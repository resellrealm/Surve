import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, Text } from 'react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { PressableScale } from '../ui/PressableScale';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function FilterChip({ label, selected, onPress }: FilterChipProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handlePress = useCallback(() => {
    haptics.select();
    onPress();
  }, [onPress]);

  return (
    <PressableScale
      scaleValue={0.93}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Filter: ${label}`}
      accessibilityHint="Filters results by this category"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? colors.onPrimary : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

interface ListingFiltersProps {
  items: { key: string; label: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function ListingFilterChips({
  items,
  selectedKey,
  onSelect,
}: ListingFiltersProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {items.map((item) => (
        <FilterChip
          key={item.key}
          label={item.label}
          selected={selectedKey === item.key}
          onPress={() => onSelect(item.key)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
});
