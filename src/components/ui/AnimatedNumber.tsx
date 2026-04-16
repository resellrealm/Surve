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
  /** Pass `currency="USD"` to format via Intl.NumberFormat (preferred). */
  currency?: string;
  /** Legacy: plain string prefix prepended before the number (e.g. '$'). Use `currency` instead. */
  prefix?: string;
  style?: TextStyle;
  formatOptions?: Intl.NumberFormatOptions;
}

export function AnimatedNumber({
  value,
  duration = 800,
  currency,
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
    let text: string;
    if (currency) {
      text = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(v);
    } else {
      text = `${prefix}${v.toLocaleString()}`;
    }
    return { text, defaultValue: text } as Record<string, string>;
  });

  const a11yLabel = currency
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency, ...formatOptions }).format(value)
    : `${prefix}${value.toLocaleString(undefined, formatOptions)}`;

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={[style, { padding: 0, margin: 0 }]}
      animatedProps={animatedProps}
    />
  );
}
