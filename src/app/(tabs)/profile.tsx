import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Star,
  MapPin,
  Shield,
  Wallet,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  Info,
  Bookmark,
  MessageSquare,
  Clock,
  BarChart2,
} from 'lucide-react-native';
import type { Creator, Business, Review, Listing } from '../../types';
import { useHaptics } from '../../hooks/useHaptics';
import { toast } from '../../lib/toast';
import { useTheme } from '../../hooks/useTheme';

import { ThemedText } from '../../components/ui/ThemedText';
import { useStore } from '../../lib/store';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { PlatformBadge } from '../../components/creator/PlatformBadge';
import { StatsRow } from '../../components/creator/StatsRow';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { PulsingDot } from '../../components/ui/PulsingDot';
import { Skeleton } from '../../components/ui/Skeleton';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';
import * as api from '../../lib/api';
import { formatSmartDate } from '../../lib/dateFormat';
import {
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
  Springs,
} from '../../constants/theme';

// ─── Constants ───────────────────────────────────────────────────────────────

const COVER_HEIGHT = 160;
const AVATAR_SIZE = 96;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;
const TAB_COUNT = 3;
const TAB_W = Layout.screenWidth / TAB_COUNT;
const UNDERLINE_W = TAB_W * 0.4;
const UNDERLINE_START = (TAB_W - UNDERLINE_W) / 2;

function joinedYear(iso: string): string {
  try { return new Date(iso).getFullYear().toString(); } catch { return '—'; }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileSkeleton({ topInset }: { topInset: number }) {
  return (
    <View>
      <Skeleton width={Layout.screenWidth} height={COVER_HEIGHT + topInset} />
      <View style={{ alignItems: 'center', paddingTop: AVATAR_OVERLAP + Spacing.md, gap: Spacing.sm, paddingHorizontal: Spacing.lg }}>
        <Skeleton width={160} height={22} />
        <Skeleton width={100} height={18} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Skeleton width={70} height={24} borderRadius={BorderRadius.full} />
          <Skeleton width={70} height={24} borderRadius={BorderRadius.full} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.xxl, marginTop: Spacing.lg }}>
          <Skeleton width={56} height={44} />
          <Skeleton width={56} height={44} />
          <Skeleton width={56} height={44} />
        </View>
        <Skeleton width={140} height={40} borderRadius={BorderRadius.full} style={{ marginTop: Spacing.sm }} />
      </View>
    </View>
  );
}

// ─── Settings Row ─────────────────────────────────────────────────────────────

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  accessibilityHint?: string;
}

function SettingsRow({ icon, title, subtitle, onPress, destructive = false, accessibilityHint }: SettingsRowProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const handlePress = useCallback(() => { haptics.tap(); onPress(); }, [onPress, haptics]);

  return (
    <PressableScale
      scaleValue={0.98}
      onPress={handlePress}
      style={styles.settingsRow}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
    >
      <View style={[styles.settingsIcon, { backgroundColor: destructive ? colors.cancelledLight : colors.surfaceSecondary }]}>
        {icon}
      </View>
      <View style={styles.settingsInfo}>
        <ThemedText variant="subheadline" style={[styles.settingsTitle, { color: destructive ? colors.error : colors.text }]}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText variant="caption1" style={[styles.settingsSubtitle, { color: colors.textTertiary }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
    </PressableScale>
  );
}

// ─── Stripe Connect Card ──────────────────────────────────────────────────────

function StripeConnectCard({ creatorData, onPress }: { creatorData: Creator; onPress: () => void }) {
  const { colors } = useTheme();
  const connected = creatorData.stripe_onboarding_complete === true;
  const started = Boolean(creatorData.stripe_account_id) && !connected;

  const tone = connected
    ? { bg: colors.completedLight, fg: colors.completed }
    : started
      ? { bg: colors.pendingLight, fg: colors.pending }
      : { bg: colors.errorLight, fg: colors.error };

  const title = connected ? 'Payouts set up' : started ? 'Finish Stripe verification' : 'Set up payouts';
  const body = connected
    ? 'Stripe Connect is active — payouts land in your bank after each completed booking.'
    : started
      ? 'Stripe needs a couple more details before it can send you money.'
      : "Connect your bank through Stripe to receive payouts. Takes about 2 minutes.";

  return (
    <PressableScale onPress={connected ? undefined : onPress} disabled={connected} accessibilityRole="button" accessibilityLabel={title}>
      <Card style={styles.infoCard}>
        <View style={styles.stripeRow}>
          <View style={[styles.stripeIcon, { backgroundColor: tone.bg }]}>
            <CreditCard size={20} color={tone.fg} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="headline" style={[styles.stripeTitle, { color: colors.text }]}>{title}</ThemedText>
            <ThemedText variant="footnote" style={[styles.stripeBody, { color: colors.textSecondary }]}>{body}</ThemedText>
          </View>
          {!connected && <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />}
        </View>
      </Card>
    </PressableScale>
  );
}

// ─── Tab Sub-components ───────────────────────────────────────────────────────

function AboutTab({
  isCreator,
  creatorData,
  businessData,
  location,
  bio,
  onStripePress,
}: {
  isCreator: boolean;
  creatorData: Creator | null;
  businessData: Business | null;
  location: string | null | undefined;
  bio: string | null | undefined;
  onStripePress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.tabPane}>
      {isCreator && creatorData && (
        <StripeConnectCard creatorData={creatorData} onPress={onStripePress} />
      )}

      {bio ? (
        <Card style={styles.infoCard}>
          <ThemedText variant="headline" style={[styles.cardTitle, { color: colors.text }]}>
            {isCreator ? 'About me' : 'About'}
          </ThemedText>
          <ThemedText variant="body" style={[styles.bioText, { color: colors.textSecondary }]}>
            {bio}
          </ThemedText>
        </Card>
      ) : null}

      {location ? (
        <View style={[styles.locationChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MapPin size={14} color={colors.primary} strokeWidth={2} />
          <ThemedText variant="subheadline" style={{ color: colors.textSecondary }}>{location}</ThemedText>
        </View>
      ) : null}

      {isCreator && creatorData && (
        <Card style={styles.infoCard}>
          <ThemedText variant="headline" style={[styles.cardTitle, { color: colors.text }]}>Platform Stats</ThemedText>
          <View style={styles.platformBadges}>
            {creatorData.instagram_handle && <PlatformBadge platform="instagram" />}
            {creatorData.tiktok_handle && <PlatformBadge platform="tiktok" />}
          </View>

          {/* Pending screenshot review banner */}
          {creatorData.social_accounts?.some(
            (a) => a.verification_status === 'pending_screenshot',
          ) && (
            <View style={[styles.pendingReviewBanner, { backgroundColor: colors.pendingLight, borderColor: colors.pending }]}>
              <Clock size={14} color={colors.pending} strokeWidth={2} />
              <ThemedText variant="caption1" style={[styles.pendingReviewText, { color: colors.pending }]}>
                Pending review — your analytics screenshot is being checked. Usually &lt;24h.
              </ThemedText>
            </View>
          )}

          <StatsRow
            instagramFollowers={creatorData.instagram_followers}
            tiktokFollowers={creatorData.tiktok_followers}
            engagementRate={creatorData.engagement_rate}
            avgViews={creatorData.avg_views}
          />
        </Card>
      )}

      {!isCreator && businessData && (
        <Card style={styles.infoCard}>
          <ThemedText variant="headline" style={[styles.cardTitle, { color: colors.text }]}>Business Info</ThemedText>
          <View style={styles.perfRow}>
            <View style={styles.perfItem}>
              <Star size={18} color={colors.rating} fill={colors.rating} strokeWidth={2} />
              <ThemedText variant="title3" style={[styles.perfValue, { color: colors.text }]}>
                {businessData.rating.toFixed(1)}
              </ThemedText>
              <ThemedText variant="caption2" style={{ color: colors.textTertiary }}>Rating</ThemedText>
            </View>
            <View style={[styles.perfDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.perfItem}>
              <ThemedText variant="title3" style={[styles.perfValue, { color: colors.text }]}>
                {businessData.total_listings}
              </ThemedText>
              <ThemedText variant="caption2" style={{ color: colors.textTertiary }}>Listings</ThemedText>
            </View>
            <View style={[styles.perfDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.perfItem}>
              <ThemedText variant="title3" style={[styles.perfValue, { color: colors.text }]}>
                {businessData.total_reviews}
              </ThemedText>
              <ThemedText variant="caption2" style={{ color: colors.textTertiary }}>Reviews</ThemedText>
            </View>
          </View>
        </Card>
      )}
    </View>
  );
}

// ─── Review Item ──────────────────────────────────────────────────────────────

function ReviewItem({ review }: { review: Review }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.reviewItem, { borderColor: colors.borderLight }]}>
      <View style={styles.reviewHeader}>
        <Avatar
          uri={review.reviewer_avatar}
          name={review.reviewer_name}
          size={40}
        />
        <View style={{ flex: 1 }}>
          <ThemedText variant="subheadline" style={[styles.reviewerName, { color: colors.text }]}>
            {review.reviewer_name}
          </ThemedText>
          <View style={styles.reviewMeta}>
            <View style={styles.reviewStars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={12}
                  color={colors.rating}
                  fill={i <= review.rating ? colors.rating : 'transparent'}
                  strokeWidth={2}
                />
              ))}
            </View>
            <ThemedText variant="caption2" style={{ color: colors.textTertiary }}>
              {formatSmartDate(review.created_at)}
            </ThemedText>
          </View>
        </View>
      </View>
      {review.comment ? (
        <ThemedText variant="body" style={[styles.reviewComment, { color: colors.textSecondary }]}>
          {review.comment}
        </ThemedText>
      ) : null}
    </View>
  );
}

function WorkTab({
  isCreator,
  creatorData,
  businessData,
  listings,
  onListingPress,
}: {
  isCreator: boolean;
  creatorData: Creator | null;
  businessData: Business | null;
  listings: Listing[];
  onListingPress: (id: string) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  if (isCreator && creatorData?.portfolio_urls?.length) {
    return (
      <View style={styles.tabPane}>
        <Card style={styles.infoCard}>
          <ThemedText variant="headline" style={[styles.cardTitle, { color: colors.text }]}>Portfolio</ThemedText>
          <View style={styles.portfolioGrid}>
            {creatorData.portfolio_urls.map((url, idx) => (
              <PressableScale
                key={idx}
                onPress={() => haptics.tap()}
                accessibilityRole="image"
                accessibilityLabel={`Portfolio image ${idx + 1}`}
              >
                <AdaptiveImage
                  source={{ uri: url }}
                  contentFit="cover"
                  overlayOpacity={0.12}
                  style={styles.portfolioImage}
                />
              </PressableScale>
            ))}
          </View>
        </Card>
      </View>
    );
  }

  if (isCreator) {
    return (
      <View style={[styles.tabPane, styles.emptyState]}>
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceSecondary }]}>
          <Star size={32} color={colors.textTertiary} strokeWidth={1.5} />
        </View>
        <ThemedText variant="headline" style={[{ color: colors.text }, styles.emptyTitle]}>
          No portfolio yet
        </ThemedText>
        <ThemedText variant="subheadline" style={[{ color: colors.textSecondary, textAlign: 'center' }]}>
          Add portfolio images to showcase your work to businesses.
        </ThemedText>
      </View>
    );
  }

  if (!isCreator && businessData) {
    const myListings = listings.filter((l) => l.business_id === businessData.id);
    if (myListings.length > 0) {
      return (
        <View style={styles.tabPane}>
          {myListings.map((listing) => (
            <PressableScale
              key={listing.id}
              onPress={() => { haptics.tap(); onListingPress(listing.id); }}
              accessibilityRole="button"
              accessibilityLabel={listing.title}
            >
              <Card style={styles.listingRow} padding={0}>
                <AdaptiveImage
                  source={{ uri: listing.image_url }}
                  contentFit="cover"
                  overlayOpacity={0.1}
                  style={styles.listingThumb}
                />
                <View style={styles.listingRowInfo}>
                  <ThemedText variant="subheadline" style={[{ color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    {listing.title}
                  </ThemedText>
                  <ThemedText variant="caption1" style={{ color: colors.textSecondary }} numberOfLines={1}>
                    {listing.location}
                  </ThemedText>
                  <View style={styles.listingRowMeta}>
                    <Badge
                      text={listing.status}
                      variant={listing.status === 'active' ? 'success' : 'default'}
                    />
                    <ThemedText variant="caption2" style={{ color: colors.primary, fontWeight: '600' }}>
                      ${listing.pay_min}–${listing.pay_max}
                    </ThemedText>
                  </View>
                </View>
                <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} style={{ alignSelf: 'center', marginRight: Spacing.md }} />
              </Card>
            </PressableScale>
          ))}
        </View>
      );
    }

    return (
      <View style={[styles.tabPane, styles.emptyState]}>
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceSecondary }]}>
          <Bookmark size={32} color={colors.textTertiary} strokeWidth={1.5} />
        </View>
        <ThemedText variant="headline" style={[{ color: colors.text }, styles.emptyTitle]}>
          No listings yet
        </ThemedText>
        <ThemedText variant="subheadline" style={[{ color: colors.textSecondary, textAlign: 'center' }]}>
          Create your first listing to start attracting creators.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.tabPane, styles.emptyState]}>
      <ThemedText variant="subheadline" style={{ color: colors.textTertiary }}>No content yet</ThemedText>
    </View>
  );
}

function ReviewsTab({
  isCreator,
  creatorData,
  businessData,
  reviews,
  reviewsLoading,
}: {
  isCreator: boolean;
  creatorData: Creator | null;
  businessData: Business | null;
  reviews: Review[];
  reviewsLoading: boolean;
}) {
  const { colors } = useTheme();
  const rating = isCreator ? creatorData?.rating : businessData?.rating;
  const total = isCreator ? creatorData?.total_reviews : businessData?.total_reviews;

  return (
    <View style={styles.tabPane}>
      {/* Rating summary card */}
      <Card style={styles.infoCard}>
        <View style={styles.reviewSummary}>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={26}
                color={colors.rating}
                fill={rating && i <= Math.round(rating) ? colors.rating : 'transparent'}
                strokeWidth={2}
              />
            ))}
          </View>
          <ThemedText variant="title1" style={{ color: colors.text, fontWeight: '700' }}>
            {rating?.toFixed(1) ?? '—'}
          </ThemedText>
          <ThemedText variant="subheadline" style={{ color: colors.textSecondary }}>
            {total !== undefined
              ? total > 0 ? `${total} review${total !== 1 ? 's' : ''}` : 'No reviews yet'
              : '—'}
          </ThemedText>
        </View>
      </Card>

      {/* Loading skeletons */}
      {reviewsLoading && (
        <>
          <Skeleton width="100%" height={90} borderRadius={BorderRadius.lg} />
          <Skeleton width="100%" height={90} borderRadius={BorderRadius.lg} />
        </>
      )}

      {/* Review items */}
      {!reviewsLoading && reviews.length > 0 && reviews.map((review) => (
        <ReviewItem key={review.id} review={review} />
      ))}

      {/* Empty state */}
      {!reviewsLoading && reviews.length === 0 && (total === 0 || total === undefined) && (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceSecondary }]}>
            <MessageSquare size={32} color={colors.textTertiary} strokeWidth={1.5} />
          </View>
          <ThemedText variant="headline" style={[{ color: colors.text }, styles.emptyTitle]}>
            No reviews yet
          </ThemedText>
          <ThemedText variant="subheadline" style={{ color: colors.textSecondary, textAlign: 'center' }}>
            Complete your first booking to start collecting reviews.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, unreadNotificationsCount } = useStore();

  const isCreator = user?.role === 'creator';
  const [creatorData, setCreatorData] = React.useState<Creator | null>(null);
  const [businessData, setBusinessData] = React.useState<Business | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = React.useState(false);
  const listings = useStore((s) => s.listings);

  const [activeTab, setActiveTab] = useState(0);
  const tabOffset = useSharedValue(UNDERLINE_START);
  const underlineAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: tabOffset.value }],
  }));

  const tabLabels = isCreator ? ['About', 'Portfolio', 'Reviews'] : ['About', 'Listings', 'Reviews'];

  const handleTabPress = useCallback((index: number) => {
    haptics.tap();
    setActiveTab(index);
    tabOffset.value = withSpring(index * TAB_W + UNDERLINE_START, Springs.snappy);
  }, [haptics, tabOffset]);

  const load = useCallback(() => {
    if (!user) return;
    setProfileLoading(true);
    setProfileError(null);
    const req = isCreator
      ? api.getCreatorProfile(user.id).then((data) => {
          setCreatorData(data);
          if (data?.id) {
            setReviewsLoading(true);
            api.getReviews(data.id).then(setReviews).finally(() => setReviewsLoading(false));
          }
        })
      : api.getBusinessProfile(user.id).then((data) => {
          setBusinessData(data);
          if (data?.id) {
            setReviewsLoading(true);
            api.getReviews(data.id).then(setReviews).finally(() => setReviewsLoading(false));
          }
        });
    req
      .catch((e: unknown) => setProfileError((e as Error)?.message ?? 'Failed to load profile'))
      .finally(() => setProfileLoading(false));
  }, [user, isCreator]);

  React.useEffect(() => {
    if (!user) return;
    api.trackProfileView(user.id, user.id);
  }, [user?.id]);

  React.useEffect(() => { load(); }, [load]);

  const handleLogout = useCallback(() => {
    haptics.warning();
    logout();
    router.replace('/auth');
  }, [logout, router, haptics]);

  const location = user?.location ?? (isCreator ? creatorData?.location : businessData?.location);
  const bio = user?.bio ?? (isCreator ? creatorData?.bio : businessData?.description);
  const rating = isCreator ? creatorData?.rating : businessData?.rating;
  const statLeftValue = isCreator
    ? (creatorData?.total_bookings?.toString() ?? '0')
    : (businessData?.total_listings?.toString() ?? '0');
  const statLeftLabel = isCreator ? 'Bookings' : 'Listings';
  const joinedAt = (isCreator ? creatorData?.created_at : businessData?.created_at) ?? user?.created_at ?? '';
  const coverUri = isCreator ? creatorData?.cover_photo_url : businessData?.cover_url;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (profileLoading && !creatorData && !businessData) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: Layout.tabBarHeight + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileSkeleton topInset={insets.top} />
      </ScrollView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (profileError && !creatorData && !businessData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} accessibilityRole="alert">
        <View style={[styles.errorState, { paddingTop: insets.top + 80 }]}>
          <View style={[styles.errorIcon, { backgroundColor: colors.cancelledLight }]}>
            <AlertTriangle size={40} color={colors.error} strokeWidth={1.5} />
          </View>
          <ThemedText variant="title3" style={[{ marginBottom: Spacing.sm }, { color: colors.text }]}>
            Couldn't load profile
          </ThemedText>
          <ThemedText variant="subheadline" style={[{ textAlign: 'center', marginBottom: Spacing.xl }, { color: colors.textSecondary }]}>
            {profileError}
          </ThemedText>
          <PressableScale
            onPress={load}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading profile"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <ThemedText variant="subheadline" style={[{ fontWeight: '600' }, { color: colors.onPrimary }]}>Try Again</ThemedText>
          </PressableScale>
        </View>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Layout.tabBarHeight + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Cover ─────────────────────────────────────────────────── */}
      <View style={[styles.coverContainer, { height: COVER_HEIGHT + insets.top }]}>
        {coverUri ? (
          <AdaptiveImage
            source={{ uri: coverUri }}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            overlayOpacity={0}
            accessibilityLabel="Profile cover photo"
          />
        ) : null}
        {/* Gradient: opaque when no cover, semi-transparent overlay when cover exists */}
        <LinearGradient
          colors={
            coverUri
              ? ['rgba(0,0,0,0.15)', 'rgba(17,29,74,0.80)'] as [string, string]
              : ['#111d4a', '#2c428f'] as [string, string]
          }
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Top-right action icons */}
        <View style={[styles.coverActions, { top: insets.top + Spacing.xs }]}>
          <PressableScale
            onPress={() => { haptics.tap(); router.push('/(profile)/notifications'); }}
            style={styles.coverIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={8}
          >
            <Bell size={22} color="#FFFFFF" strokeWidth={2} />
            {unreadNotificationsCount > 0 && <PulsingDot size={8} style={styles.notifDot} />}
          </PressableScale>
          <PressableScale
            onPress={() => { haptics.tap(); router.push('/(profile)/preferences'); }}
            style={styles.coverIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
          >
            <Settings size={22} color="#FFFFFF" strokeWidth={2} />
          </PressableScale>
        </View>

        {/* Avatar overlapping cover bottom */}
        <View style={styles.avatarAnchor}>
          <PressableScale
            onPress={() => { haptics.tap(); router.push('/(profile)/edit'); }}
            accessibilityRole="button"
            accessibilityLabel="Edit profile picture"
            hitSlop={8}
          >
            <View style={[styles.avatarRing, { borderColor: colors.surface, backgroundColor: colors.surface, ...Shadows.lg }]}>
              <Avatar
                uri={user?.avatar_url ?? null}
                name={user?.full_name ?? 'User'}
                size={AVATAR_SIZE}
                blurhash={user?.avatar_blurhash}
              />
            </View>
          </PressableScale>
        </View>
      </View>

      {/* ── Identity ───────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(80)}
        style={[styles.identitySection, { paddingTop: AVATAR_OVERLAP + Spacing.md }]}
      >
        <ThemedText variant="title1" style={[styles.profileName, { color: colors.text }]} accessibilityRole="header">
          {user?.full_name}
        </ThemedText>
        {user?.username && (
          <ThemedText variant="subheadline" style={[styles.profileHandle, { color: colors.textSecondary }]}>
            @{user.username}
          </ThemedText>
        )}
        <View style={styles.badgeRow}>
          <Badge text={isCreator ? 'Creator' : 'Business'} variant="primary" />
          {((isCreator && creatorData?.verified) || (!isCreator && businessData?.verified)) && (
            <Badge text="Verified" variant="success" />
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow} accessibilityRole="summary">
          <View style={styles.statItem}>
            <ThemedText variant="title2" style={[styles.statValue, { color: colors.text }]}>
              {statLeftValue}
            </ThemedText>
            <ThemedText variant="caption2" style={[styles.statLabel, { color: colors.textTertiary }]}>
              {statLeftLabel}
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.statItem}>
            <View style={styles.ratingValueRow}>
              <Star size={14} color={colors.rating} fill={colors.rating} strokeWidth={2} />
              <ThemedText variant="title2" style={[styles.statValue, { color: colors.text }]}>
                {rating?.toFixed(1) ?? '—'}
              </ThemedText>
            </View>
            <ThemedText variant="caption2" style={[styles.statLabel, { color: colors.textTertiary }]}>
              Rating
            </ThemedText>
          </View>
          {joinedAt ? (
            <>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statItem}>
                <ThemedText variant="title2" style={[styles.statValue, { color: colors.text }]}>
                  {joinedYear(joinedAt)}
                </ThemedText>
                <ThemedText variant="caption2" style={[styles.statLabel, { color: colors.textTertiary }]}>
                  Joined
                </ThemedText>
              </View>
            </>
          ) : null}
        </View>

        {/* Edit Profile */}
        <PressableScale
          onPress={() => { haptics.tap(); router.push('/(profile)/edit'); }}
          style={[styles.editBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <ThemedText variant="subheadline" style={[styles.editBtnText, { color: colors.text }]}>
            Edit profile
          </ThemedText>
        </PressableScale>
      </Animated.View>

      {/* ── Tab Bar ────────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(160)}
        style={[styles.tabBar, { borderBottomColor: colors.borderLight }]}
      >
        {tabLabels.map((label, i) => (
          <PressableScale
            key={label}
            onPress={() => handleTabPress(i)}
            style={styles.tabBtn}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: activeTab === i }}
          >
            <ThemedText
              variant="subheadline"
              style={[
                styles.tabLabel,
                { color: activeTab === i ? colors.primary : colors.textTertiary },
              ]}
            >
              {label}
            </ThemedText>
          </PressableScale>
        ))}
        {/* Animated underline indicator */}
        <Animated.View
          style={[
            styles.tabUnderline,
            { backgroundColor: colors.primary, width: UNDERLINE_W },
            underlineAnim,
          ]}
        />
      </Animated.View>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.tabContent}>
        {activeTab === 0 && (
          <Animated.View key="tab-about" entering={FadeIn.duration(200)}>
            <AboutTab
              isCreator={isCreator}
              creatorData={creatorData}
              businessData={businessData}
              location={location}
              bio={bio}
              onStripePress={async () => {
                const url = await api.getStripeConnectLink();
                if (url) Linking.openURL(url);
                else toast.error('Not available. Try again in a moment.');
              }}
            />
          </Animated.View>
        )}
        {activeTab === 1 && (
          <Animated.View key="tab-work" entering={FadeIn.duration(200)}>
            <WorkTab
              isCreator={isCreator}
              creatorData={creatorData}
              businessData={businessData}
              listings={listings}
              onListingPress={(id) => router.push(`/(listing)/${id}`)}
            />
          </Animated.View>
        )}
        {activeTab === 2 && (
          <Animated.View key="tab-reviews" entering={FadeIn.duration(200)}>
            <ReviewsTab
              isCreator={isCreator}
              creatorData={creatorData}
              businessData={businessData}
              reviews={reviews}
              reviewsLoading={reviewsLoading}
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* ── Money ──────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(400).delay(260)} style={styles.section}>
        <Card style={styles.settingsCard} padding={0}>
          <SettingsRow
            icon={<Wallet size={20} color={colors.primary} strokeWidth={2} />}
            title={isCreator ? 'Earnings' : 'Spending'}
            subtitle="Payouts, transactions, history"
            onPress={() => router.push('/(profile)/earnings')}
            accessibilityHint="Opens your earnings and transaction history"
          />
          {isCreator && (
            <>
              <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
              <SettingsRow
                icon={<BarChart2 size={20} color={colors.primary} strokeWidth={2} />}
                title="Analytics"
                subtitle="Views, applications, acceptance rate"
                onPress={() => router.push('/(profile)/analytics')}
                accessibilityHint="Opens your creator analytics dashboard"
              />
            </>
          )}
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<CreditCard size={20} color={colors.primary} strokeWidth={2} />}
            title="Payment methods"
            subtitle="Cards, Apple Pay, bank"
            onPress={() => router.push('/(payment)/methods')}
            accessibilityHint="Opens your saved payment methods"
          />
        </Card>
      </Animated.View>

      {/* ── Settings ───────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.section}>
        <Card style={styles.settingsCard} padding={0}>
          <SettingsRow
            icon={
              <View>
                <Bell size={20} color={colors.primary} strokeWidth={2} />
                {unreadNotificationsCount > 0 && <PulsingDot size={8} style={styles.notifBadge} />}
              </View>
            }
            title="Notifications"
            subtitle={unreadNotificationsCount > 0 ? `${unreadNotificationsCount} unread` : 'Activity, alerts, payouts'}
            onPress={() => router.push('/(profile)/notifications')}
            accessibilityHint="Opens your notification feed"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<Bookmark size={20} color={colors.primary} strokeWidth={2} />}
            title="Saved searches"
            subtitle="Quick-jump to filters you use"
            onPress={() => router.push('/(profile)/saved-searches')}
            accessibilityHint="Opens your saved search filters"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<Shield size={20} color={colors.primary} strokeWidth={2} />}
            title="Account & Privacy"
            subtitle="Password, email, data"
            onPress={() => router.push('/(profile)/account')}
            accessibilityHint="Opens account and privacy settings"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<Settings size={20} color={colors.primary} strokeWidth={2} />}
            title="Preferences"
            subtitle="Theme, notifications"
            onPress={() => router.push('/(profile)/preferences')}
            accessibilityHint="Opens theme and notification preferences"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<HelpCircle size={20} color={colors.primary} strokeWidth={2} />}
            title="Help & Support"
            subtitle="FAQ, contact us"
            onPress={() => router.push('/(profile)/support')}
            accessibilityHint="Opens help and support options"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<Info size={20} color={colors.primary} strokeWidth={2} />}
            title="About"
            subtitle="Version, legal, links"
            onPress={() => router.push('/(profile)/about')}
            accessibilityHint="Opens app version and legal information"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<LogOut size={20} color={colors.error} strokeWidth={2} />}
            title="Log Out"
            onPress={handleLogout}
            destructive
            accessibilityHint="Signs you out of your account"
          />
        </Card>
      </Animated.View>

      <ThemedText variant="caption1" style={[styles.version, { color: colors.textTertiary }]}>
        Surve v1.0.0
      </ThemedText>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Cover ──
  coverContainer: {
    width: Layout.screenWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  coverActions: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.xs,
    zIndex: 10,
  },
  coverIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  avatarAnchor: {
    position: 'absolute',
    bottom: -AVATAR_OVERLAP,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  avatarRing: {
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Identity ──
  identitySection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  profileName: {
    fontWeight: '700',
    textAlign: 'center',
  },
  profileHandle: {
    fontWeight: '600',
    marginTop: Spacing.xxs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
    minWidth: 56,
  },
  statValue: {
    fontWeight: '700',
  },
  statLabel: {},
  statDivider: {
    width: 1,
    height: 36,
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },

  // ── Edit button ──
  editBtn: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  editBtnText: {
    fontWeight: '600',
  },

  // ── Tab Bar ──
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    marginTop: Spacing.sm,
  },
  tabBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },

  // ── Tab Content ──
  tabContent: {
    paddingHorizontal: Spacing.lg,
  },
  tabPane: {
    gap: Spacing.lg,
    paddingVertical: Spacing.lg,
  },

  // ── Info Cards ──
  infoCard: {
    marginBottom: 0,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  bioText: {
    lineHeight: 24,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  platformBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pendingReviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.md,
  },
  pendingReviewText: {
    flex: 1,
    fontWeight: '500' as const,
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  perfItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  perfValue: {
    fontWeight: '700',
  },
  perfDivider: {
    width: 1,
    height: 32,
  },

  // ── Portfolio ──
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  portfolioImage: {
    width: (Layout.screenWidth - Spacing.lg * 4 - Spacing.sm * 2) / 3,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
  },

  // ── Reviews ──
  reviewSummary: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  starRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  reviewItem: {
    paddingVertical: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  reviewerName: {
    fontWeight: '600',
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    lineHeight: 22,
  },

  // ── Listing Row (business tab) ──
  listingRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    marginBottom: 0,
  },
  listingThumb: {
    width: 72,
    height: 72,
    borderRadius: 0,
  },
  listingRowInfo: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
    justifyContent: 'center',
  },
  listingRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // ── Empty States ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontWeight: '700',
  },

  // ── Stripe Card ──
  stripeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stripeIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripeTitle: {
    fontWeight: '700',
  },
  stripeBody: {
    marginTop: 2,
    lineHeight: 18,
  },

  // ── Settings ──
  section: {
    paddingHorizontal: Spacing.lg,
  },
  settingsCard: {
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsInfo: {
    flex: 1,
  },
  settingsTitle: {
    fontWeight: '600',
  },
  settingsSubtitle: {
    marginTop: Spacing.xxs,
  },
  settingsSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },

  // ── Error ──
  errorState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },

  // ── Misc ──
  version: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
});
