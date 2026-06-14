import { useEffect, useState } from 'react';
import type { Settings as SettingsT, WhisperModelId } from '@open-flow/shared';

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
