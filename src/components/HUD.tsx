import { useAppStore } from '../store/appStore';
import './HUD.css';

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`hud-dot ${ok ? 'hud-dot--ok' : 'hud-dot--off'}`} />;
}

export default function HUD() {
  const handDetected = useAppStore((s) => s.handDetected);
  const gesture = useAppStore((s) => s.gesture);
  const gestureConfidence = useAppStore((s) => s.gestureConfidence);
  const landmarks = useAppStore((s) => s.landmarks);
  const detectionFps = useAppStore((s) => s.detectionFps);
  const targetBrickId = useAppStore((s) => s.targetBrickId);
  const targetDistance = useAppStore((s) => s.targetDistance);
  const websShotCount = useAppStore((s) => s.websShotCount);
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  const wrist = landmarks?.[0];

  return (
    <div className="hud">
      <div className="hud__panel hud__panel--top-left">
        <div className="hud__title">WEB.SHOOTER // CV-CONTROL</div>
        <div className="hud__row">
          <span className="hud__label">HAND STATUS</span>
          <span className={`hud__value ${handDetected ? 'hud__value--good' : 'hud__value--muted'}`}>
            <StatusDot ok={handDetected} />
            {handDetected ? 'DETECTED' : 'NOT DETECTED'}
          </span>
        </div>
        <div className="hud__row">
          <span className="hud__label">GESTURE</span>
          <span className={`hud__value ${gesture === 'WEB_SHOOT' ? 'hud__value--alert' : ''}`}>{gesture}</span>
        </div>
        <div className="hud__row">
          <span className="hud__label">CONFIDENCE</span>
          <div className="hud__bar">
            <div className="hud__bar-fill" style={{ width: `${Math.round(gestureConfidence * 100)}%` }} />
          </div>
          <span className="hud__value hud__value--sm">{Math.round(gestureConfidence * 100)}%</span>
        </div>
        <div className="hud__row">
          <span className="hud__label">HAND X/Y</span>
          <span className="hud__value hud__value--mono">
            {wrist ? `${wrist.x.toFixed(3)} / ${wrist.y.toFixed(3)}` : '-- / --'}
          </span>
        </div>
      </div>

      <div className="hud__panel hud__panel--top-right">
        <div className="hud__row">
          <span className="hud__label">TARGET BRICK</span>
          <span className="hud__value hud__value--mono">{targetBrickId ?? '----'}</span>
        </div>
        <div className="hud__row">
          <span className="hud__label">TARGET DIST</span>
          <span className="hud__value hud__value--mono">
            {targetDistance !== null ? `${targetDistance.toFixed(2)}m` : '--'}
          </span>
        </div>
        <div className="hud__row">
          <span className="hud__label">DETECTION FPS</span>
          <span className="hud__value hud__value--mono">{detectionFps}</span>
        </div>
        <div className="hud__row">
          <span className="hud__label">WEBS SHOT</span>
          <span className="hud__value hud__value--mono">{websShotCount.toString().padStart(3, '0')}</span>
        </div>
        <div className="hud__row">
          <span className="hud__label">CONNECTION</span>
          <span
            className={`hud__value hud__value--sm ${
              connectionStatus === 'CONNECTED' ? 'hud__value--good' : 'hud__value--alert'
            }`}
          >
            <StatusDot ok={connectionStatus === 'CONNECTED'} />
            {connectionStatus}
          </span>
        </div>
      </div>

      <div className="hud__crosshair-corners">
        <span className="hud__corner hud__corner--tl" />
        <span className="hud__corner hud__corner--tr" />
        <span className="hud__corner hud__corner--bl" />
        <span className="hud__corner hud__corner--br" />
      </div>
    </div>
  );
}
