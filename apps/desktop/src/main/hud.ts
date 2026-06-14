import { BrowserWindow, screen } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const RENDERER_DEV_URL = process.env['ELECTRON_RENDERER_URL'];

const HUD_WIDTH = 280;
const HUD_HEIGHT = 72;

let hud: BrowserWindow | null = null;

function ensureHud(): BrowserWindow {
  if (hud && !hud.isDestroyed()) return hud;

  hud = new BrowserWindow({
    width: HUD_WIDTH,
    height: HUD_HEIGHT,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: false,
    fullscreenable: false,
    show: false,
    hasShadow: true,
    acceptFirstMouse: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Keep the HUD visible across spaces and above fullscreen apps.
  hud.setAlwaysOnTop(true, 'screen-saver');
  hud.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (RENDERER_DEV_URL) {
    void hud.loadURL(`${RENDERER_DEV_URL}#hud`);
  } else {
    void hud.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'hud' });
  }

  hud.on('closed', () => {
    hud = null;
  });

  return hud;
}

function positionAboveActiveScreen(win: BrowserWindow): void {
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { x, y, width } = display.workArea;
  const targetX = x + Math.floor((width - HUD_WIDTH) / 2);
  const targetY = y + 48;
  win.setPosition(targetX, targetY);
}

export function showHud(): void {
  const win = ensureHud();
  positionAboveActiveScreen(win);
  win.showInactive();
  win.webContents.send('hud:state', { state: 'recording' });
}

export function setHudTranscribing(): void {
  const win = hud;
  if (!win || win.isDestroyed()) return;
  win.webContents.send('hud:state', { state: 'transcribing' });
}

export function hideHud(): void {
  if (!hud || hud.isDestroyed()) return;
  hud.hide();
}

export function sendHudLevels(rms: number): void {
  if (!hud || hud.isDestroyed() || !hud.isVisible()) return;
  hud.webContents.send('hud:levels', { rms });
}