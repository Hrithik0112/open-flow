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
import { forwardSidecarEventToRenderers, registerRendererIpc } from './ipc.js';
import { downloadBase, isModelInstalled } from './models.js';
import { hideHud, sendHudLevels, setHudTranscribing, showHud } from './hud.js';

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
  sc.send({
    type: 'init',
    settings,
    dictionary,
    modelName: settings.model,
    downloadBase: downloadBase(),
  });
  if (isModelInstalled(settings.model)) {
    sc.send({ type: 'loadModel', modelName: settings.model, downloadBase: downloadBase() });
  }
  return sc;
}

function handleSidecarMessage(msg: Incoming): void {
  switch (msg.type) {
    case 'hotkey.pressed':
      forwardSidecarEventToRenderers('hotkey:event', { kind: 'pressed', at: msg.at });
      showHud();
      break;
    case 'hotkey.released':
      forwardSidecarEventToRenderers('hotkey:event', { kind: 'released', at: msg.at });
      setHudTranscribing();
      break;
    case 'recording.levels':
      sendHudLevels(msg.rms);
      break;
    case 'recording.maxDurationReached':
      setHudTranscribing();
      break;
    case 'transcribe.complete': {
      hideHud();
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
    case 'model.progress':
      forwardSidecarEventToRenderers('model:progress', {
        fraction: msg.fraction,
        message: msg.message,
      });
      break;
    case 'model.loaded':
      forwardSidecarEventToRenderers('model:loaded', { name: msg.name });
      console.log(`[sidecar] model loaded: ${msg.name}`);
      break;
    case 'permissions':
      forwardSidecarEventToRenderers('sidecar:permissions', {
        microphone: msg.microphone,
        inputMonitoring: msg.inputMonitoring,
        accessibility: msg.accessibility,
        binaryPath: msg.binaryPath,
      });
      console.log(
        `[sidecar] permissions mic=${msg.microphone} input=${msg.inputMonitoring} accessibility=${msg.accessibility}`,
      );
      break;
    case 'error':
      hideHud();
      forwardSidecarEventToRenderers('model:error', { code: msg.code, message: msg.message });
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

  const callbacks = {
    openStatus: () => openRoute('status'),
    openSettings: () => openRoute('settings'),
    openDictionary: () => openRoute('dictionary'),
    openHistory: () => openRoute('history'),
    togglePaused: () => {
      paused = !paused;
      if (tray) rebuildTrayMenu(tray, callbacks);
    },
    quit: () => app.quit(),
    isPaused: () => paused,
  };
  tray = createTray(callbacks);

  const settings = loadSettings();
  openRoute(isModelInstalled(settings.model) ? 'status' : 'onboarding');
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
    openRoute('status');
  }
});
