import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius, Springs } from '../../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
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
}: ButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const sizeConfig = SIZE_CONFIG[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, Springs.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, Springs.bouncy);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [disabled, loading, onPress]);

  const containerStyle = getContainerStyle(variant, colors, disabled);
  const textColor = getTextColor(variant, colors, disabled);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        styles.base,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: BorderRadius.md,
        },
        containerStyle,
        animatedStyle,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.onPrimary : colors.primary}
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
    </AnimatedPressable>
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
  }
}

function getTextColor(
  variant: ButtonVariant,
  colors: ReturnType<typeof useTheme>['colors'],
  disabled: boolean
): string {
  if (disabled) {
    return variant === 'primary' ? 'rgba(255,255,255,0.7)' : colors.textTertiary;
  }
  switch (variant) {
    case 'primary':
      return colors.onPrimary;
    case 'secondary':
      return colors.text;
    case 'outline':
    case 'ghost':
      return colors.primary;
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
