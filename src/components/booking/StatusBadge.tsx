import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { BookingStatus } from '../../types';

interface StatusBadgeProps {
  status: BookingStatus;
}

const PULSE_STATUSES: BookingStatus[] = ['pending', 'proof_submitted'];

function getStatusConfig(status: BookingStatus) {
  switch (status) {
    case 'pending':
      return { label: 'Pending', colorKey: 'pending' as const };
    case 'accepted':
      return { label: 'Accepted', colorKey: 'active' as const };
    case 'active':
      return { label: 'Active', colorKey: 'active' as const };
    case 'in_progress':
      return { label: 'In Progress', colorKey: 'active' as const };
    case 'proof_submitted':
      return { label: 'Proof Submitted', colorKey: 'pending' as const };
    case 'completed':
      return { label: 'Completed', colorKey: 'completed' as const };
    case 'disputed':
      return { label: 'Disputed', colorKey: 'warning' as const };
    case 'cancelled':
      return { label: 'Cancelled', colorKey: 'cancelled' as const };
    case 'refunded':
      return { label: 'Refunded', colorKey: 'cancelled' as const };
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const config = getStatusConfig(status);
  const bgKey = `${config.colorKey}Light` as keyof typeof colors;
  const textKey = config.colorKey as keyof typeof colors;

  const shouldPulse = PULSE_STATUSES.includes(status) && !reducedMotion;
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (shouldPulse) {
      opacity.value = withRepeat(
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      opacity.value = 1;
    }
  }, [shouldPulse]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Status: ${config.label}`}
      style={[
        styles.container,
        { backgroundColor: colors[bgKey] as string },
      ]}
    >
      <Animated.View
        style={[styles.dot, { backgroundColor: colors[textKey] as string }, dotAnimatedStyle]}
      />
      <Text style={[styles.text, { color: colors[textKey] as string }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...Typography.caption1,
    fontWeight: '600',
  },
});
