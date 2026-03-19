import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Instagram } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { Platform } from '../../types';

interface PlatformBadgeProps {
  platform: Platform;
}

const platformConfig = {
  instagram: {
    label: 'Instagram',
    color: '#E4405F',
    bgLight: '#FEF0F3',
    bgDark: '#2D1519',
  },
  tiktok: {
    label: 'TikTok',
    color: '#000000',
    bgLight: '#F0F0F0',
    bgDark: '#252525',
  },
  both: {
    label: 'IG + TikTok',
    color: '#6B21A8',
    bgLight: '#F3E8FF',
    bgDark: '#1F1530',
  },
};

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  const { isDark } = useTheme();
  const config = platformConfig[platform];
  const bg = isDark ? config.bgDark : config.bgLight;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  text: {
    ...Typography.caption1,
    fontWeight: '700',
  },
});
