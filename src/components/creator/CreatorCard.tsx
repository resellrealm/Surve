import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { Avatar } from '../ui/Avatar';
import { PlatformBadge } from './PlatformBadge';
import { StatsRow } from './StatsRow';
import { Badge } from '../ui/Badge';
import { PressableScale } from '../ui/PressableScale';
import { ThemedText } from '../ui/ThemedText';
import { ContextMenu } from '../ui/ContextMenu';
import { useCreatorContextActions } from '../../hooks/useCardContextActions';
import { useTheme } from '../../hooks/useTheme';
import {
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import type { Creator } from '../../types';

interface CreatorCardProps {
  creator: Creator;
  onPress: (creator: Creator) => void;
}

export function CreatorCard({ creator, onPress }: CreatorCardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const menuActions = useCreatorContextActions(creator);

  const handlePress = useCallback(() => {
    haptics.tap();
    onPress(creator);
  }, [creator, onPress]);

  const platform = creator.instagram_handle && creator.tiktok_handle
    ? 'both'
    : creator.tiktok_handle
      ? 'tiktok'
      : 'instagram';

  return (
    <ContextMenu
      actions={menuActions}
      accessibilityLabel={`Creator: ${creator.user.full_name}, long press for options`}
    >
    <PressableScale
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Creator: ${creator.user.full_name}, rated ${creator.rating.toFixed(1)}`}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
        },
      ]}
    >
      <View style={styles.header}>
        <Avatar
          uri={creator.user.avatar_url}
          name={creator.user.full_name}
          size={52}
          blurhash={creator.user.avatar_blurhash}
        />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <ThemedText
              variant="headline"
              style={[styles.name, { color: colors.text }]}
              numberOfLines={1}
            >
              {creator.user.full_name}
            </ThemedText>
            {creator.verified && (
              <Badge text="Verified" variant="primary" small />
            )}
          </View>
          <ThemedText
            variant="caption1"
            style={[styles.location, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {creator.location}
          </ThemedText>
        </View>
        <View style={styles.ratingContainer}>
          <Star size={14} color={colors.rating} fill={colors.rating} strokeWidth={2} />
          <ThemedText variant="subheadline" style={[styles.rating, { color: colors.text }]}>
            {creator.rating.toFixed(1)}
          </ThemedText>
        </View>
      </View>

      <ThemedText
        variant="subheadline"
        style={[styles.bio, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {creator.bio}
      </ThemedText>

      <View style={styles.platformRow}>
        <PlatformBadge platform={platform} />
      </View>

      <StatsRow
        instagramFollowers={creator.instagram_followers}
        tiktokFollowers={creator.tiktok_followers}
        engagementRate={creator.engagement_rate}
        avgViews={creator.avg_views}
      />
    </PressableScale>
    </ContextMenu>
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
  name: {},
  location: {
    marginTop: Spacing.xxs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rating: {
    fontWeight: '600',
  },
  bio: {
    marginBottom: Spacing.md,
  },
  platformRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
});
