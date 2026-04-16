import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ThemedText } from '../ui/ThemedText';
import { Spacing } from '../../constants/theme';

interface StatsRowProps {
  instagramFollowers: number;
  tiktokFollowers: number;
  engagementRate: number;
  avgViews: number;
}

export function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

function StatItem({
  label,
  value,
  accent,
  colors,
}: {
  label: string;
  value: string;
  accent?: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.statItem}>
      <ThemedText variant="headline" style={[styles.statValue, { color: accent ?? colors.text }]}>{value}</ThemedText>
      <ThemedText variant="caption2" style={[styles.statLabel, { color: colors.textTertiary }]}>
        {label}
      </ThemedText>
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

  const showIG = instagramFollowers > 0;
  const showTT = tiktokFollowers > 0;
  const showBoth = showIG && showTT;

  return (
    <View style={[styles.container, { borderTopColor: colors.borderLight }]}>
      {showIG && (
        <>
          <StatItem
            label="IG"
            value={formatCount(instagramFollowers)}
            accent="#E1306C"
            colors={colors}
          />
          {showBoth && <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />}
        </>
      )}
      {showTT && (
        <>
          <StatItem
            label="TikTok"
            value={formatCount(tiktokFollowers)}
            accent="#000000"
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
        </>
      )}
      {!showIG && !showTT && (
        <>
          <StatItem label="Followers" value="—" colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
        </>
      )}
      <StatItem
        label="Engagement"
        value={`${engagementRate}%`}
        accent={engagementRate >= 5 ? colors.completed : undefined}
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
    fontWeight: '700',
  },
  statLabel: {
    marginTop: Spacing.xxs,
  },
  divider: {
    width: 1,
    height: 28,
  },
});
