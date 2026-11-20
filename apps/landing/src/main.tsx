import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const REPO = 'https://github.com/Hrithik0112/open-flow';
const INSTALL =
  'git clone https://github.com/Hrithik0112/open-flow.git\ncd open-flow\npnpm install\npnpm build:sidecar\npnpm dev';
const EXAMPLES = [
  {
    tab: 'A quick note',
    title: 'A little room to think',
    before: 'For tomorrow',
    text: 'Let’s keep the first version simple. Make it useful, get feedback, and build from there.',
  },
  {
    tab: 'An email',
    title: 'A thoughtful follow-up',
    before: 'Hey team,',
    text: 'Thanks for the conversation today. I’ll put together a few ideas and share them tomorrow morning.',
  },
  {
    tab: 'An idea',
    title: 'Catch it while it’s fresh',
    before: 'Something to explore',
    text: 'What if the best writing tool just got out of the way and let you finish your thought?',
  },
];
const FAQ = [
  [
    'Does my audio leave my Mac?',
    'Speech is recorded and transcribed on your Mac using WhisperKit. The initial speech-model download needs an internet connection; transcription runs locally after that.',
  ],
  [
    'Which Macs can run it?',
    'open-flow targets Apple Silicon Macs running macOS 13 or later. The source build requires Node.js 22 (22.12 or newer), pnpm 10.33.3, and Swift 5.10 or newer. Intel Mac and Windows builds are not currently provided by this project.',
  ],
  [
    'Why does it need three permissions?',
    'Microphone lets the app hear you. Input Monitoring detects the dictation hotkey while you use other apps. Accessibility lets it paste your transcript into the focused text field. Setup walks you through these permissions.',
  ],
  [
    'Can I change the hotkey or use hands-free recording?',
    'Yes. Settings lets you configure the hotkey and switch between hold-to-talk and toggle mode. In toggle mode, press once to start and again to stop.',
  ],
  [
    'What gets saved?',
    'Transcript history is stored locally on your Mac. You can delete entries or turn history off in Settings. Dictionary rules and app settings are also stored locally.',
  ],
  [
    'The hotkey works, but nothing gets pasted. What should I check?',
    'Make sure a text field is focused and Accessibility permission is granted. If recording will not start, check Microphone and Input Monitoring in the app’s Status screen. After rebuilding the native helper, macOS may require you to grant its permissions again.',
  ],
  [
    'Do I need to download a model first?',
    'Yes. Choose and install a model during setup before dictating. The app offers tiny, base, and small English Whisper models. Larger models trade more disk space and processing time for potential accuracy improvements.',
  ],
];

function Mark(): JSX.Element {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function Demo(): JSX.Element {
  const [selected, setSelected] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'listening' | 'transcribing' | 'done'>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function reset(index: number): void {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSelected(index);
    setPhase('idle');
  }
  function play(): void {
    timers.current.forEach(clearTimeout);
    setPhase('listening');
    timers.current = [
      setTimeout(() => setPhase('transcribing'), 1800),
      setTimeout(() => setPhase('done'), 2800),
    ];
  }
  const example = EXAMPLES[selected]!;
  return (
    <div className="demo" id="preview">
      <div className="demo-toolbar">
        <span className="window-controls" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>A thought, uninterrupted</span>
        <span className="demo-tag">Product preview</span>
      </div>
      <div className="demo-tabs" role="group" aria-label="Preview examples">
        {EXAMPLES.map((item, index) => (
          <button key={item.tab} aria-pressed={selected === index} onClick={() => reset(index)}>
            {item.tab}
          </button>
        ))}
      </div>
      <div className="demo-paper">
        <span className="paper-label">YOUR SPACE TO WRITE</span>
        <h2>{example.title}</h2>
        <p className="paper-intro">{example.before}</p>
        <div className="demo-transcript" aria-live="polite">
          {phase === 'done' ? (
            <p>{example.text}</p>
          ) : (
            <p className="placeholder">
              Your next thought starts here.
              <span className="caret" />
            </p>
          )}
        </div>
      </div>
      <div className="demo-bottom">
        <div className="preview-hud" data-phase={phase} role="status">
          <span className="mini-wave" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} style={{ animationDelay: `${i * 130}ms` }} />
            ))}
          </span>
          <span>
            {phase === 'listening'
              ? 'Listening'
              : phase === 'transcribing'
                ? 'Transcribing'
                : phase === 'done'
                  ? 'Thought captured'
                  : 'Ready when you are'}
          </span>
          <span className="hud-light" />
        </div>
        <button
          className="demo-play"
          onClick={play}
          disabled={phase === 'listening' || phase === 'transcribing'}
        >
          {phase === 'done' ? 'Play again' : phase === 'idle' ? 'Play the demo' : 'Preview running'}
        </button>
      </div>
      <p className="demo-disclaimer">An illustrative preview. No microphone access or recording.</p>
    </div>
  );
}

function Setup(): JSX.Element {
  const [copyState, setCopyState] = useState('Copy commands');
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(INSTALL);
      setCopyState('Copied');
    } catch {
      setCopyState('Select the commands to copy');
    }
  }
  return (
    <section className="section setup" id="get-started">
      <div className="setup-copy">
        <p className="eyebrow">MAKE YOURSELF AT HOME</p>
        <h2>
          A few minutes of setup.
          <br />A little less typing.
        </h2>
        <p>Built for Apple Silicon. At home on macOS 13 and later.</p>
        <a className="button primary" href={`${REPO}#setup`}>
          Get the source on GitHub
        </a>
        <a className="text-link" href={`${REPO}/releases`}>
          Check available releases
        </a>
        <p className="small-note">
          Packaged downloads depend on release availability. You can build and run the app from
          source.
        </p>
      </div>
      <div className="setup-details">
        <div className="terminal">
          <div className="terminal-heading">
            <span>Build from source</span>
            <button onClick={() => void copy()} aria-live="polite">
              {copyState}
            </button>
          </div>
          <pre>
            <code>{INSTALL}</code>
          </pre>
          <p>Requires Node.js 22.12+, pnpm 10.33.3, and Swift 5.10+. Use Node 22.</p>
        </div>
        <ol className="setup-steps">
          <li>
            <strong>Give it permission.</strong>
            <span>Enable Microphone, Input Monitoring, and Accessibility.</span>
          </li>
          <li>
            <strong>Choose your model.</strong>
            <span>Download an English Whisper model in the app.</span>
          </li>
          <li>
            <strong>Find a text field. Find your flow.</strong>
            <span>Hold Right Option, speak, and release to paste.</span>
          </li>
        </ol>
      </div>
    </section>
  );
}

function App(): JSX.Element {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="open-flow home">
          <Mark />
          open-flow
        </a>
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#faq">FAQ</a>
          <a className="nav-cta" href="#get-started">
            Get started
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero section" id="home">
          <p className="eyebrow">YOUR VOICE. YOUR MAC. YOUR FLOW.</p>
          <h1>
            Less typing.
            <br />
            <span>More thinking.</span>
          </h1>
          <p className="hero-description">
            Turn your thoughts into text, right where you’re working. Hold a key, speak, and let
            your Mac do the typing.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#get-started">
              Get open-flow
            </a>
            <a className="button secondary" href="#preview">
              See it in action
            </a>
          </div>
          <p className="compatibility">
            Made for Apple Silicon <span aria-hidden="true">·</span> macOS 13+{' '}
            <span aria-hidden="true">·</span> Local transcription
          </p>
          <Demo />
        </section>
        <section className="section workflow" aria-label="How dictation works">
          <div>
            <kbd>⌥</kbd>
            <h3>Hold a key.</h3>
            <p>Right Option is your shortcut. Keep your cursor in the text field.</p>
          </div>
          <div>
            <span className="step-symbol" aria-hidden="true">
              “
            </span>
            <h3>Say your piece.</h3>
            <p>A quick reply or a whole train of thought. Speak naturally.</p>
          </div>
          <div>
            <span className="step-symbol text-cursor" aria-hidden="true">
              I
            </span>
            <h3>Keep going.</h3>
            <p>Release to transcribe and paste. Your focus stays where it belongs.</p>
          </div>
        </section>
        <section className="section features" id="features">
          <div className="section-heading">
            <p className="eyebrow">SMALL APP. MORE ROOM TO THINK.</p>
            <h2>
              Fits into your day.
              <br />
              Stays out of your way.
            </h2>
          </div>
          <div className="feature-layout">
            <article className="privacy-feature">
              <div className="privacy-art" aria-hidden="true">
                <div className="local-orbit">
                  <Mark />
                </div>
                <span>ON YOUR MAC</span>
              </div>
              <div>
                <h3>Your voice stays yours.</h3>
                <p>
                  WhisperKit transcribes on your Mac. Download a speech model once, then dictate
                  without a cloud transcription service.
                </p>
                <a className="text-link" href="#faq">
                  Read about privacy
                </a>
              </div>
            </article>
            <div className="feature-list">
              <article>
                <span className="feature-symbol" aria-hidden="true">
                  ⌘
                </span>
                <div>
                  <h3>Where you already write.</h3>
                  <p>
                    Paste into the focused text field in your editor, email, or notes. No switching
                    to a separate writing app.
                  </p>
                </div>
              </article>
              <article>
                <span className="feature-symbol" aria-hidden="true">
                  Aa
                </span>
                <div>
                  <h3>Your words, your rules.</h3>
                  <p>Add dictionary replacements for names, terms, and phrases you use often.</p>
                </div>
              </article>
              <article>
                <span className="feature-symbol" aria-hidden="true">
                  ↺
                </span>
                <div>
                  <h3>A thought worth keeping.</h3>
                  <p>
                    Revisit local transcript history. Delete entries or turn history off whenever
                    you like.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>
        <section className="quiet-break">
          <p>
            A shortcut for the words
            <br />
            you haven’t typed yet.
          </p>
          <span>
            Hold <kbd>right ⌥</kbd> to find your flow.
          </span>
        </section>
        <Setup />
        <section className="section faq" id="faq">
          <div className="section-heading">
            <p className="eyebrow">A FEW GOOD QUESTIONS</p>
            <h2>Before you dive in.</h2>
            <p>Setup, privacy, and the little things.</p>
          </div>
          <div className="faq-list">
            {FAQ.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="section site-footer">
        <a className="brand" href="#home">
          <Mark />
          open-flow
        </a>
        <p>A little less typing. A little more you.</p>
        <div>
          <a href={REPO}>GitHub</a>
          <a href={`${REPO}#setup`}>Documentation</a>
          <a href={`${REPO}/issues`}>Report an issue</a>
        </div>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
