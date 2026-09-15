import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Scene from './components/Scene';
import HandTracker from './components/HandTracker';
import HUD from './components/HUD';
import DebugPanel from './components/DebugPanel';
import { useAppStore } from './store/appStore';
import './App.css';

export default function App() {
  const [debugOpen, setDebugOpen] = useState(false);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const errorMessage = useAppStore((s) => s.errorMessage);

  return (
    <div className="app">
      <Canvas
        shadows
        camera={{ position: [0, 0, 8.5], fov: 45, near: 0.1, far: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        dpr={[1, 1.75]}
      >
        <Scene />
      </Canvas>

      <HUD />
      {/* The camera preview stays mounted at all times (so hand tracking
          keeps running in the background) but is only shown on screen
          when the debug panel is open - it's not part of the main
          dashboard view. */}
      <HandTracker show={debugOpen} />
      <DebugPanel open={debugOpen} onToggle={() => setDebugOpen((v) => !v)} />

      {connectionStatus === 'INITIALIZING' && (
        <div className="app__overlay">
          <div className="app__overlay-card">
            <div className="app__spinner" />
            <div className="app__overlay-title">CALIBRATING VISION PIPELINE</div>
            <div className="app__overlay-sub">Loading MediaPipe hand-landmark model &amp; requesting camera access…</div>
          </div>
        </div>
      )}

      {connectionStatus === 'NO_CAMERA' && (
        <div className="app__overlay">
          <div className="app__overlay-card">
            <div className="app__overlay-title app__overlay-title--alert">CAMERA ACCESS REQUIRED</div>
            <div className="app__overlay-sub">
              This app needs webcam permission to track your hand. Allow camera access in your browser's address
              bar, then reload the page.
            </div>
          </div>
        </div>
      )}

      {connectionStatus === 'ERROR' && (
        <div className="app__overlay">
          <div className="app__overlay-card">
            <div className="app__overlay-title app__overlay-title--alert">VISION PIPELINE ERROR</div>
            <div className="app__overlay-sub">{errorMessage ?? 'Something went wrong initializing the camera / model.'}</div>
          </div>
        </div>
      )}

      <div className="app__help">
        <span className="app__help-pill">🖐 OPEN PALM</span>
        <span className="app__help-pill">☝ POINT</span>
        <span className="app__help-pill">✊ FIST</span>
        <span className="app__help-pill app__help-pill--accent">🤟 WEB-SHOOT: index + pinky straight, thumb out to the side, fire!</span>
      </div>
    </div>
  );
}
