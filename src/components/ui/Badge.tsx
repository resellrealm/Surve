import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  small?: boolean;
}

export function Badge({ text, variant = 'default', style, small = false }: BadgeProps) {
  const { colors } = useTheme();

  const variantStyles = getVariantStyles(variant, colors);

  return (
    <View
      style={[
        styles.container,
        small && styles.small,
        { backgroundColor: variantStyles.bg },
        style,
      ]}
    >
      <Text
        style={[
          small ? Typography.caption2 : Typography.caption1,
          { color: variantStyles.text, fontWeight: '600' },
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

function getVariantStyles(
  variant: BadgeVariant,
  colors: ReturnType<typeof useTheme>['colors']
) {
  switch (variant) {
    case 'primary':
      return { bg: colors.activeLight, text: colors.primary };
    case 'success':
      return { bg: colors.completedLight, text: colors.completed };
    case 'warning':
      return { bg: colors.pendingLight, text: colors.pending };
    case 'error':
      return { bg: colors.cancelledLight, text: colors.cancelled };
    case 'info':
      return { bg: colors.activeLight, text: colors.active };
    default:
      return { bg: colors.surfaceSecondary, text: colors.textSecondary };
  }
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: Spacing.xxs,
    borderRadius: BorderRadius.xs,
  },
});
