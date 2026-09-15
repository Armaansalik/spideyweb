import * as THREE from 'three';
import type { Landmark } from '../types/hand';

/**
 * Converts a normalized MediaPipe landmark (x,y in [0,1], origin
 * top-left of the *unmirrored* camera frame) into Normalized Device
 * Coordinates (-1..1, origin center, y-up) for use with Three.js.
 *
 * We mirror the X axis here so the interaction feels natural: moving
 * your hand to your own right moves the cursor to screen-right, the
 * same way a mirror (or a selfie camera preview) would show it.
 */
export function landmarkToNDC(landmark: Landmark): THREE.Vector2 {
  const ndcX = (1 - landmark.x) * 2 - 1;
  const ndcY = -(landmark.y * 2 - 1);
  return new THREE.Vector2(ndcX, ndcY);
}

/**
 * Unprojects an NDC point at a given depth (0 = near plane, 1 = far
 * plane) into world space using the active camera.
 */
export function ndcToWorld(
  ndc: THREE.Vector2,
  depth: number,
  camera: THREE.Camera,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  target.set(ndc.x, ndc.y, depth * 2 - 1);
  target.unproject(camera);
  return target;
}

/**
 * Builds a raycaster shooting from the camera through the given
 * landmark's screen position, for brick-picking.
 */
export function raycasterFromLandmark(
  landmark: Landmark,
  camera: THREE.Camera,
  raycaster: THREE.Raycaster,
) {
  const ndc = landmarkToNDC(landmark);
  raycaster.setFromCamera(ndc, camera);
  return raycaster;
}

/**
 * A stable point representing "where the user's hand is" in 3D space,
 * used as the origin of the web strand. We place it a fixed distance
 * in front of the camera along the ray through the landmark, which
 * keeps the effect anchored near the on-screen hand position without
 * needing true depth data from a single RGB camera.
 */
export function landmarkToHandWorldPosition(
  landmark: Landmark,
  camera: THREE.Camera,
  distanceFromCamera: number,
): THREE.Vector3 {
  const ndc = landmarkToNDC(landmark);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.at(distanceFromCamera, new THREE.Vector3());
}
