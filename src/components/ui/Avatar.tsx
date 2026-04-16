import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Fonts } from '../../constants/theme';
import { AdaptiveImage } from './AdaptiveImage';

const AVATAR_SIZES = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;

const FALLBACK_PALETTE = [
  '#2c428f',
  '#059669',
  '#7C3AED',
  '#D97706',
  '#DC2626',
  '#0891B2',
  '#BE185D',
  '#4338CA',
  '#15803D',
  '#B45309',
] as const;

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface AvatarProps {
  uri: string | null;
  name: string;
  size?: AvatarSize | number;
  showOnline?: boolean;
  online?: boolean;
  blurhash?: string | null;
}

export function Avatar({
  uri,
  name,
  size = 'md',
  showOnline = false,
  online = false,
  blurhash,
}: AvatarProps) {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);

  const px = typeof size === 'number' ? size : AVATAR_SIZES[size];
  const initials = getInitials(name);
  const bgColor = FALLBACK_PALETTE[hashName(name) % FALLBACK_PALETTE.length];

  const showImage = !!uri && !imgError;

  const handleError = useCallback(() => setImgError(true), []);

  const fontSize = px <= 32 ? px * 0.4 : px * 0.36;
  const fontFamily = px >= 80 ? Fonts.bold : Fonts.semibold;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name}'s avatar${showOnline ? (online ? ', online' : ', offline') : ''}`}
      style={[styles.container, { width: px, height: px }]}
    >
      {showImage ? (
        <AdaptiveImage
          source={{ uri }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          circular
          overlayOpacity={0.12}
          blurhash={blurhash}
          onError={handleError}
          style={{
            width: px,
            height: px,
            borderRadius: px / 2,
          }}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: px,
              height: px,
              borderRadius: px / 2,
              backgroundColor: bgColor,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              { fontSize, fontFamily, color: '#FFFFFF' },
            ]}
            allowFontScaling={false}
          >
            {initials}
          </Text>
        </View>
      )}
      {showOnline && (
        <View
          style={[
            styles.onlineIndicator,
            {
              backgroundColor: online ? colors.success : colors.textTertiary,
              borderColor: colors.surface,
              width: px * 0.28,
              height: px * 0.28,
              borderRadius: (px * 0.28) / 2,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    borderWidth: 2,
  },
});
