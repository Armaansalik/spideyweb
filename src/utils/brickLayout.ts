import * as THREE from 'three';

export const WALL_COLS = 14;
export const WALL_ROWS = 9;
export const BRICK_W = 1.0;
export const BRICK_H = 0.44;
export const BRICK_D = 0.5;
export const GAP = 0.055;
export const WALL_Z = 0; // world Z the wall face sits at

export const PITCH_X = BRICK_W + GAP;
export const PITCH_Y = BRICK_H + GAP;
export const WALL_WIDTH = WALL_COLS * PITCH_X;
export const WALL_HEIGHT = WALL_ROWS * PITCH_Y;

export interface BrickInfo {
  id: number;
  col: number;
  row: number;
  position: THREE.Vector3;
  seed: number; // stable pseudo-random seed for per-brick visual variance
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function brickCenter(col: number, row: number): THREE.Vector3 {
  const x = -WALL_WIDTH / 2 + col * PITCH_X + PITCH_X / 2;
  const y = WALL_HEIGHT / 2 - row * PITCH_Y - PITCH_Y / 2;
  const seed = hash(col * 91.7 + row * 13.37);
  const z = WALL_Z + (seed - 0.5) * 0.03;
  return new THREE.Vector3(x, y, z);
}

export function buildBrickGrid(): BrickInfo[] {
  const bricks: BrickInfo[] = [];
  for (let row = 0; row < WALL_ROWS; row++) {
    for (let col = 0; col < WALL_COLS; col++) {
      const id = row * WALL_COLS + col;
      bricks.push({
        id,
        col,
        row,
        position: brickCenter(col, row),
        seed: hash(id * 7.13),
      });
    }
  }
  return bricks;
}

export function brickIdAt(col: number, row: number): number | null {
  if (col < 0 || col >= WALL_COLS || row < 0 || row >= WALL_ROWS) return null;
  return row * WALL_COLS + col;
}

/** The world-space picking plane the wall lives on (used for ray intersection). */
export const wallPickingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -WALL_Z);

/**
 * Given a point already known to lie on the wall's picking plane,
 * returns which brick (col/row/id) contains it, or null if outside
 * the wall's bounds.
 */
export function pointToBrick(point: THREE.Vector3): { id: number; col: number; row: number } | null {
  const localX = point.x + WALL_WIDTH / 2;
  const localY = WALL_HEIGHT / 2 - point.y;
  if (localX < 0 || localX >= WALL_WIDTH || localY < 0 || localY >= WALL_HEIGHT) return null;

  const col = Math.min(WALL_COLS - 1, Math.max(0, Math.floor(localX / PITCH_X)));
  const row = Math.min(WALL_ROWS - 1, Math.max(0, Math.floor(localY / PITCH_Y)));
  const id = brickIdAt(col, row);
  if (id === null) return null;
  return { id, col, row };
}
