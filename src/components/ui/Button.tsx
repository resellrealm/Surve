import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';
import { PressableScale } from './PressableScale';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const SIZE_CONFIG: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; textStyle: TextStyle }
> = {
  sm: {
    height: 36,
    paddingHorizontal: Spacing.lg,
    textStyle: Typography.footnote,
  },
  md: {
    height: 48,
    paddingHorizontal: Spacing.xl,
    textStyle: Typography.headline,
  },
  lg: {
    height: 56,
    paddingHorizontal: Spacing.xxl,
    textStyle: Typography.headline,
  },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const sizeConfig = SIZE_CONFIG[size];

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    if (variant === 'primary') haptics.confirm();
    else if (variant === 'destructive') haptics.warning();
    else haptics.tap();
    onPress();
  }, [disabled, loading, onPress, variant]);

  const containerStyle = getContainerStyle(variant, colors, disabled);
  const textColor = getTextColor(variant, colors, disabled);

  return (
    <PressableScale
      scaleValue={0.96}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.base,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: BorderRadius.md,
        },
        containerStyle,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={(variant === 'primary' || variant === 'destructive') ? colors.onPrimary : colors.primary}
        />
      ) : (
        <>
          {icon && <Animated.View style={styles.icon}>{icon}</Animated.View>}
          <Text
            style={[
              sizeConfig.textStyle,
              { color: textColor, fontWeight: '600' },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

function getContainerStyle(
  variant: ButtonVariant,
  colors: ReturnType<typeof useTheme>['colors'],
  disabled: boolean
): ViewStyle {
  const opacity = disabled ? 0.5 : 1;

  switch (variant) {
    case 'primary':
      return {
        backgroundColor: colors.primary,
        opacity,
      };
    case 'secondary':
      return {
        backgroundColor: colors.surfaceSecondary,
        opacity,
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary,
        opacity,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        opacity,
      };
    case 'destructive':
      return {
        backgroundColor: colors.error,
        opacity,
      };
  }
}

function getTextColor(
  variant: ButtonVariant,
  colors: ReturnType<typeof useTheme>['colors'],
  disabled: boolean
): string {
  if (disabled) {
    return (variant === 'primary' || variant === 'destructive') ? 'rgba(255,255,255,0.7)' : colors.textTertiary;
  }
  switch (variant) {
    case 'primary':
      return colors.onPrimary;
    case 'secondary':
      return colors.text;
    case 'outline':
    case 'ghost':
      return colors.primary;
    case 'destructive':
      return colors.onPrimary;
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  fullWidth: {
    width: '100%',
  },
});
