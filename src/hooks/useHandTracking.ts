import { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useAppStore } from '../store/appStore';
import { LandmarkSmoother } from '../utils/smoothing';
import { classifyGesture } from '../utils/gestures';
import type { Landmark } from '../types/hand';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// A gesture has to be seen for this many consecutive frames before we
// trust it - filters out single-frame misclassifications ("gesture jitter").
const GESTURE_STABILITY_FRAMES = 3;

// The webcam captures at 960x720, but MediaPipe doesn't need anywhere
// near that resolution to find a hand - inference time scales with
// input size, so we draw each frame down to a small offscreen canvas
// before handing it to the model. This is the actual, reliable fix for
// "detection feels slow": a much smaller image to process every frame,
// regardless of which thread it happens to run on.
//
// (We tried moving this to a Web Worker for true background execution,
// but MediaPipe Tasks Vision's WASM loader uses importScripts(), which
// ES module workers don't support - a confirmed open upstream bug:
// github.com/google-ai-edge/mediapipe/issues/5527. Running on the main
// thread, on a small image, is the reliable option today.)
const PROCESS_WIDTH = 320;
const PROCESS_HEIGHT = 240;

export interface UseHandTrackingResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * Owns the full client-side computer-vision pipeline:
 *   webcam -> downscale -> MediaPipe HandLandmarker -> smoothing
 *   -> gesture classification -> Zustand store.
 */
export function useHandTracking(): UseHandTrackingResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const smootherRef = useRef(new LandmarkSmoother());
  const streamRef = useRef<MediaStream | null>(null);
  const processCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const fpsCounter = useRef({ frames: 0, lastSample: performance.now() });
  const gestureHistory = useRef<{ gesture: string; count: number }>({ gesture: 'NONE', count: 0 });

  const setHandFrame = useAppStore((s) => s.setHandFrame);
  const setGesture = useAppStore((s) => s.setGesture);
  const setDetectionFps = useAppStore((s) => s.setDetectionFps);
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);

  useEffect(() => {
    let cancelled = false;

    const canvas = document.createElement('canvas');
    canvas.width = PROCESS_WIDTH;
    canvas.height = PROCESS_HEIGHT;
    processCanvasRef.current = canvas;
    const drawCtx = canvas.getContext('2d', { willReadFrequently: false });

    async function init() {
      try {
        setConnectionStatus('INITIALIZING');

        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        if (cancelled) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 960, height: 720, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) throw new Error('Video element not mounted');
        video.srcObject = stream;
        await video.play();

        setConnectionStatus('CONNECTED');
        loop();
      } catch (err) {
        console.error('[useHandTracking] init failed', err);
        if (!cancelled) {
          const isPermission =
            err instanceof DOMException &&
            (err.name === 'NotAllowedError' || err.name === 'NotFoundError');
          setConnectionStatus(
            isPermission ? 'NO_CAMERA' : 'ERROR',
            err instanceof Error ? err.message : String(err),
          );
        }
      }
    }

    function loop() {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || video.readyState < 2 || !drawCtx || !processCanvasRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      drawCtx.drawImage(video, 0, 0, PROCESS_WIDTH, PROCESS_HEIGHT);

      const now = performance.now();
      let result: HandLandmarkerResult | null = null;
      try {
        result = landmarker.detectForVideo(processCanvasRef.current, now);
      } catch {
        // Detector can throw transiently while the video track is warming up.
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // --- FPS bookkeeping ---
      const fc = fpsCounter.current;
      fc.frames += 1;
      const elapsed = now - fc.lastSample;
      if (elapsed >= 500) {
        setDetectionFps(Math.round((fc.frames / elapsed) * 1000));
        fc.frames = 0;
        fc.lastSample = now;
      }

      if (result && result.landmarks.length > 0) {
        const raw: Landmark[] = result.landmarks[0].map((p) => ({ x: p.x, y: p.y, z: p.z }));
        const smoothed = smootherRef.current.smooth(raw);
        const handedness = (result.handedness[0]?.[0]?.categoryName as 'Left' | 'Right') ?? 'Unknown';

        setHandFrame({ handDetected: true, landmarks: smoothed, handedness });

        const { gesture, confidence } = classifyGesture(smoothed);
        const gh = gestureHistory.current;
        if (gesture === gh.gesture) {
          gh.count += 1;
        } else {
          gh.gesture = gesture;
          gh.count = 1;
        }
        if (gh.count >= GESTURE_STABILITY_FRAMES) {
          setGesture(gesture, confidence);
        }
      } else {
        smootherRef.current.reset();
        gestureHistory.current = { gesture: 'NONE', count: 0 };
        setHandFrame({ handDetected: false, landmarks: null, handedness: 'Unknown' });
        setGesture('NONE', 0);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { videoRef };
}
