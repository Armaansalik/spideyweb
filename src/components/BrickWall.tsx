import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/appStore';
import { buildBrickGrid, pointToBrick, WALL_HEIGHT, WALL_WIDTH, wallPickingPlane } from '../utils/brickLayout';
import { createWallTexture } from '../utils/wallTexture';
import { landmarkToNDC } from '../utils/coordinateMapping';
import { LandmarkIndex } from '../types/hand';

interface BrickWallProps {
  onShoot: (brickId: number) => void;
}

/**
 * Renders the wall as a single flat plane (brown fill + black grid
 * lines baked into a texture) rather than individually modeled 3D
 * bricks, and doubles as the interaction controller: every frame it
 * raycasts from the tracked hand's index fingertip (falling back to a
 * mouse ray when no hand is present, for keyboard/mouse testing)
 * through the wall plane to find the targeted grid cell, and fires
 * onShoot() when the WEB_SHOOT gesture transitions from inactive ->
 * active. Grid-cell math (position lookups for the target reticle /
 * web decals) still comes from brickLayout - only the per-cell 3D
 * geometry has been removed.
 */
export default function BrickWall({ onShoot }: BrickWallProps) {
  const bricks = useMemo(() => buildBrickGrid(), []);
  const wallTexture = useMemo(() => createWallTexture(), []);
  const { camera, raycaster, pointer } = useThree();

  const wasShootingRef = useRef(false);
  const hoveredIdRef = useRef<number | null>(null);
  const targetIdRef = useRef<number | null>(null);

  const setHoveredBrick = useAppStore((s) => s.setHoveredBrick);
  const setTarget = useAppStore((s) => s.setTarget);

  const intersection = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const { landmarks, handDetected, gesture } = useAppStore.getState();

    let hitPoint: THREE.Vector3 | null = null;

    if (handDetected && landmarks) {
      const ndc = landmarkToNDC(landmarks[LandmarkIndex.INDEX_TIP]);
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(wallPickingPlane, intersection)) {
        hitPoint = intersection;
      }
    } else {
      // No hand detected: fall back to the mouse pointer so the demo
      // stays testable without a webcam.
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(wallPickingPlane, intersection)) {
        hitPoint = intersection;
      }
    }

    const hit = hitPoint ? pointToBrick(hitPoint) : null;
    const newHoveredId = hit ? hit.id : null;

    if (newHoveredId !== hoveredIdRef.current) {
      hoveredIdRef.current = newHoveredId;
      setHoveredBrick(newHoveredId);
    }

    const isShooting = gesture === 'WEB_SHOOT';
    const targetId = isShooting ? newHoveredId : targetIdRef.current;

    if (isShooting && newHoveredId !== null) {
      const distance = camera.position.distanceTo(bricks[newHoveredId].position);
      if (newHoveredId !== targetIdRef.current) {
        targetIdRef.current = newHoveredId;
        setTarget(newHoveredId, distance);
      } else {
        setTarget(newHoveredId, distance);
      }
    }

    // Rising edge: gesture just became WEB_SHOOT this frame -> fire.
    if (isShooting && !wasShootingRef.current && newHoveredId !== null) {
      onShoot(newHoveredId);
    }
    wasShootingRef.current = isShooting;
    void targetId;
  });

  return (
    <group>
      <mesh receiveShadow>
        <planeGeometry args={[WALL_WIDTH, WALL_HEIGHT]} />
        <meshStandardMaterial map={wallTexture} roughness={0.95} metalness={0.02} />
      </mesh>
    </group>
  );
}
