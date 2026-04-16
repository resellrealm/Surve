import React, { useCallback } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { useHaptics } from '../../hooks/useHaptics';
import { Springs } from '../../constants/theme';

const REDUCED_TIMING = { duration: 150 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PARTICLE_COUNT = 6;
const PARTICLE_ANGLES = Array.from(
  { length: PARTICLE_COUNT },
  (_, i) => (i * 360) / PARTICLE_COUNT,
);

function Particle({
  angle,
  color,
  trigger,
  dist,
}: {
  angle: number;
  color: string;
  trigger: SharedValue<number>;
  dist: number;
}) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) * dist;
  const dy = Math.sin(rad) * dist;

  const animStyle = useAnimatedStyle(() => {
    const t = trigger.value;
    return {
      opacity: t * (1 - t) * 4,
      transform: [
        { translateX: dx * t },
        { translateY: dy * t },
        { scale: 1 - t * 0.6 },
      ],
    };
  });

  const dotSize = Math.max(3, dist * 0.18);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

interface AnimatedLikeButtonProps {
  active: boolean;
  onToggle: () => void;
  activeColor: string;
  inactiveColor: string;
  size?: number;
  style?: ViewStyle | ViewStyle[] | (ViewStyle | undefined | false)[];
  hitSlop?: number;
  children: (props: { color: string; fill: string }) => React.ReactNode;
  accessibilityLabel?: string;
}

export function AnimatedLikeButton({
  active,
  onToggle,
  activeColor,
  inactiveColor,
  size = 40,
  style,
  hitSlop = 8,
  children,
  accessibilityLabel,
}: AnimatedLikeButtonProps) {
  const scale = useSharedValue(1);
  const particleProgress = useSharedValue(0);
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();

  const handlePress = useCallback(() => {
    haptics.confirm();

    if (reducedMotion) {
      scale.value = withTiming(active ? 1 : 1, REDUCED_TIMING);
    } else if (!active) {
      scale.value = withSequence(
        withSpring(1.35, Springs.snappy),
        withSpring(1, Springs.bouncy),
      );
      particleProgress.value = 0;
      particleProgress.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      scale.value = withSequence(
        withSpring(0.8, Springs.snappy),
        withSpring(1, Springs.bouncy),
      );
    }

    onToggle();
  }, [active, onToggle, haptics, scale, particleProgress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = active ? activeColor : inactiveColor;
  const iconFill = active ? activeColor : 'transparent';
  const particleDist = size * 0.7;

  return (
    <AnimatedPressable
      onPress={handlePress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        animatedStyle,
        style as any,
      ]}
    >
      {!reducedMotion && PARTICLE_ANGLES.map((angle) => (
        <Particle
          key={angle}
          angle={angle}
          color={activeColor}
          trigger={particleProgress}
          dist={particleDist}
        />
      ))}
      {children({ color: iconColor, fill: iconFill })}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
