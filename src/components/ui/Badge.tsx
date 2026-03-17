import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label: string;
  color?: string;
  size?: BadgeSize;
  style?: ViewStyle;
}

const SIZE_CONFIG = {
  sm: { paddingVertical: 2, paddingHorizontal: Spacing.sm, textStyle: Typography.caption2 },
  md: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, textStyle: Typography.caption1 },
  lg: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, textStyle: Typography.footnote },
} as const;

export function Badge({ label, color, size = 'md', style }: BadgeProps) {
  const { colors } = useTheme();
  const badgeColor = color ?? colors.primary;
  const config = SIZE_CONFIG[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${badgeColor}18`,
          paddingVertical: config.paddingVertical,
          paddingHorizontal: config.paddingHorizontal,
          borderRadius: BorderRadius.full,
        },
        style,
      ]}
    >
      <Text
        style={[
          config.textStyle,
          { color: badgeColor, fontWeight: '600' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
