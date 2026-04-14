import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { resendVerificationEmail } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useStore();

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const handleResend = useCallback(async () => {
    if (!user?.email || cooldown) return;

    setResending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const success = await resendVerificationEmail(user.email);
    setResending(false);

    if (success) {
      Alert.alert('Email Sent', 'A new verification link has been sent to your email.');
      setCooldown(true);
      setTimeout(() => setCooldown(false), 60_000);
    } else {
      Alert.alert('Error', 'Failed to resend verification email. Please try again later.');
    }
  }, [user?.email, cooldown]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Verify Email" onBack={handleBack} />
      <View
        style={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        <Animated.View
          entering={FadeInDown.duration(600).delay(100)}
          style={styles.iconSection}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.primaryLight ?? colors.surfaceSecondary },
            ]}
          >
            <Mail size={48} color={colors.primary} strokeWidth={1.5} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <Text style={[styles.title, { color: colors.text }]}>
            Check your inbox
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We sent a verification link to
          </Text>
          <Text style={[styles.email, { color: colors.text }]}>
            {user?.email ?? 'your email'}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Click the link in the email to verify your account. If you don't see
            it, check your spam folder.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.actions}
        >
          <Button
            title={cooldown ? 'Email sent — check your inbox' : 'Resend verification email'}
            onPress={handleResend}
            loading={resending}
            disabled={cooldown}
            size="lg"
            fullWidth
            icon={<RefreshCw size={20} color={colors.onPrimary} strokeWidth={2} />}
          />
          <Button
            title="Go back"
            onPress={handleBack}
            variant="outline"
            size="lg"
            fullWidth
            icon={<ArrowLeft size={20} color={colors.primary} strokeWidth={2} />}
          />
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    justifyContent: 'center',
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.title1,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  email: {
    ...Typography.headline,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  description: {
    ...Typography.subheadline,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 22,
  },
  actions: {
    gap: Spacing.md,
    marginTop: Spacing.xxxl,
  },
});
