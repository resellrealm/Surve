import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius, Springs } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  containerStyle,
  icon,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderProgress = useSharedValue(0);

  const handleFocus = useCallback(() => {
    setFocused(true);
    borderProgress.value = withSpring(1, Springs.snappy);
  }, [borderProgress]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    borderProgress.value = withSpring(0, Springs.gentle);
  }, [borderProgress]);

  const errorColor = colors.error;
  const primaryColor = colors.primary;
  const borderColor = colors.border;

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor:
      borderProgress.value > 0.5
        ? error
          ? errorColor
          : primaryColor
        : error
          ? errorColor
          : borderColor,
  }));

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
          },
          animatedBorder,
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
            },
            icon ? styles.inputWithIcon : undefined,
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </Animated.View>
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.subheadline,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  icon: {
    paddingLeft: Spacing.md,
  },
  input: {
    ...Typography.body,
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  inputWithIcon: {
    paddingLeft: Spacing.sm,
  },
  error: {
    ...Typography.caption1,
    marginTop: Spacing.xs,
  },
});
