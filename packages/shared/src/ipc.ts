import type { DictionaryRule, HotkeyBinding, Settings } from './settings.js';

export type Outgoing =
  | { type: 'init'; id?: string; settings: Settings; dictionary: DictionaryRule[]; modelName: string; downloadBase: string }
  | { type: 'setHotkey'; id?: string; hotkey: HotkeyBinding }
  | { type: 'setDictionary'; id?: string; rules: DictionaryRule[] }
  | { type: 'loadModel'; id?: string; modelName: string; downloadBase: string }
  | { type: 'injectText'; id?: string; text: string }
  | { type: 'permissions.check'; id?: string }
  | { type: 'permissions.requestMicrophone'; id?: string }
  | { type: 'permissions.requestInputMonitoring'; id?: string }
  | { type: 'permissions.promptAccessibility'; id?: string }
  | { type: 'shutdown'; id?: string };

export type Incoming =
  | { type: 'ready' }
  | { type: 'hotkey.pressed'; at: number }
  | { type: 'hotkey.released'; at: number }
  | { type: 'recording.levels'; rms: number }
  | { type: 'recording.maxDurationReached' }
  | {
      type: 'transcribe.complete';
      text: string;
      rawText: string;
      language: string;
      durationMs: number;
      bundleId: string | null;
    }
  | { type: 'model.progress'; fraction: number; message: string }
  | { type: 'model.loaded'; name: string }
  | { type: 'model.missing'; wanted: string }
  | {
      type: 'permissions';
      microphone: SidecarPermissionStatus;
      inputMonitoring: SidecarPermissionStatus;
      accessibility: SidecarPermissionStatus;
      binaryPath: string;
    }
  | { type: 'error'; code: ErrorCode; message: string };

export type SidecarPermissionStatus =
  | 'granted'
  | 'denied'
  | 'notDetermined'
  | 'restricted'
  | 'unknown';

export type ErrorCode =
  | 'permission.inputMonitoring'
  | 'permission.microphone'
  | 'permission.accessibility'
  | 'model.loadFailed'
  | 'model.notFound'
  | 'audio.captureFailed'
  | 'transcribe.failed'
  | 'inject.failed'
  | 'protocol.invalid'
  | 'internal';

export function encode(msg: Outgoing | Incoming): string {
  return JSON.stringify(msg) + '\n';
}

export function decode(line: string): Outgoing | Incoming | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.type === 'string') {
      return parsed as Outgoing | Incoming;
    }
    return null;
  } catch {
    return null;
  }
}
