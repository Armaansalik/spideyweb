# CV Web-Shooter // Brick Wall Dashboard

A futuristic, real-time computer-vision dashboard: point your webcam at your
hand, throw a Spider-Man-style "web-shoot" gesture, and watch a procedural
web fly from your hand and stick to a brick on a fully 3D, dynamically lit
brick wall — driven entirely by live MediaPipe hand tracking, no mouse
required.

This is a **working application**, not a mockup: the hand tracking, gesture
recognition, 3D raycasting/brick-picking, and web animation are all real and
running against your actual webcam feed in the browser.

---

## Tech stack

- **React 19 + TypeScript + Vite**
- **Three.js** via **React Three Fiber** + **@react-three/drei**
- **GSAP** for the web-projectile / impact animation timelines
- **MediaPipe Tasks Vision (`HandLandmarker`)** for real-time 21-point hand
  landmark detection — runs fully client-side via WASM/WebGL, no server
  round-trip needed
- **@react-three/postprocessing** (Bloom, Depth of Field, Vignette) for the
  cinematic look
- **Zustand** as the state hub connecting the CV pipeline to the 3D scene
  and the HUD
- **Python + FastAPI + WebSocket** — an **optional** backend (see below)

## Quick start

```bash
cd cv-webshooter
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`), allow
camera access when prompted, and show your hand to the camera.

> Requires a browser with WebGL2 + WebRTC (getUserMedia) support — any
> current Chrome, Edge, or Firefox works well. HTTPS or `localhost` is
> required for camera access (the Vite dev server serves `localhost`, so
> this works out of the box).

### Production build

```bash
npm run build
npm run preview
```

`npm run build` type-checks with `tsc -b` and outputs a static bundle to
`dist/` — deployable to any static host (the model files are fetched from
a CDN at runtime, see "Offline / self-hosting the model" below).

## How to use it

1. **Allow camera access.** A small live camera feed with a skeleton overlay
   appears bottom-left — that's the raw CV debug view, confirming tracking
   is live.
2. **Point at the wall.** Move your hand — a targeting reticle locks onto
   the brick under your fingertip.
3. **Make the web-shoot gesture:** extend your **index finger and pinky**,
   curl your **middle and ring** fingers down (the classic Spider-Man
   hand). A web fires from your hand toward the targeted brick, sticks,
   and leaves a permanent procedural web decal + impact particles + a
   camera shake.
4. Other recognized poses (shown live in the HUD): **open palm**,
   **fist**, **pointing**.
5. No webcam handy? The brick-picking raycaster also follows your mouse
   pointer as a fallback, so you can still explore the 3D wall.

The **DEBUG** panel (bottom-right, toggle with the button) shows the raw
21-landmark coordinates and the finger-extension values the gesture
classifier is using — handy for tuning thresholds for your own hand/camera.

## Architecture

```
src/
  hooks/
    useHandTracking.ts     # webcam -> MediaPipe HandLandmarker -> smoothing
                            # -> gesture classification -> Zustand store
  utils/
    smoothing.ts            # velocity-adaptive landmark jitter filter
    gestures.ts               # finger-extension math + gesture classifier
    coordinateMapping.ts       # 2D landmark -> 3D ray / world position
    brickLayout.ts               # brick grid math (shared by renderer + picker)
  store/
    appStore.ts                   # zustand store: single source of truth
  components/
    HandTracker.tsx                # webcam preview + landmark skeleton overlay
    BrickWall.tsx / Brick.tsx       # instanced 3D wall + raycasting picker
    TargetIndicator.tsx              # HUD reticle locked to the hovered brick
    WebProjectile.tsx                 # traveling web strand (GSAP + curve)
    WebEffect.tsx                      # permanent radial web decal on impact
    ParticleSystem.tsx                  # impact particle burst
    CameraController.tsx                 # idle drift + impact shake
    Scene.tsx                             # wires it all together + lighting
                                           # + post-processing
    HUD.tsx / DebugPanel.tsx               # 2D overlays
```

### The CV pipeline

1. `getUserMedia` grabs the webcam stream into a `<video>` element.
2. `HandLandmarker.detectForVideo()` (MediaPipe Tasks Vision, GPU delegate)
   runs on every animation frame, producing 21 normalized hand landmarks.
3. `LandmarkSmoother` applies a velocity-adaptive exponential filter per
   landmark so the hand looks stable when still but stays responsive
   during fast motion.
4. `classifyGesture()` computes a per-finger "extension" score (tip
   distance from wrist vs. base-knuckle distance, normalized by palm
   span) and pattern-matches it to `OPEN_PALM` / `FIST` / `POINTING` /
   `WEB_SHOOT`, with light temporal debouncing (a gesture must hold for a
   few consecutive frames) to avoid flicker.
5. Everything is written into a Zustand store, which the 3D scene and the
   HUD both read reactively.

### Coordinate mapping (2D webcam → 3D scene)

The wall's brick-picking uses a `THREE.Raycaster` built from the tracked
index-fingertip landmark's normalized position converted to NDC space
(mirrored on X so pointing right on camera feels like pointing right on
screen), intersected against the wall's picking plane; the hit point is
then mapped to a brick column/row analytically (`brickLayout.ts`). The
web's *origin* point is found the same way, unprojected to a fixed depth
in front of the camera, so the strand visually originates from wherever
your hand is on screen.

## Optional backend (`/backend`)

The app works completely standalone — MediaPipe runs in the browser, so
**you do not need to run the backend to use the dashboard.**

`backend/main.py` is provided as an extension point matching the requested
stack (FastAPI + WebSocket): a small relay server that can broadcast
gesture/web-shot events to multiple connected clients, or serve as the
place to plug in heavier server-side ML later (a custom PyTorch gesture
classifier, YOLO object detection on uploaded frames, etc. — see the
commented-out optional dependencies in `requirements.txt`).

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # or your tool of choice
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

It is not wired into the frontend by default; nothing needs it to run.

## Offline / self-hosting the model

By default the hand-landmark model and MediaPipe's WASM runtime are
fetched from Google's CDN at runtime (see `WASM_BASE` / `MODEL_URL` in
`src/hooks/useHandTracking.ts`). For a fully offline/air-gapped deployment,
download:

- `hand_landmarker.task` from the MediaPipe models bucket
- the `@mediapipe/tasks-vision` WASM bundle (already in
  `node_modules/@mediapipe/tasks-vision/wasm` after `npm install`)

into `public/models/` and `public/wasm/`, and point `MODEL_URL` /
`WASM_BASE` at the local `/models/...` and `/wasm` paths instead.

## Tuning gesture detection

If the `WEB_SHOOT` gesture doesn't trigger reliably for your hand/camera,
open the DEBUG panel and watch the raw per-finger extension numbers while
you pose the gesture — then adjust `EXTEND_THRESHOLD` and the thumb-spread
constant in `src/utils/gestures.ts`. Lighting and camera angle both affect
MediaPipe's landmark accuracy; a well-lit hand facing the camera works best.

## Known limitations

- Single-hand tracking (`numHands: 1`) — easy to raise in
  `useHandTracking.ts` if you want two-handed play.
- Gesture recognition is a rule-based classifier on landmark geometry, not
  a trained ML classifier — robust for the 4 gestures here, but not a
  general-purpose gesture-recognition system.
- No true depth camera: the hand's 3D depth is approximated (fixed
  distance in front of the virtual camera along the fingertip ray), which
  is standard practice for single-RGB-camera hand tracking.
