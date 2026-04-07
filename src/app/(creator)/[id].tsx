import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  ArrowLeft,
  Star,
  MapPin,
  CheckCircle,
  Send,
  ExternalLink,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PlatformBadge } from '../../components/creator/PlatformBadge';
import { StatsRow } from '../../components/creator/StatsRow';
import * as api from '../../lib/api';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import type { Creator, Review } from '../../types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ReviewCard({ review }: { review: Review }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.reviewCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
        },
      ]}
    >
      <View style={styles.reviewHeader}>
        <Avatar
          uri={review.reviewer_avatar}
          name={review.reviewer_name}
          size={36}
        />
        <View style={styles.reviewInfo}>
          <Text style={[styles.reviewerName, { color: colors.text }]}>
            {review.reviewer_name}
          </Text>
          <Text
            style={[styles.reviewDate, { color: colors.textTertiary }]}
          >
            {formatDate(review.created_at)}
          </Text>
        </View>
        <View style={styles.reviewStars}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={14}
              color={colors.rating}
              fill={i < review.rating ? colors.rating : 'transparent'}
              strokeWidth={2}
            />
          ))}
        </View>
      </View>
      <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
        {review.comment}
      </Text>
    </View>
  );
}

export default function CreatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [creator, setCreator] = React.useState<Creator | null>(null);
  const [creatorReviews, setCreatorReviews] = React.useState<Review[]>([]);

  React.useEffect(() => {
    if (!id) return;
    // Fetch creator by profile ID — need to get all creators and find by id
    api.getCreators().then((creators) => {
      const found = creators.find((c) => c.id === id) ?? null;
      setCreator(found);
      if (found) {
        api.getReviews(found.user_id).then(setCreatorReviews);
      }
    });
  }, [id]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleInvite = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleMessage = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  if (!creator) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={styles.errorState}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Creator not found
          </Text>
        </View>
      </View>
    );
  }

  const platform =
    creator.instagram_handle && creator.tiktok_handle
      ? 'both'
      : creator.tiktok_handle
        ? 'tiktok'
        : 'instagram';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Header */}
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Profile Header */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          style={styles.profileHeader}
        >
          <Avatar
            uri={creator.user.avatar_url}
            name={creator.user.full_name}
            size={90}
          />
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>
                {creator.user.full_name}
              </Text>
              {creator.verified && (
                <CheckCircle
                  size={20}
                  color={colors.primary}
                  fill={colors.primary}
                  strokeWidth={2}
                />
              )}
            </View>
            <View style={styles.locationRow}>
              <MapPin size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text
                style={[styles.locationText, { color: colors.textSecondary }]}
              >
                {creator.location}
              </Text>
            </View>
            <View style={styles.badgesRow}>
              <PlatformBadge platform={platform} />
              <View style={styles.ratingBadge}>
                <Star
                  size={14}
                  color={colors.rating}
                  fill={colors.rating}
                  strokeWidth={2}
                />
                <Text style={[styles.ratingText, { color: colors.text }]}>
                  {creator.rating.toFixed(1)} ({creator.total_reviews})
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Bio */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Text style={[styles.bio, { color: colors.textSecondary }]}>
            {creator.bio}
          </Text>
        </Animated.View>

        {/* Handles */}
        <Animated.View entering={FadeInDown.duration(500).delay(250)}>
          <View style={styles.handles}>
            {creator.instagram_handle && (
              <View
                style={[
                  styles.handleChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.handleText, { color: colors.text }]}>
                  {creator.instagram_handle}
                </Text>
                <ExternalLink
                  size={14}
                  color={colors.textTertiary}
                  strokeWidth={2}
                />
              </View>
            )}
            {creator.tiktok_handle && (
              <View
                style={[
                  styles.handleChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.handleText, { color: colors.text }]}>
                  {creator.tiktok_handle}
                </Text>
                <ExternalLink
                  size={14}
                  color={colors.textTertiary}
                  strokeWidth={2}
                />
              </View>
            )}
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Card style={styles.statsCard}>
            <StatsRow
              instagramFollowers={creator.instagram_followers}
              tiktokFollowers={creator.tiktok_followers}
              engagementRate={creator.engagement_rate}
              avgViews={creator.avg_views}
            />
          </Card>
        </Animated.View>

        {/* Performance */}
        <Animated.View entering={FadeInDown.duration(500).delay(350)}>
          <Card style={styles.statsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Track Record
            </Text>
            <View style={styles.perfRow}>
              <View style={styles.perfItem}>
                <Text style={[styles.perfValue, { color: colors.primary }]}>
                  {creator.total_bookings}
                </Text>
                <Text
                  style={[styles.perfLabel, { color: colors.textTertiary }]}
                >
                  Bookings
                </Text>
              </View>
              <View
                style={[
                  styles.perfDivider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <View style={styles.perfItem}>
                <Text style={[styles.perfValue, { color: colors.primary }]}>
                  {creator.total_reviews}
                </Text>
                <Text
                  style={[styles.perfLabel, { color: colors.textTertiary }]}
                >
                  Reviews
                </Text>
              </View>
              <View
                style={[
                  styles.perfDivider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <View style={styles.perfItem}>
                <Text style={[styles.perfValue, { color: colors.primary }]}>
                  {creator.categories.length}
                </Text>
                <Text
                  style={[styles.perfLabel, { color: colors.textTertiary }]}
                >
                  Categories
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Portfolio */}
        {creator.portfolio_urls.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Portfolio
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.portfolioScroll}
            >
              {creator.portfolio_urls.map((url, idx) => (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={styles.portfolioImage}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Reviews */}
        {creatorReviews.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, marginTop: Spacing.xxl },
              ]}
            >
              Reviews ({creatorReviews.length})
            </Text>
            {creatorReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(300)}
        style={[
          styles.bottomCta,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.borderLight,
            paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg,
          },
        ]}
      >
        <Button
          title="Message"
          onPress={handleMessage}
          variant="outline"
          size="lg"
          style={styles.ctaButtonHalf}
          icon={<Send size={18} color={colors.primary} strokeWidth={2} />}
        />
        <Button
          title="Invite to Listing"
          onPress={handleInvite}
          size="lg"
          style={styles.ctaButtonHalf}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  nameSection: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    ...Typography.title2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  locationText: {
    ...Typography.subheadline,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.caption1,
    fontWeight: '600',
  },
  bio: {
    ...Typography.body,
    lineHeight: 26,
    marginBottom: Spacing.lg,
  },
  handles: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    flexWrap: 'wrap',
  },
  handleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  handleText: {
    ...Typography.subheadline,
    fontWeight: '500',
  },
  statsCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  perfItem: {
    flex: 1,
    alignItems: 'center',
  },
  perfValue: {
    ...Typography.title2,
    fontWeight: '800',
  },
  perfLabel: {
    ...Typography.caption2,
    marginTop: Spacing.xs,
  },
  perfDivider: {
    width: 1,
    height: 36,
  },
  portfolioScroll: {
    gap: Spacing.md,
  },
  portfolioImage: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.lg,
    resizeMode: 'cover',
  },
  reviewCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  reviewInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  reviewerName: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  reviewDate: {
    ...Typography.caption2,
    marginTop: Spacing.xxs,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    ...Typography.subheadline,
    lineHeight: 22,
  },
  bottomCta: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadows.lg,
  },
  ctaButtonHalf: {
    flex: 1,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...Typography.title3,
  },
});
