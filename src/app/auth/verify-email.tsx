import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { toast } from '../../lib/toast';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { resendVerificationEmail, verifyEmailOtp } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

const CODE_LENGTH = 8;

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const user = useStore((s) => s.user);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setTimeout(() => setCooldownLeft((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldownLeft]);

  const handleVerify = useCallback(async () => {
    if (!user?.email) {
      toast.error('No email on record.');
      return;
    }
    if (code.length < 4) {
      toast.warning('Check your inbox for the code we sent.');
      return;
    }
    setVerifying(true);
    haptics.confirm();
    const result = await verifyEmailOtp(user.email, code);
    setVerifying(false);
    if (result.ok) {
      haptics.success();
      setVerified(true);
      setTimeout(() => router.replace('/(tabs)'), 1200);
    } else {
      haptics.error();
      toast.error('Incorrect code: ' + (result.message || 'That code is invalid or expired.'));
    }
  }, [code, haptics, router, user?.email]);

  const handleResend = useCallback(async () => {
    if (!user?.email || cooldownLeft > 0) return;
    setResending(true);
    haptics.tap();
    const success = await resendVerificationEmail(user.email);
    setResending(false);
    if (success) {
      setCooldownLeft(60);
      toast.success('A new code has been sent to your email.');
    } else {
      toast.error('Failed to resend. Try again in a moment.');
    }
  }, [cooldownLeft, haptics, user?.email]);

  if (verified) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Verify Email" />
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.centered}>
            <CheckCircle size={72} color={colors.success} strokeWidth={1.5} />
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Email verified</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Taking you in…
            </Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Verify Email" />
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.iconSection}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Mail size={48} color={colors.onPrimary} strokeWidth={1.5} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(80)}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Check your inbox</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We sent a {CODE_LENGTH}-digit code to
          </Text>
          <Text style={[styles.email, { color: colors.text }]}>
            {user?.email ?? 'your email'}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(160)} style={styles.form}>
          <Input
            label="Verification code"
            value={code}
            onChangeText={(t) =>
              setCode(t.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH))
            }
            keyboardType="number-pad"
            placeholder={'0'.repeat(CODE_LENGTH)}
            maxLength={CODE_LENGTH}
            autoFocus
          />
          <Button
            title="Verify"
            onPress={handleVerify}
            loading={verifying}
            disabled={verifying || code.length < 4}
            size="lg"
            fullWidth
          />
          <Button
            title={
              cooldownLeft > 0
                ? `Resend in ${cooldownLeft}s`
                : resending
                  ? 'Sending…'
                  : 'Resend code'
            }
            onPress={handleResend}
            variant="outline"
            size="lg"
            fullWidth
            disabled={cooldownLeft > 0 || resending}
            icon={<RefreshCw size={18} color={colors.primary} strokeWidth={2} />}
          />
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    justifyContent: 'center',
  },
  centered: { alignItems: 'center', gap: Spacing.md },
  iconSection: { alignItems: 'center', marginBottom: Spacing.xxl },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.title1, textAlign: 'center' },
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
  form: { gap: Spacing.md, marginTop: Spacing.xxxl },
});
