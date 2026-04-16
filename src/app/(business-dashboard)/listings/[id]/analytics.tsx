import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
  BarChart3,
} from 'lucide-react-native';
import { useTheme } from '../../../../hooks/useTheme';
import { useHaptics } from '../../../../hooks/useHaptics';
import { ScreenHeader } from '../../../../components/ui/ScreenHeader';
import { Skeleton } from '../../../../components/ui/Skeleton';
import * as api from '../../../../lib/api';
import { useStore } from '../../../../lib/store';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../../../constants/theme';
import type { Application, Listing } from '../../../../types';

// ─── Stat Tile ────────────────────────────────────────────────────────────────

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay: number;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay)}
      style={[
        styles.statTile,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      {sub && (
        <Text style={[styles.statSub, { color: colors.textTertiary }]}>{sub}</Text>
      )}
    </Animated.View>
  );
}

// ─── Bar Row ─────────────────────────────────────────────────────────────────

function BarRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const { colors } = useTheme();
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.barTrack, { backgroundColor: colors.surfaceSecondary }]}>
        <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barCount, { color: colors.text }]}>{count}</Text>
    </View>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  delay,
}: {
  title: string;
  children: React.ReactNode;
  delay: number;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay)}
      style={[
        styles.sectionCard,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ListingAnalyticsScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, listings } = useStore();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const listing = useMemo(
    () => listings.find((l) => l.id === id) ?? null,
    [listings, id],
  );

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const all = await api.getBusinessApplications(user.id);
    setApplications(all.filter((a) => a.listing_id === id));
  }, [user?.id, id]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    haptics.confirm();
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [haptics, loadData]);

  // ── Derived stats ────────────────────────────────────────────────────────

  const total = applications.length;
  const pending = applications.filter((a) => a.status === 'pending').length;
  const accepted = applications.filter((a) => a.status === 'accepted').length;
  const rejected = applications.filter((a) => a.status === 'rejected').length;
  const withdrawn = applications.filter((a) => a.status === 'withdrawn').length;

  const conversionRate =
    total > 0 ? Math.round((accepted / total) * 100) : 0;

  const reviewedCount = accepted + rejected + withdrawn;
  const reviewRate = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;

  // Average review time in hours
  const avgReviewHours = useMemo(() => {
    const reviewed = applications.filter(
      (a) => a.status !== 'pending' && a.updated_at && a.created_at,
    );
    if (reviewed.length === 0) return null;
    const totalMs = reviewed.reduce((sum, a) => {
      const created = new Date(a.created_at).getTime();
      const updated = new Date((a as any).updated_at).getTime();
      return sum + Math.max(0, updated - created);
    }, 0);
    const avgMs = totalMs / reviewed.length;
    const hours = avgMs / (1000 * 60 * 60);
    return hours < 24 ? `${Math.round(hours)}h` : `${Math.round(hours / 24)}d`;
  }, [applications]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Analytics" />
        <View style={styles.skeletonWrap}>
          <View style={styles.statsRow}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonTile}>
                <Skeleton width={40} height={40} borderRadius={BorderRadius.md} />
                <Skeleton width={48} height={24} />
                <Skeleton width={72} height={14} />
              </View>
            ))}
          </View>
          <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
            <Skeleton width="100%" height={160} borderRadius={BorderRadius.lg} />
            <Skeleton width="100%" height={120} borderRadius={BorderRadius.lg} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={listing?.title ? `${listing.title} · Analytics` : 'Analytics'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
          paddingTop: Spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Stat tiles */}
        <View style={styles.statsRow}>
          <StatTile
            icon={Users}
            label="Applications"
            value={total}
            color={colors.primary}
            delay={0}
          />
          <StatTile
            icon={CheckCircle2}
            label="Accepted"
            value={accepted}
            sub={total > 0 ? `${conversionRate}%` : undefined}
            color={colors.completed}
            delay={60}
          />
          <StatTile
            icon={XCircle}
            label="Rejected"
            value={rejected}
            color={colors.error}
            delay={120}
          />
          <StatTile
            icon={Clock}
            label="Avg Review"
            value={avgReviewHours ?? '—'}
            color={colors.secondary}
            delay={180}
          />
        </View>

        {/* Application breakdown */}
        <SectionCard title="Application Breakdown" delay={240}>
          {total === 0 ? (
            <View style={styles.emptySection}>
              <BarChart3 size={32} color={colors.textTertiary} strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No applications yet
              </Text>
            </View>
          ) : (
            <View style={styles.barsWrap}>
              <BarRow label="Pending" count={pending} total={total} color={colors.pending} />
              <BarRow label="Accepted" count={accepted} total={total} color={colors.completed} />
              <BarRow label="Rejected" count={rejected} total={total} color={colors.error} />
              {withdrawn > 0 && (
                <BarRow label="Withdrawn" count={withdrawn} total={total} color={colors.textTertiary} />
              )}
            </View>
          )}
        </SectionCard>

        {/* Conversion funnel */}
        <SectionCard title="Conversion Funnel" delay={320}>
          <View style={styles.funnelWrap}>
            <View style={styles.funnelStep}>
              <View style={[styles.funnelDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.funnelLabel, { color: colors.textSecondary }]}>
                Total Applications
              </Text>
              <Text style={[styles.funnelValue, { color: colors.text }]}>{total}</Text>
            </View>
            <View style={[styles.funnelLine, { backgroundColor: colors.borderLight }]} />
            <View style={styles.funnelStep}>
              <View style={[styles.funnelDot, { backgroundColor: colors.secondary }]} />
              <Text style={[styles.funnelLabel, { color: colors.textSecondary }]}>
                Reviewed
              </Text>
              <Text style={[styles.funnelValue, { color: colors.text }]}>
                {reviewedCount}
                {total > 0 && (
                  <Text style={[styles.funnelPct, { color: colors.textTertiary }]}>
                    {' '}({reviewRate}%)
                  </Text>
                )}
              </Text>
            </View>
            <View style={[styles.funnelLine, { backgroundColor: colors.borderLight }]} />
            <View style={styles.funnelStep}>
              <View style={[styles.funnelDot, { backgroundColor: colors.completed }]} />
              <Text style={[styles.funnelLabel, { color: colors.textSecondary }]}>
                Accepted
              </Text>
              <Text style={[styles.funnelValue, { color: colors.text }]}>
                {accepted}
                {total > 0 && (
                  <Text style={[styles.funnelPct, { color: colors.textTertiary }]}>
                    {' '}({conversionRate}%)
                  </Text>
                )}
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* Listing info */}
        {listing && (
          <SectionCard title="Listing Info" delay={400}>
            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Status</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        listing.status === 'active'
                          ? colors.completedLight
                          : colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          listing.status === 'active'
                            ? colors.completed
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={[styles.infoRowDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Pay Range</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  ${listing.pay_min}–${listing.pay_max}
                </Text>
              </View>
              <View style={[styles.infoRowDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Min Followers</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {listing.min_followers >= 1000
                    ? `${(listing.min_followers / 1000).toFixed(0)}K`
                    : listing.min_followers || 'Any'}
                </Text>
              </View>
              <View style={[styles.infoRowDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Deadline</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {listing.deadline
                    ? new Date(listing.deadline).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </Text>
              </View>
            </View>
          </SectionCard>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  skeletonWrap: { gap: Spacing.xl },

  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statTile: {
    flex: 1,
    minWidth: 80,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  skeletonTile: {
    flex: 1,
    minWidth: 80,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...Typography.title2,
  },
  statLabel: {
    ...Typography.caption2,
    textAlign: 'center',
  },
  statSub: {
    ...Typography.caption2,
    fontWeight: '700',
  },

  sectionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  sectionTitle: {
    ...Typography.headline,
    marginBottom: Spacing.lg,
  },

  emptySection: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...Typography.subheadline,
  },

  barsWrap: { gap: Spacing.md },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  barLabel: {
    ...Typography.footnote,
    width: 68,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barCount: {
    ...Typography.footnote,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'right',
  },

  funnelWrap: { gap: 0 },
  funnelStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  funnelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  funnelLabel: {
    ...Typography.subheadline,
    flex: 1,
  },
  funnelValue: {
    ...Typography.subheadline,
    fontWeight: '700',
  },
  funnelPct: {
    ...Typography.footnote,
    fontWeight: '400',
  },
  funnelLine: {
    width: 2,
    height: 12,
    marginLeft: 4,
    borderRadius: 1,
  },

  infoGrid: { gap: 0 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  infoRowDivider: {
    height: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    ...Typography.subheadline,
  },
  infoValue: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.caption1,
    fontWeight: '600',
  },
});
