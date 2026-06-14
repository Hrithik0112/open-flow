import { useEffect, useState } from 'react';

interface Status {
  microphone: string;
  inputMonitoring: string;
  accessibility: string;
}

export function Onboarding(): JSX.Element {
  const [status, setStatus] = useState<Status | null>(null);

  async function refresh(): Promise<void> {
    const s = (await window.openFlow.permissions.status()) as Status;
    setStatus(s);
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!status) return <div className="page">Loading…</div>;

  return (
    <div className="page">
      <h1>Welcome to open-flow</h1>
      <p>open-flow needs three macOS permissions to do its job. Grant each one, then you are ready to dictate.</p>

      <Step
        title="Microphone"
        body="open-flow records audio while you hold the hotkey. Nothing leaves your machine."
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

      <div className="row">
        <button onClick={refresh}>Re-check permissions</button>
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
