import { app } from 'electron';
import { join } from 'node:path';

export const dataDir = (): string => join(app.getPath('appData'), 'open-flow');
export const settingsPath = (): string => join(dataDir(), 'settings.json');
export const dictionaryPath = (): string => join(dataDir(), 'dictionary.json');
export const historyDbPath = (): string => join(dataDir(), 'history.sqlite');
export const modelsDir = (): string => join(dataDir(), 'models');
export const logsDir = (): string => join(dataDir(), 'logs');

export const sidecarBinaryPath = (): string => {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'bin', 'open-flow-sidecar');
  }
  return join(app.getAppPath(), 'resources', 'bin', 'open-flow-sidecar');
};
