import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  Trash2,
  AlertTriangle,
  Download,
  Check,
  Lock,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { deleteAccount, exportMyData } from '../../lib/api';
import { requireBiometric } from '../../lib/biometric';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import {
  Typography,
  Spacing,
  BorderRadius,
} from '../../constants/theme';

type Step = 'warning' | 'confirm';

const CONFIRM_PHRASE = 'DELETE';

const WHAT_HAPPENS: { Icon: typeof Check; text: string; bad?: boolean }[] = [
  { Icon: Trash2, text: 'Your profile, photos, and listings are removed', bad: true },
  { Icon: Trash2, text: 'Your conversations become anonymized on the other end', bad: true },
  { Icon: Trash2, text: 'Stripe Connect is disconnected (creators)', bad: true },
  { Icon: Check, text: 'Completed bookings stay on record for tax/compliance' },
  { Icon: Check, text: 'Reviews you wrote stay but show as "Deleted user"' },
];

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { user, logout } = useStore();

  const [step, setStep] = useState<Step>('warning');
  const [password, setPassword] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!user) return;
    setExporting(true);
    haptics.tap();
    try {
      const dump = await exportMyData(user.id);
      const uri = FileSystem.cacheDirectory + `surve-data-${user.id}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(dump, null, 2));
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Your Surve data export',
          UTI: 'public.json',
        });
      } else {
        toast.success('Your data export is ready but sharing is unavailable on this device.');
      }
    } catch (e) {
      toast.error(`Export failed: ${e instanceof Error ? e.message : 'Try again.'}`);
    } finally {
      setExporting(false);
    }
  }, [user, haptics]);

  const handleContinue = useCallback(() => {
    haptics.warning();
    setStep('confirm');
  }, [haptics]);

  const handleDelete = useCallback(async () => {
    if (confirmWord !== CONFIRM_PHRASE) {
      toast.warning('Type DELETE in the confirmation box to continue.');
      return;
    }
    if (password.length < 8) {
      toast.warning('We need your password to confirm it really is you.');
      return;
    }
    const bio = await requireBiometric('Confirm deleting your Surve account');
    if (!bio.ok) {
      haptics.error();
      return;
    }
    haptics.warning();
    setDeleting(true);
    const result = await deleteAccount(password);
    setDeleting(false);
    if (!result.ok) {
      haptics.error();
      if (result.code === 'password_incorrect') {
        toast.error('Wrong password: Check your password and try again.');
      } else if (result.code === 'open_bookings_exist') {
        toast.error(`Open bookings: You have ${result.count ?? 'some'} open booking(s). Resolve or cancel them before deleting your account.`);
      } else {
        toast.error(`Could not delete: ${result.code}`);
      }
      return;
    }
    haptics.success();
    toast.success("Account deleted — we're sorry to see you go. Goodbye from Surve.");
    logout();
    router.replace('/auth/login');
  }, [confirmWord, password, haptics, logout, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Delete account" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.huge,
          gap: Spacing.xl,
        }}
      >
        {step === 'warning' && (
          <>
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={styles.heroBlock}
            >
              <View
                style={[styles.heroIcon, { backgroundColor: colors.errorLight }]}
              >
                <AlertTriangle size={40} color={colors.error} strokeWidth={1.75} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]} accessibilityRole="header">
                Delete your account?
              </Text>
              <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
                This is permanent. Your account can't be recovered after 30 days.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                WHAT HAPPENS
              </Text>
              <Card padding={Spacing.sm}>
                {WHAT_HAPPENS.map((item, i) => (
                  <View
                    key={i}
                    style={[
                      styles.row,
                      i < WHAT_HAPPENS.length - 1 && {
                        borderBottomColor: colors.borderLight,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.rowIcon,
                        {
                          backgroundColor: item.bad
                            ? colors.errorLight
                            : colors.successLight,
                        },
                      ]}
                    >
                      <item.Icon
                        size={14}
                        color={item.bad ? colors.error : colors.success}
                        strokeWidth={2.5}
                      />
                    </View>
                    <Text style={[styles.rowText, { color: colors.text }]}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </Card>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(400).delay(160)}
              style={{ gap: Spacing.md }}
            >
              <PressableScale onPress={handleExport} disabled={exporting} accessibilityRole="button" accessibilityLabel="Export your data before deletion" accessibilityHint="Double tap to download a copy of your data">
                <Card>
                  <View style={styles.exportRow}>
                    <View
                      style={[
                        styles.rowIcon,
                        { backgroundColor: colors.activeLight, width: 40, height: 40 },
                      ]}
                    >
                      <Download size={18} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.exportTitle, { color: colors.text }]}>
                        {exporting ? 'Preparing…' : 'Download my data first'}
                      </Text>
                      <Text
                        style={[styles.exportHint, { color: colors.textSecondary }]}
                      >
                        Everything we hold about you, as a JSON file.
                      </Text>
                    </View>
                  </View>
                </Card>
              </PressableScale>

              <Button
                title="Continue to delete"
                onPress={handleContinue}
                variant="outline"
                size="lg"
                fullWidth
                icon={<Trash2 size={18} color={colors.error} strokeWidth={2} />}
                accessibilityLabel="Continue to delete account"
                accessibilityHint="Proceeds to the confirmation step for account deletion"
              />
            </Animated.View>
          </>
        )}

        {step === 'confirm' && (
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={{ gap: Spacing.lg }}
          >
            <View style={styles.heroBlock}>
              <View
                style={[styles.heroIcon, { backgroundColor: colors.errorLight }]}
              >
                <Trash2 size={40} color={colors.error} strokeWidth={1.75} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]} accessibilityRole="header">
                One last check
              </Text>
              <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
                Confirm your password and type DELETE below.
              </Text>
            </View>

            <Input
              label="Your password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              icon={<Lock size={18} color={colors.textTertiary} strokeWidth={2} />}
            />
            <Input
              label="Type DELETE to confirm"
              value={confirmWord}
              onChangeText={(t) => setConfirmWord(t.toUpperCase())}
              placeholder="DELETE"
              autoCapitalize="characters"
              maxLength={6}
            />

            <Button
              title={deleting ? 'Deleting…' : 'Delete my account'}
              onPress={handleDelete}
              size="lg"
              fullWidth
              loading={deleting}
              disabled={
                deleting || confirmWord !== CONFIRM_PHRASE || password.length < 8
              }
              style={{ backgroundColor: colors.error }}
              accessibilityLabel="Delete my account permanently"
              accessibilityHint="Permanently deletes your account and all associated data"
            />
            <Button
              title="Cancel"
              onPress={() => setStep('warning')}
              variant="outline"
              size="lg"
              fullWidth
              disabled={deleting}
            />
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroBlock: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { ...Typography.title1, textAlign: 'center' },
  heroBody: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  sectionLabel: {
    ...Typography.caption2,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { ...Typography.subheadline, flex: 1 },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  exportTitle: { ...Typography.subheadline, fontWeight: '600' },
  exportHint: { ...Typography.caption1, marginTop: 2 },
});
