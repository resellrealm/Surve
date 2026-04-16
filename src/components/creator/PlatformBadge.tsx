import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Instagram } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { ThemedText } from '../ui/ThemedText';
import { Spacing, BorderRadius } from '../../constants/theme';
import type { Platform } from '../../types';

interface PlatformBadgeProps {
  platform: Platform;
}

const platformConfig = {
  instagram: {
    label: 'Instagram',
    color: '#E4405F',
    colorDark: '#FF6B85',  // lightened for dark bg: ~6.5:1 on #2D1519
    bgLight: '#FEF0F3',
    bgDark: '#2D1519',
  },
  tiktok: {
    label: 'TikTok',
    color: '#000000',
    colorDark: '#E5E5E5',  // light gray on dark bg: ~10:1 on #252525
    bgLight: '#F0F0F0',
    bgDark: '#252525',
  },
  both: {
    label: 'IG + TikTok',
    color: '#6B21A8',
    colorDark: '#C084FC',  // purple-400: ~6.8:1 on #1F1530
    bgLight: '#F3E8FF',
    bgDark: '#1F1530',
  },
};

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  const { isDark } = useTheme();
  const config = platformConfig[platform];
  const bg = isDark ? config.bgDark : config.bgLight;
  const textColor = isDark ? config.colorDark : config.color;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Platform: ${config.label}`}
      style={[styles.container, { backgroundColor: bg }]}
    >
      <ThemedText variant="caption1" style={[styles.text, { color: textColor }]}>
        {config.label}
      </ThemedText>
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
    fontWeight: '700',
  },
});
