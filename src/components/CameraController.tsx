import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/appStore';

const BASE_POSITION = new THREE.Vector3(0, 0, 8.5);

/**
 * Gives the scene a subtle "handheld robotics rig" idle drift, and
 * punches in a decaying camera shake every time a new web lands
 * (detected by watching websShotCount tick up).
 */
export default function CameraController() {
  const { camera } = useThree();
  const shakeRef = useRef(0);
  const lastWebCount = useRef(0);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;

    const { websShotCount, handDetected, landmarks } = useAppStore.getState();
    if (websShotCount > lastWebCount.current) {
      shakeRef.current = 1;
      lastWebCount.current = websShotCount;
    }

    // Idle sway.
    let x = BASE_POSITION.x + Math.sin(t.current * 0.25) * 0.35;
    let y = BASE_POSITION.y + Math.cos(t.current * 0.2) * 0.2;

    // Gentle parallax toward the hand's screen position, so the
    // camera feels like it's "looking where you point."
    if (handDetected && landmarks) {
      const wrist = landmarks[0];
      x += (0.5 - wrist.x) * 1.1;
      y += (0.5 - wrist.y) * 0.6;
    }

    if (shakeRef.current > 0.001) {
      const s = shakeRef.current;
      x += (Math.random() - 0.5) * 0.18 * s;
      y += (Math.random() - 0.5) * 0.18 * s;
      shakeRef.current *= 0.86;
    } else {
      shakeRef.current = 0;
    }

    camera.position.set(x, y, BASE_POSITION.z);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
