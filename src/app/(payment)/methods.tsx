import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CreditCard, Plus, Star, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ModalHeader } from '../../components/ui/ModalHeader';
import { PressableScale } from '../../components/ui/PressableScale';
import { Skeleton } from '../../components/ui/Skeleton';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { getPaymentMethods, deletePaymentMethod, setDefaultPaymentMethod } from '../../lib/api';
import { useStore } from '../../lib/store';
import type { PaymentMethod } from '../../types';

function formatBrand(brand: PaymentMethod['brand']) {
  if (brand === 'apple_pay') return 'Apple Pay';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export default function PaymentMethodsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const user = useStore((s) => s.user);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMethods = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await getPaymentMethods(user.id);
    setMethods(data);
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadMethods();
    }, [loadMethods]),
  );

  const makeDefault = async (id: string) => {
    haptics.select();
    setMethods((prev) => prev.map((m) => ({ ...m, is_default: m.id === id })));
    const ok = await setDefaultPaymentMethod(id);
    if (!ok) loadMethods();
  };

  const remove = async (id: string) => {
    haptics.warning();
    setMethods((prev) => prev.filter((m) => m.id !== id));
    const ok = await deletePaymentMethod(id);
    if (!ok) loadMethods();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ModalHeader />
      <ScreenHeader title="Payment Methods" />

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 80, gap: Spacing.md }}>
        {loading && methods.length === 0 && (
          <>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <Skeleton width={44} height={44} borderRadius={12} />
                <View style={{ flex: 1, gap: Spacing.xs }}>
                  <Skeleton width={140} height={16} />
                  <Skeleton width={100} height={12} />
                </View>
              </View>
            ))}
          </>
        )}
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
                  <PressableScale onPress={() => makeDefault(pm.id)} scaleValue={0.92} accessibilityRole="button" accessibilityLabel={`Set ${formatBrand(pm.brand)} ending in ${pm.last4} as default`} accessibilityHint="Makes this your primary payment method">
                    <Text style={[styles.actionText, { color: colors.primary }]}>Set as default</Text>
                  </PressableScale>
                )}
                <PressableScale onPress={() => remove(pm.id)} scaleValue={0.92} accessibilityRole="button" accessibilityLabel={`Remove ${formatBrand(pm.brand)} ending in ${pm.last4}`} accessibilityHint="Removes this payment method from your account">
                  <Text style={[styles.actionText, { color: colors.error }]}>Remove</Text>
                </PressableScale>
              </View>
            </View>
          </Animated.View>
        ))}

        <PressableScale
          onPress={() => { haptics.confirm(); router.push('/(payment)/add-method'); }}
          style={[styles.addBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Add payment method"
        >
          <View style={[styles.cardIcon, { backgroundColor: colors.activeLight }]}>
            <Plus size={22} color={colors.primary} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Add payment method</Text>
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>Card, Apple Pay or bank</Text>
          </View>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

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
