import { useEffect, useRef, useState } from 'react';

type HudState = 'recording' | 'transcribing';

export function HUD(): JSX.Element {
  const [state, setState] = useState<HudState>('recording');
  const [smoothedRms, setSmoothedRms] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastRmsRef = useRef(0);

  useEffect(() => {
    document.documentElement.classList.add('hud-html');
    document.body.classList.add('hud-body');
    return () => {
      document.documentElement.classList.remove('hud-html');
      document.body.classList.remove('hud-body');
    };
  }, []);

  useEffect(() => {
    const offState = window.openFlow.hud.onState((msg) => {
      setState(msg.state);
    });
    const offLevels = window.openFlow.hud.onLevels((msg) => {
      lastRmsRef.current = msg.rms;
    });

    const tick = (): void => {
      // Exponential smoothing for a less jittery meter.
      setSmoothedRms((prev) => prev * 0.7 + lastRmsRef.current * 0.3);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      offState();
      offLevels();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const meterWidth = Math.min(100, Math.round(Math.sqrt(smoothedRms) * 220));

  return (
    <div className="hud-root">
      <div className="hud-card">
        <div className="hud-dot" data-state={state} />
        <div className="hud-content">
          <div className="hud-label">{state === 'recording' ? 'Listening' : 'Transcribing…'}</div>
          {state === 'recording' && (
            <div className="hud-meter">
              <div className="hud-meter-fill" style={{ width: `${meterWidth}%` }} />
            </div>
          )}
          {state === 'transcribing' && <div className="hud-meter hud-meter-indeterminate" />}
        </div>
      </div>
    </div>
  );
}
