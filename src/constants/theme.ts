import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Surve — Uber-like dark with blue accent palette
// Premium, clean, professional creator-business platform
export const Colors = {
  light: {
    primary: '#2c428f',
    primaryLight: '#3a4f99',
    primaryDark: '#111d4a',
    secondary: '#059669',
    secondaryLight: '#6EE7B7',
    accent: '#2c428f',
    background: '#F4F3F4',
    surface: '#FFFFFF',
    surfaceSecondary: '#ECECEC',
    text: '#000000',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E5E5',
    borderLight: '#F0F0F0',
    error: '#DC2626',
    errorLight: '#FEF2F2',
    warning: '#D97706',
    warningLight: '#FFFBEB',
    success: '#059669',
    successLight: '#ECFDF5',
    onPrimary: '#FFFFFF',
    rating: '#F59E0B',
    overlay: 'rgba(0, 0, 0, 0.4)',
    card: '#FFFFFF',
    skeleton: '#E5E5E5',
    pending: '#D97706',
    pendingLight: '#FFFBEB',
    active: '#2c428f',
    activeLight: '#EEF0F8',
    completed: '#059669',
    completedLight: '#ECFDF5',
    cancelled: '#DC2626',
    cancelledLight: '#FEF2F2',
  },
  dark: {
    primary: '#4A6CF7',
    primaryLight: '#2c428f',
    primaryDark: '#97ABFF',
    secondary: '#6EE7B7',
    secondaryLight: '#059669',
    accent: '#4A6CF7',
    background: '#0A0A0A',
    surface: '#1A1A1A',
    surfaceSecondary: '#252525',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#2A2A2A',
    borderLight: '#1F1F1F',
    error: '#EF4444',
    errorLight: '#1F1515',
    warning: '#F59E0B',
    warningLight: '#1F1D15',
    success: '#6EE7B7',
    successLight: '#15201D',
    onPrimary: '#FFFFFF',
    rating: '#F59E0B',
    overlay: 'rgba(0, 0, 0, 0.6)',
    card: '#1A1A1A',
    skeleton: '#2A2A2A',
    pending: '#F59E0B',
    pendingLight: '#1F1D15',
    active: '#4A6CF7',
    activeLight: '#151830',
    completed: '#6EE7B7',
    completedLight: '#15201D',
    cancelled: '#EF4444',
    cancelledLight: '#1F1515',
  },
} as const;

export const Typography = {
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
  home: { light: '#2c428f', dark: '#4A6CF7' },
  search: { light: '#2c428f', dark: '#4A6CF7' },
  messages: { light: '#2c428f', dark: '#4A6CF7' },
  bookings: { light: '#2c428f', dark: '#4A6CF7' },
  profile: { light: '#2c428f', dark: '#4A6CF7' },
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
  tabBarHeight: 60,
} as const;
