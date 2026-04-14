import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  TrendingUp,
  Wallet,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { mockTransactions } from '../../lib/mockData';

function groupByMonth(txns: typeof mockTransactions) {
  const byMonth: Record<string, typeof mockTransactions> = {};
  for (const t of txns) {
    const key = new Date(t.created_at).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    (byMonth[key] ||= []).push(t);
  }
  return byMonth;
}

export default function EarningsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const { lifetime, pending, thisMonth, grouped } = useMemo(() => {
    const paid = mockTransactions.filter((t) => t.status === 'paid' && t.direction === 'incoming');
    const lifetime = paid.reduce((s, t) => s + t.amount, 0);
    const pending = mockTransactions
      .filter((t) => t.status === 'pending' && t.direction === 'incoming')
      .reduce((s, t) => s + t.amount, 0);
    const now = new Date();
    const thisMonth = paid
      .filter((t) => {
        const d = new Date(t.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, t) => s + t.amount, 0);
    return { lifetime, pending, thisMonth, grouped: groupByMonth(mockTransactions) };
  }, []);

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
        <Text style={[styles.title, { color: colors.text }]}>Earnings</Text>
        <Pressable hitSlop={8} onPress={() => { haptics.light(); }}>
          <Download size={20} color={colors.primary} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.hero, { backgroundColor: colors.primary }]}>
          <Wallet size={28} color={colors.onPrimary} strokeWidth={2} />
          <Text style={[styles.heroLabel, { color: 'rgba(255,255,255,0.8)' }]}>Lifetime earnings</Text>
          <Text style={[styles.heroAmount, { color: colors.onPrimary }]}>
            ${lifetime.toLocaleString()}
          </Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.7)' }]}>This month</Text>
              <Text style={[styles.heroStatValue, { color: colors.onPrimary }]}>
                ${thisMonth.toLocaleString()}
              </Text>
            </View>
            <View style={[styles.heroDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.7)' }]}>Pending</Text>
              <Text style={[styles.heroStatValue, { color: colors.onPrimary }]}>
                ${pending.toLocaleString()}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(80)}
          style={[styles.payoutCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        >
          <View style={[styles.payoutIcon, { backgroundColor: colors.activeLight }]}>
            <TrendingUp size={20} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.payoutTitle, { color: colors.text }]}>Next payout</Text>
            <Text style={[styles.payoutMeta, { color: colors.textSecondary }]}>
              ${pending.toLocaleString()} arrives Apr 17
            </Text>
          </View>
          <Pressable onPress={() => { haptics.light(); router.push('/(payment)/methods'); }}>
            <Text style={[styles.payoutLink, { color: colors.primary }]}>Payout details</Text>
          </Pressable>
        </Animated.View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>

        {Object.entries(grouped).map(([month, txns], gi) => (
          <View key={month} style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
            <Text style={[styles.monthLabel, { color: colors.textTertiary }]}>{month.toUpperCase()}</Text>
            {txns.map((t, i) => (
              <Animated.View
                key={t.id}
                entering={FadeInDown.duration(350).delay((gi * 4 + i) * 40)}
                style={[styles.txn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              >
                <View
                  style={[
                    styles.txnIcon,
                    { backgroundColor: t.direction === 'incoming' ? colors.completedLight : colors.surfaceSecondary },
                  ]}
                >
                  {t.direction === 'incoming' ? (
                    <ArrowDownLeft size={18} color={colors.completed} strokeWidth={2.2} />
                  ) : (
                    <ArrowUpRight size={18} color={colors.textSecondary} strokeWidth={2.2} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txnTitle, { color: colors.text }]} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text style={[styles.txnMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                    {t.counterparty} · {t.method}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.txnAmount,
                      { color: t.direction === 'incoming' ? colors.completed : colors.text },
                    ]}
                  >
                    {t.direction === 'incoming' ? '+' : '-'}${t.amount.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.txnStatus,
                      {
                        color:
                          t.status === 'paid'
                            ? colors.completed
                            : t.status === 'pending'
                            ? colors.pending
                            : colors.error,
                      },
                    ]}
                  >
                    {t.status}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>
        ))}
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

  hero: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    ...Shadows.lg,
  },
  heroLabel: { ...Typography.footnote, fontWeight: '600', marginTop: Spacing.sm },
  heroAmount: { ...Typography.largeTitle, fontWeight: '800', letterSpacing: -1 },
  heroRow: { flexDirection: 'row', marginTop: Spacing.md, alignItems: 'stretch' },
  heroStat: { flex: 1 },
  heroStatLabel: { ...Typography.caption1, fontWeight: '600' },
  heroStatValue: { ...Typography.title3, fontWeight: '700', marginTop: 2 },
  heroDivider: { width: 1, marginHorizontal: Spacing.md },

  payoutCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.sm,
  },
  payoutIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payoutTitle: { ...Typography.subheadline, fontWeight: '700' },
  payoutMeta: { ...Typography.footnote, marginTop: 2 },
  payoutLink: { ...Typography.footnote, fontWeight: '700' },

  sectionTitle: { ...Typography.title3, fontWeight: '700', marginTop: Spacing.xl, marginBottom: Spacing.md },
  monthLabel: { ...Typography.caption2, fontWeight: '700', letterSpacing: 0.8 },

  txn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  txnIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txnTitle: { ...Typography.subheadline, fontWeight: '600' },
  txnMeta: { ...Typography.footnote, marginTop: 2 },
  txnAmount: { ...Typography.subheadline, fontWeight: '700' },
  txnStatus: { ...Typography.caption1, fontWeight: '600', textTransform: 'capitalize', marginTop: 2 },
});
