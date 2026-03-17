import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable, type TextInputProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const LABEL_DURATION = 200;

export function Input({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry,
  leftIcon,
  rightIcon,
  ...rest
}: InputProps) {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // Floating label animation: 0 = resting (inside), 1 = floated (above)
  const labelPosition = useSharedValue(value ? 1 : 0);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    const shouldFloat = isFocused || value.length > 0;
    labelPosition.value = withTiming(shouldFloat ? 1 : 0, { duration: LABEL_DURATION });
    focusAnim.value = withTiming(isFocused ? 1 : 0, { duration: LABEL_DURATION });
  }, [isFocused, value, labelPosition, focusAnim]);

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const top = interpolate(labelPosition.value, [0, 1], [18, 6]);
    const fontSize = interpolate(labelPosition.value, [0, 1], [17, 12]);

    return {
      top,
      fontSize,
    };
  });

  const labelColorStyle = useAnimatedStyle(() => {
    const hasError = !!error;
    const focusedColor = hasError ? colors.error : colors.primary;
    const restColor = hasError ? colors.error : colors.textTertiary;

    return {
      color: interpolateColor(
        focusAnim.value,
        [0, 1],
        [restColor, focusedColor]
      ),
    };
  });

  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.primary
    : colors.border;

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={[
          styles.container,
          {
            borderColor,
            backgroundColor: colors.surface,
            borderRadius: BorderRadius.md,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <View style={styles.inputWrapper}>
          <Animated.Text
            style={[
              styles.label,
              labelAnimatedStyle,
              labelColorStyle,
              leftIcon ? { left: 0 } : undefined,
            ]}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>

          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                paddingTop: 22,
                paddingBottom: 8,
              },
            ]}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isFocused ? placeholder : undefined}
            placeholderTextColor={colors.textTertiary}
            secureTextEntry={secureTextEntry}
            selectionColor={colors.primary}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            {...rest}
          />
        </View>

        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </Pressable>

      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    left: 0,
    fontWeight: '500',
  },
  input: {
    ...Typography.body,
    flex: 1,
    padding: 0,
    margin: 0,
  },
  error: {
    ...Typography.caption1,
    marginLeft: Spacing.xs,
  },
});
