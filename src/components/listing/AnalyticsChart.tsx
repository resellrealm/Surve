import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { ListingAnalyticsPoint } from '../../types';

interface AnalyticsChartProps {
  data: ListingAnalyticsPoint[];
  metric: 'views' | 'clicks' | 'applications';
  color: string;
  label: string;
  total: number;
  delta: number;
}

const CHART_WIDTH = 280;
const CHART_HEIGHT = 100;
const CHART_PADDING = 4;

function buildPath(
  points: number[],
  width: number,
  height: number,
  padding: number,
  fill?: boolean
): string {
  if (points.length < 2) return '';
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const stepX = usableW / (points.length - 1);

  const coords = points.map((v, i) => ({
    x: padding + i * stepX,
    y: padding + usableH - ((v - min) / range) * usableH,
  }));

  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cpx1 = prev.x + stepX * 0.4;
    const cpx2 = curr.x - stepX * 0.4;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  if (fill) {
    const last = coords[coords.length - 1];
    d += ` L ${last.x} ${height} L ${coords[0].x} ${height} Z`;
  }

  return d;
}

export function AnalyticsChart({
  data,
  metric,
  color,
  label,
  total,
  delta,
}: AnalyticsChartProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const points = useMemo(() => data.map((d) => d[metric]), [data, metric]);

  const linePath = useMemo(
    () => buildPath(points, CHART_WIDTH, CHART_HEIGHT, CHART_PADDING),
    [points]
  );
  const fillPath = useMemo(
    () => buildPath(points, CHART_WIDTH, CHART_HEIGHT, CHART_PADDING, true),
    [points]
  );

  const gradientId = `grad-${metric}`;
  const isPositive = delta >= 0;

  return (
    <Animated.View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${total.toLocaleString()}, ${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)} percent over last 30 days`}
      entering={reducedMotion ? undefined : FadeIn.duration(400)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <View
          style={[
            styles.deltaBadge,
            {
              backgroundColor: isPositive
                ? colors.successLight
                : colors.errorLight,
            },
          ]}
        >
          <Text
            style={[
              styles.deltaText,
              { color: isPositive ? colors.success : colors.error },
            ]}
          >
            {isPositive ? '+' : ''}
            {delta.toFixed(1)}%
          </Text>
        </View>
      </View>
      <Text style={[styles.total, { color: colors.text }]}>
        {total.toLocaleString()}
      </Text>
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.25" />
              <Stop offset="1" stopColor={color} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>
          {fillPath ? (
            <Path d={fillPath} fill={`url(#${gradientId})`} />
          ) : null}
          {linePath ? (
            <Path
              d={linePath}
              stroke={color}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>
      <Text style={[styles.period, { color: colors.textTertiary }]}>
        Last 30 days
      </Text>
    </Animated.View>
  );
}

export function AnalyticsSkeletonCard({ colors }: { colors: { skeleton: string; card: string; borderLight: string } }) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.borderLight },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[styles.skeletonLine, { width: 60, backgroundColor: colors.skeleton }]}
        />
        <View
          style={[styles.skeletonLine, { width: 44, backgroundColor: colors.skeleton }]}
        />
      </View>
      <View
        style={[
          styles.skeletonLine,
          { width: 80, height: 28, marginTop: Spacing.xs, backgroundColor: colors.skeleton },
        ]}
      />
      <View
        style={[
          styles.skeletonChart,
          { backgroundColor: colors.skeleton },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    width: CHART_WIDTH + Spacing.lg * 2,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...Typography.caption1,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deltaBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: BorderRadius.sm,
  },
  deltaText: {
    ...Typography.caption2,
    fontWeight: '700',
  },
  total: {
    ...Typography.title2,
    marginTop: Spacing.xs,
  },
  chartContainer: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  period: {
    ...Typography.caption2,
    marginTop: Spacing.sm,
  },
  skeletonLine: {
    height: 14,
    borderRadius: BorderRadius.xs,
  },
  skeletonChart: {
    height: CHART_HEIGHT,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
});
