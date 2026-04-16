import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

const PULSE_DURATION = 1200;
const DEFAULT_SIZE = 10;
const BADGE_COLOR = '#DC2626';

interface PulsingDotProps {
  size?: number;
  color?: string;
  style?: object;
}

export function PulsingDot({
  size = DEFAULT_SIZE,
  color = BADGE_COLOR,
  style,
}: PulsingDotProps) {
  const pulse = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: PULSE_DURATION, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: PULSE_DURATION, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse, reducedMotion]);

  const pulseRingStyle = useAnimatedStyle(() => ({
    opacity: 1 - pulse.value,
    transform: [{ scale: 1 + pulse.value * 0.4 }],
  }));

  const half = size / 2;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: half,
            backgroundColor: color,
          },
          pulseRingStyle,
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: half,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
