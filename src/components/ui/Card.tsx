import React, { useCallback } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { PressableScale } from './PressableScale';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
  accessibilityLabel?: string;
}

export function Card({ children, style, onPress, padding, accessibilityLabel }: CardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    padding: padding ?? Spacing.lg,
    ...Shadows.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  };

  const handlePress = useCallback(() => {
    haptics.tap();
    onPress?.();
  }, [haptics, onPress]);

  if (onPress) {
    return (
      <PressableScale
        onPress={handlePress}
        style={[cardStyle, style]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </PressableScale>
    );
  }

  return (
    <Animated.View style={[cardStyle, style]}>
      {children}
    </Animated.View>
  );
}
