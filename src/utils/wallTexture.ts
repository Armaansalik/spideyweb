import * as THREE from 'three';
import { WALL_COLS, WALL_ROWS } from './brickLayout';

const CELL_PX = 64;

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Draws a flat brown wall with black grid lines onto an offscreen
 * canvas and returns it as a Three.js texture. This replaces the
 * previous individually-modeled 3D brick instances with a single flat
 * plane - much simpler, and exactly what was asked for: a brown
 * background with black dividing lines, not raised brick geometry.
 */
export function createWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = WALL_COLS * CELL_PX;
  canvas.height = WALL_ROWS * CELL_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Brown fill, with a little per-cell variance so it doesn't look
  // like a flat, dead-uniform color.
  for (let row = 0; row < WALL_ROWS; row++) {
    for (let col = 0; col < WALL_COLS; col++) {
      const seed = hash(col * 91.7 + row * 13.37);
      const lightness = 30 + seed * 10; // 30%-40%
      ctx.fillStyle = `hsl(22, 45%, ${lightness}%)`;
      ctx.fillRect(col * CELL_PX, row * CELL_PX, CELL_PX, CELL_PX);
    }
  }

  // Black grid lines.
  ctx.strokeStyle = '#0b0805';
  ctx.lineWidth = Math.max(2, CELL_PX * 0.06);
  ctx.beginPath();
  for (let col = 0; col <= WALL_COLS; col++) {
    const x = col * CELL_PX;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let row = 0; row <= WALL_ROWS; row++) {
    const y = row * CELL_PX;
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
