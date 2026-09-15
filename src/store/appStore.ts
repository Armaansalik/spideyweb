import { create } from 'zustand';
import type { GestureType, Landmark } from '../types/hand';

export type ConnectionStatus = 'INITIALIZING' | 'CONNECTED' | 'NO_CAMERA' | 'ERROR';

export interface WebInstance {
  id: number;
  brickId: number;
  createdAt: number;
}

interface AppState {
  // --- CV pipeline state (updated up to 60x/sec) ---
  handDetected: boolean;
  landmarks: Landmark[] | null;
  handedness: 'Left' | 'Right' | 'Unknown';
  gesture: GestureType;
  gestureConfidence: number;
  detectionFps: number;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;

  // --- Scene interaction state ---
  targetBrickId: number | null;
  targetDistance: number | null;
  hoveredBrickId: number | null;

  // --- Webs ---
  webs: WebInstance[];
  websShotCount: number;
  nextWebId: number;

  // --- Debug ---
  debugPanelOpen: boolean;

  // actions
  setHandFrame: (payload: {
    handDetected: boolean;
    landmarks: Landmark[] | null;
    handedness: 'Left' | 'Right' | 'Unknown';
  }) => void;
  setGesture: (gesture: GestureType, confidence: number) => void;
  setDetectionFps: (fps: number) => void;
  setConnectionStatus: (status: ConnectionStatus, message?: string) => void;
  setTarget: (brickId: number | null, distance: number | null) => void;
  setHoveredBrick: (brickId: number | null) => void;
  spawnWeb: (brickId: number) => void;
  clearWebFromBrick: (brickId: number) => void;
  toggleDebugPanel: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  handDetected: false,
  landmarks: null,
  handedness: 'Unknown',
  gesture: 'NONE',
  gestureConfidence: 0,
  detectionFps: 0,
  connectionStatus: 'INITIALIZING',
  errorMessage: null,

  targetBrickId: null,
  targetDistance: null,
  hoveredBrickId: null,

  webs: [],
  websShotCount: 0,
  nextWebId: 1,

  debugPanelOpen: true,

  setHandFrame: ({ handDetected, landmarks, handedness }) =>
    set({ handDetected, landmarks, handedness }),

  setGesture: (gesture, gestureConfidence) => set({ gesture, gestureConfidence }),

  setDetectionFps: (detectionFps) => set({ detectionFps }),

  setConnectionStatus: (connectionStatus, message) =>
    set({ connectionStatus, errorMessage: message ?? null }),

  setTarget: (targetBrickId, targetDistance) => set({ targetBrickId, targetDistance }),

  setHoveredBrick: (hoveredBrickId) => set({ hoveredBrickId }),

  spawnWeb: (brickId) => {
    const { nextWebId, webs } = get();
    // Only one web strand shown per brick at a time - replace if reshooting the same brick.
    const filtered = webs.filter((w) => w.brickId !== brickId);
    set({
      webs: [...filtered, { id: nextWebId, brickId, createdAt: performance.now() }],
      nextWebId: nextWebId + 1,
      websShotCount: get().websShotCount + 1,
    });
  },

  clearWebFromBrick: (brickId) => {
    set({ webs: get().webs.filter((w) => w.brickId !== brickId) });
  },

  toggleDebugPanel: () => set({ debugPanelOpen: !get().debugPanelOpen }),
}));
