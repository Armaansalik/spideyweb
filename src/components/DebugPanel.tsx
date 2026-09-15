import { useAppStore } from '../store/appStore';
import { computeFingerStates } from '../utils/gestures';
import './DebugPanel.css';

const LANDMARK_NAMES = [
  'WRIST',
  'THUMB_CMC',
  'THUMB_MCP',
  'THUMB_IP',
  'THUMB_TIP',
  'INDEX_MCP',
  'INDEX_PIP',
  'INDEX_DIP',
  'INDEX_TIP',
  'MIDDLE_MCP',
  'MIDDLE_PIP',
  'MIDDLE_DIP',
  'MIDDLE_TIP',
  'RING_MCP',
  'RING_PIP',
  'RING_DIP',
  'RING_TIP',
  'PINKY_MCP',
  'PINKY_PIP',
  'PINKY_DIP',
  'PINKY_TIP',
];

interface DebugPanelProps {
  open: boolean;
  onToggle: () => void;
}

export default function DebugPanel({ open, onToggle }: DebugPanelProps) {
  const landmarks = useAppStore((s) => s.landmarks);
  const handedness = useAppStore((s) => s.handedness);
  const handDetected = useAppStore((s) => s.handDetected);
  const errorMessage = useAppStore((s) => s.errorMessage);

  const fingers = landmarks ? computeFingerStates(landmarks) : null;

  return (
    <div className={`debug-panel ${open ? 'debug-panel--open' : 'debug-panel--closed'}`}>
      <button className="debug-panel__toggle" onClick={onToggle}>
        {open ? 'HIDE DEBUG ▾' : 'DEBUG ▸'}
      </button>

      {open && (
        <div className="debug-panel__body">
          <div className="debug-panel__section-title">GESTURE CLASSIFIER</div>
          {fingers ? (
            <div className="debug-panel__fingers">
              {(['thumb', 'index', 'middle', 'ring', 'pinky'] as const).map((f) => (
                <div key={f} className={`debug-panel__finger ${fingers[f] ? 'is-extended' : ''}`}>
                  <span>{f.toUpperCase()}</span>
                  <span className="debug-panel__finger-val">{fingers.raw[f].toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="debug-panel__empty">
              no hand — tips: move hand 30–60cm from the camera, ensure even
              lighting on your palm, keep a plain background behind your
              hand, and make sure the whole hand is in frame.
            </div>
          )}

          <div className="debug-panel__section-title">
            LANDMARKS ({handedness}) {handDetected ? '' : '- none'}
          </div>
          <div className="debug-panel__landmarks">
            {landmarks?.map((p, i) => (
              <div key={i} className="debug-panel__landmark-row">
                <span className="debug-panel__landmark-name">{LANDMARK_NAMES[i]}</span>
                <span className="debug-panel__landmark-vals">
                  {p.x.toFixed(2)}, {p.y.toFixed(2)}, {p.z.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {errorMessage && <div className="debug-panel__error">ERR: {errorMessage}</div>}
        </div>
      )}
    </div>
  );
}
