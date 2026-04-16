import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View, Text, useColorScheme, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RotateCcw, Home, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useHaptics } from '../hooks/useHaptics';
import { PressableScale } from './ui/PressableScale';
import { useStore } from '../lib/store';
import { captureError } from '../lib/sentry';

const SUPPORT_EMAIL = 'astropodzx@gmail.com';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  homeRoute?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) console.error('ErrorBoundary caught:', error, errorInfo);
    captureError(error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          homeRoute={this.props.homeRoute}
        />
      );
    }

    return this.props.children;
  }
}

function ErrorFallback({
  error,
  onRetry,
  homeRoute,
}: {
  error: Error | null;
  onRetry: () => void;
  homeRoute?: string;
}) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const themePreference = useStore((s) => s.themePreference);
  const scheme = themePreference === 'system' ? colorScheme : themePreference;
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const router = useRouter();

  const handleRetry = () => {
    haptics.confirm();
    onRetry();
  };

  const handleGoHome = () => {
    haptics.tap();
    onRetry();
    if (homeRoute) {
      router.replace(homeRoute as any);
    }
  };

  const handleReport = () => {
    haptics.tap();
    const subject = encodeURIComponent('Surve Crash Report');
    const body = encodeURIComponent(
      `Hi Surve team,\n\nThe app crashed with the following error:\n\n${error?.message ?? 'Unknown error'}\n\n---\nPlease describe what you were doing when the crash happened:\n\n`,
    );
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      accessibilityRole="alert"
    >
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        contentFit="contain"
        accessibilityRole="image"
        accessibilityLabel="Surve logo"
      />

      <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        An unexpected error occurred. Please try reloading the app.
      </Text>

      <View style={styles.actions}>
        <PressableScale
          scaleValue={0.95}
          onPress={handleRetry}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Reload the app"
        >
          <RotateCcw size={18} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.primaryButtonText}>Reload</Text>
        </PressableScale>

        <PressableScale
          scaleValue={0.95}
          onPress={handleReport}
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Report this issue via email"
        >
          <Mail size={18} color={colors.text} strokeWidth={2} />
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Report</Text>
        </PressableScale>

        {homeRoute && (
          <PressableScale
            scaleValue={0.95}
            onPress={handleGoHome}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Go to home screen"
          >
            <Home size={18} color={colors.text} strokeWidth={2} />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Go Home</Text>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.title2,
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
    maxWidth: 300,
  },
  actions: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 180,
    justifyContent: 'center',
    ...Shadows.sm,
  },
  primaryButtonText: {
    ...Typography.callout,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 180,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...Typography.callout,
    fontWeight: '600',
  },
});
