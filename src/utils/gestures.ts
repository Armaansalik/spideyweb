import { LandmarkIndex, type GestureResult, type Landmark } from '../types/hand';

function dist(a: Landmark, b: Landmark) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z - b.z) * 0.5; // z is noisier, weight it down
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * A finger is considered "extended" when its tip sits meaningfully
 * farther from the wrist than its base (MCP) knuckle does, relative
 * to the overall size of the hand (palm span). Using ratios instead
 * of absolute pixel distances keeps this working regardless of how
 * close the hand is to the camera.
 */
function fingerExtension(
  landmarks: Landmark[],
  tipIdx: LandmarkIndex,
  pipIdx: LandmarkIndex,
  mcpIdx: LandmarkIndex,
  wristIdx: LandmarkIndex,
  handScale: number,
): number {
  const wrist = landmarks[wristIdx];
  const tip = landmarks[tipIdx];
  const pip = landmarks[pipIdx];
  const mcp = landmarks[mcpIdx];

  const tipToWrist = dist(tip, wrist);
  const pipToWrist = dist(pip, wrist);
  const mcpToWrist = dist(mcp, wrist);

  // How much farther the tip is than the middle knuckle, normalized.
  const extension = (tipToWrist - pipToWrist) / handScale;
  // Straightness bonus: a curled finger has its tip closer to the wrist
  // than its own base knuckle.
  const straightness = (tipToWrist - mcpToWrist) / handScale;

  return extension * 0.5 + straightness * 0.5;
}

function handScaleOf(landmarks: Landmark[]): number {
  // Palm span: wrist to middle-finger MCP is a stable reference length
  // that scales with hand size / camera distance.
  const wrist = landmarks[LandmarkIndex.WRIST];
  const middleMcp = landmarks[LandmarkIndex.MIDDLE_MCP];
  return Math.max(dist(wrist, middleMcp), 0.001);
}

export interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  raw: { thumb: number; index: number; middle: number; ring: number; pinky: number };
}

const EXTEND_THRESHOLD = 0.12;

export function computeFingerStates(landmarks: Landmark[]): FingerStates {
  const scale = handScaleOf(landmarks);

  const index = fingerExtension(
    landmarks,
    LandmarkIndex.INDEX_TIP,
    LandmarkIndex.INDEX_PIP,
    LandmarkIndex.INDEX_MCP,
    LandmarkIndex.WRIST,
    scale,
  );
  const middle = fingerExtension(
    landmarks,
    LandmarkIndex.MIDDLE_TIP,
    LandmarkIndex.MIDDLE_PIP,
    LandmarkIndex.MIDDLE_MCP,
    LandmarkIndex.WRIST,
    scale,
  );
  const ring = fingerExtension(
    landmarks,
    LandmarkIndex.RING_TIP,
    LandmarkIndex.RING_PIP,
    LandmarkIndex.RING_MCP,
    LandmarkIndex.WRIST,
    scale,
  );
  const pinky = fingerExtension(
    landmarks,
    LandmarkIndex.PINKY_TIP,
    LandmarkIndex.PINKY_PIP,
    LandmarkIndex.PINKY_MCP,
    LandmarkIndex.WRIST,
    scale,
  );

  // Thumb doesn't fold the same way as the other fingers (it moves
  // sideways, not up/down), so we measure it against the index MCP
  // (across the palm) instead of the wrist.
  const thumbTip = landmarks[LandmarkIndex.THUMB_TIP];
  const indexMcp = landmarks[LandmarkIndex.INDEX_MCP];
  const pinkyMcp = landmarks[LandmarkIndex.PINKY_MCP];
  const thumbSpread = dist(thumbTip, pinkyMcp) / scale - dist(indexMcp, pinkyMcp) / scale;

  return {
    thumb: thumbSpread > 0.35,
    index: index > EXTEND_THRESHOLD,
    middle: middle > EXTEND_THRESHOLD,
    ring: ring > EXTEND_THRESHOLD,
    pinky: pinky > EXTEND_THRESHOLD,
    raw: { thumb: thumbSpread, index, middle, ring, pinky },
  };
}

/**
 * Classifies the current hand pose into one of our supported gestures.
 * WEB_SHOOT is the Spider-Man "shooter" pose: index + pinky extended,
 * middle + ring curled down, thumb tucked across the palm.
 */
export function classifyGesture(landmarks: Landmark[]): GestureResult {
  const f = computeFingerStates(landmarks);

  const extendedCount = [f.index, f.middle, f.ring, f.pinky].filter(Boolean).length;

  // WEB_SHOOT: index + pinky out, middle + ring curled.
  if (f.index && f.pinky && !f.middle && !f.ring) {
    const confidence = clamp01(
      0.5 +
        (f.raw.index - EXTEND_THRESHOLD) * 1.2 +
        (f.raw.pinky - EXTEND_THRESHOLD) * 1.2 -
        Math.max(0, f.raw.middle) * 0.8 -
        Math.max(0, f.raw.ring) * 0.8,
    );
    return { gesture: 'WEB_SHOOT', confidence };
  }

  // FIST: nothing extended.
  if (extendedCount === 0) {
    const curl = -(f.raw.index + f.raw.middle + f.raw.ring + f.raw.pinky) / 4;
    return { gesture: 'FIST', confidence: clamp01(0.55 + curl * 1.5) };
  }

  // OPEN_PALM: everything extended.
  if (extendedCount === 4 && f.thumb) {
    const spread = (f.raw.index + f.raw.middle + f.raw.ring + f.raw.pinky) / 4;
    return { gesture: 'OPEN_PALM', confidence: clamp01(0.55 + spread * 1.2) };
  }

  // POINTING: only index out.
  if (f.index && !f.middle && !f.ring && !f.pinky) {
    return { gesture: 'POINTING', confidence: clamp01(0.55 + (f.raw.index - EXTEND_THRESHOLD) * 1.5) };
  }

  return { gesture: 'NONE', confidence: 0.3 };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
