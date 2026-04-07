import { createMMKV, type MMKV } from 'react-native-mmkv';

export const storage: MMKV = createMMKV({ id: 'surve-app' });

// Theme persistence
export function getStoredTheme(): 'light' | 'dark' | 'system' {
  const val = storage.getString('themePreference');
  if (val === 'light' || val === 'dark' || val === 'system') return val;
  return 'system';
}

export function setStoredTheme(theme: 'light' | 'dark' | 'system') {
  storage.set('themePreference', theme);
}

// Notifications persistence
export function getStoredNotifications(): boolean {
  try {
    const val = storage.getBoolean('notificationsEnabled');
    return val ?? true;
  } catch {
    return true;
  }
}

export function setStoredNotifications(enabled: boolean) {
  storage.set('notificationsEnabled', enabled);
}
