import React from 'react';
import { Text, type TextProps } from 'react-native';
import { Typography } from '../../constants/theme';

type TypographyVariant = keyof typeof Typography;

const MAX_SCALE: Record<TypographyVariant, number> = {
  largeTitle: 1.3,
  title1: 1.3,
  title2: 1.35,
  title3: 1.4,
  headline: 1.4,
  body: 1.5,
  callout: 1.5,
  subheadline: 1.5,
  footnote: 1.6,
  caption1: 1.6,
  caption2: 1.6,
};

interface ThemedTextProps extends TextProps {
  variant?: TypographyVariant;
}

export function ThemedText({
  variant = 'body',
  style,
  allowFontScaling = true,
  maxFontSizeMultiplier,
  ...rest
}: ThemedTextProps) {
  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_SCALE[variant]}
      style={[Typography[variant], style]}
      {...rest}
    />
  );
}
