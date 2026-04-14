import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { PlatformBadge } from './PlatformBadge';
import { StatsRow } from './StatsRow';
import { Badge } from '../ui/Badge';
import { useTheme } from '../../hooks/useTheme';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Springs,
} from '../../constants/theme';
import type { Creator } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CreatorCardProps {
  creator: Creator;
  onPress: (creator: Creator) => void;
}

export function CreatorCard({ creator, onPress }: CreatorCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, Springs.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, Springs.bouncy);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(creator);
  }, [creator, onPress]);

  const platform = creator.instagram_handle && creator.tiktok_handle
    ? 'both'
    : creator.tiktok_handle
      ? 'tiktok'
      : 'instagram';

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`Creator: ${creator.user.full_name}, rated ${creator.rating.toFixed(1)}`}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <Avatar
          uri={creator.user.avatar_url}
          name={creator.user.full_name}
          size={52}
        />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: colors.text }]}
              numberOfLines={1}
            >
              {creator.user.full_name}
            </Text>
            {creator.verified && (
              <Badge text="Verified" variant="primary" small />
            )}
          </View>
          <Text
            style={[styles.location, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {creator.location}
          </Text>
        </View>
        <View style={styles.ratingContainer}>
          <Star size={14} color={colors.rating} fill={colors.rating} strokeWidth={2} />
          <Text style={[styles.rating, { color: colors.text }]}>
            {creator.rating.toFixed(1)}
          </Text>
        </View>
      </View>

      <Text
        style={[styles.bio, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {creator.bio}
      </Text>

      <View style={styles.platformRow}>
        <PlatformBadge platform={platform} />
      </View>

      <StatsRow
        instagramFollowers={creator.instagram_followers}
        tiktokFollowers={creator.tiktok_followers}
        engagementRate={creator.engagement_rate}
        avgViews={creator.avg_views}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    ...Typography.headline,
  },
  location: {
    ...Typography.caption1,
    marginTop: Spacing.xxs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rating: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  bio: {
    ...Typography.subheadline,
    marginBottom: Spacing.md,
  },
  platformRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
});
