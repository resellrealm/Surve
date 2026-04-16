import React, { useCallback } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { Springs } from '../../constants/theme';

const REDUCED_TIMING = { duration: 150 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  scaleValue?: number;
  style?: ViewStyle | ViewStyle[] | (ViewStyle | undefined | false)[];
  children: React.ReactNode;
}

export function PressableScale({
  scaleValue = 0.97,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = reducedMotion
        ? withTiming(scaleValue, REDUCED_TIMING)
        : withSpring(scaleValue, Springs.snappy);
      onPressIn?.(e);
    },
    [scale, scaleValue, onPressIn, reducedMotion],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = reducedMotion
        ? withTiming(1, REDUCED_TIMING)
        : withSpring(1, Springs.bouncy);
      onPressOut?.(e);
    },
    [scale, onPressOut, reducedMotion],
  );

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style as any]}
    >
      {children}
    </AnimatedPressable>
  );
}
