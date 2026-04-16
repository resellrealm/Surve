import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Clock, Users, Heart, Star } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { AdaptiveImage } from '../ui/AdaptiveImage';
import { PlatformBadge } from '../creator/PlatformBadge';
import { Badge } from '../ui/Badge';
import { PressableScale } from '../ui/PressableScale';
import { ThemedText } from '../ui/ThemedText';
import { AnimatedLikeButton } from '../ui/AnimatedLikeButton';
import { ContextMenu } from '../ui/ContextMenu';
import { useListingContextActions } from '../../hooks/useCardContextActions';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { formatCurrencyRange } from '../../lib/currency';
import type { Listing } from '../../types';

interface ListingCardProps {
  listing: Listing;
  onPress: (listing: Listing) => void;
}

function formatDeadline(deadline: string): string {
  const d = new Date(deadline);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Expired';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ListingCard({ listing, onPress }: ListingCardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { savedListings, toggleSavedListing } = useStore();
  const isSaved = savedListings.includes(listing.id);
  const menuActions = useListingContextActions(listing);

  const handlePress = useCallback(() => {
    haptics.tap();
    onPress(listing);
  }, [listing, onPress]);

  const handleToggleSave = useCallback(() => {
    toggleSavedListing(listing.id);
  }, [listing.id, toggleSavedListing]);

  return (
    <ContextMenu
      actions={menuActions}
      accessibilityLabel={`Listing: ${listing.title}, long press for options`}
    >
    <PressableScale
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Listing: ${listing.title} by ${listing.business.business_name}`}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
        },
      ]}
    >
      <View>
        <AdaptiveImage
          source={{ uri: listing.image_url }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          gradient
          overlayOpacity={0.18}
          blurhash={listing.image_blurhash}
          accessibilityLabel={`Photo for ${listing.title}`}
          style={styles.image}
        />
        <AnimatedLikeButton
          active={isSaved}
          onToggle={handleToggleSave}
          activeColor="#FF3B6F"
          inactiveColor="rgba(255,255,255,0.9)"
          size={36}
          style={styles.bookmarkButton}
          accessibilityLabel={isSaved ? 'Unsave listing' : 'Save listing'}
        >
          {({ color, fill }) => (
            <Heart size={18} color={color} fill={fill} strokeWidth={2} />
          )}
        </AnimatedLikeButton>
        {listing.is_boosted && (
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.boostedBadge}
          >
            <Star size={11} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
            <ThemedText variant="caption1" style={styles.boostedText}>Boosted</ThemedText>
          </LinearGradient>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.badges}>
            <PlatformBadge platform={listing.platform} />
            <Badge text={capitalizeFirst(listing.category)} small />
          </View>
          <ThemedText variant="headline" style={[styles.pay, { color: colors.primary }]}>
            {formatCurrencyRange(listing.pay_min, listing.pay_max)}
          </ThemedText>
        </View>

        <ThemedText
          variant="headline"
          style={[styles.title, { color: colors.text }]}
          numberOfLines={2}
        >
          {listing.title}
        </ThemedText>

        <ThemedText
          variant="subheadline"
          style={[styles.businessName, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {listing.business.business_name}
        </ThemedText>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.textTertiary} strokeWidth={2} />
            <ThemedText variant="caption1" style={{ color: colors.textTertiary }}>
              {listing.location}
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Clock size={14} color={colors.textTertiary} strokeWidth={2} />
            <ThemedText variant="caption1" style={{ color: colors.textTertiary }}>
              {formatDeadline(listing.deadline)}
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Users size={14} color={colors.textTertiary} strokeWidth={2} />
            <ThemedText variant="caption1" style={{ color: colors.textTertiary }}>
              {listing.applicants_count}
            </ThemedText>
          </View>
        </View>
      </View>
    </PressableScale>
    </ContextMenu>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  image: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  bookmarkButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 18,
  },
  boostedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm + 36 + Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  boostedText: {
    ...Typography.caption1,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    padding: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pay: {
    ...Typography.headline,
    fontWeight: '700',
  },
  title: {
    ...Typography.headline,
    marginBottom: Spacing.xs,
  },
  businessName: {
    ...Typography.subheadline,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
