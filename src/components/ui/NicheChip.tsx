import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { PressableScale } from './PressableScale';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { Niche } from '../../constants/niches';

interface NicheChipProps {
  niche: Niche;
  selected?: boolean;
  onPress?: (niche: Niche) => void;
  style?: ViewStyle;
}

export function NicheChip({ niche, selected = false, onPress, style }: NicheChipProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const bgColor = selected ? niche.color : colors.surfaceSecondary;
  const textColor = selected ? '#FFFFFF' : colors.text;
  const iconColor = selected ? '#FFFFFF' : niche.color;
  const borderColor = selected ? niche.color : colors.border;

  if (!onPress) {
    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={niche.label}
        style={[styles.container, { backgroundColor: bgColor, borderColor }, style]}
      >
        <Ionicons name={niche.icon} size={16} color={iconColor} style={styles.icon} />
        <Text style={[Typography.footnote, styles.label, { color: textColor }]} numberOfLines={1}>
          {niche.label}
        </Text>
      </View>
    );
  }

  return (
    <PressableScale
      accessible
      accessibilityRole="button"
      accessibilityLabel={niche.label}
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.tap();
        onPress(niche);
      }}
      style={[styles.container, { backgroundColor: bgColor, borderColor }, style]}
    >
      <Ionicons name={niche.icon} size={16} color={iconColor} style={styles.icon} />
      <Text style={[Typography.footnote, styles.label, { color: textColor }]} numberOfLines={1}>
        {niche.label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 44,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
});
