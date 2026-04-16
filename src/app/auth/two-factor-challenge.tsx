import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ShieldCheck, LogOut } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { toast } from '../../lib/toast';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { challengeAndVerifyTotp, signOut, getSession } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

export default function TwoFactorChallengeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { factorId } = useLocalSearchParams<{ factorId: string }>();
  const setUser = useStore((s) => s.setUser);
  const setSession = useStore((s) => s.setSession);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = useCallback(async () => {
    if (!factorId) {
      toast.error('Missing factor.');
      return;
    }
    if (code.length !== 6) return;
    setVerifying(true);
    haptics.confirm();
    const result = await challengeAndVerifyTotp(factorId, code);
    if (!result.ok) {
      setVerifying(false);
      haptics.error();
      toast.error('Incorrect code: ' + (result.message || 'The code is invalid or expired.'));
      return;
    }
    const sess = await getSession();
    setVerifying(false);
    if (sess) {
      setUser(sess.user);
      setSession(sess.session);
      haptics.success();
      router.replace('/(tabs)');
    } else {
      toast.error('Could not restore session. Please sign in again.');
      await signOut();
      router.replace('/auth/login');
    }
  }, [code, factorId, haptics, router, setSession, setUser]);

  const handleCancel = useCallback(async () => {
    haptics.tap();
    await signOut();
    router.replace('/auth/login');
  }, [haptics, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Two-Factor" onBack={handleCancel} />
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.iconSection}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <ShieldCheck size={48} color={colors.onPrimary} strokeWidth={1.5} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(80)}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Enter 2FA code</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Open your authenticator app and enter the 6-digit code for Surve.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(160)} style={styles.form}>
          <Input
            label="Authenticator code"
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="000000"
            maxLength={6}
            autoFocus
          />
          <Button
            title="Verify"
            onPress={handleVerify}
            loading={verifying}
            disabled={verifying || code.length !== 6}
            size="lg"
            fullWidth
            accessibilityLabel="Verify authenticator code"
            accessibilityHint="Verifies the 6-digit code from your authenticator app"
          />
          <Button
            title="Cancel and sign out"
            onPress={handleCancel}
            variant="outline"
            size="lg"
            fullWidth
            icon={<LogOut size={18} color={colors.primary} strokeWidth={2} />}
            accessibilityLabel="Cancel and sign out"
            accessibilityHint="Signs you out and returns to the login screen"
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
    paddingHorizontal: Spacing.md,
  },
  form: { gap: Spacing.md, marginTop: Spacing.xxxl },
});
