import React, { useCallback, useRef } from 'react';
import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

interface AdaptiveImageProps extends Omit<ImageProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  overlayOpacity?: number;
  /** Adds a bottom-to-top gradient scrim in dark mode for text readability */
  gradient?: boolean;
  /** Controls gradient height as fraction of image (0-1). Default 0.6 */
  gradientHeight?: number;
  /** Circular images (avatars) — applies uniform dim instead of gradient */
  circular?: boolean;
  /** Blurhash string shown as placeholder while image loads */
  blurhash?: string | null;
  accessibilityLabel?: string;
}

export function AdaptiveImage({
  style,
  overlayOpacity = 0.15,
  gradient = false,
  gradientHeight = 0.6,
  circular = false,
  blurhash,
  accessibilityLabel,
  // consumed here so we handle the fade ourselves; callers may still pass it
  transition: _transition,
  onLoad,
  ...imageProps
}: AdaptiveImageProps) {
  const { isDark } = useTheme();

  // opacity starts at 0 and fades to 1 once the image is decoded — no pop
  const opacity = useSharedValue(0);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleLoad = useCallback(
    (event: Parameters<NonNullable<ImageProps['onLoad']>>[0]) => {
      opacity.value = withTiming(1, { duration: 200 });
      onLoadRef.current?.(event);
    },
    [opacity],
  );

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[styles.wrapper, style]}
    >
      {/* Blurhash rendered as a static background — visible while the main image is loading */}
      {blurhash ? (
        <Image
          source={{ blurhash }}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessible={false}
          importantForAccessibility="no"
        />
      ) : null}
      {/* Main image fades in via Reanimated once decoded — eliminates the pop */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <Image
          {...imageProps}
          style={StyleSheet.absoluteFill}
          onLoad={handleLoad}
        />
      </Animated.View>
      {isDark && gradient && (
        <LinearGradient
          colors={[
            'transparent',
            `rgba(0, 0, 0, ${overlayOpacity * 0.5})`,
            `rgba(0, 0, 0, ${overlayOpacity * 1.8})`,
          ]}
          locations={[1 - gradientHeight, 1 - gradientHeight * 0.4, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {isDark && !gradient && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
              borderRadius: circular ? 9999 : 0,
            },
          ]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
});
