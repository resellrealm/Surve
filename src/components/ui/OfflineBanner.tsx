import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { Typography, Spacing, Springs } from '../../constants/theme';

const BANNER_HEIGHT = 36;

export function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const setIsOffline = useStore((s) => s.setIsOffline);
  const isOffline = useStore((s) => s.isOffline);
  const prevOffline = useRef(false);

  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const totalHeight = insets.top + Spacing.sm + BANNER_HEIGHT;

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected || state.isInternetReachable === false;
      setIsOffline(offline);
    });
    return () => unsub();
  }, [setIsOffline]);

  useEffect(() => {
    if (isOffline && !prevOffline.current) {
      haptics.warning();
      AccessibilityInfo.announceForAccessibility('You are offline. Some features are unavailable.');
    } else if (!isOffline && prevOffline.current) {
      haptics.success();
      AccessibilityInfo.announceForAccessibility('Back online.');
    }
    prevOffline.current = isOffline;
    progress.value = reducedMotion
      ? withTiming(isOffline ? 1 : 0, { duration: 150 })
      : withSpring(isOffline ? 1 : 0, Springs.snappy);
  }, [isOffline, haptics, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [-totalHeight, 0]) }],
    opacity: progress.value,
  }));

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: colors.error,
          paddingTop: insets.top + Spacing.sm,
          height: totalHeight,
        },
        animatedStyle,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      pointerEvents={isOffline ? 'auto' : 'none'}
    >
      <WifiOff size={14} color={colors.onPrimary} strokeWidth={2.2} />
      <Text style={[styles.text, { color: colors.onPrimary }]}>
        No internet connection
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    zIndex: 999,
  },
  text: {
    ...Typography.footnote,
    fontWeight: '600',
  },
});
