import React, { useCallback } from 'react';
import { StyleSheet, Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Glass, BorderRadius, Spacing, Springs } from '../../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  delay?: number;
  intensity?: number;
}

export function GlassCard({ children, style, onPress, delay = 0, intensity = 40 }: GlassCardProps) {
  const { isDark } = useTheme();
  const scale = useSharedValue(1);
  const glass = isDark ? Glass.dark : Glass.light;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(0.97, Springs.snappy);
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(1, Springs.snappy);
  }, [onPress, scale]);

  const handlePress = useCallback(() => {
    if (!onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const containerStyle: ViewStyle = {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: glass.border,
    overflow: 'hidden',
  };

  const innerContent = (
    <BlurView intensity={intensity} tint={isDark ? 'dark' : 'light'} style={styles.blur}>
      <View style={[styles.innerFallback, { backgroundColor: glass.background }]}>
        <View style={[styles.content, style]}>
          {children}
        </View>
      </View>
    </BlurView>
  );

  if (onPress) {
    return (
      <Animated.View entering={FadeInDown.duration(400).delay(delay).springify()}>
        <AnimatedPressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[containerStyle, animatedStyle]}
        >
          {innerContent}
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay).springify()}
      style={containerStyle}
    >
      {innerContent}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
  },
  innerFallback: {
    // Semi-transparent fallback when blur isn't supported
  },
  content: {
    padding: Spacing.lg,
  },
});
