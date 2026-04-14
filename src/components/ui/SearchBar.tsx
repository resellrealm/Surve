import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText('');
  }, [onChangeText]);

  return (
    <View
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
        <Pressable onPress={handleClear} style={styles.clearButton} accessibilityRole="button" accessibilityLabel="Clear search">
          <X size={18} color={colors.textTertiary} strokeWidth={2} />
        </Pressable>
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
