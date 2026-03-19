import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius, Shadows, Springs } from '../../constants/theme';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

export function Toast({
  message,
  type = 'info',
  visible,
  onHide,
  duration = 3000,
}: ToastProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, Springs.bouncy);
      opacity.value = withTiming(1, { duration: 200 });

      const timer = setTimeout(() => {
        translateY.value = withSpring(-100, Springs.quick);
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onHide)();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const Icon = icons[type];
  const iconColor = getIconColor(type, colors);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + Spacing.sm,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        animatedStyle,
      ]}
    >
      <Icon size={20} color={iconColor} strokeWidth={2} />
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

function getIconColor(
  type: ToastType,
  colors: ReturnType<typeof useTheme>['colors']
): string {
  switch (type) {
    case 'success':
      return colors.success;
    case 'error':
      return colors.error;
    case 'warning':
      return colors.warning;
    case 'info':
      return colors.primary;
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    zIndex: 9999,
    ...Shadows.lg,
  },
  text: {
    ...Typography.subheadline,
    flex: 1,
  },
});
