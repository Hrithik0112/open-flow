import { useEffect, useRef, useState } from 'react';
import type { WhisperModelId } from '@open-flow/shared';
import { labelForKeycode } from '../keycodes.js';

interface SidecarPermissions {
  microphone: string;
  inputMonitoring: string;
  accessibility: string;
  binaryPath: string;
}

interface ModelEntry {
  id: WhisperModelId;
  displayName: string;
  approxSizeMb: number;
  installed: boolean;
}

interface SettingsT {
  hotkey: { keycode: number; modifiers: number; mode: string };
  model: WhisperModelId;
}

export function Status(): JSX.Element {
  const [perms, setPerms] = useState<SidecarPermissions | null>(null);
  const [settings, setSettings] = useState<SettingsT | null>(null);
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [lastHotkeyAt, setLastHotkeyAt] = useState<number | null>(null);
  const [hotkeyState, setHotkeyState] = useState<'idle' | 'pressed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef<number | null>(null);
  const [, forceTick] = useState(0);

  async function refresh(): Promise<void> {
    const s = (await window.openFlow.settings.load()) as SettingsT;
    const m = (await window.openFlow.models.list()) as ModelEntry[];
    setSettings(s);
    setModels(m);
  }

  useEffect(() => {
    void refresh();
    void window.openFlow.sidecarPermissions.check();
    const offPerms = window.openFlow.sidecarPermissions.onUpdate((p) => setPerms(p));
    const offHotkey = window.openFlow.hotkey.onEvent((e) => {
      setLastHotkeyAt(e.at);
      setHotkeyState(e.kind === 'pressed' ? 'pressed' : 'idle');
    });
    const offError = window.openFlow.models.onError((e) => setError(`${e.code}: ${e.message}`));
    const offLoaded = window.openFlow.models.onLoaded(() => {
      void refresh();
      setError(null);
    });
    tickRef.current = window.setInterval(() => forceTick((t) => t + 1), 1000);
    return () => {
      offPerms();
      offHotkey();
      offError();
      offLoaded();
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
    };
  }, []);

  const installedModel = models.find((m) => m.id === settings?.model);
  const hotkeyLabel = settings ? labelForKeycode(settings.hotkey.keycode) : '—';
  const allGranted = perms && perms.microphone === 'granted' && perms.inputMonitoring === 'granted' && perms.accessibility === 'granted';
  const sinceLastHotkey = lastHotkeyAt ? Math.floor((Date.now() - lastHotkeyAt) / 1000) : null;

  return (
    <div className="page page-status">
      <div className="page-title-block">
        <div className="eyebrow">Status</div>
        <h1>Ready check.</h1>
        <p>Hotkey, permissions, and local model health at a glance.</p>
      </div>

      <section className="status-grid">
        <div className="status-tile">
          <div className="eyebrow">Hotkey</div>
          <strong>{hotkeyLabel}</strong>
          <span className={`pill ${hotkeyState === 'pressed' ? 'pill-active' : sinceLastHotkey !== null ? 'pill-ok' : 'pill-warn'}`}>
            {hotkeyState === 'pressed'
              ? 'Held now'
              : sinceLastHotkey !== null
                ? `${sinceLastHotkey}s ago`
                : 'No events'}
          </span>
        </div>
        <div className="status-tile">
          <div className="eyebrow">Permissions</div>
          <strong>{allGranted ? 'All granted' : 'Needs attention'}</strong>
          <span className={`pill ${allGranted ? 'pill-ok' : 'pill-warn'}`}>
            {perms ? `${[perms.microphone, perms.inputMonitoring, perms.accessibility].filter((p) => p === 'granted').length}/3` : 'Checking'}
          </span>
        </div>
        <div className="status-tile">
          <div className="eyebrow">Model</div>
          <strong>{installedModel?.displayName ?? 'Whisper'}</strong>
          <span className={`pill ${installedModel?.installed ? 'pill-ok' : 'pill-warn'}`}>
            {installedModel?.installed ? 'Installed' : 'Missing'}
          </span>
        </div>
      </section>

      <section className="card compact-card">
        <div className="card-row">
          <strong>Sidecar permissions</strong>
          {perms && <button onClick={() => window.openFlow.sidecarPermissions.check()}>Re-check</button>}
        </div>
        {perms ? (
          <>
            <PermRow
              name="Microphone"
              status={perms.microphone}
              onAction={() => window.openFlow.sidecarPermissions.requestMicrophone()}
              actionLabel="Request"
              paneKind="microphone"
            />
            <PermRow
              name="Input Monitoring"
              status={perms.inputMonitoring}
              onAction={() => window.openFlow.sidecarPermissions.requestInputMonitoring()}
              actionLabel="Request"
              paneKind="inputMonitoring"
            />
            <PermRow
              name="Accessibility"
              status={perms.accessibility}
              onAction={() => window.openFlow.sidecarPermissions.promptAccessibility()}
              actionLabel="Prompt"
              paneKind="accessibility"
            />
            <div className="muted small">
              Binary
              <code className="path-pill">{perms.binaryPath}</code>
            </div>
          </>
        ) : (
          <div className="muted">Querying…</div>
        )}
      </section>

      {error && (
        <section className="card compact-card card-warning">
          <strong>Model error</strong>
          <div className="error small">{error}</div>
        </section>
      )}

      {!allGranted && (
        <section className="card compact-card card-warning">
          <strong>Still blocked?</strong>
          <p className="muted small">
            Re-add the sidecar binary in Input Monitoring or Accessibility after rebuilds. macOS ties
            permission grants to the signed binary path.
          </p>
        </section>
      )}
    </div>
  );
}

function PermRow(props: {
  name: string;
  status: string;
  actionLabel: string;
  onAction: () => Promise<unknown> | void;
  paneKind: 'microphone' | 'inputMonitoring' | 'accessibility';
}): JSX.Element {
  const granted = props.status === 'granted';
  return (
    <div className="perm-row">
      <div className="perm-row-label">
        <strong>{props.name}</strong>
        <span className={`pill ${granted ? 'pill-ok' : 'pill-warn'}`}>{props.status}</span>
      </div>
      <div className="perm-row-actions">
        <button onClick={() => void props.onAction()} disabled={granted}>
          {props.actionLabel}
        </button>
        <button onClick={() => window.openFlow.permissions.openPane(props.paneKind)}>
          Settings
        </button>
      </div>
    </div>
  );
}
