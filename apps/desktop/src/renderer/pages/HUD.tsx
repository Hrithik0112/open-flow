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
      lastRmsRef.current = 0;
      setSmoothedRms(0);
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

  const level = Math.min(1, Math.sqrt(smoothedRms) * 2.2);
  const label = state === 'recording' ? 'Listening' : 'Transcribing';

  return (
    <div className="hud-root">
      <div className="hud-card" data-state={state} role="status" aria-live="polite">
        <div className="hud-wave" aria-hidden="true">
          {[0.4, 0.75, 1, 0.65, 0.35].map((weight, index) => (
            <span
              key={index}
              style={{
                height: `${4 + level * weight * 20}px`,
                animationDelay: `${index * 120}ms`,
              }}
            />
          ))}
        </div>
        <span className="hud-label">{label}</span>
        <span className="hud-status-dot" aria-hidden="true" />
      </div>
    </div>
  );
}
