import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { DictionaryRule, Settings, WhisperModelId } from '@open-flow/shared';

const api = {
  settings: {
    load: (): Promise<Settings> => ipcRenderer.invoke('settings:load'),
    save: (s: Settings): Promise<boolean> => ipcRenderer.invoke('settings:save', s),
  },
  dictionary: {
    load: (): Promise<DictionaryRule[]> => ipcRenderer.invoke('dictionary:load'),
    save: (r: DictionaryRule[]): Promise<boolean> => ipcRenderer.invoke('dictionary:save', r),
  },
  history: {
    list: (limit?: number): Promise<unknown[]> => ipcRenderer.invoke('history:list', limit),
  },
  models: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke('models:list'),
    install: (id: WhisperModelId): Promise<boolean> => ipcRenderer.invoke('models:install', id),
    onProgress: (fn: (msg: { fraction: number; message: string }) => void): (() => void) => {
      const handler = (_e: IpcRendererEvent, msg: { fraction: number; message: string }): void => fn(msg);
      ipcRenderer.on('model:progress', handler);
      return () => ipcRenderer.removeListener('model:progress', handler);
    },
    onLoaded: (fn: (msg: { name: string }) => void): (() => void) => {
      const handler = (_e: IpcRendererEvent, msg: { name: string }): void => fn(msg);
      ipcRenderer.on('model:loaded', handler);
      return () => ipcRenderer.removeListener('model:loaded', handler);
    },
    onError: (fn: (msg: { code: string; message: string }) => void): (() => void) => {
      const handler = (_e: IpcRendererEvent, msg: { code: string; message: string }): void => fn(msg);
      ipcRenderer.on('model:error', handler);
      return () => ipcRenderer.removeListener('model:error', handler);
    },
  },
  permissions: {
    status: (): Promise<unknown> => ipcRenderer.invoke('permissions:status'),
    requestMicrophone: (): Promise<boolean> => ipcRenderer.invoke('permissions:requestMicrophone'),
    promptAccessibility: (): Promise<boolean> => ipcRenderer.invoke('permissions:promptAccessibility'),
    openPane: (kind: 'microphone' | 'inputMonitoring' | 'accessibility'): Promise<boolean> =>
      ipcRenderer.invoke('permissions:openPane', kind),
  },
  sidecarPermissions: {
    check: (): Promise<boolean> => ipcRenderer.invoke('sidecar:permissions:check'),
    requestMicrophone: (): Promise<boolean> =>
      ipcRenderer.invoke('sidecar:permissions:requestMicrophone'),
    requestInputMonitoring: (): Promise<boolean> =>
      ipcRenderer.invoke('sidecar:permissions:requestInputMonitoring'),
    promptAccessibility: (): Promise<boolean> =>
      ipcRenderer.invoke('sidecar:permissions:promptAccessibility'),
    onUpdate: (
      fn: (msg: {
        microphone: string;
        inputMonitoring: string;
        accessibility: string;
        binaryPath: string;
      }) => void,
    ): (() => void) => {
      const handler = (
        _e: IpcRendererEvent,
        msg: {
          microphone: string;
          inputMonitoring: string;
          accessibility: string;
          binaryPath: string;
        },
      ): void => fn(msg);
      ipcRenderer.on('sidecar:permissions', handler);
      return () => ipcRenderer.removeListener('sidecar:permissions', handler);
    },
  },
  window: {
    open: (route: 'status' | 'onboarding' | 'settings' | 'dictionary' | 'history'): Promise<boolean> =>
      ipcRenderer.invoke('window:open', route),
  },
  app: {
    onNavigate: (
      fn: (msg: { route: 'status' | 'onboarding' | 'settings' | 'dictionary' | 'history' }) => void,
    ): (() => void) => {
      const handler = (
        _e: IpcRendererEvent,
        msg: { route: 'status' | 'onboarding' | 'settings' | 'dictionary' | 'history' },
      ): void => fn(msg);
      ipcRenderer.on('app:navigate', handler);
      return () => ipcRenderer.removeListener('app:navigate', handler);
    },
  },
  hotkey: {
    onEvent: (fn: (msg: { kind: 'pressed' | 'released'; at: number }) => void): (() => void) => {
      const handler = (
        _e: IpcRendererEvent,
        msg: { kind: 'pressed' | 'released'; at: number },
      ): void => fn(msg);
      ipcRenderer.on('hotkey:event', handler);
      return () => ipcRenderer.removeListener('hotkey:event', handler);
    },
  },
  hud: {
    onState: (fn: (msg: { state: 'recording' | 'transcribing' }) => void): (() => void) => {
      const handler = (_e: IpcRendererEvent, msg: { state: 'recording' | 'transcribing' }): void => fn(msg);
      ipcRenderer.on('hud:state', handler);
      return () => ipcRenderer.removeListener('hud:state', handler);
    },
    onLevels: (fn: (msg: { rms: number }) => void): (() => void) => {
      const handler = (_e: IpcRendererEvent, msg: { rms: number }): void => fn(msg);
      ipcRenderer.on('hud:levels', handler);
      return () => ipcRenderer.removeListener('hud:levels', handler);
    },
  },
};

contextBridge.exposeInMainWorld('openFlow', api);

export type OpenFlowApi = typeof api;
declare global {
  interface Window {
    openFlow: OpenFlowApi;
  }
}
