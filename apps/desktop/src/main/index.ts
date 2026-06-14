import { app, BrowserWindow, Tray } from 'electron';
import { mkdirSync } from 'node:fs';
import { type Incoming } from '@open-flow/shared';
import {
  appendHistory,
  closeDb,
  loadDictionary,
  loadSettings,
} from './store.js';
import { dataDir, logsDir, modelsDir } from './paths.js';
import { Sidecar } from './sidecar.js';
import { createTray, rebuild as rebuildTrayMenu } from './tray.js';
import { openRoute } from './windows.js';
import { registerRendererIpc } from './ipc.js';
import { isModelInstalled, modelDirFor } from './models.js';

let tray: Tray | null = null;
let sidecar: Sidecar | null = null;
let paused = false;

function ensureDirs(): void {
  mkdirSync(dataDir(), { recursive: true });
  mkdirSync(modelsDir(), { recursive: true });
  mkdirSync(logsDir(), { recursive: true });
}

function startSidecar(): Sidecar {
  const sc = new Sidecar();
  sc.on('message', (msg: Incoming) => {
    handleSidecarMessage(msg);
  });
  sc.on('log', (line: string) => {
    console.log('[sidecar]', line);
  });
  sc.on('childError', (err: Error) => {
    console.error('[sidecar] spawn error:', err);
  });
  sc.on('fatal', (err: Error) => {
    console.error('[sidecar] fatal:', err.message);
  });
  sc.start();

  const settings = loadSettings();
  const dictionary = loadDictionary();
  const modelPath = isModelInstalled(settings.model) ? modelDirFor(settings.model) : '';
  sc.send({ type: 'init', settings, dictionary, modelPath });
  return sc;
}

function handleSidecarMessage(msg: Incoming): void {
  switch (msg.type) {
    case 'transcribe.complete': {
      const settings = loadSettings();
      if (settings.historyEnabled) {
        appendHistory({
          timestamp: Date.now(),
          rawText: msg.rawText,
          finalText: msg.text,
          durationMs: msg.durationMs,
          bundleId: msg.bundleId,
          model: settings.model,
        });
      }
      break;
    }
    case 'error':
      console.error(`[sidecar] ${msg.code}: ${msg.message}`);
      break;
    case 'model.missing':
      console.warn(`[sidecar] model missing: ${msg.wanted}`);
      break;
    default:
      break;
  }
}

app.whenReady().then(() => {
  ensureDirs();
  sidecar = startSidecar();
  registerRendererIpc(sidecar);

  tray = createTray({
    openSettings: () => openRoute('settings'),
    openDictionary: () => openRoute('dictionary'),
    openHistory: () => openRoute('history'),
    togglePaused: () => {
      paused = !paused;
      if (tray) {
        rebuildTrayMenu(tray, {
          openSettings: () => openRoute('settings'),
          openDictionary: () => openRoute('dictionary'),
          openHistory: () => openRoute('history'),
          togglePaused: () => {
            paused = !paused;
          },
          quit: () => app.quit(),
          isPaused: () => paused,
        });
      }
    },
    quit: () => app.quit(),
    isPaused: () => paused,
  });

  const settings = loadSettings();
  if (!isModelInstalled(settings.model)) {
    openRoute('onboarding');
  }
});

app.on('window-all-closed', () => {
  // Keep the app alive when all windows close; the tray remains.
});

app.on('before-quit', () => {
  sidecar?.shutdown();
  closeDb();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    openRoute('settings');
  }
});
