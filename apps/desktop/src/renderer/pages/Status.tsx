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
      <h1>Status</h1>

      <section className="card">
        <div className="card-row">
          <strong>Hotkey events</strong>
          <span className={`pill ${hotkeyState === 'pressed' ? 'pill-active' : sinceLastHotkey !== null ? 'pill-ok' : 'pill-warn'}`}>
            {hotkeyState === 'pressed'
              ? 'Hotkey held now'
              : sinceLastHotkey !== null
                ? `Last event ${sinceLastHotkey}s ago`
                : 'Never seen'}
          </span>
        </div>
        <div className="muted">
          Current binding: <strong>{hotkeyLabel}</strong>. Hold it in any app to dictate. If "Never seen"
          stays put after pressing the hotkey, the sidecar isn't receiving events — see the recipe below.
        </div>
      </section>

      <section className="card">
        <div className="card-row">
          <strong>Sidecar permissions</strong>
          {perms && (
            <button onClick={() => window.openFlow.sidecarPermissions.check()}>Re-check</button>
          )}
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
              Granted to binary:
              <code className="path-pill">{perms.binaryPath}</code>
            </div>
          </>
        ) : (
          <div className="muted">Querying…</div>
        )}
      </section>

      <section className="card">
        <div className="card-row">
          <strong>Whisper model</strong>
          <span className={`pill ${installedModel?.installed ? 'pill-ok' : 'pill-warn'}`}>
            {installedModel?.installed ? `${installedModel.displayName} ✓` : 'Not installed'}
          </span>
        </div>
        {error && <div className="error">{error}</div>}
      </section>

      {!allGranted && (
        <section className="card card-warning">
          <strong>Why this isn't working yet</strong>
          <ol className="muted small">
            <li>
              <strong>Accessibility denied:</strong> open System Settings → Privacy &amp; Security → Accessibility,
              click <em>+</em>, navigate to the sidecar binary path above, and toggle it on. Pasting the transcript
              into the focused app requires this.
            </li>
            <li>
              <strong>Microphone not determined:</strong> click "Request" above. macOS may not show a banner for a
              non-bundled CLI binary; if it doesn't, open System Settings → Privacy &amp; Security → Microphone and
              add the sidecar binary manually.
            </li>
            <li>
              <strong>Hotkey "granted" but no events arriving (TCC + signature mismatch):</strong>
              every time the sidecar is rebuilt its code signature changes, so even a previously-granted Input
              Monitoring entry stops delivering events. Open System Settings → Privacy &amp; Security → Input
              Monitoring, <em>remove</em> the open-flow-sidecar entry, then add the binary back from the path above
              and toggle it on. Restart <code>pnpm dev</code>.
            </li>
          </ol>
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
          Open System Settings
        </button>
      </div>
    </div>
  );
}
