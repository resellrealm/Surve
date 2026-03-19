import { useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../lib/store';

export type ThemeColors = typeof Colors.light;
export type ColorScheme = 'light' | 'dark';

export function useTheme() {
  const systemScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const themePreference = useStore((s) => s.themePreference);

  const colorScheme: ColorScheme =
    themePreference === 'system' ? systemScheme : themePreference;
  const colors = Colors[colorScheme];

  return {
    colors,
    colorScheme,
    isDark: colorScheme === 'dark',
  };
}
