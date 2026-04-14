import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  Mail,
  Lock,
  Smartphone,
  ShieldCheck,
  FileText,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export default function AccountScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const user = useStore((s) => s.user);

  const rows = [
    { Icon: Mail, label: 'Email', value: user?.email ?? '—' },
    { Icon: Lock, label: 'Password', value: '•••••••••' },
    { Icon: Smartphone, label: 'Phone number', value: 'Add phone' },
    { Icon: ShieldCheck, label: 'Two-factor authentication', value: 'Off' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Pressable onPress={() => { haptics.light(); router.back(); }} style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]} hitSlop={8}>
          <ChevronLeft size={20} color={colors.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Account & Privacy</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 40, gap: Spacing.xl }}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>SIGN IN</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            {rows.map((r, i) => (
              <React.Fragment key={r.label}>
                <Pressable style={styles.row} onPress={() => haptics.light()}>
                  <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSecondary }]}>
                    <r.Icon size={18} color={colors.text} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{r.label}</Text>
                    <Text style={[styles.rowValue, { color: colors.textTertiary }]} numberOfLines={1}>
                      {r.value}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
                </Pressable>
                {i < rows.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>PRIVACY & DATA</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Pressable style={styles.row} onPress={() => haptics.light()}>
              <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <FileText size={18} color={colors.text} strokeWidth={2} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>Download my data</Text>
              <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
            </Pressable>
            <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
            <Pressable style={styles.row} onPress={() => haptics.warning()}>
              <View style={[styles.rowIcon, { backgroundColor: colors.errorLight }]}>
                <Trash2 size={18} color={colors.error} strokeWidth={2} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.error, flex: 1 }]}>Delete account</Text>
              <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
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
  rowLabel: { ...Typography.subheadline, fontWeight: '600' },
  rowValue: { ...Typography.footnote, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.md + 36 + Spacing.md },
});
