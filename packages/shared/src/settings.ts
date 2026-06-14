export type HotkeyMode = 'pushToTalk' | 'toggle';

export interface HotkeyBinding {
  keycode: number;
  modifiers: number;
  mode: HotkeyMode;
}

export type WhisperModelId =
  | 'openai_whisper-tiny.en'
  | 'openai_whisper-base.en'
  | 'openai_whisper-small.en';

export interface DictionaryRule {
  from: string;
  to: string;
  caseSensitive: boolean;
  wholeWord: boolean;
}

export interface Settings {
  hotkey: HotkeyBinding;
  model: WhisperModelId;
  maxRecordingSeconds: number;
  historyEnabled: boolean;
  showRecordingHud: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  hotkey: {
    keycode: 61,
    modifiers: 0,
    mode: 'pushToTalk',
  },
  model: 'openai_whisper-base.en',
  maxRecordingSeconds: 60,
  historyEnabled: true,
  showRecordingHud: true,
};
