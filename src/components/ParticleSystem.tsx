import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

interface ParticleSystemProps {
  position: THREE.Vector3 | [number, number, number];
  color?: string;
  count?: number;
  onDone?: () => void;
}

/**
 * A short-lived radial particle burst used for web-impact sparks.
 * Positions are stored in a plain Float32Array and driven directly
 * (no per-particle React state) for performance; a single GSAP tween
 * drives the overall progress/fade so the whole burst eases out together.
 */
export default function ParticleSystem({ position, color = '#8fe8ff', count = 26, onDone }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const progress = useRef({ t: 0 });

  const { geometry, velocities } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Random direction, biased outward in a hemisphere facing the camera (+Z).
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.6 + 0.3);
      const speed = 0.9 + Math.random() * 1.6;
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      vel[i * 3 + 2] = Math.cos(phi) * speed * 0.8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry: geo, velocities: vel };
  }, [count]);

  useEffect(() => {
    const tween = gsap.to(progress.current, {
      t: 1,
      duration: 0.7,
      ease: 'power2.out',
      onComplete: () => onDone?.(),
    });
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const t = progress.current.t;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const drag = 1 - t * 0.4;
      arr[i * 3] = velocities[i * 3] * t * drag;
      arr[i * 3 + 1] = velocities[i * 3 + 1] * t * drag - t * t * 0.6; // gentle gravity
      arr[i * 3 + 2] = velocities[i * 3 + 2] * t * drag;
    }
    posAttr.needsUpdate = true;
    if (materialRef.current) {
      materialRef.current.opacity = 1 - t;
      materialRef.current.size = 0.05 * (1 - t * 0.6);
    }
  });

  return (
    <points ref={pointsRef} position={position} geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        color={color}
        size={0.05}
        sizeAttenuation
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
