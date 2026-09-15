import type { Landmark } from '../types/hand';

/**
 * Lightweight exponential + velocity-aware smoothing filter, applied
 * per-landmark, per-axis. Cheap approximation of a One-Euro filter:
 * it adapts the smoothing factor based on how fast the point is moving,
 * so fast gestures stay responsive while a still hand looks rock solid.
 */
export class LandmarkSmoother {
  private prev: Landmark[] | null = null;
  private prevVelocity: Landmark[] | null = null;
  private minAlpha: number; // smoothing when hand is still (lower = smoother)
  private maxAlpha: number; // smoothing when hand is moving fast (higher = snappier)
  private velocityScale: number;

  constructor(minAlpha = 0.35, maxAlpha = 0.85, velocityScale = 18) {
    this.minAlpha = minAlpha;
    this.maxAlpha = maxAlpha;
    this.velocityScale = velocityScale;
  }

  reset() {
    this.prev = null;
    this.prevVelocity = null;
  }

  smooth(landmarks: Landmark[]): Landmark[] {
    if (!this.prev || this.prev.length !== landmarks.length) {
      this.prev = landmarks.map((p) => ({ ...p }));
      this.prevVelocity = landmarks.map(() => ({ x: 0, y: 0, z: 0 }));
      return this.prev;
    }

    const out: Landmark[] = new Array(landmarks.length);
    const prev = this.prev;
    const prevVel = this.prevVelocity!;

    for (let i = 0; i < landmarks.length; i++) {
      const raw = landmarks[i];
      const last = prev[i];

      const vx = raw.x - last.x;
      const vy = raw.y - last.y;
      const vz = raw.z - last.z;
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

      const alpha = clamp(
        this.minAlpha + speed * this.velocityScale,
        this.minAlpha,
        this.maxAlpha,
      );

      const smoothed: Landmark = {
        x: lerp(last.x, raw.x, alpha),
        y: lerp(last.y, raw.y, alpha),
        z: lerp(last.z, raw.z, alpha),
      };

      out[i] = smoothed;
      prevVel[i] = { x: vx, y: vy, z: vz };
    }

    this.prev = out;
    return out;
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
