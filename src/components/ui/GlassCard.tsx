import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Glass, BorderRadius, Spacing } from '../../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassCard({ children, style }: GlassCardProps) {
  const { isDark } = useTheme();
  const glass = isDark ? Glass.dark : Glass.light;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: glass.background,
          borderColor: glass.border,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
});
