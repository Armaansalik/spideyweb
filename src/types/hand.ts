// Normalized landmark as returned by MediaPipe (x, y, z in [0,1]-ish range, z relative depth)
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

// The 21 MediaPipe hand landmark indices, named for readability.
export const LandmarkIndex = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

export type LandmarkIndex = (typeof LandmarkIndex)[keyof typeof LandmarkIndex];

export type GestureType =
  | 'NONE'
  | 'OPEN_PALM'
  | 'FIST'
  | 'POINTING'
  | 'WEB_SHOOT';

export interface GestureResult {
  gesture: GestureType;
  confidence: number; // 0..1
}

export interface HandFrame {
  landmarks: Landmark[]; // length 21, normalized video-space coords
  handedness: 'Left' | 'Right' | 'Unknown';
  detectedAt: number;
}

export interface Brick3D {
  x: number;
  y: number;
  z: number;
}
