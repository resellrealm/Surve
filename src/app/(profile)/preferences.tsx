import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Sun,
  Moon,
  Monitor,
  Check,
  MessageSquare,
  Calendar,
  DollarSign,
  Star,
  Megaphone,
  Mail,
  Volume2,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { useChime } from '../../hooks/useChime';
import {
  DEFAULT_NOTIFICATION_PREFS,
  getNotificationPrefs,
  setNotificationPrefs as saveNotificationPrefs,
  type NotificationPrefs,
} from '../../lib/api';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PressableScale } from '../../components/ui/PressableScale';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';

const THEME_OPTIONS = [
  { id: 'light' as const, label: 'Light', Icon: Sun },
  { id: 'dark' as const, label: 'Dark', Icon: Moon },
  { id: 'system' as const, label: 'Match system', Icon: Monitor },
];

type PushRow = {
  key: keyof NotificationPrefs;
  label: string;
  sublabel: string;
  Icon: typeof MessageSquare;
};

const PUSH_ROWS: PushRow[] = [
  {
    key: 'messages',
    label: 'Messages',
    sublabel: 'New DMs from creators or businesses',
    Icon: MessageSquare,
  },
  {
    key: 'bookings',
    label: 'Booking updates',
    sublabel: 'Accepted, declined, proof submitted, completed',
    Icon: Calendar,
  },
  {
    key: 'payments',
    label: 'Payments & payouts',
    sublabel: 'Captures, releases, refunds',
    Icon: DollarSign,
  },
  {
    key: 'reviews',
    label: 'Reviews',
    sublabel: 'Someone left you a review',
    Icon: Star,
  },
  {
    key: 'marketing',
    label: 'Tips & promos',
    sublabel: 'Product updates and special offers',
    Icon: Megaphone,
  },
];

const EMAIL_ROWS: PushRow[] = [
  {
    key: 'email_messages',
    label: 'Message digest',
    sublabel: 'Daily summary of unread messages',
    Icon: MessageSquare,
  },
  {
    key: 'email_bookings',
    label: 'Booking receipts',
    sublabel: 'Confirmations and status changes',
    Icon: Calendar,
  },
  {
    key: 'email_payments',
    label: 'Payment receipts',
    sublabel: 'Invoices, payouts, refunds',
    Icon: DollarSign,
  },
  {
    key: 'email_marketing',
    label: 'Product updates',
    sublabel: 'New features and surveys',
    Icon: Megaphone,
  },
];

export default function PreferencesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const themePreference = useStore((s) => s.themePreference);
  const setThemePreference = useStore((s) => s.setThemePreference);
  const soundEnabled = useStore((s) => s.soundEnabled);
  const setSoundEnabled = useStore((s) => s.setSoundEnabled);
  const { playChime } = useChime();
  const user = useStore((s) => s.user);

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    getNotificationPrefs(user.id).then((p) => {
      setPrefs(p);
      setLoaded(true);
    });
  }, [user]);

  const toggle = useCallback(
    async (key: keyof NotificationPrefs) => {
      if (!user) return;
      haptics.select();
      setPrefs((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        saveNotificationPrefs(user.id, { [key]: next[key] });
        return next;
      });
    },
    [user, haptics]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Preferences" />

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + 40,
          gap: Spacing.xl,
        }}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            APPEARANCE
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            {THEME_OPTIONS.map((opt, i) => {
              const selected = themePreference === opt.id;
              const Icon = opt.Icon;
              return (
                <React.Fragment key={opt.id}>
                  <PressableScale
                    onPress={() => {
                      haptics.select();
                      setThemePreference(opt.id);
                    }}
                    style={styles.row}
                    accessibilityRole="radio"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected }}
                  >
                    <View
                      style={[
                        styles.rowIcon,
                        { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      <Icon size={18} color={colors.text} strokeWidth={2} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>
                      {opt.label}
                    </Text>
                    {selected && (
                      <Check size={20} color={colors.primary} strokeWidth={2.5} />
                    )}
                  </PressableScale>
                  {i < THEME_OPTIONS.length - 1 && (
                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: colors.borderLight },
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(60)}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            SOUND
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Volume2 size={18} color={colors.text} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>UI sounds</Text>
                <Text style={[styles.rowSubLabel, { color: colors.textTertiary }]}>
                  Soft chime on bookings, payouts & notifications
                </Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={(val) => {
                  haptics.select();
                  setSoundEnabled(val);
                  if (val) playChime();
                }}
                trackColor={{ false: colors.surfaceSecondary, true: colors.primary }}
                thumbColor="#fff"
                accessibilityRole="switch"
                accessibilityLabel="UI sounds: Soft chime on bookings, payouts & notifications"
                accessibilityState={{ checked: soundEnabled }}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            PUSH NOTIFICATIONS
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            {!loaded ? (
              <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height={48} width="100%" />
                ))}
              </View>
            ) : (
              PUSH_ROWS.map((r, i) => (
                <React.Fragment key={r.key}>
                  <PrefRow
                    row={r}
                    value={prefs[r.key]}
                    onToggle={() => toggle(r.key)}
                    colors={colors}
                  />
                  {i < PUSH_ROWS.length - 1 && (
                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: colors.borderLight },
                      ]}
                    />
                  )}
                </React.Fragment>
              ))
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <View style={styles.emailSectionHeader}>
            <Mail size={14} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              EMAIL
            </Text>
          </View>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            {!loaded ? (
              <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
                {[0, 1].map((i) => (
                  <Skeleton key={i} height={48} width="100%" />
                ))}
              </View>
            ) : (
              EMAIL_ROWS.map((r, i) => (
                <React.Fragment key={r.key}>
                  <PrefRow
                    row={r}
                    value={prefs[r.key]}
                    onToggle={() => toggle(r.key)}
                    colors={colors}
                  />
                  {i < EMAIL_ROWS.length - 1 && (
                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: colors.borderLight },
                      ]}
                    />
                  )}
                </React.Fragment>
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function PrefRow({
  row,
  value,
  onToggle,
  colors,
}: {
  row: PushRow;
  value: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const Icon = row.Icon;
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSecondary }]}>
        <Icon size={18} color={colors.text} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{row.label}</Text>
        <Text style={[styles.rowSubLabel, { color: colors.textTertiary }]}>
          {row.sublabel}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.surfaceSecondary, true: colors.primary }}
        thumbColor="#fff"
        accessibilityRole="switch"
        accessibilityLabel={`${row.label}: ${row.sublabel}`}
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: {
    ...Typography.caption2,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  emailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...Typography.subheadline, fontWeight: '600' },
  rowSubLabel: { ...Typography.caption1, marginTop: 2 },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md + 36 + Spacing.md,
  },
});
