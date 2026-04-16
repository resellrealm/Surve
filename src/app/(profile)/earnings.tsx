import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  TrendingUp,
  Wallet,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { toast } from '../../lib/toast';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { Skeleton } from '../../components/ui/Skeleton';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { PressableScale } from '../../components/ui/PressableScale';
import { formatCurrency } from '../../lib/currency';
import { useStore } from '../../lib/store';
import * as api from '../../lib/api';
import { mockTransactions, type Transaction as DisplayTransaction } from '../../lib/mockData';
import type { Transaction } from '../../types';

/** Map an API Transaction (types/index.ts) to the display shape used by the UI. */
function toDisplayTransaction(t: Transaction, userId: string): DisplayTransaction {
  const direction: DisplayTransaction['direction'] =
    t.payee_id === userId ? 'incoming' : 'outgoing';
  const statusMap: Record<string, DisplayTransaction['status']> = {
    succeeded: 'paid',
    pending: 'pending',
    failed: 'failed',
    refunded: 'refunded',
  };
  return {
    id: t.id,
    booking_id: t.booking_id ?? '',
    title: t.description || t.kind,
    counterparty: '',
    amount: t.amount_cents / 100,
    currency: 'USD',
    direction,
    status: statusMap[t.status] ?? 'pending',
    method: '',
    created_at: t.created_at,
  };
}

function computeEarningsFromDisplay(txns: DisplayTransaction[]) {
  const paid = txns.filter((t) => t.status === 'paid' && t.direction === 'incoming');
  const _lifetime = paid.reduce((s, t) => s + t.amount, 0);
  const _pending = txns
    .filter((t) => t.status === 'pending' && t.direction === 'incoming')
    .reduce((s, t) => s + t.amount, 0);
  const now = new Date();
  const _thisMonth = paid
    .filter((t) => {
      const d = new Date(t.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, t) => s + t.amount, 0);
  return { lifetime: _lifetime, pending: _pending, thisMonth: _thisMonth };
}

const PAGE_SIZE = 5;

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function transactionsToCsv(txns: DisplayTransaction[]): string {
  const header = [
    'id',
    'date',
    'direction',
    'amount',
    'currency',
    'status',
    'type',
    'description',
  ];
  const rows = txns.map((t) => [
    t.id,
    new Date(t.created_at).toISOString(),
    t.direction,
    t.amount,
    'USD',
    t.status,
    (t as unknown as { type?: string }).type ?? '',
    (t as unknown as { description?: string }).description ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
}

import { formatMonthYear } from '../../lib/dateFormat';

function groupByMonth(txns: DisplayTransaction[]) {
  const byMonth: Record<string, DisplayTransaction[]> = {};
  for (const t of txns) {
    const key = formatMonthYear(t.created_at);
    (byMonth[key] ||= []).push(t);
  }
  return byMonth;
}

export default function EarningsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const user = useStore((s) => s.user);
  const userId = user?.id ?? '';

  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [earnings, setEarnings] = useState({ lifetime: 0, pending: 0, thisMonth: 0 });

  const fetchData = useCallback(async () => {
    if (!userId) {
      const fallback = api.preferMock([] as DisplayTransaction[], mockTransactions);
      setTransactions(fallback);
      setEarnings(computeEarningsFromDisplay(fallback));
      setLoading(false);
      return;
    }

    const [apiTxns, summary] = await Promise.all([
      api.getTransactions(userId),
      api.getEarningsSummary(userId),
    ]);

    const displayTxns = apiTxns.map((t) => toDisplayTransaction(t, userId));
    const finalTxns = api.preferMock(displayTxns, mockTransactions);
    setTransactions(finalTxns);

    // If we fell back to mock data, compute summary from display txns
    if (finalTxns === mockTransactions || displayTxns.length === 0) {
      setEarnings(computeEarningsFromDisplay(finalTxns));
    } else {
      setEarnings({
        lifetime: summary.total_cents / 100,
        pending: summary.pending_cents / 100,
        thisMonth: summary.this_month_cents / 100,
      });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const visibleTransactions = useMemo(
    () => transactions.slice(0, visibleCount),
    [transactions, visibleCount],
  );
  const hasMore = visibleCount < transactions.length;
  const remaining = transactions.length - visibleCount;

  const grouped = useMemo(() => groupByMonth(visibleTransactions), [visibleTransactions]);

  const handleRefresh = useCallback(async () => {
    haptics.tap();
    setRefreshing(true);
    setVisibleCount(PAGE_SIZE);
    await fetchData();
    setRefreshing(false);
  }, [haptics, fetchData]);

  const handleLoadMore = useCallback(() => {
    haptics.tap();
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, transactions.length));
      setLoadingMore(false);
    }, 300);
  }, [haptics, transactions.length]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Earnings"
        right={
          <PressableScale
            scaleValue={0.85}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Export earnings as CSV"
            accessibilityHint="Downloads your transaction history as a file"
            onPress={async () => {
              haptics.tap();
              if (exporting) return;
              setExporting(true);
              try {
                const csv = transactionsToCsv(transactions);
                const filename = `surve-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
                const uri = FileSystem.cacheDirectory + filename;
                await FileSystem.writeAsStringAsync(uri, csv);
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(uri, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Export transactions',
                    UTI: 'public.comma-separated-values-text',
                  });
                } else {
                  toast.success(`CSV saved to ${uri}`);
                }
              } catch (e) {
                toast.error(`Export failed: ${e instanceof Error ? e.message : 'Try again'}`);
              } finally {
                setExporting(false);
              }
            }}
          >
            <Download
              size={20}
              color={exporting ? colors.textTertiary : colors.primary}
              strokeWidth={2}
            />
          </PressableScale>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading && (
          <View style={{ gap: Spacing.md }}>
            <Skeleton width="100%" height={180} borderRadius={BorderRadius.xl} />
            <Skeleton width="100%" height={64} borderRadius={BorderRadius.lg} />
            <Skeleton width={120} height={24} borderRadius={BorderRadius.sm} />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={64} borderRadius={BorderRadius.lg} />
            ))}
          </View>
        )}

        {!loading && (<>
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.hero, { backgroundColor: colors.primary }]}>
          <Wallet size={28} color={colors.onPrimary} strokeWidth={2} />
          <Text style={[styles.heroLabel, { color: 'rgba(255,255,255,0.8)' }]}>Lifetime earnings</Text>
          <AnimatedNumber
            value={earnings.lifetime}
            prefix="$"
            style={[styles.heroAmount, { color: colors.onPrimary }] as never}
          />
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.7)' }]}>This month</Text>
              <AnimatedNumber
                value={earnings.thisMonth}
                prefix="$"
                duration={800}
                style={[styles.heroStatValue, { color: colors.onPrimary }] as never}
              />
            </View>
            <View style={[styles.heroDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.7)' }]}>Pending</Text>
              <AnimatedNumber
                value={earnings.pending}
                prefix="$"
                duration={800}
                style={[styles.heroStatValue, { color: colors.onPrimary }] as never}
              />
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
              {formatCurrency(earnings.pending)} arrives Apr 17
            </Text>
          </View>
          <PressableScale onPress={() => { haptics.tap(); router.push('/(payment)/methods'); }} accessibilityRole="link" accessibilityLabel="Payout details" accessibilityHint="Double tap to view payout methods">
            <Text style={[styles.payoutLink, { color: colors.primary }]}>Payout details</Text>
          </PressableScale>
        </Animated.View>

        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>

        {!loading && transactions.length === 0 && (
          <EmptyState
            icon="wallet-outline"
            title="No transactions yet"
            body="Once you complete a booking and get paid, your earnings will appear here."
            ctaLabel="Find opportunities"
            onPress={() => router.push('/(tabs)/search')}
          />
        )}

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
                  <AnimatedNumber
                    value={t.amount}
                    prefix={t.direction === 'incoming' ? '+$' : '-$'}
                    duration={600}
                    style={[
                      styles.txnAmount,
                      { color: t.direction === 'incoming' ? colors.completed : colors.text },
                    ] as never}
                  />
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

        {hasMore && (
          <PressableScale
            style={[
              styles.loadMore,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
            onPress={handleLoadMore}
            disabled={loadingMore}
            accessibilityRole="button"
            accessibilityLabel={`Load more transactions, ${remaining} remaining`}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <ChevronDown size={18} color={colors.primary} strokeWidth={2.2} />
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  Load more ({remaining})
                </Text>
              </>
            )}
          </PressableScale>
        )}

        {!hasMore && transactions.length > PAGE_SIZE && (
          <Text style={[styles.allLoaded, { color: colors.textTertiary }]}>
            All {transactions.length} transactions loaded
          </Text>
        )}
        </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

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

  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    ...Shadows.sm,
  },
  loadMoreText: { ...Typography.subheadline, fontWeight: '700' },
  allLoaded: { ...Typography.footnote, textAlign: 'center', paddingVertical: Spacing.md },
});
