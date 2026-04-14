import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, CreditCard, Plus, Star, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { mockPaymentMethods, type PaymentMethod } from '../../lib/mockData';

function formatBrand(brand: PaymentMethod['brand']) {
  if (brand === 'apple_pay') return 'Apple Pay';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export default function PaymentMethodsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [methods, setMethods] = useState(mockPaymentMethods);

  const makeDefault = (id: string) => {
    haptics.selection();
    setMethods((prev) => prev.map((m) => ({ ...m, is_default: m.id === id })));
  };

  const remove = (id: string) => {
    haptics.warning();
    setMethods((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Pressable
          onPress={() => { haptics.light(); router.back(); }}
          style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
          hitSlop={8}
        >
          <ChevronLeft size={20} color={colors.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Payment methods</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 80, gap: Spacing.md }}>
        {methods.map((pm, i) => (
          <Animated.View
            key={pm.id}
            entering={FadeInDown.duration(350).delay(i * 60)}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
          >
            <View style={[styles.cardIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <CreditCard size={22} color={colors.text} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {formatBrand(pm.brand)} {pm.last4 ? `•• ${pm.last4}` : ''}
                </Text>
                {pm.is_default && (
                  <View style={[styles.defaultChip, { backgroundColor: colors.activeLight }]}>
                    <Star size={10} color={colors.primary} strokeWidth={2.5} fill={colors.primary} />
                    <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>
                {pm.exp_year
                  ? `Expires ${String(pm.exp_month).padStart(2, '0')}/${String(pm.exp_year).slice(-2)}`
                  : 'Face ID / Touch ID'}
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm }}>
                {!pm.is_default && (
                  <Pressable onPress={() => makeDefault(pm.id)}>
                    <Text style={[styles.actionText, { color: colors.primary }]}>Set as default</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => remove(pm.id)}>
                  <Text style={[styles.actionText, { color: colors.error }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        ))}

        <Pressable
          onPress={() => { haptics.medium(); router.push('/(payment)/add-method'); }}
          style={[styles.addBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: colors.activeLight }]}>
            <Plus size={22} color={colors.primary} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Add payment method</Text>
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>Card, Apple Pay or bank</Text>
          </View>
        </Pressable>
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

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...Typography.headline, fontWeight: '700' },
  cardMeta: { ...Typography.footnote, marginTop: 2 },

  defaultChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  defaultText: { ...Typography.caption2, fontWeight: '700' },
  actionText: { ...Typography.footnote, fontWeight: '700' },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
