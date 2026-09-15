import { useEffect, useRef } from 'react';
import { useHandTracking } from '../hooks/useHandTracking';
import { useAppStore } from '../store/appStore';
import { LandmarkIndex } from '../types/hand';
import './HandTracker.css';

// Bone connections for drawing the hand skeleton overlay.
const CONNECTIONS: [LandmarkIndex, LandmarkIndex][] = [
  [LandmarkIndex.WRIST, LandmarkIndex.THUMB_CMC],
  [LandmarkIndex.THUMB_CMC, LandmarkIndex.THUMB_MCP],
  [LandmarkIndex.THUMB_MCP, LandmarkIndex.THUMB_IP],
  [LandmarkIndex.THUMB_IP, LandmarkIndex.THUMB_TIP],

  [LandmarkIndex.WRIST, LandmarkIndex.INDEX_MCP],
  [LandmarkIndex.INDEX_MCP, LandmarkIndex.INDEX_PIP],
  [LandmarkIndex.INDEX_PIP, LandmarkIndex.INDEX_DIP],
  [LandmarkIndex.INDEX_DIP, LandmarkIndex.INDEX_TIP],

  [LandmarkIndex.INDEX_MCP, LandmarkIndex.MIDDLE_MCP],
  [LandmarkIndex.MIDDLE_MCP, LandmarkIndex.MIDDLE_PIP],
  [LandmarkIndex.MIDDLE_PIP, LandmarkIndex.MIDDLE_DIP],
  [LandmarkIndex.MIDDLE_DIP, LandmarkIndex.MIDDLE_TIP],

  [LandmarkIndex.MIDDLE_MCP, LandmarkIndex.RING_MCP],
  [LandmarkIndex.RING_MCP, LandmarkIndex.RING_PIP],
  [LandmarkIndex.RING_PIP, LandmarkIndex.RING_DIP],
  [LandmarkIndex.RING_DIP, LandmarkIndex.RING_TIP],

  [LandmarkIndex.RING_MCP, LandmarkIndex.PINKY_MCP],
  [LandmarkIndex.PINKY_MCP, LandmarkIndex.PINKY_PIP],
  [LandmarkIndex.PINKY_PIP, LandmarkIndex.PINKY_DIP],
  [LandmarkIndex.PINKY_DIP, LandmarkIndex.PINKY_TIP],

  [LandmarkIndex.WRIST, LandmarkIndex.PINKY_MCP],
];

interface HandTrackerProps {
  show: boolean;
}

/**
 * Renders the raw webcam feed with a live landmark-skeleton overlay.
 * This is the visible "debug camera" panel; the actual CV pipeline
 * (useHandTracking) runs regardless of whether this is shown - hiding
 * it only hides the DOM element (display:none), it does not stop the
 * camera or the background detection worker.
 */
export default function HandTracker({ show }: HandTrackerProps) {
  const { videoRef } = useHandTracking();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const { landmarks, handDetected, gesture } = useAppStore.getState();

          if (handDetected && landmarks) {
            const color = gesture === 'WEB_SHOOT' ? '#ff2f4e' : '#4dd8ff';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;

            for (const [a, b] of CONNECTIONS) {
              const p1 = landmarks[a];
              const p2 = landmarks[b];
              if (!p1 || !p2) continue;
              ctx.beginPath();
              ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
              ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
              ctx.stroke();
            }

            ctx.fillStyle = color;
            for (const p of landmarks) {
              ctx.beginPath();
              ctx.arc(p.x * canvas.width, p.y * canvas.height, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef]);

  return (
    <div className={`hand-tracker ${show ? '' : 'hand-tracker--hidden'}`}>
      <video ref={videoRef} className="hand-tracker__video" playsInline muted />
      <canvas ref={canvasRef} className="hand-tracker__canvas" />
      <div className="hand-tracker__label">CV FEED (running in background)</div>
    </div>
  );
}
