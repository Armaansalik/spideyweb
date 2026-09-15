import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Line2 } from 'three-stdlib';
import * as THREE from 'three';
import gsap from 'gsap';

interface WebProjectileProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  seed?: number;
  onImpact: () => void;
}

const SEGMENTS = 48;

/**
 * The fast-traveling web strand: a glowing line that grows from the
 * user's hand toward the targeted brick, with a slight organic wobble
 * (elastic silk, not a laser) and a bright leading tip + motion trail.
 * Built as a Catmull-Rom curve so it reads as a single continuous
 * strand rather than a straight segment.
 *
 * IMPORTANT: drei's <Line> uses a "fat line" geometry (LineGeometry
 * from three-stdlib) under the hood, which only exposes
 * `.setPositions(flatArray)` - NOT the plain THREE.BufferGeometry
 * `.setFromPoints()` method. Calling the wrong one throws at runtime
 * inside the R3F render loop and silently kills the whole canvas.
 */
function setLinePoints(lineRef: RefObject<Line2 | null>, points: THREE.Vector3[]) {
  const obj = lineRef.current;
  if (!obj?.geometry || points.length < 2) return;
  const flat: number[] = [];
  for (const p of points) flat.push(p.x, p.y, p.z);
  obj.geometry.setPositions(flat);
}

export default function WebProjectile({ start, end, seed = 0, onImpact }: WebProjectileProps) {
  const progressRef = useRef({ t: 0 });
  const lineRef = useRef<Line2>(null);
  const tipRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<Line2>(null);

  const curve = useMemo(() => {
    const dist = start.distanceTo(end);
    const dir = end.clone().sub(start).normalize();
    // A stable "up-ish" perpendicular so the wobble reads as web silk
    // sagging/twisting rather than random noise.
    const up = new THREE.Vector3(0, 1, 0);
    const perp = new THREE.Vector3().crossVectors(dir, up).normalize();
    const perp2 = new THREE.Vector3().crossVectors(dir, perp).normalize();

    const rnd = (n: number) => {
      const x = Math.sin((seed + n) * 78.233) * 43758.5453;
      return x - Math.floor(x) - 0.5;
    };

    const points: THREE.Vector3[] = [start.clone()];
    const midCount = 3;
    for (let i = 1; i <= midCount; i++) {
      const t = i / (midCount + 1);
      const base = start.clone().lerp(end, t);
      const wobble = dist * 0.06;
      base.addScaledVector(perp, rnd(i) * wobble);
      base.addScaledVector(perp2, rnd(i + 10) * wobble * 0.6);
      points.push(base);
    }
    points.push(end.clone());

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
  }, [start, end, seed]);

  useEffect(() => {
    const tween = gsap.to(progressRef.current, {
      t: 1,
      duration: 0.32,
      ease: 'power1.in',
      onComplete: () => onImpact(),
    });
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const t = Math.min(1, progressRef.current.t);
    const tip = curve.getPointAt(t);

    if (tipRef.current) {
      tipRef.current.position.copy(tip);
      const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.15;
      tipRef.current.scale.setScalar(0.055 * pulse);
    }

    const drawnCount = Math.max(2, Math.floor(t * SEGMENTS));
    const drawnPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= drawnCount; i++) {
      drawnPoints.push(curve.getPointAt(Math.min(1, (i / SEGMENTS) )));
    }
    drawnPoints[drawnPoints.length - 1] = tip;

    setLinePoints(lineRef, drawnPoints);

    // Short fading trail just behind the tip.
    const trailStart = Math.max(0, t - 0.18);
    setLinePoints(trailRef, [curve.getPointAt(trailStart), curve.getPointAt(Math.max(trailStart, t - 0.02)), tip]);
  });

  return (
    <group>
      <Line ref={lineRef} points={[start, end]} color="#eafcff" lineWidth={2.4} transparent opacity={0.92} />
      <Line ref={trailRef} points={[start, start, start]} color="#3fd6ff" lineWidth={5} transparent opacity={0.5} />
      <mesh ref={tipRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}
