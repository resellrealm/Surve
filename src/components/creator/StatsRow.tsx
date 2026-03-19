import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing } from '../../constants/theme';

interface StatsRowProps {
  instagramFollowers: number;
  tiktokFollowers: number;
  engagementRate: number;
  avgViews: number;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

function StatItem({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
        {label}
      </Text>
    </View>
  );
}

export function StatsRow({
  instagramFollowers,
  tiktokFollowers,
  engagementRate,
  avgViews,
}: StatsRowProps) {
  const { colors } = useTheme();
  const totalFollowers = instagramFollowers + tiktokFollowers;

  return (
    <View style={[styles.container, { borderTopColor: colors.borderLight }]}>
      <StatItem
        label="Followers"
        value={formatCount(totalFollowers)}
        colors={colors}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
      <StatItem
        label="Engagement"
        value={`${engagementRate}%`}
        colors={colors}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
      <StatItem
        label="Avg Views"
        value={formatCount(avgViews)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.headline,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.caption2,
    marginTop: Spacing.xxs,
  },
  divider: {
    width: 1,
    height: 28,
  },
});
