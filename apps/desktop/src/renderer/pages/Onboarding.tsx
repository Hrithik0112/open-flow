import { useEffect, useState } from 'react';
import type { WhisperModelId } from '@open-flow/shared';

interface Status {
  microphone: string;
  inputMonitoring: string;
  accessibility: string;
}

interface ModelEntry {
  id: WhisperModelId;
  displayName: string;
  approxSizeMb: number;
  description: string;
  installed: boolean;
}

type DownloadMsg =
  | { kind: 'progress'; id: string; bytesDownloaded: number; totalBytes: number; currentFile: string; filesDone: number; totalFiles: number }
  | { kind: 'done'; id: string }
  | { kind: 'error'; id: string; message: string };

export function Onboarding(): JSX.Element {
  const [status, setStatus] = useState<Status | null>(null);
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [download, setDownload] = useState<DownloadMsg | null>(null);

  async function refresh(): Promise<void> {
    const s = (await window.openFlow.permissions.status()) as Status;
    const m = (await window.openFlow.models.list()) as ModelEntry[];
    setStatus(s);
    setModels(m);
  }

  useEffect(() => {
    void refresh();
    const off = window.openFlow.models.onDownloadProgress((msg) => {
      setDownload(msg as DownloadMsg);
      if ((msg as DownloadMsg).kind === 'done') void refresh();
    });
    return off;
  }, []);

  if (!status) return <div className="page">Loading…</div>;

  const defaultModel = models.find((m) => m.id === 'openai_whisper-base.en');

  return (
    <div className="page">
      <h1>Welcome to open-flow</h1>
      <p>open-flow needs three macOS permissions and one Whisper model to do its job. Everything stays on your machine.</p>

      <Step
        title="Microphone"
        body="Records audio while you hold the hotkey. Nothing leaves your machine."
        granted={status.microphone === 'granted'}
        action={async () => {
          await window.openFlow.permissions.requestMicrophone();
          await refresh();
        }}
        openPane={() => window.openFlow.permissions.openPane('microphone')}
      />

      <Step
        title="Input Monitoring"
        body="Needed to listen for the global hotkey, even when open-flow is not focused."
        granted={status.inputMonitoring === 'granted'}
        action={() => window.openFlow.permissions.openPane('inputMonitoring')}
        openPane={() => window.openFlow.permissions.openPane('inputMonitoring')}
      />

      <Step
        title="Accessibility"
        body="Needed to paste the transcript into the app you are typing into."
        granted={status.accessibility === 'granted'}
        action={async () => {
          await window.openFlow.permissions.promptAccessibility();
          await refresh();
        }}
        openPane={() => window.openFlow.permissions.openPane('accessibility')}
      />

      {defaultModel && (
        <ModelStep
          model={defaultModel}
          download={download}
          onStart={async () => {
            setDownload({ kind: 'progress', id: defaultModel.id, bytesDownloaded: 0, totalBytes: 0, currentFile: '', filesDone: 0, totalFiles: 0 });
            await window.openFlow.models.download(defaultModel.id);
          }}
        />
      )}

      <div className="row">
        <button onClick={refresh}>Re-check</button>
      </div>
    </div>
  );
}

function Step(props: {
  title: string;
  body: string;
  granted: boolean;
  action: () => void | Promise<void>;
  openPane: () => void | Promise<unknown>;
}): JSX.Element {
  return (
    <div className="row">
      <div style={{ flex: 1 }}>
        <strong>{props.title}</strong> {props.granted ? '✓ granted' : '— not granted'}
        <div style={{ opacity: 0.7 }}>{props.body}</div>
      </div>
      <button onClick={() => void props.action()} disabled={props.granted}>
        Grant
      </button>
      <button onClick={() => void props.openPane()}>Open System Settings</button>
    </div>
  );
}

function ModelStep(props: {
  model: ModelEntry;
  download: DownloadMsg | null;
  onStart: () => void | Promise<void>;
}): JSX.Element {
  const { model, download } = props;
  const inFlight = download?.kind === 'progress' && download.id === model.id;
  const errored = download?.kind === 'error' && download.id === model.id;
  const pct =
    inFlight && download.totalBytes > 0
      ? Math.min(100, Math.round((download.bytesDownloaded / download.totalBytes) * 100))
      : null;

  return (
    <div className="row">
      <div style={{ flex: 1 }}>
        <strong>Whisper model</strong> {model.installed ? '✓ installed' : `— ~${model.approxSizeMb} MB download`}
        <div style={{ opacity: 0.7 }}>{model.displayName} — {model.description}</div>
        {inFlight && (
          <div style={{ marginTop: 4 }}>
            <div>{download.currentFile} ({download.filesDone}/{download.totalFiles}) {pct !== null ? `${pct}%` : ''}</div>
            <progress max={download.totalBytes || 1} value={download.bytesDownloaded} />
          </div>
        )}
        {errored && <div style={{ color: 'red', marginTop: 4 }}>{(download as { message: string }).message}</div>}
      </div>
      <button onClick={() => void props.onStart()} disabled={model.installed || inFlight}>
        {model.installed ? 'Installed' : inFlight ? 'Downloading…' : 'Download'}
      </button>
    </div>
  );
}
