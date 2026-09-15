import { useCallback, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import BrickWall from './BrickWall';
import TargetIndicator from './TargetIndicator';
import WebProjectile from './WebProjectile';
import WebEffect from './WebEffect';
import ParticleSystem from './ParticleSystem';
import CameraController from './CameraController';
import { useAppStore } from '../store/appStore';
import { buildBrickGrid } from '../utils/brickLayout';
import { landmarkToHandWorldPosition } from '../utils/coordinateMapping';
import { LandmarkIndex } from '../types/hand';

interface FlyingWeb {
  id: number;
  brickId: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
}

interface Burst {
  id: number;
  position: THREE.Vector3;
}

const bricks = buildBrickGrid();

export default function Scene() {
  const { camera } = useThree();
  const [flying, setFlying] = useState<FlyingWeb[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextFlyingId = useRef(1);
  const nextBurstId = useRef(1);

  const spawnWeb = useAppStore((s) => s.spawnWeb);
  const webs = useAppStore((s) => s.webs);

  const handleShoot = useCallback(
    (brickId: number) => {
      const { landmarks, handDetected } = useAppStore.getState();
      if (!handDetected || !landmarks) return;

      // Origin the strand from the index fingertip, which is where a
      // web-shooter would sit on the wrist/hand.
      const handPoint = landmarkToHandWorldPosition(landmarks[LandmarkIndex.INDEX_TIP], camera, 3.2);
      const brickPos = bricks[brickId].position.clone();

      setFlying((prev) => [
        ...prev,
        { id: nextFlyingId.current++, brickId, start: handPoint, end: brickPos },
      ]);
    },
    [camera],
  );

  const handleImpact = useCallback(
    (flyingId: number, brickId: number, position: THREE.Vector3) => {
      setFlying((prev) => prev.filter((f) => f.id !== flyingId));
      spawnWeb(brickId);
      setBursts((prev) => [...prev, { id: nextBurstId.current++, position: position.clone() }]);
    },
    [spawnWeb],
  );

  const handleBurstDone = useCallback((burstId: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== burstId));
  }, []);

  return (
    <>
      <CameraController />

      {/* Lighting: warm-white key light (so the brown wall actually reads
          brown) + a restrained cool rim accent for the "cinematic CV lab"
          mood, without letting that rim color dominate and wash out the
          wall's base color the way a strong cool-blue key light would.
          NOTE: three.js r155+ removed legacy lighting entirely - light
          intensities are now physically-based units (lux for directional,
          candela for point lights), which are much larger numbers than the
          old arbitrary-unit convention. These values are tuned for that. */}
      <ambientLight intensity={1.2} color="#8a6a52" />
      <directionalLight
        position={[4, 6, 6]}
        intensity={4.5}
        color="#fff2e0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <pointLight position={[-6, -3, 4]} intensity={130} color="#ff5470" distance={16} />
      <pointLight position={[6, 4, 3]} intensity={90} color="#4dd8ff" distance={16} />
      <fog attach="fog" args={['#050810', 9, 22]} />

      <BrickWall onShoot={handleShoot} />
      <TargetIndicator />

      {flying.map((f) => (
        <WebProjectile
          key={f.id}
          start={f.start}
          end={f.end}
          seed={f.id}
          onImpact={() => handleImpact(f.id, f.brickId, f.end)}
        />
      ))}

      {webs.map((w) => (
        <WebEffect key={w.id} center={bricks[w.brickId].position} seed={w.id} />
      ))}

      {bursts.map((b) => (
        <ParticleSystem key={b.id} position={b.position} onDone={() => handleBurstDone(b.id)} />
      ))}

      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur radius={0.5} />
        <DepthOfField focusDistance={0.02} focalLength={0.04} bokehScale={2.4} height={480} />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </>
  );
}
