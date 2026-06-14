import { useEffect, useState } from 'react';
import type { WhisperModelId } from '@open-flow/shared';

interface ModelEntry {
  id: WhisperModelId;
  displayName: string;
  approxSizeMb: number;
  description: string;
  installed: boolean;
}

interface SidecarPermissions {
  microphone: string;
  inputMonitoring: string;
  accessibility: string;
  binaryPath: string;
}

interface ProgressState {
  fraction: number;
  message: string;
}

export function Onboarding(): JSX.Element {
  const [perms, setPerms] = useState<SidecarPermissions | null>(null);
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [installing, setInstalling] = useState<WhisperModelId | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshModels(): Promise<void> {
    const m = (await window.openFlow.models.list()) as ModelEntry[];
    setModels(m);
  }

  useEffect(() => {
    void refreshModels();
    void window.openFlow.sidecarPermissions.check();
    const offPerms = window.openFlow.sidecarPermissions.onUpdate((p) => {
      setPerms(p);
    });
    const offProgress = window.openFlow.models.onProgress((p) => {
      setProgress(p);
      setError(null);
    });
    const offLoaded = window.openFlow.models.onLoaded(() => {
      setInstalling(null);
      setProgress(null);
      setError(null);
      void refreshModels();
    });
    const offError = window.openFlow.models.onError((e) => {
      setInstalling(null);
      setError(e.message);
    });
    return () => {
      offPerms();
      offProgress();
      offLoaded();
      offError();
    };
  }, []);

  if (!perms) return <div className="page">Checking permissions…</div>;

  const defaultModel = models.find((m) => m.id === 'openai_whisper-base.en');

  return (
    <div className="page">
      <h1>Welcome to open-flow</h1>
      <p>
        open-flow needs three macOS permissions and one Whisper model. Permissions are granted{' '}
        <strong>per binary</strong>, and the binary that does the recording / hotkey / paste work is
        the sidecar process listed below. macOS will not auto-prompt for Input Monitoring; you must
        add the binary in System Settings.
      </p>

      <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <strong>Sidecar binary</strong>
        <code style={{ wordBreak: 'break-all', opacity: 0.75 }}>{perms.binaryPath}</code>
      </div>

      <PermissionStep
        title="Microphone"
        body="So the sidecar can read the input from your mic when you hold the hotkey."
        status={perms.microphone}
        onGrant={() => window.openFlow.sidecarPermissions.requestMicrophone()}
        paneKind="microphone"
      />

      <PermissionStep
        title="Input Monitoring"
        body="So the sidecar can see the hotkey when other apps are focused. macOS will open a prompt; if it doesn't, open the pane and drag the binary above into the allowed list."
        status={perms.inputMonitoring}
        onGrant={() => window.openFlow.sidecarPermissions.requestInputMonitoring()}
        paneKind="inputMonitoring"
      />

      <PermissionStep
        title="Accessibility"
        body="So the sidecar can paste the transcript into the focused app. Required even though we use the clipboard."
        status={perms.accessibility}
        onGrant={() => window.openFlow.sidecarPermissions.promptAccessibility()}
        paneKind="accessibility"
      />

      {defaultModel && (
        <ModelStep
          model={defaultModel}
          installing={installing === defaultModel.id}
          progress={installing === defaultModel.id ? progress : null}
          error={error}
          onStart={async () => {
            setInstalling(defaultModel.id);
            setProgress({ fraction: 0, message: 'Starting…' });
            setError(null);
            await window.openFlow.models.install(defaultModel.id);
          }}
        />
      )}

      <div className="row">
        <button onClick={() => window.openFlow.sidecarPermissions.check()}>Re-check permissions</button>
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'granted':
      return '✓ granted';
    case 'denied':
      return '✗ denied';
    case 'notDetermined':
      return '— not determined';
    case 'restricted':
      return '✗ restricted by policy';
    default:
      return '— unknown';
  }
}

function PermissionStep(props: {
  title: string;
  body: string;
  status: string;
  onGrant: () => Promise<unknown> | void;
  paneKind: 'microphone' | 'inputMonitoring' | 'accessibility';
}): JSX.Element {
  const granted = props.status === 'granted';
  return (
    <div className="row">
      <div style={{ flex: 1 }}>
        <strong>{props.title}</strong> {statusLabel(props.status)}
        <div style={{ opacity: 0.7 }}>{props.body}</div>
      </div>
      <button onClick={() => void props.onGrant()} disabled={granted}>
        Request
      </button>
      <button onClick={() => window.openFlow.permissions.openPane(props.paneKind)}>
        Open System Settings
      </button>
    </div>
  );
}

function ModelStep(props: {
  model: ModelEntry;
  installing: boolean;
  progress: ProgressState | null;
  error: string | null;
  onStart: () => void | Promise<void>;
}): JSX.Element {
  const { model, installing, progress, error } = props;
  const pct = progress ? Math.min(100, Math.round(progress.fraction * 100)) : null;

  return (
    <div className="row">
      <div style={{ flex: 1 }}>
        <strong>Whisper model</strong>{' '}
        {model.installed ? '✓ installed' : `— ~${model.approxSizeMb} MB download`}
        <div style={{ opacity: 0.7 }}>
          {model.displayName} — {model.description}
        </div>
        {installing && progress && (
          <div style={{ marginTop: 4 }}>
            <div>
              {progress.message} {pct !== null ? `${pct}%` : ''}
            </div>
            <progress max={1} value={progress.fraction} />
          </div>
        )}
        {error && <div style={{ color: 'red', marginTop: 4 }}>{error}</div>}
      </div>
      <button onClick={() => void props.onStart()} disabled={model.installed || installing}>
        {model.installed ? 'Installed' : installing ? 'Installing…' : 'Install'}
      </button>
    </div>
  );
}
