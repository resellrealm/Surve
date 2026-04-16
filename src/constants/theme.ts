import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Surve — Uber-like dark with blue accent palette
// Premium, clean, professional creator-business platform
export const Colors = {
  light: {
    // WCAG AA audit (body >=4.5:1, large >=3:1) — see S115
    primary: '#2c428f',          // onPrimary #FFF on primary: 9.20:1 — AA pass
    primaryLight: '#3a4f99',     // on surface: 7.61:1, on bg: 6.88:1 — AA pass
    primaryDark: '#111d4a',      // on surface: 16.17:1 — AA pass
    secondary: '#059669',        // icon/non-text only — 3.77:1 on surface (WCAG 1.4.11 non-text 3:1 pass)
    secondaryLight: '#6EE7B7',   // decorative background only — not used as text
    accent: '#2c428f',           // same as primary — AA pass
    background: '#F4F3F4',       // text #000 on bg: 18.97:1 — AA pass
    surface: '#FFFFFF',          // text #000 on surface: 21:1 — AA pass
    surfaceSecondary: '#ECECEC',
    text: '#000000',
    textSecondary: '#595F6A',    // on bg: 5.80:1, on surface: 6.42:1 — AA body pass (was #6B7280, 4.37:1 bg fail)
    textTertiary: '#696F7C',     // on bg: 4.55:1, on surface: 5.04:1 — AA body pass (was #737885 3.99:1 body fail)
    border: '#E5E5E5',
    borderLight: '#F0F0F0',
    error: '#DC2626',            // on surface: 4.83:1 — AA body pass
    errorLight: '#FEF2F2',
    warning: '#B45309',          // on surface: 5.02:1 — AA body pass (was #D97706 3.19:1 body fail)
    warningLight: '#FFFBEB',
    success: '#047857',          // on surface: 5.48:1 — AA body pass (was #059669 3.77:1 body fail)
    successLight: '#ECFDF5',
    onPrimary: '#FFFFFF',        // #FFF on primary #2c428f: 9.20:1 — AA pass
    rating: '#F59E0B',           // star fill only — not for text
    overlay: 'rgba(0, 0, 0, 0.4)',
    card: '#FFFFFF',
    skeleton: '#E5E5E5',
    pending: '#B45309',          // on pendingLight: 4.84:1 — AA body pass (was #D97706 3.07:1 body fail)
    pendingLight: '#FFFBEB',
    active: '#2c428f',           // on activeLight: 8.08:1 — AA pass
    activeLight: '#EEF0F8',
    completed: '#047857',        // on completedLight: 5.21:1 — AA body pass (was #059669 3.58:1 body fail)
    completedLight: '#ECFDF5',
    cancelled: '#B91C1C',        // on cancelledLight: 5.91:1 — AA body pass (was #DC2626 4.41:1 body fail)
    cancelledLight: '#FEF2F2',
  },
  dark: {
    // WCAG AA audit (body >=4.5:1, large >=3:1) — see S115
    primary: '#5B7BF7',          // on bg: 5.30:1, on surface: 4.66:1 — AA body pass (was #4A6CF7: surface 3.96:1 body fail)
    primaryLight: '#2c428f',     // decorative/background only in dark
    primaryDark: '#97ABFF',      // decorative only
    secondary: '#6EE7B7',        // on bg: 12.99:1, on surface: 11.42:1 — AA pass
    secondaryLight: '#059669',   // decorative background only
    accent: '#5B7BF7',
    background: '#0A0A0A',       // text #FFF: 19.80:1 — AA pass
    surface: '#1A1A1A',          // text #FFF: 17.40:1 — AA pass
    surfaceSecondary: '#252525',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',    // on bg: 7.80:1, surface: 6.86:1 — AA pass
    textTertiary: '#8A8F9C',     // on bg: 6.12:1, on surface: 5.38:1 — AA body pass
    border: '#2A2A2A',
    borderLight: '#1F1F1F',
    error: '#EF4444',            // on bg: 5.26:1, on surface: 4.62:1 — AA body pass
    errorLight: '#1F1515',
    warning: '#F59E0B',          // on bg: 9.22:1, on surface: 8.10:1 — AA pass
    warningLight: '#1F1D15',
    success: '#6EE7B7',          // on bg: 12.99:1, on surface: 11.42:1 — AA pass
    successLight: '#15201D',
    onPrimary: '#000000',        // black on #5B7BF7: 5.62:1 — AA body pass (was #FFF: 4.39:1 body fail on old primary)
    rating: '#F59E0B',
    overlay: 'rgba(0, 0, 0, 0.6)',
    card: '#1A1A1A',
    skeleton: '#2A2A2A',
    pending: '#F59E0B',          // on pendingLight: 7.85:1, on surface: 8.10:1 — AA pass
    pendingLight: '#1F1D15',
    active: '#5B7BF7',           // on activeLight: 4.66:1, on surface: 4.66:1 — AA body pass (was #4A6CF7 3.97:1 body fail)
    activeLight: '#151830',
    completed: '#6EE7B7',        // on completedLight: 10.97:1, on surface: 11.42:1 — AA pass
    completedLight: '#15201D',
    cancelled: '#EF4444',        // on cancelledLight: 4.74:1, on surface: 4.62:1 — AA body pass
    cancelledLight: '#1F1515',
  },
} as const;

// Plus Jakarta Sans — loaded in _layout.tsx via @expo-google-fonts.
// Each Typography token picks the font file that matches its weight, so
// Pressable overrides like `fontWeight: '700'` still win visually because
// the 700 font file is used by default for titles.
export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const Typography = {
  largeTitle: {
    fontFamily: Fonts.bold,
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.37,
    lineHeight: 41,
  },
  title1: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.36,
    lineHeight: 34,
  },
  title2: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: 0.35,
    lineHeight: 28,
  },
  title3: {
    fontFamily: Fonts.semibold,
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.38,
    lineHeight: 25,
  },
  headline: {
    fontFamily: Fonts.semibold,
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  callout: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: -0.32,
    lineHeight: 21,
  },
  subheadline: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  footnote: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  caption1: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  caption2: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.07,
    lineHeight: 13,
  },
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

export const Glass = {
  light: {
    background: 'rgba(255,255,255,0.7)',
    border: 'rgba(229,229,229,0.5)',
  },
  dark: {
    background: 'rgba(26,26,26,0.6)',
    border: 'rgba(42,42,42,0.4)',
  },
} as const;

export const TabColors = {
  home: { light: '#2c428f', dark: '#5B7BF7' },
  search: { light: '#2c428f', dark: '#5B7BF7' },
  messages: { light: '#2c428f', dark: '#5B7BF7' },
  bookings: { light: '#2c428f', dark: '#5B7BF7' },
  profile: { light: '#2c428f', dark: '#5B7BF7' },
} as const;

export const Springs = {
  gentle: { damping: 20, stiffness: 150, mass: 1 },
  bouncy: { damping: 12, stiffness: 200, mass: 0.8 },
  snappy: { damping: 15, stiffness: 300, mass: 0.8 },
  quick: { damping: 20, stiffness: 400, mass: 0.8 },
  tab: { damping: 30, stiffness: 500 },
} as const;

export const Layout = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  isSmallDevice: SCREEN_WIDTH < 375,
  contentPadding: 16,
  tabBarHeight: 56,
} as const;
