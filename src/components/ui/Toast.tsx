import React, { useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Typography, Spacing, BorderRadius, Shadows, Springs } from '../../constants/theme';
import { useToastStore, type ToastVariant, type ToastAction } from '../../lib/toast';

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
} as const;

const DISMISS_THRESHOLD = -40;

export function ToastContainer() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!current) return null;

  return (
    <ToastView
      key={current.id}
      message={current.message}
      variant={current.variant}
      duration={current.duration}
      action={current.action}
      onDismiss={dismiss}
    />
  );
}

function ToastView({
  message,
  variant,
  duration,
  action,
  onDismiss,
}: {
  message: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dismissedRef = useRef(false);
  const reducedMotion = useReducedMotion();

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    clearTimeout(timerRef.current);
    onDismiss();
  }, [onDismiss]);

  const slideOut = useCallback(() => {
    translateY.value = reducedMotion
      ? withTiming(-120, { duration: 150 })
      : withSpring(-120, Springs.quick);
    opacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(handleDismiss)();
    });
  }, [translateY, opacity, handleDismiss, reducedMotion]);

  useEffect(() => {
    haptics.tap();

    translateY.value = reducedMotion
      ? withTiming(0, { duration: 150 })
      : withSpring(0, Springs.bouncy);
    opacity.value = withTiming(1, { duration: reducedMotion ? 150 : 200 });

    timerRef.current = setTimeout(slideOut, duration);

    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY < DISMISS_THRESHOLD) {
        translateY.value = reducedMotion
          ? withTiming(-120, { duration: 150 })
          : withSpring(-120, Springs.quick);
        opacity.value = withTiming(0, { duration: 150 }, () => {
          runOnJS(handleDismiss)();
        });
      } else {
        translateY.value = reducedMotion
          ? withTiming(0, { duration: 150 })
          : withSpring(0, Springs.bouncy);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const Icon = ICONS[variant];
  const iconColor = getIconColor(variant, colors);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        accessibilityLabel={`${variant}: ${message}`}
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
        {action && (
          <PressableScale
            scaleValue={0.95}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={8}
            onPress={() => {
              haptics.tap();
              onDismiss();
              action.onPress();
            }}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.actionLabel}>{action.label}</Text>
          </PressableScale>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function getIconColor(
  variant: ToastVariant,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (variant) {
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
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 44,
    minHeight: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  actionLabel: {
    ...Typography.caption1,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
});
