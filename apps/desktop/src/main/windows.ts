import { BrowserWindow } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const RENDERER_DEV_URL = process.env['ELECTRON_RENDERER_URL'];

export type AppRoute = 'status' | 'onboarding' | 'settings' | 'dictionary' | 'history';

let mainWindow: BrowserWindow | null = null;

function loadRoute(win: BrowserWindow, route: AppRoute): void {
  if (RENDERER_DEV_URL) {
    void win.loadURL(`${RENDERER_DEV_URL}#${route}`);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: route });
  }
}

export function openRoute(route: AppRoute): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('app:navigate', { route });
    return mainWindow;
  }

  const win = new BrowserWindow({
    width: 980,
    height: 640,
    minWidth: 760,
    minHeight: 480,
    title: 'open-flow',
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadRoute(win, route);
  win.on('ready-to-show', () => win.show());
  win.on('closed', () => {
    mainWindow = null;
  });

  mainWindow = win;
  return win;
}
