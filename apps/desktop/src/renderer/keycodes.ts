// Mapping from browser KeyboardEvent.code to macOS virtual keycode + label.
// Restricted to keys that make sense for push-to-talk dictation: modifiers
// (left/right Option/Command/Control/Shift) and extended function keys (F13-F19).
//
// Reasons other keys aren't in the table:
//   - F1-F12 default to system actions (brightness, Mission Control, media).
//     The user would have to enable "Use F1, F2, etc. as standard function keys".
//   - Letter/number keys would block typing that character everywhere.
//   - Caps Lock is a latching key; macOS doesn't deliver normal keydown events for it.
//   - Fn (Globe) is not exposed by browsers and macOS uses double-tap fn for built-in dictation.
//   - Brightness/volume/media keys are routed to the OS before event taps see them.

export interface SupportedKey {
  code: number;
  label: string;
  category: 'modifier' | 'function';
}

export const SUPPORTED_KEYS: Record<string, SupportedKey> = {
  AltLeft: { code: 58, label: 'Left Option', category: 'modifier' },
  AltRight: { code: 61, label: 'Right Option', category: 'modifier' },
  ShiftLeft: { code: 56, label: 'Left Shift', category: 'modifier' },
  ShiftRight: { code: 60, label: 'Right Shift', category: 'modifier' },
  ControlLeft: { code: 59, label: 'Left Control', category: 'modifier' },
  ControlRight: { code: 62, label: 'Right Control', category: 'modifier' },
  MetaLeft: { code: 55, label: 'Left Command', category: 'modifier' },
  MetaRight: { code: 54, label: 'Right Command', category: 'modifier' },
  F13: { code: 105, label: 'F13', category: 'function' },
  F14: { code: 107, label: 'F14', category: 'function' },
  F15: { code: 113, label: 'F15', category: 'function' },
  F16: { code: 106, label: 'F16', category: 'function' },
  F17: { code: 64, label: 'F17', category: 'function' },
  F18: { code: 79, label: 'F18', category: 'function' },
  F19: { code: 80, label: 'F19', category: 'function' },
};

export function lookupBrowserKey(code: string): SupportedKey | null {
  return SUPPORTED_KEYS[code] ?? null;
}

export function labelForKeycode(code: number): string {
  for (const entry of Object.values(SUPPORTED_KEYS)) {
    if (entry.code === code) return entry.label;
  }
  return `Keycode ${code}`;
}

export interface CaptureFailure {
  kind: 'unsupported' | 'system' | 'typing';
  reason: string;
}

const SYSTEM_OR_LETTER_REASONS: Record<string, CaptureFailure> = {
  CapsLock: { kind: 'system', reason: 'Caps Lock is a latching key — macOS does not deliver normal keydown events for it.' },
  Escape: { kind: 'system', reason: 'Escape is reserved.' },
  Tab: { kind: 'system', reason: 'Tab would block tabbing in every app.' },
  Space: { kind: 'typing', reason: 'Space would block typing spaces everywhere.' },
  Enter: { kind: 'typing', reason: 'Return would block submitting in every app.' },
  Backspace: { kind: 'typing', reason: 'Delete would block backspace everywhere.' },
};

export function describeRejection(code: string): CaptureFailure {
  const known = SYSTEM_OR_LETTER_REASONS[code];
  if (known) return known;
  if (/^Key[A-Z]$/.test(code) || /^Digit\d$/.test(code)) {
    return { kind: 'typing', reason: `${code} would block typing that character. Pick a modifier or F13-F19 instead.` };
  }
  if (/^F([1-9]|1[0-2])$/.test(code)) {
    return {
      kind: 'system',
      reason: `${code} defaults to a macOS system action (brightness, Mission Control, media). Pick F13-F19 instead.`,
    };
  }
  return {
    kind: 'unsupported',
    reason: `${code} is not a supported binding. Pick a modifier (Option, Command, Control, Shift) or F13-F19.`,
  };
}
