import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { BorderRadius, Spacing, Springs } from '../../constants/theme';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const { colors } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep} of ${totalSteps}`}
      accessibilityValue={{ min: 0, max: totalSteps, now: currentStep }}
      style={styles.container}
    >
      <View style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const isActive = i < currentStep;
          return (
            <AnimatedSegment
              key={i}
              active={isActive}
              activeColor={colors.primary}
              flex={1 / totalSteps}
            />
          );
        })}
      </View>
    </View>
  );
}

function AnimatedSegment({
  active,
  activeColor,
  flex,
}: {
  active: boolean;
  activeColor: string;
  flex: number;
}) {
  const reducedMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion
      ? withTiming(active ? 1 : 0, { duration: 150 })
      : withSpring(active ? 1 : 0, Springs.snappy),
  }));

  return (
    <View style={{ flex }}>
      <Animated.View
        style={[
          styles.segment,
          { backgroundColor: activeColor },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  track: {
    height: 4,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
