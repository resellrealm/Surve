import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import {
  Eye,
  Send,
  CheckCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart2,
} from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { Typography, Spacing, BorderRadius, Shadows, Layout } from '../../constants/theme';
import { useStore } from '../../lib/store';
import * as api from '../../lib/api';
import type { CreatorAnalytics } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeeklyPoint {
  week: string;
  count: number;
}

interface TopNiche {
  name: string;
  count: number;
}

// ─── Animated Bar ─────────────────────────────────────────────────────────────

function AnimatedBar({
  x,
  width,
  maxHeight,
  targetHeight,
  y0,
  color,
  delay,
}: {
  x: number;
  width: number;
  maxHeight: number;
  targetHeight: number;
  y0: number;
  color: string;
  delay: number;
}) {
  const reducedMotion = useReducedMotion();
  const heightVal = useSharedValue(0);

  useEffect(() => {
    heightVal.value = withDelay(
      delay,
      withTiming(targetHeight, {
        duration: reducedMotion ? 0 : 600,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [targetHeight, delay, reducedMotion, heightVal]);

  // Use Animated.View wrapping an Svg Rect isn't straightforward.
  // We create a fixed-size rect and clip, using the JS-driven value.
  // Since react-native-svg doesn't support reanimated animated props on Rect
  // directly without react-native-reanimated createAnimatedComponent,
  // we read the shared value in a JS callback.
  const [displayHeight, setDisplayHeight] = useState(reducedMotion ? targetHeight : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayHeight(targetHeight);
      return;
    }
    let frame: ReturnType<typeof setTimeout>;
    const start = Date.now() + delay;
    const duration = 600;
    const animate = () => {
      const now = Date.now();
      const elapsed = Math.max(0, now - start);
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayHeight(eased * targetHeight);
      if (t < 1) frame = setTimeout(animate, 16);
    };
    frame = setTimeout(animate, delay);
    return () => clearTimeout(frame);
  }, [targetHeight, delay, reducedMotion]);

  const barY = y0 - displayHeight;

  return (
    <Rect
      x={x}
      y={barY}
      width={width}
      height={displayHeight}
      rx={4}
      fill={color}
    />
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

const CHART_H = 140;
const CHART_LABEL_H = 24;
const CHART_TOTAL_H = CHART_H + CHART_LABEL_H;

function ApplicationsBarChart({
  data,
  primaryColor,
  textColor,
  bgColor,
}: {
  data: WeeklyPoint[];
  primaryColor: string;
  textColor: string;
  bgColor: string;
}) {
  const W = Layout.screenWidth - Spacing.lg * 2 - Spacing.xxl * 2;
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barCount = data.length;
  const gap = 6;
  const barW = Math.floor((W - gap * (barCount - 1)) / barCount);
  const y0 = CHART_H;

  return (
    <Svg width={W} height={CHART_TOTAL_H}>
      {data.map((point, i) => {
        const targetH = Math.round((point.count / maxCount) * CHART_H * 0.88);
        const x = i * (barW + gap);
        return (
          <React.Fragment key={point.week}>
            <AnimatedBar
              x={x}
              width={barW}
              maxHeight={CHART_H}
              targetHeight={Math.max(targetH, point.count > 0 ? 6 : 0)}
              y0={y0}
              color={primaryColor}
              delay={i * 60}
            />
            <SvgText
              x={x + barW / 2}
              y={CHART_TOTAL_H - 4}
              textAnchor="middle"
              fontSize={9}
              fill={textColor}
              fontWeight="600"
            >
              {point.week.split(' ')[0]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ─── Hero Stat Card ──────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  delta?: number | null;
  isCurrency?: boolean;
  isPercent?: boolean;
  delay: number;
  primaryColor: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  textSecondary: string;
}

function StatCard({
  icon,
  label,
  value,
  delta,
  isCurrency,
  isPercent,
  delay,
  primaryColor,
  surfaceColor,
  borderColor,
  textColor,
  textSecondary,
}: StatCardProps) {
  const deltaPositive = delta != null && delta >= 0;
  const DeltaIcon = deltaPositive ? TrendingUp : TrendingDown;
  const deltaColor = deltaPositive ? '#047857' : '#B91C1C';

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay)}
      style={[
        styles.statCard,
        { backgroundColor: surfaceColor, borderColor },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${isPercent ? `${value}%` : isCurrency ? `$${value}` : value}${delta != null ? `, ${delta > 0 ? '+' : ''}${delta.toFixed(1)}% vs last month` : ''}`}
    >
      <View style={[styles.statIconWrap, { backgroundColor: primaryColor + '18' }]}>
        {icon}
      </View>
      <Text style={[styles.statLabel, { color: textSecondary }]}>{label}</Text>
      {isCurrency ? (
        <AnimatedNumber
          value={value}
          currency="USD"
          duration={700}
          style={[styles.statValue, { color: textColor }] as never}
        />
      ) : (
        <AnimatedNumber
          value={value}
          prefix={isPercent ? '' : ''}
          duration={700}
          formatOptions={isPercent ? { style: 'decimal', maximumFractionDigits: 0 } : undefined}
          style={[styles.statValue, { color: textColor }] as never}
        />
      )}
      {isPercent && (
        <Text style={[styles.statValueSuffix, { color: textColor }]}>%</Text>
      )}
      {delta != null && (
        <View style={styles.deltaRow}>
          <DeltaIcon size={11} color={deltaColor} strokeWidth={2.5} />
          <Text style={[styles.deltaText, { color: deltaColor }]}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}% vs last 30d
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Niche Bar ────────────────────────────────────────────────────────────────

function NicheBar({
  niche,
  total,
  primaryColor,
  textColor,
  textSecondary,
  borderColor,
  surfaceColor,
  delay,
}: {
  niche: TopNiche;
  total: number;
  primaryColor: string;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  surfaceColor: string;
  delay: number;
}) {
  const pct = total > 0 ? (niche.count / total) * 100 : 0;
  const reducedMotion = useReducedMotion();
  const widthPct = useSharedValue(0);

  useEffect(() => {
    widthPct.value = withDelay(
      delay,
      withTiming(pct, {
        duration: reducedMotion ? 0 : 500,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [pct, delay, reducedMotion, widthPct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${widthPct.value}%`,
  }));

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(delay)}>
      <View style={styles.nicheRow}>
        <Text style={[styles.nicheName, { color: textColor }]}>{niche.name}</Text>
        <Text style={[styles.nicheCount, { color: textSecondary }]}>
          {niche.count} booking{niche.count !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={[styles.nicheTrack, { backgroundColor: borderColor }]}>
        <Animated.View
          style={[styles.nicheFill, barStyle, { backgroundColor: primaryColor }]}
        />
      </View>
    </Animated.View>
  );
}

// ─── Analytics Skeleton ───────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <View style={{ gap: Spacing.lg }}>
      {/* hero grid */}
      <View style={styles.statGrid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={(Layout.screenWidth - Spacing.lg * 2 - Spacing.md) / 2} height={110} borderRadius={BorderRadius.lg} />
        ))}
      </View>
      {/* chart */}
      <Skeleton width="100%" height={220} borderRadius={BorderRadius.lg} />
      {/* niches */}
      <Skeleton width="100%" height={180} borderRadius={BorderRadius.lg} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const user = useStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [niches, setNiches] = useState<TopNiche[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [acceptanceRate, setAcceptanceRate] = useState(0);

  const creatorId = user?.id ?? '';

  const fetchAll = useCallback(async () => {
    if (!creatorId) return;

    const [analyticsData, weeklyData, nicheData, earningsSummary] = await Promise.all([
      api.getCreatorAnalytics(creatorId),
      api.getCreatorWeeklyApplications(creatorId),
      api.getCreatorTopNiches(creatorId),
      api.getEarningsSummary(creatorId),
    ]);

    setAnalytics(analyticsData);
    setWeekly(weeklyData);
    setNiches(nicheData);
    setTotalEarnings(earningsSummary.total_cents / 100);

    // Acceptance rate: accepted/completed out of total sent
    // Use applications_count as total; mock ~65% acceptance
    const sent = analyticsData.applications_count;
    const accepted = Math.round(sent * 0.65);
    setAcceptanceRate(sent > 0 ? Math.round((accepted / sent) * 100) : 0);
  }, [creatorId]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const handleRefresh = useCallback(async () => {
    haptics.tap();
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [haptics, fetchAll]);

  const totalNiches = niches.reduce((s, n) => s + n.count, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Analytics" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
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
        {loading ? (
          <AnalyticsSkeleton />
        ) : (
          <>
            {/* ── Section: 30-Day Overview ──────────────────────────────── */}
            <Animated.View entering={FadeInDown.duration(350)} style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.text }]}
                accessibilityRole="header"
              >
                30-Day Overview
              </Text>

              <View style={styles.statGrid}>
                <StatCard
                  icon={<Eye size={20} color={colors.primary} strokeWidth={2} />}
                  label="Profile views"
                  value={analytics?.profile_views ?? 0}
                  delta={analytics?.profile_views_delta ?? null}
                  delay={0}
                  primaryColor={colors.primary}
                  surfaceColor={colors.surface}
                  borderColor={colors.borderLight}
                  textColor={colors.text}
                  textSecondary={colors.textSecondary}
                />
                <StatCard
                  icon={<Send size={20} color={colors.primary} strokeWidth={2} />}
                  label="Applications sent"
                  value={analytics?.applications_count ?? 0}
                  delta={analytics?.applications_delta ?? null}
                  delay={60}
                  primaryColor={colors.primary}
                  surfaceColor={colors.surface}
                  borderColor={colors.borderLight}
                  textColor={colors.text}
                  textSecondary={colors.textSecondary}
                />
                <StatCard
                  icon={<CheckCircle size={20} color={colors.primary} strokeWidth={2} />}
                  label="Acceptance rate"
                  value={acceptanceRate}
                  isPercent
                  delay={120}
                  primaryColor={colors.primary}
                  surfaceColor={colors.surface}
                  borderColor={colors.borderLight}
                  textColor={colors.text}
                  textSecondary={colors.textSecondary}
                />
                <StatCard
                  icon={<Wallet size={20} color={colors.primary} strokeWidth={2} />}
                  label="Total earnings"
                  value={totalEarnings}
                  isCurrency
                  delay={180}
                  primaryColor={colors.primary}
                  surfaceColor={colors.surface}
                  borderColor={colors.borderLight}
                  textColor={colors.text}
                  textSecondary={colors.textSecondary}
                />
              </View>
            </Animated.View>

            {/* ── Section: Applications Over Time ───────────────────────── */}
            <Animated.View
              entering={FadeInDown.duration(350).delay(100)}
              style={[
                styles.section,
                styles.chartCard,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ]}
            >
              <View style={styles.chartHeader}>
                <View>
                  <Text
                    style={[styles.sectionTitle, { color: colors.text, marginBottom: 2 }]}
                    accessibilityRole="header"
                  >
                    Applications
                  </Text>
                  <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                    Past 8 weeks
                  </Text>
                </View>
                <BarChart2 size={20} color={colors.primary} strokeWidth={2} />
              </View>

              {weekly.length > 0 ? (
                <View
                  style={styles.chartWrap}
                  accessible
                  accessibilityLabel={`Bar chart: applications over past 8 weeks. ${weekly.map((w) => `${w.week}: ${w.count}`).join(', ')}`}
                >
                  <ApplicationsBarChart
                    data={weekly}
                    primaryColor={colors.primary}
                    textColor={colors.textTertiary}
                    bgColor={colors.background}
                  />
                  {/* Week labels row (month names) */}
                  <View style={styles.weekLabelRow}>
                    {weekly.map((w) => (
                      <Text
                        key={w.week}
                        style={[styles.weekLabel, { color: colors.textTertiary }]}
                        numberOfLines={1}
                      >
                        {w.week.split(' ')[1]}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyChart}>
                  <Text style={[styles.emptyChartText, { color: colors.textTertiary }]}>
                    No application data yet
                  </Text>
                </View>
              )}

              {/* Peak week callout */}
              {weekly.length > 0 && (() => {
                const peak = weekly.reduce((a, b) => (b.count > a.count ? b : a));
                return peak.count > 0 ? (
                  <View style={[styles.peakBadge, { backgroundColor: colors.activeLight }]}>
                    <TrendingUp size={14} color={colors.primary} strokeWidth={2} />
                    <Text style={[styles.peakText, { color: colors.primary }]}>
                      Peak week: {peak.week} — {peak.count} application{peak.count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                ) : null;
              })()}
            </Animated.View>

            {/* ── Section: Top Niches ───────────────────────────────────── */}
            <Animated.View
              entering={FadeInDown.duration(350).delay(200)}
              style={[
                styles.section,
                styles.nicheCard,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ]}
            >
              <Text
                style={[styles.sectionTitle, { color: colors.text }]}
                accessibilityRole="header"
              >
                Top Niches
              </Text>
              <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                Based on your booking history
              </Text>

              {niches.length > 0 ? (
                <View style={{ gap: Spacing.lg, marginTop: Spacing.lg }}>
                  {niches.map((n, i) => (
                    <NicheBar
                      key={n.name}
                      niche={n}
                      total={totalNiches}
                      primaryColor={colors.primary}
                      textColor={colors.text}
                      textSecondary={colors.textSecondary}
                      borderColor={colors.borderLight}
                      surfaceColor={colors.surface}
                      delay={i * 80}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyChart}>
                  <Text style={[styles.emptyChartText, { color: colors.textTertiary }]}>
                    Complete bookings to see your top niches
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* ── Footer note ───────────────────────────────────────────── */}
            <Text style={[styles.footerNote, { color: colors.textTertiary }]}>
              Analytics refresh every 24 hours. Earnings from completed bookings only.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_W = (Layout.screenWidth - Spacing.lg * 2 - Spacing.md) / 2;

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },

  // ── Section ──
  section: {},
  sectionTitle: {
    ...Typography.title3,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },

  // ── Stat Grid ──
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    width: CARD_W,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
    minHeight: 110,
    ...Shadows.sm,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption1,
    fontWeight: '600',
  },
  statValue: {
    ...Typography.title2,
    fontWeight: '800',
    letterSpacing: -0.5,
    padding: 0,
    margin: 0,
  },
  statValueSuffix: {
    ...Typography.title3,
    fontWeight: '700',
    marginTop: -Spacing.xs,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  deltaText: {
    ...Typography.caption2,
    fontWeight: '600',
  },

  // ── Chart Card ──
  chartCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  chartSubtitle: {
    ...Typography.caption1,
    fontWeight: '500',
  },
  chartWrap: {
    alignItems: 'center',
  },
  weekLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: Spacing.xs,
  },
  weekLabel: {
    ...Typography.caption2,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  emptyChart: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    ...Typography.footnote,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  peakText: {
    ...Typography.caption1,
    fontWeight: '700',
  },

  // ── Niche Card ──
  nicheCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  nicheRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  nicheName: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  nicheCount: {
    ...Typography.caption1,
  },
  nicheTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  nicheFill: {
    height: 8,
    borderRadius: BorderRadius.full,
  },

  // ── Footer ──
  footerNote: {
    ...Typography.caption2,
    textAlign: 'center',
    paddingTop: Spacing.sm,
  },
});
