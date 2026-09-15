import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { WALL_HEIGHT, WALL_WIDTH } from '../utils/brickLayout';

interface WebEffectProps {
  center: THREE.Vector3;
  seed?: number;
}

const SPOKE_COUNT = 16;
const RING_COUNT = 7;

// The wall is wide and short (14 columns x 9 rows of bricks), so a
// single uniform "radius" either looks tiny against the width or pokes
// way above/below the bricks into empty space. Instead we scale the
// web's reach independently per axis, proportional to the wall's own
// dimensions, so one web genuinely reads as covering a large swath of
// the wall - not just the brick it's centered on - while still roughly
// respecting the wall's shape.
const RADIUS_X = WALL_WIDTH * 0.22;
const RADIUS_Y = WALL_HEIGHT * 0.3;

function rnd(seed: number, n: number) {
  const x = Math.sin((seed + n) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The classic Spider-Man radial web pattern, procedurally generated
 * with straight spokes from the attachment point plus concentric
 * "rings" connecting the spokes at increasing radius - stuck flat
 * against the brick face, offset slightly forward so it doesn't
 * z-fight with the brick surface.
 *
 * The rings are spaced so the outermost ring lands exactly at each
 * spoke's tip (frac = 1.0) - previously they stopped at ~90% of the
 * spoke length with no ring near the center either, so only the
 * outer/edge portion of each spoke ever looked "connected" into a web
 * shape while the middle was just bare converging lines.
 */
export default function WebEffect({ center, seed = 0 }: WebEffectProps) {
  const glowRef = useRef<THREE.Mesh>(null);

  const { spokePoints, ringPoints } = useMemo(() => {
    const normal = new THREE.Vector3(0, 0, 1);
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, normal).normalize();
    const trueUp = new THREE.Vector3().crossVectors(normal, right).normalize();

    const irregularity = 0.1;
    const spokeDirs: THREE.Vector3[] = [];
    for (let i = 0; i < SPOKE_COUNT; i++) {
      const angle = (i / SPOKE_COUNT) * Math.PI * 2 + rnd(seed, i) * 0.15;
      const variance = 0.88 + rnd(seed, i + 50) * 0.22;
      // Elliptical spread: horizontal reach and vertical reach are
      // scaled independently so the web hugs the wall's proportions
      // instead of forming a circle that overshoots the short axis.
      const dir = right
        .clone()
        .multiplyScalar(Math.cos(angle) * RADIUS_X * variance)
        .add(trueUp.clone().multiplyScalar(Math.sin(angle) * RADIUS_Y * variance));
      spokeDirs.push(dir);
    }

    const spokes: THREE.Vector3[][] = spokeDirs.map((d) => [
      center.clone().addScaledVector(normal, 0.02),
      center.clone().add(d).addScaledVector(normal, 0.02),
    ]);

    // Evenly spaced rings from near the center out to *exactly* each
    // spoke's tip (last frac === 1), so every spoke is fully woven in.
    const fracs = Array.from({ length: RING_COUNT }, (_, r) => (r + 1) / RING_COUNT);
    const rings: THREE.Vector3[][] = fracs.map((frac, r) => {
      const ringPts: THREE.Vector3[] = [];
      for (let i = 0; i <= SPOKE_COUNT; i++) {
        const dir = spokeDirs[i % SPOKE_COUNT];
        const isOutermost = r === fracs.length - 1;
        // Keep the outermost ring exact (no jitter) so it always meets
        // the spoke tips cleanly; inner rings get a little organic wobble.
        const jitter = isOutermost ? 1 : 1 + (rnd(seed, i * 3 + r * 17) - 0.5) * irregularity;
        ringPts.push(center.clone().add(dir.clone().multiplyScalar(frac * jitter)).addScaledVector(normal, 0.021));
      }
      return ringPts;
    });

    return { spokePoints: spokes, ringPoints: rings };
  }, [center, seed]);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 2 + seed * 10) * 0.06;
      glowRef.current.scale.setScalar(s);
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + Math.sin(clock.elapsedTime * 2 + seed * 10) * 0.1;
    }
  });

  return (
    <group>
      <mesh ref={glowRef} position={center.clone().addScaledVector(new THREE.Vector3(0, 0, 1), 0.015)}>
        <circleGeometry args={[Math.min(RADIUS_X, RADIUS_Y) * 0.28, 24]} />
        <meshBasicMaterial color="#bff5ff" transparent opacity={0.6} depthWrite={false} toneMapped={false} />
      </mesh>

      {spokePoints.map((pts, i) => (
        <Line key={`spoke-${i}`} points={pts} color="#f4feff" lineWidth={1.6} transparent opacity={0.9} toneMapped={false} />
      ))}
      {ringPoints.map((pts, i) => (
        <Line key={`ring-${i}`} points={pts} color="#eafcff" lineWidth={1.2} transparent opacity={0.75} toneMapped={false} />
      ))}
    </group>
  );
}
