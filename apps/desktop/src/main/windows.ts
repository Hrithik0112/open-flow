import { BrowserWindow } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const RENDERER_DEV_URL = process.env['ELECTRON_RENDERER_URL'];

type Route = 'onboarding' | 'settings' | 'dictionary' | 'history';

const cache = new Map<Route, BrowserWindow>();

export function openRoute(route: Route): BrowserWindow {
  const existing = cache.get(route);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return existing;
  }

  const win = new BrowserWindow({
    width: 720,
    height: 520,
    title: titleFor(route),
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (RENDERER_DEV_URL) {
    void win.loadURL(`${RENDERER_DEV_URL}#${route}`);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: route });
  }

  win.on('ready-to-show', () => win.show());
  win.on('closed', () => cache.delete(route));
  cache.set(route, win);
  return win;
}

function titleFor(route: Route): string {
  switch (route) {
    case 'onboarding':
      return 'Welcome to open-flow';
    case 'settings':
      return 'open-flow Settings';
    case 'dictionary':
      return 'Dictionary';
    case 'history':
      return 'Dictation History';
  }
}
