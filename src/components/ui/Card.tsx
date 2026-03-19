import React, { useCallback } from 'react';
import { StyleSheet, Pressable, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, BorderRadius, Shadows, Springs } from '../../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
}

export function Card({ children, style, onPress, padding }: CardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(0.97, Springs.snappy);
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(1, Springs.bouncy);
  }, [onPress, scale]);

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    padding: padding ?? Spacing.lg,
    ...Shadows.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  };

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[cardStyle, animatedStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[cardStyle, style]}>
      {children}
    </Animated.View>
  );
}
