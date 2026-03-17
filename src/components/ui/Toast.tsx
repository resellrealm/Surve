import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius, Shadows, Springs } from '../../constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  show: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  hide: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// ─── Toast Indicator Colors ──────────────────────────────────────────────────

function getToastIcon(type: ToastType): string {
  switch (type) {
    case 'success': return '\u2713';
    case 'error': return '\u2715';
    case 'warning': return '!';
    case 'info': return 'i';
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const hide = useCallback(() => {
    translateY.value = withTiming(-120, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(clearToast)();
    });
  }, [translateY, opacity, clearToast]);

  const show = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 3000) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const id = Date.now().toString();
      setToast({ id, type, title, message, duration });

      translateY.value = -120;
      opacity.value = 0;

      translateY.value = withSpring(0, Springs.bouncy);
      opacity.value = withTiming(1, { duration: 200 });

      timeoutRef.current = setTimeout(() => {
        hide();
      }, duration);
    },
    [translateY, opacity, hide]
  );

  const success = useCallback((title: string, message?: string) => show('success', title, message), [show]);
  const error = useCallback((title: string, message?: string) => show('error', title, message), [show]);
  const warning = useCallback((title: string, message?: string) => show('warning', title, message), [show]);
  const info = useCallback((title: string, message?: string) => show('info', title, message), [show]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const getAccentColor = (type: ToastType): string => {
    switch (type) {
      case 'success': return colors.success;
      case 'error': return colors.error;
      case 'warning': return colors.warning;
      case 'info': return colors.primary;
    }
  };

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, hide }}>
      {children}

      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: insets.top + Spacing.sm,
            },
            animatedStyle,
          ]}
          pointerEvents="box-none"
        >
          <Pressable onPress={hide}>
            <View
              style={[
                styles.toast,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  ...Shadows.lg,
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${getAccentColor(toast.type)}20` },
                ]}
              >
                <Text
                  style={[
                    styles.iconText,
                    { color: getAccentColor(toast.type) },
                  ]}
                >
                  {getToastIcon(toast.type)}
                </Text>
              </View>

              <View style={styles.content}>
                <Text
                  style={[Typography.headline, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {toast.title}
                </Text>
                {toast.message ? (
                  <Text
                    style={[Typography.footnote, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {toast.message}
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: 2,
  },
});
