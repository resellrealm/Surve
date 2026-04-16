import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { ShieldCheck, Copy, ExternalLink, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import {
  enrollTotp,
  listMfaFactors,
  unenrollMfa,
  verifyTotpEnrollment,
} from '../../lib/api';
import { toast } from '../../lib/toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PressableScale } from '../../components/ui/PressableScale';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

type Mode = 'loading' | 'idle' | 'enrolling' | 'enrolled';

export default function TwoFactorScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const [mode, setMode] = useState<Mode>('loading');
  const [existingFactorId, setExistingFactorId] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setMode('loading');
    const factors = await listMfaFactors();
    const verified = factors.find((f) => f.type === 'totp' && f.status === 'verified');
    if (verified) {
      setExistingFactorId(verified.id);
      setMode('enrolled');
    } else {
      const unverified = factors.find((f) => f.type === 'totp' && f.status === 'unverified');
      if (unverified) {
        await unenrollMfa(unverified.id);
      }
      setExistingFactorId(null);
      setMode('idle');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleEnroll = useCallback(async () => {
    setBusy(true);
    haptics.confirm();
    const result = await enrollTotp();
    setBusy(false);
    if (!result.ok) {
      haptics.error();
      toast.error(result.message);
      return;
    }
    setFactorId(result.factorId);
    setQrSvg(result.qrSvg);
    setSecret(result.secret);
    setUri(result.uri);
    setMode('enrolling');
  }, [haptics]);

  const handleVerify = useCallback(async () => {
    if (!factorId || code.length !== 6) return;
    setBusy(true);
    haptics.confirm();
    const result = await verifyTotpEnrollment(factorId, code);
    setBusy(false);
    if (!result.ok) {
      haptics.error();
      toast.error(`Incorrect code: ${result.message || 'The code is invalid.'}`);
      return;
    }
    haptics.success();
    toast.success('Two-factor authentication is now active on your account.');
    setCode('');
    setFactorId(null);
    setQrSvg(null);
    setSecret(null);
    setUri(null);
    await refresh();
  }, [code, factorId, haptics, refresh]);

  const handleCancelEnrollment = useCallback(async () => {
    if (factorId) {
      await unenrollMfa(factorId);
    }
    setCode('');
    setFactorId(null);
    setQrSvg(null);
    setSecret(null);
    setUri(null);
    setMode('idle');
  }, [factorId]);

  const handleDisable = useCallback(() => {
    if (!existingFactorId) return;
    Alert.alert(
      'Disable two-factor?',
      'You will only need your password to sign in. This reduces account security.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            haptics.warning();
            const ok = await unenrollMfa(existingFactorId);
            setBusy(false);
            if (ok) {
              haptics.success();
              await refresh();
            } else {
              toast.error('Failed to disable 2FA. Try again.');
            }
          },
        },
      ]
    );
  }, [existingFactorId, haptics, refresh]);

  const handleCopySecret = useCallback(async () => {
    if (!secret) return;
    await Clipboard.setStringAsync(secret);
    haptics.success();
    toast.success('Secret copied to clipboard.');
  }, [haptics, secret]);

  const handleOpenAuthenticator = useCallback(async () => {
    if (!uri) return;
    haptics.tap();
    const canOpen = await Linking.canOpenURL(uri);
    if (canOpen) {
      await Linking.openURL(uri);
    } else {
      toast.info('No authenticator found: Install Google Authenticator, Authy, or 1Password and scan the QR code.');
    }
  }, [haptics, uri]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Two-Factor Auth" />

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + 40,
          gap: Spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'loading' && (
          <Text style={[styles.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Loading…
          </Text>
        )}

        {mode === 'idle' && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: Spacing.lg }}>
            <View style={styles.heroIconWrap}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <ShieldCheck size={48} color={colors.onPrimary} strokeWidth={1.5} />
              </View>
            </View>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
              Protect your account
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Add a second step when you sign in by generating a 6-digit code from an
              authenticator app (Google Authenticator, Authy, 1Password).
            </Text>
            <Button
              title="Enable 2FA"
              onPress={handleEnroll}
              loading={busy}
              disabled={busy}
              size="lg"
              fullWidth
              accessibilityLabel="Enable two-factor authentication"
              accessibilityHint="Begins the setup process for two-factor authentication"
            />
          </Animated.View>
        )}

        {mode === 'enrolling' && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: Spacing.lg }}>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Scan with authenticator</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Open your authenticator app and scan the QR code, then enter the 6-digit code
              it generates.
            </Text>

            {qrSvg && (
              <View
                style={[
                  styles.qrCard,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                ]}
                accessibilityRole="image"
                accessibilityLabel="QR code for authenticator app setup"
              >
                <SvgXml xml={qrSvg} width={220} height={220} />
              </View>
            )}

            {secret && (
              <View
                style={[
                  styles.secretCard,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                ]}
              >
                <Text style={[styles.secretLabel, { color: colors.textTertiary }]}>
                  OR ENTER MANUALLY
                </Text>
                <Text style={[styles.secretValue, { color: colors.text }]}>{secret}</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <PressableScale
                    scaleValue={0.95}
                    onPress={handleCopySecret}
                    style={[styles.smallBtn, { backgroundColor: colors.surfaceSecondary }]}
                    accessibilityRole="button"
                    accessibilityLabel="Copy secret key"
                  >
                    <Copy size={16} color={colors.text} strokeWidth={2} />
                    <Text style={[styles.smallBtnText, { color: colors.text }]}>Copy</Text>
                  </PressableScale>
                  <PressableScale
                    scaleValue={0.95}
                    onPress={handleOpenAuthenticator}
                    style={[styles.smallBtn, { backgroundColor: colors.surfaceSecondary }]}
                    accessibilityRole="button"
                    accessibilityLabel="Open authenticator app"
                  >
                    <ExternalLink size={16} color={colors.text} strokeWidth={2} />
                    <Text style={[styles.smallBtnText, { color: colors.text }]}>
                      Open app
                    </Text>
                  </PressableScale>
                </View>
              </View>
            )}

            <Input
              label="6-digit code"
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="000000"
              maxLength={6}
            />
            <Button
              title="Confirm and enable"
              onPress={handleVerify}
              loading={busy}
              disabled={busy || code.length !== 6}
              size="lg"
              fullWidth
              accessibilityLabel="Confirm and enable two-factor authentication"
              accessibilityHint="Verifies your code and activates two-factor authentication"
            />
            <Button
              title="Cancel"
              onPress={handleCancelEnrollment}
              variant="outline"
              size="lg"
              fullWidth
              disabled={busy}
            />
          </Animated.View>
        )}

        {mode === 'enrolled' && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: Spacing.lg }}>
            <View style={styles.heroIconWrap}>
              <View style={[styles.iconCircle, { backgroundColor: colors.successLight }]}>
                <ShieldCheck size={48} color={colors.success} strokeWidth={1.5} />
              </View>
            </View>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">2FA is on</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              You'll be asked for a 6-digit code from your authenticator app each time you
              sign in.
            </Text>
            <Button
              title="Disable 2FA"
              onPress={handleDisable}
              loading={busy}
              disabled={busy}
              variant="outline"
              size="lg"
              fullWidth
              icon={<Trash2 size={18} color={colors.error} strokeWidth={2} />}
              accessibilityLabel="Disable two-factor authentication"
              accessibilityHint="Removes two-factor authentication from your account"
            />
            <Button
              title="Done"
              onPress={() => router.back()}
              size="lg"
              fullWidth
            />
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroIconWrap: { alignItems: 'center', marginTop: Spacing.xl },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.title1, textAlign: 'center' },
  body: { ...Typography.body, lineHeight: 22 },
  qrCard: {
    alignSelf: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  secretCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  secretLabel: { ...Typography.caption2, fontWeight: '700', letterSpacing: 0.8 },
  secretValue: { ...Typography.headline, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    minHeight: 44,
  },
  smallBtnText: { ...Typography.footnote, fontWeight: '600' },
});
