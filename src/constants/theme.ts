import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Surve — Clean grey + off-white survey app palette
// Minimal, professional, premium survey tool
export const Colors = {
  light: {
    primary: '#475569',        // Refined grey
    primaryLight: '#94A3B8',
    primaryDark: '#334155',
    secondary: '#059669',      // Muted emerald for success/completion
    secondaryLight: '#6EE7B7',
    accent: '#64748B',         // Slate accent
    background: '#F1F0EE',     // Off-white background
    surface: '#F7F6F4',        // Warm off-white surface
    surfaceSecondary: '#EDECEB', // Darker off-white
    text: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    border: '#DDD9D5',
    borderLight: '#EDECEB',
    error: '#DC2626',
    errorLight: '#FEF2F2',
    warning: '#D97706',
    warningLight: '#FFFBEB',
    success: '#059669',
    successLight: '#ECFDF5',
    overlay: 'rgba(0, 0, 0, 0.4)',
    card: '#F7F6F4',           // Off-white cards
    skeleton: '#DDD9D5',
  },
  dark: {
    primary: '#CBD5E1',
    primaryLight: '#64748B',
    primaryDark: '#F1F0EE',
    secondary: '#6EE7B7',
    secondaryLight: '#059669',
    accent: '#94A3B8',
    background: '#1E293B',     // Dark grey background
    surface: '#2D3748',        // Dark grey surface
    surfaceSecondary: '#374151',
    text: '#F1F0EE',           // Off-white text
    textSecondary: '#94A3B8',
    textTertiary: '#475569',
    border: '#374151',
    borderLight: '#2D3748',
    error: '#EF4444',
    errorLight: '#1F1515',
    warning: '#F59E0B',
    warningLight: '#1F1D15',
    success: '#6EE7B7',
    successLight: '#15201D',
    overlay: 'rgba(0, 0, 0, 0.6)',
    card: '#2D3748',           // Dark grey cards
    skeleton: '#374151',
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

// Glass morphism tokens — off-white tinted
export const Glass = {
  light: {
    background: 'rgba(241,240,238,0.7)',
    border: 'rgba(221,217,213,0.5)',
  },
  dark: {
    background: 'rgba(45,55,72,0.6)',
    border: 'rgba(55,65,81,0.4)',
  },
} as const;

// Tab accent colors — grey tones only
export const TabColors = {
  home: { light: '#334155', dark: '#CBD5E1' },       // dark grey / light grey
  create: { light: '#475569', dark: '#94A3B8' },     // grey / lighter grey
  discover: { light: '#64748B', dark: '#94A3B8' },   // medium grey / light grey
  responses: { light: '#475569', dark: '#94A3B8' },  // grey / lighter grey
  profile: { light: '#64748B', dark: '#94A3B8' },    // medium grey / light grey
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
