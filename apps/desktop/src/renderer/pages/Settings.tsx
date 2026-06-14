import { useEffect, useRef, useState } from 'react';
import type { Settings as SettingsT, WhisperModelId } from '@open-flow/shared';
import { SUPPORTED_KEYS, describeRejection, labelForKeycode, lookupBrowserKey } from '../keycodes.js';

interface ModelEntry {
  id: WhisperModelId;
  displayName: string;
  approxSizeMb: number;
  description: string;
  installed: boolean;
}

export function Settings(): JSX.Element {
  const [settings, setSettings] = useState<SettingsT | null>(null);
  const [models, setModels] = useState<ModelEntry[]>([]);

  useEffect(() => {
    void (async () => {
      setSettings(await window.openFlow.settings.load());
      setModels((await window.openFlow.models.list()) as ModelEntry[]);
    })();
  }, []);

  if (!settings) return <div className="page">Loading…</div>;

  async function save(next: SettingsT): Promise<void> {
    setSettings(next);
    await window.openFlow.settings.save(next);
  }

  return (
    <div className="page">
      <h1>Settings</h1>

      <HotkeyRow settings={settings} onSave={save} />

      <div className="row">
        <label>Hotkey mode</label>
        <select
          value={settings.hotkey.mode}
          onChange={(e) =>
            void save({
              ...settings,
              hotkey: { ...settings.hotkey, mode: e.target.value as 'pushToTalk' | 'toggle' },
            })
          }
        >
          <option value="pushToTalk">Push to talk (hold)</option>
          <option value="toggle">Toggle (press once, press again to stop)</option>
        </select>
      </div>

      <div className="row">
        <label>Whisper model</label>
        <select
          value={settings.model}
          onChange={(e) => void save({ ...settings, model: e.target.value as WhisperModelId })}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName} ({m.approxSizeMb} MB) {m.installed ? '✓' : '— download required'}
            </option>
          ))}
        </select>
      </div>

      <div className="row">
        <label>Max recording length (seconds)</label>
        <input
          type="text"
          value={String(settings.maxRecordingSeconds)}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(n) && n > 0) void save({ ...settings, maxRecordingSeconds: n });
          }}
        />
      </div>

      <div className="row">
        <label>Save dictation history</label>
        <input
          type="checkbox"
          checked={settings.historyEnabled}
          onChange={(e) => void save({ ...settings, historyEnabled: e.target.checked })}
        />
      </div>

      <div className="row">
        <label>Show recording HUD while dictating</label>
        <input
          type="checkbox"
          checked={settings.showRecordingHud}
          onChange={(e) => void save({ ...settings, showRecordingHud: e.target.checked })}
        />
      </div>
    </div>
  );
}

function HotkeyRow(props: { settings: SettingsT; onSave: (s: SettingsT) => Promise<void> }): JSX.Element {
  const { settings, onSave } = props;
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!capturing) return;
    const handler = (e: KeyboardEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setCapturing(false);
        setError(null);
        return;
      }
      const supported = lookupBrowserKey(e.code);
      if (!supported) {
        setError(describeRejection(e.code).reason);
        return;
      }
      void onSave({
        ...settings,
        hotkey: { ...settings.hotkey, keycode: supported.code, modifiers: 0 },
      });
      setError(null);
      setCapturing(false);
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [capturing, settings, onSave]);

  const currentLabel = labelForKeycode(settings.hotkey.keycode);
  const modifiers = Object.values(SUPPORTED_KEYS).filter((k) => k.category === 'modifier');
  const fnKeys = Object.values(SUPPORTED_KEYS).filter((k) => k.category === 'function');

  return (
    <>
      <div className="row">
        <div style={{ flex: 1 }}>
          <strong>Hotkey</strong>
          <div style={{ opacity: 0.7 }}>
            {capturing ? 'Press a key…  (Esc to cancel)' : `Current: ${currentLabel}`}
          </div>
          {error && <div style={{ color: 'red', marginTop: 4 }}>{error}</div>}
        </div>
        <button
          ref={buttonRef}
          onClick={() => {
            setError(null);
            setCapturing(true);
            buttonRef.current?.blur();
          }}
        >
          {capturing ? 'Listening…' : 'Change…'}
        </button>
        <button
          onClick={() =>
            void onSave({
              ...settings,
              hotkey: { ...settings.hotkey, keycode: 61, modifiers: 0 },
            })
          }
        >
          Reset to Right Option
        </button>
      </div>
      <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        <div style={{ opacity: 0.7 }}>
          Allowed keys: modifiers ({modifiers.map((k) => k.label).join(', ')}) or {fnKeys.map((k) => k.label).join(', ')}.
        </div>
        <div style={{ opacity: 0.6 }}>
          macOS blocks Caps Lock, Fn, brightness / volume / media keys, Mission Control, and Spotlight chords from
          reaching open-flow. F1-F12 only work if you enable "Use F1, F2, etc. as standard function keys" in System Settings.
        </div>
      </div>
    </>
  );
}
