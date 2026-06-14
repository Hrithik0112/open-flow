import { Menu, Tray, app, nativeImage } from 'electron';
import { join } from 'node:path';

export interface TrayCallbacks {
  openSettings: () => void;
  openHistory: () => void;
  openDictionary: () => void;
  togglePaused: () => void;
  quit: () => void;
  isPaused: () => boolean;
}

export function createTray(cb: TrayCallbacks): Tray {
  const iconPath = join(app.getAppPath(), 'resources', 'tray-template.png');
  const image = nativeImage.createFromPath(iconPath);
  image.setTemplateImage(true);
  const tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.setToolTip('open-flow');
  rebuild(tray, cb);
  return tray;
}

export function rebuild(tray: Tray, cb: TrayCallbacks): void {
  const menu = Menu.buildFromTemplate([
    { label: 'Settings…', click: cb.openSettings },
    { label: 'Dictionary…', click: cb.openDictionary },
    { label: 'History…', click: cb.openHistory },
    { type: 'separator' },
    {
      label: cb.isPaused() ? 'Resume dictation' : 'Pause dictation',
      click: cb.togglePaused,
    },
    { type: 'separator' },
    { label: 'Quit open-flow', click: cb.quit },
  ]);
  tray.setContextMenu(menu);
}
