import { contextBridge, ipcRenderer } from 'electron';
import type { DictionaryRule, Settings } from '@open-flow/shared';

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
  },
  permissions: {
    status: (): Promise<unknown> => ipcRenderer.invoke('permissions:status'),
    requestMicrophone: (): Promise<boolean> => ipcRenderer.invoke('permissions:requestMicrophone'),
    promptAccessibility: (): Promise<boolean> => ipcRenderer.invoke('permissions:promptAccessibility'),
    openPane: (kind: 'microphone' | 'inputMonitoring' | 'accessibility'): Promise<boolean> =>
      ipcRenderer.invoke('permissions:openPane', kind),
  },
  window: {
    open: (route: 'onboarding' | 'settings' | 'dictionary' | 'history'): Promise<boolean> =>
      ipcRenderer.invoke('window:open', route),
  },
};

contextBridge.exposeInMainWorld('openFlow', api);

export type OpenFlowApi = typeof api;
declare global {
  interface Window {
    openFlow: OpenFlowApi;
  }
}
