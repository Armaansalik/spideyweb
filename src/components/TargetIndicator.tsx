import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/appStore';
import { buildBrickGrid } from '../utils/brickLayout';

const bricks = buildBrickGrid();

/**
 * A sci-fi targeting reticle (two counter-rotating brackets + a
 * pulsing ring) that hovers in front of whichever brick the hand's
 * fingertip ray currently intersects. Turns solid red while the
 * WEB_SHOOT gesture is actively locked onto a brick.
 */
export default function TargetIndicator() {
  const groupRef = useRef<THREE.Group>(null);
  const bracketsRef = useRef<THREE.Group>(null);
  const outerMatARef = useRef<THREE.MeshBasicMaterial>(null);
  const outerMatBRef = useRef<THREE.MeshBasicMaterial>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const { hoveredBrickId, targetBrickId, gesture } = useAppStore.getState();
    const activeId = hoveredBrickId;
    const group = groupRef.current;
    if (!group) return;

    if (activeId === null) {
      group.visible = false;
      return;
    }
    group.visible = true;

    const brick = bricks[activeId];
    group.position.set(brick.position.x, brick.position.y, brick.position.z + 0.08);

    const locked = gesture === 'WEB_SHOOT' && targetBrickId === activeId;
    const color = locked ? '#ff3b52' : '#7fe8ff';

    if (bracketsRef.current) {
      bracketsRef.current.rotation.z += delta * (locked ? 2.2 : 0.6);
    }
    outerMatARef.current?.color.set(color);
    outerMatBRef.current?.color.set(color);
    if (innerRef.current) {
      innerRef.current.rotation.z -= delta * (locked ? 3.2 : 0.9);
      const s = locked ? 1 + Math.sin(performance.now() * 0.02) * 0.08 : 1;
      innerRef.current.scale.setScalar(s);
      (innerRef.current.material as THREE.MeshBasicMaterial).color.set(color);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <group ref={bracketsRef}>
        <mesh>
          <ringGeometry args={[0.55, 0.6, 4, 1, 0, Math.PI * 0.4]} />
          <meshBasicMaterial ref={outerMatARef} color="#7fe8ff" toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI]}>
          <ringGeometry args={[0.55, 0.6, 4, 1, 0, Math.PI * 0.4]} />
          <meshBasicMaterial ref={outerMatBRef} color="#7fe8ff" toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh ref={innerRef}>
        <ringGeometry args={[0.36, 0.4, 32]} />
        <meshBasicMaterial color="#7fe8ff" toneMapped={false} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
