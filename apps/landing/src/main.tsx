import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const HIGHLIGHTS = [
  {
    title: 'Local by default',
    body: 'Audio stays on your Mac. The native sidecar records, transcribes with local Whisper models, and injects text back into the focused app.',
  },
  {
    title: 'One hotkey',
    body: 'Use push-to-talk for short dictation or toggle mode for longer thoughts. The HUD gives quiet feedback while you speak.',
  },
  {
    title: 'Learns your wording',
    body: 'Dictionary replacements and local history make names, commands, punctuation, and repeated phrases easier to get right.',
  },
];

const SETUP_STEPS = [
  'Download or build the macOS app',
  'Grant Microphone, Input Monitoring, and Accessibility',
  'Install a local Whisper model',
  'Hold the hotkey and speak anywhere',
];

const DOC_STEPS = [
  {
    title: 'Download',
    body: 'Use the packaged macOS build when available. For source builds, clone the repo and install dependencies with pnpm.',
    command: 'pnpm install',
  },
  {
    title: 'Build the sidecar',
    body: 'The sidecar handles hotkeys, microphone capture, permissions, transcription, and text injection.',
    command: 'pnpm build:sidecar',
  },
  {
    title: 'Run desktop app',
    body: 'Start the Electron app in development, then complete onboarding from inside the app.',
    command: 'pnpm dev',
  },
];

const TROUBLESHOOTING = [
  {
    issue: 'Hotkey does not start recording',
    fix: 'Open Status and confirm Input Monitoring is granted for the current sidecar binary.',
  },
  {
    issue: 'Transcript does not paste',
    fix: 'Confirm Accessibility is granted. After rebuilds, macOS may need the sidecar removed and re-added.',
  },
  {
    issue: 'Model is missing',
    fix: 'Open Onboarding or Settings and install the selected Whisper model before dictating.',
  },
];

function App(): JSX.Element {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="open-flow home">
          <span className="brand-mark" />
          <span>open-flow</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#docs">Docs</a>
          <a href="#download">Download</a>
        </nav>
      </header>

      <main>
        <Home />
        <Docs />
      </main>
    </>
  );
}

function Home(): JSX.Element {
  return (
    <section className="hero section" id="home">
      <div className="hero-copy">
        <div className="eyebrow">Local macOS dictation</div>
        <h1>Hold a key. Say it once. Keep writing.</h1>
        <p>
          open-flow is a private voice layer for your Mac. It captures speech locally, transcribes
          with Whisper, and places clean text into whatever app already has focus.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href="#download">Get started</a>
          <a className="button" href="#docs">Read the docs</a>
        </div>
      </div>

      <div className="dictation-card" aria-label="Dictation preview">
        <div className="dictation-status">
          <span className="pulse-dot" />
          <span>Listening</span>
        </div>
        <div className="waveform" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <p>“Turn this thought into an implementation note and paste it into the editor.”</p>
      </div>

      <div className="feature-grid" aria-label="Product highlights">
        {HIGHLIGHTS.map((item) => (
          <article className="feature-card" key={item.title}>
            <div className="eyebrow">{item.title}</div>
            <p>{item.body}</p>
          </article>
        ))}
      </div>

      <section className="flow-panel">
        <div>
          <div className="eyebrow">Setup flow</div>
          <h2>Designed around the same checks as the desktop app.</h2>
        </div>
        <div className="flow-list">
          {SETUP_STEPS.map((step, index) => (
            <div className="flow-step" key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function Docs(): JSX.Element {
  return (
    <section className="section docs" id="docs">
      <div className="section-heading">
        <div className="eyebrow">Documentation</div>
        <h2>Install, set up, and use open-flow.</h2>
        <p>
          These are the public docs for the app: how to download, how to run from source, and what
          to check when permissions or models need attention.
        </p>
      </div>

      <div className="download-panel" id="download">
        <div>
          <div className="eyebrow">Download</div>
          <h3>Use a release build or run locally.</h3>
          <p>
            For normal use, download the packaged macOS app from releases when available. For
            development, run the project from source with the commands below.
          </p>
        </div>
        <code>pnpm install && pnpm build:sidecar && pnpm dev</code>
      </div>

      <div className="doc-grid">
        {DOC_STEPS.map((step) => (
          <article className="doc-card" key={step.title}>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            <code>{step.command}</code>
          </article>
        ))}
      </div>

      <div className="usage-panel">
        <div>
          <div className="eyebrow">How to use</div>
          <h3>Dictate from any focused text field.</h3>
        </div>
        <ul>
          <li>Open Onboarding and grant Microphone, Input Monitoring, and Accessibility.</li>
          <li>Install the default Whisper model or choose another model in Settings.</li>
          <li>Focus a text field, hold the configured hotkey, speak, then release.</li>
          <li>Use Dictionary rules to clean up names, punctuation, and repeated phrases.</li>
        </ul>
      </div>

      <div className="fix-list" aria-label="Troubleshooting">
        {TROUBLESHOOTING.map((item) => (
          <article className="fix-card" key={item.issue}>
            <strong>{item.issue}</strong>
            <p>{item.fix}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
