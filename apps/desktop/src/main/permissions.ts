import { shell, systemPreferences } from 'electron';

export type PermissionKind = 'microphone' | 'inputMonitoring' | 'accessibility';

export interface PermissionStatus {
  microphone: 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown';
  inputMonitoring: 'granted' | 'denied' | 'unknown';
  accessibility: 'granted' | 'denied' | 'unknown';
}

export function getStatus(): PermissionStatus {
  const microphone = systemPreferences.getMediaAccessStatus('microphone') as PermissionStatus['microphone'];
  const accessibility = systemPreferences.isTrustedAccessibilityClient(false) ? 'granted' : 'denied';
  return {
    microphone,
    inputMonitoring: 'unknown',
    accessibility,
  };
}

export async function requestMicrophone(): Promise<boolean> {
  return systemPreferences.askForMediaAccess('microphone');
}

export function promptAccessibility(): void {
  systemPreferences.isTrustedAccessibilityClient(true);
}

const SETTINGS_URLS: Record<PermissionKind, string> = {
  microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
  inputMonitoring: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent',
  accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
};

export function openSettingsPane(kind: PermissionKind): void {
  void shell.openExternal(SETTINGS_URLS[kind]);
}
