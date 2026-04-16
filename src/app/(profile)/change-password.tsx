import React, { useCallback, useState } from 'react';
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
import { Lock, Check } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import {
  Typography,
  Spacing,
  BorderRadius,
} from '../../constants/theme';

export default function ChangePasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const user = useStore((s) => s.user);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const canSave =
    !busy &&
    current.length >= 8 &&
    next.length >= 8 &&
    next === confirm &&
    next !== current;

  const save = useCallback(async () => {
    if (!user?.email || !canSave) return;
    haptics.confirm();
    setBusy(true);

    // Re-authenticate with current password to confirm it really is the user
    const reauth = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (reauth.error) {
      setBusy(false);
      haptics.error();
      toast.error('Wrong password: Your current password is incorrect.');
      return;
    }

    const update = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (update.error) {
      haptics.error();
      toast.error('Could not update: ' + update.error.message);
      return;
    }
    haptics.success();
    setDone(true);
    setTimeout(() => router.back(), 1500);
  }, [canSave, current, haptics, next, router, user?.email]);

  if (done) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Password" />
        <View style={styles.centered}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <View style={[styles.iconCircle, { backgroundColor: colors.successLight }]}>
              <Check size={40} color={colors.success} strokeWidth={2.5} />
            </View>
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.duration(500).delay(100)}
            style={[styles.title, { color: colors.text }]}

            accessibilityRole="header"
          >
            Password updated
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.duration(500).delay(200)}
            style={[styles.body, { color: colors.textSecondary }]}
          >
            Use your new password from now on.
          </Animated.Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Change password" />
      <View
        style={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.section}>
          <View
            style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}
          >
            <Lock size={40} color={colors.onPrimary} strokeWidth={1.75} />
          </View>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            Change your password
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Use at least 8 characters. Mix letters, numbers and symbols for a
            stronger one.
          </Text>

          <Input
            label="Current password"
            value={current}
            onChangeText={setCurrent}
            placeholder="Your current password"
            secureTextEntry
            autoFocus
            icon={<Lock size={18} color={colors.textTertiary} strokeWidth={2} />}
          />
          <Input
            label="New password"
            value={next}
            onChangeText={setNext}
            placeholder="At least 8 characters"
            secureTextEntry
            icon={<Lock size={18} color={colors.textTertiary} strokeWidth={2} />}
          />
          <Input
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat the new password"
            secureTextEntry
          />
          {next.length > 0 && next.length < 8 && (
            <Text style={[styles.warn, { color: colors.warning }]}>
              Password must be at least 8 characters.
            </Text>
          )}
          {confirm.length > 0 && next !== confirm && (
            <Text style={[styles.warn, { color: colors.error }]}>
              Passwords don't match.
            </Text>
          )}
          {next.length >= 8 && next === current && (
            <Text style={[styles.warn, { color: colors.error }]}>
              New password must be different from the current one.
            </Text>
          )}

          <Button
            title={busy ? 'Updating…' : 'Update password'}
            onPress={save}
            size="lg"
            fullWidth
            loading={busy}
            disabled={!canSave}
            accessibilityLabel="Update password"
            accessibilityHint="Saves your new password"
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.md,
    alignItems: 'stretch',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.title1, textAlign: 'center' },
  body: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  warn: { ...Typography.footnote, marginTop: -Spacing.xs },
});
