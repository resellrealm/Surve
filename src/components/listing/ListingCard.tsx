import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Image, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MapPin, Clock, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { PlatformBadge } from '../creator/PlatformBadge';
import { Badge } from '../ui/Badge';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Springs,
} from '../../constants/theme';
import type { Listing } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

function formatPay(min: number, max: number): string {
  if (min === max) return `$${min}`;
  return `$${min} - $${max}`;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ListingCard({ listing, onPress }: ListingCardProps) {
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
    onPress(listing);
  }, [listing, onPress]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`Listing: ${listing.title} by ${listing.business.business_name}`}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
        },
        animatedStyle,
      ]}
    >
      <Image source={{ uri: listing.image_url }} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.badges}>
            <PlatformBadge platform={listing.platform} />
            <Badge text={capitalizeFirst(listing.category)} small />
          </View>
          <Text style={[styles.pay, { color: colors.primary }]}>
            {formatPay(listing.pay_min, listing.pay_max)}
          </Text>
        </View>

        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={2}
        >
          {listing.title}
        </Text>

        <Text
          style={[styles.businessName, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {listing.business.business_name}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {listing.location}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={14} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {formatDeadline(listing.deadline)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Users size={14} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {listing.applicants_count}
            </Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
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
  metaText: {
    ...Typography.caption1,
  },
});
