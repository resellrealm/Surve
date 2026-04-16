import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Users, TrendingUp, Camera } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { ThemedText } from '../ui/ThemedText';
import { Spacing, BorderRadius, Typography } from '../../constants/theme';

type TagType = 'followers' | 'engagement' | 'content';

interface RequirementTagProps {
  type: TagType;
  value: string;
}

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

const iconMap = {
  followers: Users,
  engagement: TrendingUp,
  content: Camera,
};

export function RequirementTag({ type, value }: RequirementTagProps) {
  const { colors } = useTheme();
  const Icon = iconMap[type];

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${type} requirement: ${value}`}
      style={[
        styles.container,
        { backgroundColor: colors.surfaceSecondary },
      ]}
    >
      <Icon size={14} color={colors.primary} strokeWidth={2} />
      <ThemedText variant="caption1" style={[styles.text, { color: colors.text }]}>{value}</ThemedText>
    </View>
  );
}

export { formatFollowers };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
  },
  text: {
    ...Typography.caption1,
    fontWeight: '600',
  },
});
