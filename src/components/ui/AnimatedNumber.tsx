import React, { useEffect } from 'react';
import { TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(
  require('react-native').TextInput,
);

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  style?: TextStyle;
  formatOptions?: Intl.NumberFormatOptions;
}

export function AnimatedNumber({
  value,
  duration = 800,
  prefix = '',
  style,
  formatOptions,
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      animatedValue.value = value;
      return;
    }
    animatedValue.value = 0;
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, reducedMotion]);

  const animatedProps = useAnimatedProps(() => {
    const v = Math.round(animatedValue.value);
    return {
      text: `${prefix}${v.toLocaleString()}`,
      defaultValue: `${prefix}${v.toLocaleString()}`,
    } as Record<string, string>;
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${prefix}${value.toLocaleString(undefined, formatOptions)}`}
      style={[style, { padding: 0, margin: 0 }]}
      animatedProps={animatedProps}
    />
  );
}
