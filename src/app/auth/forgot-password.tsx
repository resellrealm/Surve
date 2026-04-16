import React, { useCallback, useRef, useState } from 'react';
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
import { KeyRound, Mail, Lock, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { toast } from '../../lib/toast';
import { useHaptics } from '../../hooks/useHaptics';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

type Step = 'request' | 'verify' | 'done';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const MAX_REQUESTS = 3;
  const WINDOW_MS = 60 * 60 * 1000;
  const resetAttemptsRef = useRef<Map<string, number[]>>(new Map());

  const checkRateLimit = useCallback((targetEmail: string): boolean => {
    const key = targetEmail.trim().toLowerCase();
    const now = Date.now();
    const attempts = resetAttemptsRef.current.get(key) ?? [];
    const recent = attempts.filter((t) => now - t < WINDOW_MS);
    resetAttemptsRef.current.set(key, recent);
    return recent.length >= MAX_REQUESTS;
  }, []);

  const recordAttempt = useCallback((targetEmail: string) => {
    const key = targetEmail.trim().toLowerCase();
    const now = Date.now();
    const attempts = resetAttemptsRef.current.get(key) ?? [];
    const recent = attempts.filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    resetAttemptsRef.current.set(key, recent);
  }, []);

  const sendCode = useCallback(async () => {
    if (!email.includes('@')) {
      toast.error('Invalid email: Enter the email on your Surve account.');
      return;
    }
    if (checkRateLimit(email)) {
      haptics.error();
      setRateLimited(true);
      toast.warning("Too many requests: You've reached the maximum of 3 reset requests per hour. Please try again later.");
      return;
    }
    setBusy(true);
    haptics.confirm();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (error) {
      haptics.error();
      toast.error(error.message);
      return;
    }
    recordAttempt(email);
    haptics.success();
    setRateLimited(false);
    setStep('verify');
  }, [checkRateLimit, email, haptics, recordAttempt]);

  const verifyAndReset = useCallback(async () => {
    if (token.length < 4) {
      toast.warning('Check your email for the code we sent.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password too short: Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match: Re-enter the same password.');
      return;
    }
    setBusy(true);
    haptics.confirm();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'recovery',
    });
    if (verifyError) {
      setBusy(false);
      haptics.error();
      toast.error('Invalid code: ' + verifyError.message);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setBusy(false);
    if (updateError) {
      haptics.error();
      toast.error('Could not update password: ' + updateError.message);
      return;
    }
    haptics.success();
    setStep('done');
  }, [confirm, email, haptics, password, token]);

  const back = useCallback(() => {
    haptics.tap();
    router.back();
  }, [haptics, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Reset password" onBack={back} />
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        {step === 'request' && (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.section}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
              <KeyRound size={48} color={colors.onPrimary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
              Forgot your password?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your email and we'll send you a code to reset it.
            </Text>
            <Input
              label="Email"
              value={email}
              onChangeText={(v) => { setEmail(v); setRateLimited(false); }}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              icon={<Mail size={18} color={colors.textTertiary} strokeWidth={2} />}
            />
            {rateLimited && (
              <Text style={[styles.rateLimitText, { color: colors.error }]}>
                Too many requests — try again in an hour.
              </Text>
            )}
            <Button
              title="Send code"
              onPress={sendCode}
              loading={busy}
              disabled={busy || !email.includes('@') || rateLimited}
              size="lg"
              fullWidth
              accessibilityLabel="Send password reset code"
              accessibilityHint="Sends a reset code to your email address"
            />
          </Animated.View>
        )}

        {step === 'verify' && (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.section}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
              <Lock size={48} color={colors.onPrimary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Enter new password</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We sent a code to {email}.
            </Text>
            <Input
              label="Code from email"
              value={token}
              onChangeText={(t) => setToken(t.replace(/[^0-9]/g, '').slice(0, 8))}
              keyboardType="number-pad"
              placeholder="00000000"
              maxLength={8}
              autoFocus
            />
            <Input
              label="New password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              icon={<Lock size={18} color={colors.textTertiary} strokeWidth={2} />}
            />
            <Input
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat new password"
              secureTextEntry
            />
            <Button
              title="Reset password"
              onPress={verifyAndReset}
              loading={busy}
              disabled={busy || token.length < 4 || password.length < 8}
              size="lg"
              fullWidth
              accessibilityLabel="Reset password"
              accessibilityHint="Verifies the code and sets your new password"
            />
          </Animated.View>
        )}

        {step === 'done' && (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.section}>
            <CheckCircle size={72} color={colors.success} strokeWidth={1.5} />
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
              Password updated
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              You can now sign in with your new password.
            </Text>
            <Button
              title="Go to sign in"
              onPress={() => router.replace('/auth/login')}
              size="lg"
              fullWidth
              accessibilityLabel="Go to sign in"
              accessibilityHint="Navigates to the sign in screen"
            />
          </Animated.View>
        )}
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
  section: {
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.title1, textAlign: 'center' },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  rateLimitText: {
    ...Typography.caption1,
    textAlign: 'center',
  },
});
