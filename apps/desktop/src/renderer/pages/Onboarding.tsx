import { type CSSProperties, useEffect, useState } from 'react';
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

  if (!perms) return <div className="page page-onboarding">Checking setup...</div>;

  const defaultModel = models.find((m) => m.id === 'openai_whisper-base.en');
  const grantedCount = [perms.microphone, perms.inputMonitoring, perms.accessibility].filter(
    (status) => status === 'granted',
  ).length;
  const completedSteps = grantedCount + (defaultModel?.installed ? 1 : 0);
  const setupComplete = completedSteps === 4;
  const ringStyle = { '--setup-progress': `${completedSteps * 25}%` } as CSSProperties;

  return (
    <div className="page page-onboarding">
      <section className="onboarding-hero">
        <div>
          <div className="eyebrow">Setup</div>
          <h1>Make dictation feel invisible.</h1>
          <p>Grant access, install the local model, then hold Option and speak.</p>
        </div>
        <div className={`setup-ring ${setupComplete ? 'is-complete' : ''}`} style={ringStyle}>
          <span>{completedSteps}/4</span>
        </div>
      </section>

      <div className="onboarding-path">
        <span>Sidecar</span>
        <code>{perms.binaryPath}</code>
      </div>

      <section className="setup-grid">
        <PermissionStep
          title="Microphone"
          body="Record while the hotkey is held."
          status={perms.microphone}
          onGrant={() => window.openFlow.sidecarPermissions.requestMicrophone()}
          paneKind="microphone"
        />

        <PermissionStep
          title="Input Monitoring"
          body="Catch the hotkey from any app."
          status={perms.inputMonitoring}
          onGrant={() => window.openFlow.sidecarPermissions.requestInputMonitoring()}
          paneKind="inputMonitoring"
        />

        <PermissionStep
          title="Accessibility"
          body="Paste text back into focus."
          status={perms.accessibility}
          onGrant={() => window.openFlow.sidecarPermissions.promptAccessibility()}
          paneKind="accessibility"
        />
      </section>

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

      <div className="onboarding-footer">
        <button onClick={() => window.openFlow.sidecarPermissions.check()}>Re-check</button>
        <span>{setupComplete ? 'Ready for dictation.' : 'System Settings may need a manual toggle.'}</span>
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'granted':
      return 'Granted';
    case 'denied':
      return 'Denied';
    case 'notDetermined':
      return 'Not set';
    case 'restricted':
      return 'Restricted';
    default:
      return 'Unknown';
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
    <article className="setup-card">
      <div className="setup-card-top">
        <span className={`status-dot ${granted ? 'is-granted' : ''}`} />
        <span className={`status-text ${granted ? 'is-granted' : ''}`}>{statusLabel(props.status)}</span>
      </div>
      <h2>{props.title}</h2>
      <p>{props.body}</p>
      <div className="setup-actions">
        <button onClick={() => void props.onGrant()} disabled={granted}>
          {granted ? 'Done' : 'Request'}
        </button>
        <button onClick={() => window.openFlow.permissions.openPane(props.paneKind)}>Settings</button>
      </div>
    </article>
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
    <section className="model-panel">
      <div>
        <div className="eyebrow">Local speech model</div>
        <h2>{model.displayName}</h2>
        <p>
          {model.installed
            ? 'Installed and ready.'
            : `One-time download, about ${model.approxSizeMb} MB.`}
        </p>
        {installing && progress && (
          <div className="model-progress">
            <div className="small">
              {progress.message} {pct !== null ? `${pct}%` : ''}
            </div>
            <progress max={1} value={progress.fraction} />
          </div>
        )}
        {error && <div className="error small">{error}</div>}
      </div>
      <button onClick={() => void props.onStart()} disabled={model.installed || installing}>
        {model.installed ? 'Installed' : installing ? 'Installing…' : 'Install'}
      </button>
    </section>
  );
}
