import React from 'react';
import { StyleSheet, View, Image, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { BorderRadius } from '../../constants/theme';

interface AvatarProps {
  uri: string | null;
  name: string;
  size?: number;
  showOnline?: boolean;
  online?: boolean;
}

export function Avatar({
  uri,
  name,
  size = 44,
  showOnline = false,
  online = false,
}: AvatarProps) {
  const { colors } = useTheme();
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              { fontSize: size * 0.36, color: colors.onPrimary },
            ]}
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
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: (size * 0.28) / 2,
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
  image: {
    resizeMode: 'cover',
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
