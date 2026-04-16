import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
} from 'react-native';
import { PressableScale } from './PressableScale';
import { Search, X } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  autoFocus = false,
}: SearchBarProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handleClear = useCallback(() => {
    haptics.tap();
    onChangeText('');
  }, [onChangeText]);

  return (
    <View
      accessibilityRole="search"
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Search size={20} color={colors.textTertiary} strokeWidth={2} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoFocus={autoFocus}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <PressableScale scaleValue={0.9} onPress={handleClear} style={styles.clearButton} accessibilityRole="button" accessibilityLabel="Clear search">
          <X size={18} color={colors.textTertiary} strokeWidth={2} />
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    ...Shadows.sm,
  },
  input: {
    ...Typography.body,
    flex: 1,
    marginLeft: Spacing.sm,
    paddingVertical: 0,
  },
  clearButton: {
    padding: Spacing.xs,
  },
});
