import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import {
  Typography,
  Spacing,
  BorderRadius,
} from '../../constants/theme';

interface ErrorStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

/**
 * ErrorState
 * Shown when an async fetch fails. Pair with Skeleton for loading and
 * EmptyState for zero-results. Provides an icon, message, and a Retry CTA.
 */
export function ErrorState({
  icon = 'cloud-offline-outline',
  title = "Something went wrong",
  message = "We couldn't load this right now. Check your connection and try again.",
  retryLabel = 'Try again',
  onRetry,
}: ErrorStateProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();

  const handleRetry = useCallback(() => {
    haptics.tap();
    onRetry?.();
  }, [haptics, onRetry]);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(350)}
      style={styles.container}
      accessibilityLiveRegion="polite"
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.cancelledLight },
        ]}
      >
        <Ionicons name={icon} size={36} color={colors.cancelled} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && (
        <PressableScale
          scaleValue={0.96}
          onPress={handleRetry}
          style={[styles.cta, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          accessibilityHint="Retries the last failed request"
        >
          <Ionicons name="refresh" size={18} color={colors.onPrimary} />
          <Text style={[styles.ctaText, { color: colors.onPrimary }]}>
            {retryLabel}
          </Text>
        </PressableScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.title3,
    textAlign: 'center',
  },
  body: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    minHeight: 44,
  },
  ctaText: {
    ...Typography.headline,
    fontWeight: '700',
  },
});
