import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Surve — Modern, refined survey app palette
// Inspired by Linear, Notion, Arc browser — sophisticated grey tones
export const Colors = {
  light: {
    primary: '#475569',        // Refined bluish-grey
    primaryLight: '#94A3B8',
    primaryDark: '#334155',
    secondary: '#059669',      // Muted emerald for success/completion
    secondaryLight: '#6EE7B7',
    accent: '#64748B',         // Slate accent
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    error: '#DC2626',
    errorLight: '#FEF2F2',
    warning: '#D97706',
    warningLight: '#FFFBEB',
    success: '#059669',
    successLight: '#ECFDF5',
    overlay: 'rgba(0, 0, 0, 0.4)',
    card: '#FFFFFF',
    skeleton: '#E2E8F0',
  },
  dark: {
    primary: '#94A3B8',
    primaryLight: '#64748B',
    primaryDark: '#CBD5E1',
    secondary: '#6EE7B7',
    secondaryLight: '#059669',
    accent: '#94A3B8',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceSecondary: '#334155',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#475569',
    border: '#334155',
    borderLight: '#1E293B',
    error: '#EF4444',
    errorLight: '#1F1515',
    warning: '#F59E0B',
    warningLight: '#1F1D15',
    success: '#6EE7B7',
    successLight: '#15201D',
    overlay: 'rgba(0, 0, 0, 0.6)',
    card: '#1E293B',
    skeleton: '#334155',
  },
} as const;

export const Typography = {
  // System font (San Francisco on iOS, Roboto on Android)
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.37,
    lineHeight: 41,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.36,
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: 0.35,
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.38,
    lineHeight: 25,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: -0.32,
    lineHeight: 21,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  caption2: {
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

// Glass morphism tokens
export const Glass = {
  light: {
    background: 'rgba(255,255,255,0.6)',
    border: 'rgba(229,231,235,0.5)',
  },
  dark: {
    background: 'rgba(31,41,55,0.5)',
    border: 'rgba(75,85,99,0.3)',
  },
} as const;

// Tab accent colors (Nutrio+ pattern)
export const TabColors = {
  home: { light: '#111827', dark: '#FFFFFF' },       // gray-900 / white
  create: { light: '#475569', dark: '#94A3B8' },     // slate-600 / slate-400
  discover: { light: '#10B981', dark: '#10B981' },    // emerald-500
  responses: { light: '#0EA5E9', dark: '#0EA5E9' },   // sky-500
  profile: { light: '#64748B', dark: '#94A3B8' },     // slate-500 / slate-400
} as const;

// Spring animation configs for iOS-native feel
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
  tabBarHeight: 60,
} as const;
