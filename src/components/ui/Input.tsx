import React, { useState, useCallback, useEffect, forwardRef } from 'react';
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
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius, Springs } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
  shakeTrigger?: number;
  showCharCount?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, containerStyle, icon, shakeTrigger, showCharCount, ...props },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderProgress = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (shakeTrigger && shakeTrigger > 0 && !reducedMotion) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-3, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      );
    }
  }, [shakeTrigger, shakeX, reducedMotion]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    borderProgress.value = reducedMotion
      ? withTiming(1, { duration: 150 })
      : withSpring(1, Springs.snappy);
  }, [borderProgress, reducedMotion]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    borderProgress.value = reducedMotion
      ? withTiming(0, { duration: 150 })
      : withSpring(0, Springs.gentle);
  }, [borderProgress, reducedMotion]);

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
    transform: [{ translateX: shakeX.value }],
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
          ref={ref}
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
          accessibilityLabel={label}
          {...props}
        />
      </Animated.View>
      <View style={styles.belowInput}>
        {error && (
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { color: colors.error }]}>{error}</Text>
        )}
        {showCharCount && props.maxLength != null && (() => {
          const len = props.value?.length ?? 0;
          const max = props.maxLength!;
          const ratio = len / max;
          const countColor = ratio >= 1 ? colors.error : ratio >= 0.9 ? colors.warning : colors.textTertiary;
          return (
            <Text style={[styles.charCount, { color: countColor }]}>
              {len}/{max}
            </Text>
          );
        })()}
      </View>
    </View>
  );
});

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
  belowInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  error: {
    ...Typography.caption1,
    marginTop: Spacing.xs,
    flex: 1,
  },
  charCount: {
    ...Typography.caption2,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});
