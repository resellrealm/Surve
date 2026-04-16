import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../constants/theme';

export function ModalHeader() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.pill, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  pill: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});
