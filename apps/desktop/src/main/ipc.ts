import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import {
  loadDictionary,
  loadSettings,
  saveDictionary,
  saveSettings,
  listHistory,
} from './store.js';
import {
  MODEL_MANIFEST,
  downloadModel,
  isModelInstalled,
  modelDirFor,
} from './models.js';
import { getStatus, openSettingsPane, promptAccessibility, requestMicrophone } from './permissions.js';
import { openRoute } from './windows.js';
import type { DictionaryRule, Settings, WhisperModelId } from '@open-flow/shared';
import type { Sidecar } from './sidecar.js';

export function registerRendererIpc(sidecar: Sidecar): void {
  ipcMain.handle('settings:load', () => loadSettings());
  ipcMain.handle('settings:save', (_e: IpcMainInvokeEvent, settings: Settings) => {
    saveSettings(settings);
    sidecar.send({ type: 'setHotkey', hotkey: settings.hotkey });
    return true;
  });

  ipcMain.handle('dictionary:load', () => loadDictionary());
  ipcMain.handle('dictionary:save', (_e: IpcMainInvokeEvent, rules: DictionaryRule[]) => {
    saveDictionary(rules);
    sidecar.send({ type: 'setDictionary', rules });
    return true;
  });

  ipcMain.handle('history:list', (_e: IpcMainInvokeEvent, limit?: number) => listHistory(limit));

  ipcMain.handle('models:list', () =>
    MODEL_MANIFEST.map((m) => ({ ...m, installed: isModelInstalled(m.id) })),
  );

  ipcMain.handle('models:download', async (event: IpcMainInvokeEvent, id: WhisperModelId) => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    const emit = (msg: unknown): void => {
      sender?.webContents.send('models:download:progress', msg);
    };
    try {
      await downloadModel(id, (p) => emit({ kind: 'progress', id, ...p }));
      sidecar.send({ type: 'loadModel', modelPath: modelDirFor(id) });
      emit({ kind: 'done', id });
      return { ok: true } as const;
    } catch (err) {
      emit({ kind: 'error', id, message: (err as Error).message });
      return { ok: false, message: (err as Error).message } as const;
    }
  });

  ipcMain.handle('permissions:status', () => getStatus());
  ipcMain.handle('permissions:requestMicrophone', () => requestMicrophone());
  ipcMain.handle('permissions:promptAccessibility', () => {
    promptAccessibility();
    return true;
  });
  ipcMain.handle('permissions:openPane', (_e, kind: 'microphone' | 'inputMonitoring' | 'accessibility') => {
    openSettingsPane(kind);
    return true;
  });

  ipcMain.handle('window:open', (_e, route: 'onboarding' | 'settings' | 'dictionary' | 'history') => {
    openRoute(route);
    return true;
  });
}
