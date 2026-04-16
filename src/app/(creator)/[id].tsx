import React, { useMemo, useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Star,
  MapPin,
  CheckCircle,
  Send,
  ExternalLink,
  MoreVertical,
  Flag,
  AlertTriangle,
  X,
  Check,
  UserPlus,
  UserCheck,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PressableScale } from '../../components/ui/PressableScale';
import { AnimatedLikeButton } from '../../components/ui/AnimatedLikeButton';
import { PlatformBadge } from '../../components/creator/PlatformBadge';
import { StatsRow } from '../../components/creator/StatsRow';
import { CreatorProfileSkeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import * as api from '../../lib/api';
import { useStore } from '../../lib/store';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import type { Creator, Review } from '../../types';

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam or misleading' },
  { key: 'inappropriate', label: 'Inappropriate content' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'impersonation', label: 'Impersonation' },
  { key: 'fraud', label: 'Fraud or scam' },
  { key: 'other', label: 'Other' },
] as const;

const MAX_DESCRIPTION_LENGTH = 500;

import { formatDateShort } from '../../lib/dateFormat';

const formatDate = formatDateShort;

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
      {review.reply_text && (
        <View
          style={[
            styles.replyBox,
            {
              backgroundColor: colors.surfaceSecondary,
              borderLeftColor: colors.primary,
            },
          ]}
        >
          <Text style={[styles.replyLabel, { color: colors.primary }]}>
            RESPONSE
          </Text>
          <Text style={[styles.replyText, { color: colors.text }]}>
            {review.reply_text}
          </Text>
          {review.replied_at && (
            <Text style={[styles.replyDate, { color: colors.textTertiary }]}>
              {formatDate(review.replied_at)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function ReportModal({
  visible,
  onClose,
  creatorName,
  targetUserId,
}: {
  visible: boolean;
  onClose: () => void;
  creatorName: string;
  targetUserId: string;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const currentUser = useStore((s) => s.user);

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resetAndClose = useCallback(() => {
    setSelectedReason(null);
    setDescription('');
    setSubmitted(false);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason || !currentUser) return;
    haptics.confirm();
    setSubmitting(true);
    const ok = await api.reportUser(
      currentUser.id,
      targetUserId,
      selectedReason,
      description.trim() || undefined,
    );
    setSubmitting(false);
    if (ok) {
      haptics.success();
      setSubmitted(true);
    } else {
      haptics.error();
    }
  }, [selectedReason, currentUser, targetUserId, description, haptics]);

  const handleSelectReason = useCallback(
    (key: string) => {
      haptics.select();
      setSelectedReason(key);
    },
    [haptics],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View
          style={[
            styles.modalHeader,
            {
              borderBottomColor: colors.borderLight,
              paddingTop: insets.top > 0 ? insets.top : Spacing.lg,
            },
          ]}
        >
          <PressableScale
            scaleValue={0.9}
            onPress={() => {
              haptics.tap();
              resetAndClose();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.modalCloseBtn}
          >
            <X size={22} color={colors.text} strokeWidth={2.2} />
          </PressableScale>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Report Profile
          </Text>
          <View style={styles.modalCloseBtn} />
        </View>

        {submitted ? (
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.successContainer}
          >
            <View
              style={[
                styles.successIcon,
                { backgroundColor: colors.successLight },
              ]}
            >
              <Check size={32} color={colors.success} strokeWidth={2.5} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>
              Report Submitted
            </Text>
            <Text
              style={[
                styles.successBody,
                { color: colors.textSecondary },
              ]}
            >
              Thanks for helping keep Surve safe. We'll review your report and
              take action if needed.
            </Text>
            <Button
              title="Done"
              onPress={resetAndClose}
              size="lg"
              style={styles.successBtn}
            />
          </Animated.View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.modalBody,
              { paddingBottom: insets.bottom + Spacing.xl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.warningBanner,
                { backgroundColor: colors.warningLight },
              ]}
            >
              <AlertTriangle
                size={18}
                color={colors.warning}
                strokeWidth={2}
              />
              <Text
                style={[styles.warningText, { color: colors.warning }]}
              >
                Reports are reviewed by our team. False reports may result in
                account restrictions.
              </Text>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Why are you reporting {creatorName}?
            </Text>

            {REPORT_REASONS.map((reason) => {
              const isSelected = selectedReason === reason.key;
              return (
                <PressableScale
                  key={reason.key}
                  onPress={() => handleSelectReason(reason.key)}
                  accessibilityRole="radio"
                  accessibilityLabel={reason.label}
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.reasonRow,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryLight + '12'
                        : colors.surface,
                      borderColor: isSelected
                        ? colors.primary
                        : colors.borderLight,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      {
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.radioInner,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.reasonLabel,
                      {
                        color: isSelected ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    {reason.label}
                  </Text>
                </PressableScale>
              );
            })}

            <Text
              style={[
                styles.sectionLabel,
                { color: colors.text, marginTop: Spacing.xl },
              ]}
            >
              Additional details (optional)
            </Text>
            <View
              style={[
                styles.textAreaWrap,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                value={description}
                onChangeText={(t) =>
                  t.length <= MAX_DESCRIPTION_LENGTH && setDescription(t)
                }
                placeholder="Tell us more about what happened…"
                placeholderTextColor={colors.textTertiary}
                multiline
                style={[styles.textArea, { color: colors.text }]}
                maxLength={MAX_DESCRIPTION_LENGTH}
                textAlignVertical="top"
              />
              <Text
                style={[styles.charCount, { color: colors.textTertiary }]}
              >
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </Text>
            </View>

            <Button
              title={submitting ? 'Submitting…' : 'Submit Report'}
              onPress={handleSubmit}
              size="lg"
              disabled={!selectedReason || submitting}
              variant="primary"
              style={{ marginTop: Spacing.xl }}
              icon={
                <Flag
                  size={18}
                  color={
                    !selectedReason || submitting
                      ? colors.textTertiary
                      : colors.onPrimary
                  }
                  strokeWidth={2}
                />
              }
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CreatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [0, 1], Extrapolation.CLAMP),
  }));

  const headerBorderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [50, 60], [0, 1], Extrapolation.CLAMP),
  }));

  const { followedCreators, toggleFollowedCreator, user: currentUser } = useStore();
  const [creator, setCreator] = React.useState<Creator | null>(null);
  const [creatorReviews, setCreatorReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reportVisible, setReportVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isFollowed = creator ? followedCreators.includes(creator.id) : false;

  const refetchCreator = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  React.useEffect(() => {
    if (!id) return;
    api.trackProfileView(id, currentUser?.id ?? null);
  }, [id, currentUser?.id]);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getCreators().then((creators) => {
      const found = creators.find((c) => c.id === id) ?? null;
      setCreator(found);
      setLoading(false);
      if (found) {
        api.getReviews(found.user_id).then(setCreatorReviews);
      }
    });
  }, [id, retryCount]);

  const handleInvite = useCallback(() => {
    haptics.success();
  }, [haptics]);

  const handleMessage = useCallback(() => {
    haptics.confirm();
  }, [haptics]);

  const handleOpenReport = useCallback(() => {
    haptics.confirm();
    setReportVisible(true);
  }, [haptics]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader />
        <View style={{ paddingTop: Spacing.lg }}>
          <CreatorProfileSkeleton />
        </View>
      </View>
    );
  }

  if (!creator) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader />
        <ErrorState
          title="Creator not found"
          message="We couldn't load this profile. It may have been removed or there was a connection issue."
          onRetry={refetchCreator}
        />
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
      <StatusBar style="light" />
      <View style={styles.floatingHeader} pointerEvents="box-none">
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.background },
            headerBgStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.floatingHeaderBorder,
            { backgroundColor: colors.border },
            headerBorderStyle,
          ]}
        />
        <ScreenHeader
          transparent
          right={
            <View style={styles.headerRightRow}>
              <AnimatedLikeButton
                active={isFollowed}
                onToggle={() => creator && toggleFollowedCreator(creator.id)}
                activeColor={colors.primary}
                inactiveColor={colors.text}
                size={44}
                style={[styles.headerIconBtn, { backgroundColor: colors.surface }]}
                accessibilityLabel={isFollowed ? 'Unfollow creator' : 'Follow creator'}
              >
                {({ color }) =>
                  isFollowed ? (
                    <UserCheck size={20} color={color} strokeWidth={2.2} />
                  ) : (
                    <UserPlus size={20} color={color} strokeWidth={2.2} />
                  )
                }
              </AnimatedLikeButton>
              <PressableScale
                scaleValue={0.85}
                onPress={handleOpenReport}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Report this profile"
                style={[
                  styles.headerIconBtn,
                  { backgroundColor: colors.surface },
                ]}
              >
                <MoreVertical size={20} color={colors.text} strokeWidth={2.2} />
              </PressableScale>
            </View>
          }
        />
      </View>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <AdaptiveImage
            source={{
              uri:
                creator.portfolio_urls.length > 0
                  ? creator.portfolio_urls[0]
                  : creator.user.avatar_url ?? undefined,
            }}
            style={styles.heroImage}
            contentFit="cover"
            accessibilityLabel={`${creator.user.full_name} cover photo`}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
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
              <Text style={[styles.name, { color: colors.text }]} accessibilityRole="header">
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
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
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
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Portfolio
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.portfolioScroll}
            >
              {creator.portfolio_urls.map((url, idx) => (
                <AdaptiveImage
                  key={idx}
                  source={{ uri: url }}
                  contentFit="cover"
                  style={styles.portfolioImage}
                  accessibilityLabel={`Portfolio image ${idx + 1}`}
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
              accessibilityRole="header"
            >
              Reviews ({creatorReviews.length})
            </Text>
            {creatorReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </Animated.View>
        )}
      </Animated.ScrollView>

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

      {creator && (
        <ReportModal
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          creatorName={creator.user.full_name}
          targetUserId={creator.user_id}
        />
      )}
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
  heroContainer: {
    marginHorizontal: -Spacing.lg,
    height: 240,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 240,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  floatingHeaderBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
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
  replyBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    gap: 4,
  },
  replyLabel: {
    ...Typography.caption2,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  replyText: {
    ...Typography.footnote,
    lineHeight: 20,
  },
  replyDate: {
    ...Typography.caption2,
    marginTop: 2,
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
  headerRightRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── Report Modal ──────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...Typography.headline,
    textAlign: 'center',
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  warningText: {
    ...Typography.caption1,
    flex: 1,
    lineHeight: 20,
  },
  sectionLabel: {
    ...Typography.subheadline,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
    minHeight: 52,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  reasonLabel: {
    ...Typography.body,
    flex: 1,
  },
  textAreaWrap: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 120,
  },
  textArea: {
    ...Typography.body,
    minHeight: 80,
  },
  charCount: {
    ...Typography.caption2,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    ...Typography.title2,
    marginBottom: Spacing.sm,
  },
  successBody: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  successBtn: {
    marginTop: Spacing.xxl,
    alignSelf: 'stretch',
  },
});
