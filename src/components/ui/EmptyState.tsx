import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import {
  Typography,
  Spacing,
  BorderRadius,
  Springs,
} from '../../constants/theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  ctaLabel?: string;
  onPress?: () => void;
  tint?: 'primary' | 'muted';
}



function FloatingDot({
  size,
  color,
  top,
  left,
  delay,
}: {
  size: number;
  color: string;
  top: number;
  left: number;
  delay: number;
}) {
  const translateY = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (reducedMotion) return;
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1800 }),
          withTiming(0, { duration: 1800 }),
        ),
        -1,
        true,
      ),
    );
  }, [translateY, delay, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.delay(300 + delay).duration(500)}
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          left,
        },
        animStyle,
      ]}
    />
  );
}

function DecoRing({ color, size }: { color: string; size: number }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0.85);

  React.useEffect(() => {
    if (reducedMotion) return;
    scale.value = withDelay(
      200,
      withSpring(1, Springs.gentle),
    );
  }, [scale, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: color,
          borderStyle: 'dashed',
        },
        animStyle,
      ]}
    />
  );
}

export function EmptyState({
  icon,
  title,
  body,
  ctaLabel,
  onPress,
  tint = 'primary',
}: EmptyStateProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();
  const iconColor = tint === 'primary' ? colors.primary : colors.textTertiary;
  const iconBg = tint === 'primary' ? colors.activeLight : colors.surfaceSecondary;
  const dotColor = tint === 'primary' ? colors.primary : colors.textTertiary;
  const ringColor = tint === 'primary'
    ? `${colors.primary}20`
    : `${colors.textTertiary}18`;

  const handlePress = useCallback(() => {
    haptics.confirm();
    onPress?.();
  }, [haptics, onPress]);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(400)}
      style={styles.container}
    >
      <View style={styles.illustrationWrap}>
        <DecoRing color={ringColor} size={120} />

        <FloatingDot size={8} color={`${dotColor}30`} top={4} left={12} delay={0} />
        <FloatingDot size={6} color={`${dotColor}25`} top={16} left={108} delay={300} />
        <FloatingDot size={10} color={`${dotColor}20`} top={100} left={6} delay={150} />
        <FloatingDot size={7} color={`${dotColor}28`} top={105} left={100} delay={450} />
        <FloatingDot size={5} color={`${dotColor}22`} top={56} left={118} delay={600} />

        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={40} color={iconColor} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {body}
      </Text>
      {ctaLabel && onPress && (
        <PressableScale
          scaleValue={0.96}
          onPress={handlePress}
          style={[styles.cta, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={[styles.ctaText, { color: colors.onPrimary }]}>
            {ctaLabel}
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
  illustrationWrap: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.title3,
    textAlign: 'center',
  },
  body: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  cta: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...Typography.headline,
    fontWeight: '700',
  },
});
