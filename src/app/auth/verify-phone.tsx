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
import { Phone, RefreshCw, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { toast } from '../../lib/toast';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { sendPhoneOtp, verifyPhoneOtp } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

type Step = 'enter' | 'verify' | 'done';
const CODE_LENGTH = 6;

export default function VerifyPhoneScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const user = useStore((s) => s.user);

  const [step, setStep] = useState<Step>('enter');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setTimeout(() => setCooldownLeft((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldownLeft]);

  const formatPhone = useCallback((raw: string) => {
    const digits = raw.replace(/[^+0-9]/g, '');
    return digits;
  }, []);

  const handleSendCode = useCallback(async () => {
    const cleaned = phone.trim();
    if (cleaned.length < 10) {
      toast.error('Enter a valid phone number with country code (e.g. +1 555 123 4567).');
      return;
    }
    setSending(true);
    haptics.confirm();
    const success = await sendPhoneOtp(cleaned);
    setSending(false);
    if (success) {
      haptics.success();
      setCooldownLeft(60);
      setStep('verify');
    } else {
      haptics.error();
      toast.error('Could not send SMS. Check the number and try again.');
    }
  }, [phone, haptics]);

  const handleVerify = useCallback(async () => {
    if (code.length < CODE_LENGTH) {
      toast.warning('Enter the full 6-digit code from your SMS.');
      return;
    }
    setVerifying(true);
    haptics.confirm();
    const result = await verifyPhoneOtp(phone.trim(), code);
    setVerifying(false);
    if (result.ok) {
      if (user) {
        await supabase
          .from('users')
          .update({
            phone: phone.trim(),
            phone_verified_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
      haptics.success();
      setStep('done');
      setTimeout(() => router.back(), 1500);
    } else {
      haptics.error();
      toast.error('Incorrect code: ' + (result.message || 'That code is invalid or expired.'));
    }
  }, [code, phone, haptics, router, user]);

  const handleResend = useCallback(async () => {
    if (cooldownLeft > 0) return;
    setSending(true);
    haptics.tap();
    const success = await sendPhoneOtp(phone.trim());
    setSending(false);
    if (success) {
      setCooldownLeft(60);
      toast.success('A new code has been sent to your phone.');
    } else {
      toast.error('Failed to resend. Try again in a moment.');
    }
  }, [cooldownLeft, haptics, phone]);

  if (step === 'done') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Verify Phone" />
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.centered}>
            <CheckCircle size={72} color={colors.success} strokeWidth={1.5} />
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Phone verified</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Taking you back…
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
      <ScreenHeader title="Verify Phone" />
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        {step === 'enter' && (
          <>
            <Animated.View entering={FadeInDown.duration(500)} style={styles.iconSection}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Phone size={48} color={colors.onPrimary} strokeWidth={1.5} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(80)}>
              <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Add your phone</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                A verified phone number adds a trust badge to your profile
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(160)} style={styles.form}>
              <Input
                label="Phone number"
                value={phone}
                onChangeText={(t) => setPhone(formatPhone(t))}
                keyboardType="phone-pad"
                placeholder="+1 555 123 4567"
                autoComplete="tel"
                autoFocus
                icon={<Phone size={18} color={colors.textTertiary} strokeWidth={2} />}
              />
              <Button
                title="Send Code"
                onPress={handleSendCode}
                loading={sending}
                disabled={sending || phone.trim().length < 10}
                size="lg"
                fullWidth
                accessibilityLabel="Send verification code"
                accessibilityHint="Sends a verification code to your phone number"
              />
            </Animated.View>
          </>
        )}

        {step === 'verify' && (
          <>
            <Animated.View entering={FadeInDown.duration(500)} style={styles.iconSection}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Phone size={48} color={colors.onPrimary} strokeWidth={1.5} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(80)}>
              <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Enter your code</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                We sent a {CODE_LENGTH}-digit code to
              </Text>
              <Text style={[styles.phone, { color: colors.text }]}>{phone}</Text>
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
                disabled={verifying || code.length < CODE_LENGTH}
                size="lg"
                fullWidth
                accessibilityLabel="Verify phone code"
                accessibilityHint="Verifies the code sent to your phone"
              />
              <Button
                title={
                  cooldownLeft > 0
                    ? `Resend in ${cooldownLeft}s`
                    : sending
                      ? 'Sending…'
                      : 'Resend code'
                }
                onPress={handleResend}
                variant="outline"
                size="lg"
                fullWidth
                disabled={cooldownLeft > 0 || sending}
                icon={<RefreshCw size={18} color={colors.primary} strokeWidth={2} />}
                accessibilityLabel={cooldownLeft > 0 ? `Resend code available in ${cooldownLeft} seconds` : 'Resend verification code'}
                accessibilityHint="Sends a new verification code to your phone"
              />
            </Animated.View>
          </>
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
  phone: {
    ...Typography.headline,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  form: { gap: Spacing.md, marginTop: Spacing.xxxl },
});
