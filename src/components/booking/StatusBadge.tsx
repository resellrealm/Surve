import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { BookingStatus } from '../../types';

interface StatusBadgeProps {
  status: BookingStatus;
}

function getStatusConfig(status: BookingStatus) {
  switch (status) {
    case 'pending':
      return { label: 'Pending', colorKey: 'pending' as const };
    case 'accepted':
      return { label: 'Accepted', colorKey: 'active' as const };
    case 'active':
      return { label: 'Active', colorKey: 'active' as const };
    case 'completed':
      return { label: 'Completed', colorKey: 'completed' as const };
    case 'cancelled':
      return { label: 'Cancelled', colorKey: 'cancelled' as const };
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { colors } = useTheme();
  const config = getStatusConfig(status);
  const bgKey = `${config.colorKey}Light` as keyof typeof colors;
  const textKey = config.colorKey as keyof typeof colors;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors[bgKey] as string },
      ]}
    >
      <View
        style={[styles.dot, { backgroundColor: colors[textKey] as string }]}
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
