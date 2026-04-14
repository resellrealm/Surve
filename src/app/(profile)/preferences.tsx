import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Sun, Moon, Monitor, Check } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

const THEME_OPTIONS = [
  { id: 'light' as const, label: 'Light', Icon: Sun },
  { id: 'dark' as const, label: 'Dark', Icon: Moon },
  { id: 'system' as const, label: 'Match system', Icon: Monitor },
];

export default function PreferencesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const themePreference = useStore((s) => s.themePreference);
  const setThemePreference = useStore((s) => s.setThemePreference);

  const [pushOn, setPushOn] = React.useState(true);
  const [emailOn, setEmailOn] = React.useState(true);
  const [marketing, setMarketing] = React.useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Pressable onPress={() => { haptics.light(); router.back(); }} style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]} hitSlop={8}>
          <ChevronLeft size={20} color={colors.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Preferences</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 40, gap: Spacing.xl }}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>APPEARANCE</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            {THEME_OPTIONS.map((opt, i) => {
              const selected = themePreference === opt.id;
              const Icon = opt.Icon;
              return (
                <React.Fragment key={opt.id}>
                  <Pressable
                    onPress={() => { haptics.selection(); setThemePreference(opt.id); }}
                    style={styles.row}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSecondary }]}>
                      <Icon size={18} color={colors.text} strokeWidth={2} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{opt.label}</Text>
                    {selected && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
                  </Pressable>
                  {i < THEME_OPTIONS.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>NOTIFICATIONS</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <ToggleRow label="Push notifications" value={pushOn} onChange={setPushOn} colors={colors} />
            <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
            <ToggleRow label="Email updates" value={emailOn} onChange={setEmailOn} colors={colors} />
            <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
            <ToggleRow label="Marketing emails" value={marketing} onChange={setMarketing} colors={colors} />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceSecondary, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.headline, fontWeight: '700' },

  sectionLabel: { ...Typography.caption2, fontWeight: '700', letterSpacing: 0.8, marginBottom: Spacing.sm, paddingLeft: Spacing.sm },
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
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { ...Typography.subheadline, fontWeight: '500' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.md + 36 + Spacing.md },
});
