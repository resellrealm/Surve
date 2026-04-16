import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Phone, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { sendPhoneOtp, verifyPhoneOtp } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

type Step = 'enter' | 'verify' | 'done';

export default function VerifyPhoneScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const user = useStore((s) => s.user);

  const [step, setStep] = useState<Step>('enter');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = useCallback(async () => {
    if (!phone.trim() || phone.length < 10) {
      toast.warning('Enter a valid phone number with country code');
      return;
    }
    setLoading(true);
    haptics.confirm();
    const success = await sendPhoneOtp(phone.trim());
    setLoading(false);
    if (success) {
      haptics.success();
      setStep('verify');
    } else {
      haptics.error();
      toast.error('Failed to send code. Check the number and try again.');
    }
  }, [phone, haptics]);

  const verifyCode = useCallback(async () => {
    if (code.length !== 6) {
      toast.warning('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    haptics.confirm();
    const result = await verifyPhoneOtp(phone.trim(), code);
    setLoading(false);
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
    } else {
      haptics.error();
      toast.error(result.message || 'Invalid code');
    }
  }, [phone, code, user, haptics]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Verify Phone" />

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.huge }]}>
        {step === 'enter' && (
          <Animated.View entering={FadeInDown.duration(600)} style={styles.section}>
            <Phone size={48} color={colors.primary} strokeWidth={1.5} />
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Add your phone</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              A verified phone number adds a trust badge to your profile
            </Text>
            <Input
              label="Phone Number"
              placeholder="+1 555 123 4567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              icon={<Phone size={18} color={colors.textTertiary} strokeWidth={2} />}
            />
            <Button
              title="Send Code"
              onPress={sendCode}
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading || phone.length < 10}
              accessibilityLabel="Send verification code"
              accessibilityHint="Sends a verification code to your phone number"
            />
          </Animated.View>
        )}

        {step === 'verify' && (
          <Animated.View entering={FadeInDown.duration(600)} style={styles.section}>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Enter code</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We sent a 6-digit code to {phone}
            </Text>
            <Input
              label="Verification Code"
              placeholder="123456"
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Button
              title="Verify"
              onPress={verifyCode}
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading || code.length !== 6}
              accessibilityLabel="Verify phone code"
              accessibilityHint="Verifies the code sent to your phone"
            />
          </Animated.View>
        )}

        {step === 'done' && (
          <Animated.View entering={FadeInDown.duration(600)} style={styles.section}>
            <CheckCircle size={64} color={colors.success} strokeWidth={1.5} />
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Phone verified!</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your profile now shows a verified phone badge
            </Text>
            <Button
              title="Done"
              onPress={() => router.back()}
              size="lg"
              fullWidth
            />
          </Animated.View>
        )}
      </View>
    </View>
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
    gap: Spacing.lg,
    width: '100%',
  },
  title: { ...Typography.title1, textAlign: 'center' },
  subtitle: { ...Typography.body, textAlign: 'center', marginBottom: Spacing.md },
});
