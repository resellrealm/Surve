import React, { useMemo, useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
  Linking,
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
  Globe,
  ExternalLink,
  ChevronRight,
  Building2,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PressableScale } from '../../components/ui/PressableScale';
import { CreatorProfileSkeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';
import * as api from '../../lib/api';
import { useStore } from '../../lib/store';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import type { Business, Listing, Review, Booking } from '../../types';
import { formatDateShort } from '../../lib/dateFormat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 280;
const LOGO_SIZE = 84;
const LOGO_OVERLAP = 38;

// ─── Category palette ─────────────────────────────────────────────────────────

const CATEGORY_PALETTE: Record<string, { bgLight: string; textLight: string; bgDark: string; textDark: string }> = {
  hotel:      { bgLight: '#EEF0F8', textLight: '#2c428f', bgDark: '#151830', textDark: '#97ABFF' },
  restaurant: { bgLight: '#FEF3C7', textLight: '#B45309', bgDark: '#1F1D15', textDark: '#F59E0B' },
  bar:        { bgLight: '#F3E8FF', textLight: '#7C3AED', bgDark: '#1F1530', textDark: '#C084FC' },
  cafe:       { bgLight: '#ECFDF5', textLight: '#047857', bgDark: '#15201D', textDark: '#6EE7B7' },
  resort:     { bgLight: '#FEE2E2', textLight: '#B91C1C', bgDark: '#1F1515', textDark: '#EF4444' },
  spa:        { bgLight: '#FCE7F3', textLight: '#BE185D', bgDark: '#1F1520', textDark: '#F472B6' },
};

// ─── Social handle icons ─────────────────────────────────────────────────────

const SOCIAL_CONFIG: Record<string, { label: string; bg: string; prefix: string }> = {
  instagram: { label: 'Instagram', bg: '#E4405F', prefix: 'https://instagram.com/' },
  tiktok:    { label: 'TikTok',    bg: '#010101', prefix: 'https://tiktok.com/@' },
  youtube:   { label: 'YouTube',   bg: '#FF0000', prefix: 'https://youtube.com/@' },
  twitter:   { label: 'Twitter',   bg: '#1DA1F2', prefix: 'https://twitter.com/' },
  facebook:  { label: 'Facebook',  bg: '#1877F2', prefix: 'https://facebook.com/' },
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

// ─── Category chip ────────────────────────────────────────────────────────────

function CategoryChip({ category, isDark }: { category: string; isDark: boolean }) {
  const palette = CATEGORY_PALETTE[category] ?? {
    bgLight: '#F4F3F4', textLight: '#595F6A',
    bgDark: '#252525', textDark: '#9CA3AF',
  };
  const label = category.charAt(0).toUpperCase() + category.slice(1);
  return (
    <View
      accessible
      accessibilityLabel={`Category: ${label}`}
      style={[
        styles.chip,
        { backgroundColor: isDark ? palette.bgDark : palette.bgLight },
      ]}
    >
      <Text style={[styles.chipText, { color: isDark ? palette.textDark : palette.textLight }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Value chip ───────────────────────────────────────────────────────────────

function ValueChip({ value, colors }: { value: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={[styles.chip, { backgroundColor: colors.primaryLight + '18', borderColor: colors.primary + '30', borderWidth: 1 }]}>
      <Sparkles size={10} color={colors.primary} strokeWidth={2.5} />
      <Text style={[styles.chipText, { color: colors.primary }]}>{value}</Text>
    </View>
  );
}

// ─── Social handle pill ──────────────────────────────────────────────────────

function SocialPill({
  platform,
  handle,
  colors,
}: {
  platform: string;
  handle: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const haptics = useHaptics();
  const config = SOCIAL_CONFIG[platform.toLowerCase()] ?? { label: platform, bg: '#666', prefix: '' };
  const displayHandle = handle.startsWith('@') ? handle : `@${handle}`;

  const handlePress = useCallback(() => {
    haptics.tap();
    const cleanHandle = handle.replace('@', '');
    const url = config.prefix + cleanHandle;
    Linking.openURL(url);
  }, [handle, config.prefix, haptics]);

  return (
    <PressableScale
      scaleValue={0.95}
      onPress={handlePress}
      accessibilityRole="link"
      accessibilityLabel={`${config.label}: ${displayHandle}`}
      style={[styles.socialPill, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
    >
      <View style={[styles.socialPillDot, { backgroundColor: config.bg }]} />
      <View style={styles.socialPillText}>
        <Text style={[styles.socialPillLabel, { color: colors.textTertiary }]}>{config.label}</Text>
        <Text style={[styles.socialPillHandle, { color: colors.text }]} numberOfLines={1}>{displayHandle}</Text>
      </View>
      <ExternalLink size={14} color={colors.textTertiary} strokeWidth={2} />
    </PressableScale>
  );
}

// ─── Listing card (carousel) ─────────────────────────────────────────────────

function ListingCard({
  listing,
  colors,
  onPress,
}: {
  listing: Listing;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}) {
  const haptics = useHaptics();
  const pay =
    listing.pay_min === listing.pay_max
      ? `$${listing.pay_min}`
      : `$${listing.pay_min}–$${listing.pay_max}`;

  return (
    <PressableScale
      scaleValue={0.97}
      onPress={() => { haptics.tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={listing.title}
      style={[styles.listingCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
    >
      <AdaptiveImage
        source={{ uri: listing.image_url }}
        style={styles.listingCardImage}
        contentFit="cover"
        accessibilityLabel={listing.title}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.45)']}
        style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.lg }]}
        pointerEvents="none"
      />
      <View style={styles.listingCardOverlay}>
        <Text style={styles.listingCardTitle} numberOfLines={2}>{listing.title}</Text>
        <Text style={styles.listingCardPay}>{pay}</Text>
      </View>
    </PressableScale>
  );
}

// ─── Collab card ─────────────────────────────────────────────────────────────

function CollabCard({
  booking,
  colors,
}: {
  booking: Booking;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.collabCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <AdaptiveImage
        source={{ uri: booking.listing.image_url }}
        style={styles.collabThumb}
        contentFit="cover"
        accessibilityLabel={booking.listing.title}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.lg }]}
        pointerEvents="none"
      />
      <View style={styles.collabAvatarWrap}>
        <Avatar uri={booking.creator.user.avatar_url} name={booking.creator.user.full_name} size={36} />
      </View>
      <View style={styles.collabOverlay}>
        <Text style={styles.collabName} numberOfLines={1}>{booking.creator.user.full_name}</Text>
        <Text style={styles.collabListing} numberOfLines={1}>{booking.listing.title}</Text>
      </View>
    </View>
  );
}

// ─── Rating summary ───────────────────────────────────────────────────────────

function RatingSummary({
  rating,
  totalReviews,
  colors,
}: {
  rating: number;
  totalReviews: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.ratingSummary}>
      <Text style={[styles.ratingLarge, { color: colors.text }]}>{rating.toFixed(1)}</Text>
      <View style={styles.ratingRight}>
        <View style={styles.ratingStarsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={18}
              color={colors.rating}
              fill={i < Math.round(rating) ? colors.rating : 'transparent'}
              strokeWidth={2}
            />
          ))}
        </View>
        <Text style={[styles.ratingCount, { color: colors.textTertiary }]}>
          {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
        </Text>
      </View>
    </View>
  );
}

// ─── Review card ─────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  colors,
  revieweeName,
  canRespond,
  onRespond,
}: {
  review: Review;
  colors: ReturnType<typeof useTheme>['colors'];
  revieweeName?: string;
  canRespond?: boolean;
  onRespond?: (reviewId: string) => void;
}) {
  const haptics = useHaptics();
  return (
    <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={styles.reviewHeader}>
        <Avatar uri={review.reviewer_avatar} name={review.reviewer_name} size={40} />
        <View style={styles.reviewMeta}>
          <Text style={[styles.reviewerName, { color: colors.text }]} numberOfLines={1}>
            {review.reviewer_name}
          </Text>
          <View style={styles.reviewStarsRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={12}
                color={colors.rating}
                fill={i < review.rating ? colors.rating : 'transparent'}
                strokeWidth={2}
              />
            ))}
            <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>
              · {formatDateShort(review.created_at)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
        {review.comment}
      </Text>
      {review.reply_text ? (
        <View
          style={[styles.replyBox, { backgroundColor: colors.surfaceSecondary, borderLeftColor: colors.primary }]}
        >
          <Text style={[styles.replyLabel, { color: colors.primary }]}>
            {revieweeName ? `Response from ${revieweeName}` : 'RESPONSE'}
          </Text>
          <Text style={[styles.replyText, { color: colors.text }]}>{review.reply_text}</Text>
          {review.replied_at && (
            <Text style={[styles.replyDate, { color: colors.textTertiary }]}>
              {formatDateShort(review.replied_at)}
            </Text>
          )}
          {canRespond && (
            <PressableScale
              onPress={() => { haptics.tap(); onRespond?.(review.id); }}
              scaleValue={0.96}
              accessibilityRole="button"
              accessibilityLabel="Edit your response"
              style={[styles.respondBtn, { borderColor: colors.primary }]}
            >
              <Text style={[styles.respondBtnText, { color: colors.primary }]}>Edit response</Text>
            </PressableScale>
          )}
        </View>
      ) : canRespond ? (
        <PressableScale
          onPress={() => { haptics.tap(); onRespond?.(review.id); }}
          scaleValue={0.96}
          accessibilityRole="button"
          accessibilityLabel="Respond to this review"
          style={[styles.respondBtn, { borderColor: colors.primary }]}
        >
          <Text style={[styles.respondBtnText, { color: colors.primary }]}>Respond to review</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BusinessProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [0, 1], Extrapolation.CLAMP),
  }));
  const headerBorderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [70, 80], [0, 1], Extrapolation.CLAMP),
  }));

  const [business, setBusiness] = useState<Business | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [collabs, setCollabs] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [storyExpanded, setStoryExpanded] = useState(false);

  const currentUser = useStore((s) => s.user);
  const isOwnProfile = !!(currentUser && business && currentUser.id === business.user_id && currentUser.role === 'business');
  const reviewsVisible = isOwnProfile || (business?.user.show_reviews_publicly !== false);

  const handleRespond = useCallback((reviewId: string) => {
    router.push(`/(review)/respond?reviewId=${reviewId}`);
  }, [router]);

  const refetch = useCallback(() => setRetryCount((c) => c + 1), []);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getBusinessById(id),
      api.getListingsByBusiness(id),
      api.getBookings(id).then((all) =>
        all.filter((b) => b.status === 'completed').slice(0, 8)
      ),
    ]).then(([biz, listData, bookings]) => {
      setBusiness(biz);
      setListings(listData.filter((l) => l.status === 'active'));
      setCollabs(bookings);
      if (biz) {
        api.getReviews(biz.user_id).then(setReviews);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, retryCount]);

  const heroUri = business?.cover_url ?? business?.image_url;
  const logoUri = business?.logo_url ?? business?.user.avatar_url;

  const socialHandles = useMemo(() => {
    if (!business?.social_handles) return [];
    return Object.entries(business.social_handles).filter(([, v]) => v);
  }, [business]);

  const values = useMemo(() => business?.values ?? [], [business]);
  const locations = useMemo(() => business?.locations ?? [], [business]);

  const brandStory = business?.brand_story ?? business?.description ?? '';
  const storyTrimmed = !storyExpanded && brandStory.length > 180;

  const handleViewAllListings = useCallback(() => {
    haptics.confirm();
    // Navigate to search filtered by this business
    router.push('/(tabs)/search');
  }, [haptics, router]);

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

  if (!business) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader />
        <ErrorState
          title="Business not found"
          message="We couldn't load this profile. It may have been removed or there was a connection issue."
          onRetry={refetch}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {/* Floating header */}
      <View style={styles.floatingHeader} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }, headerBgStyle]} />
        <Animated.View
          style={[styles.floatingHeaderBorder, { backgroundColor: colors.border }, headerBorderStyle]}
        />
        <ScreenHeader transparent />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Hero + logo overlap ──────────────────────────────────────── */}
        <View style={styles.heroContainer}>
          <AdaptiveImage
            source={{ uri: heroUri }}
            style={styles.heroImage}
            contentFit="cover"
            accessibilityLabel={`${business.business_name} cover photo`}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.65)']}
            locations={[0.3, 0.65, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Logo overlapping bottom of hero */}
          <View style={styles.logoOverlapWrap}>
            <View style={[styles.logoBorder, { borderColor: colors.background }]}>
              {logoUri ? (
                <AdaptiveImage
                  source={{ uri: logoUri }}
                  style={{ width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: BorderRadius.lg }}
                  contentFit="cover"
                  accessibilityLabel={`${business.business_name} logo`}
                />
              ) : (
                <View
                  style={[
                    styles.logoPlaceholder,
                    { backgroundColor: colors.primary + '20' },
                  ]}
                >
                  <Building2 size={32} color={colors.primary} strokeWidth={1.5} />
                </View>
              )}
            </View>
            {business.verified && (
              <View style={[styles.verifiedDot, { backgroundColor: colors.background }]}>
                <VerifiedBadge size="sm" />
              </View>
            )}
          </View>
        </View>

        {/* ── Identity ────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(80)}
          style={[styles.identitySection, { paddingTop: LOGO_OVERLAP + Spacing.sm }]}
        >
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>{business.business_name}</Text>
            {business.verified && <VerifiedBadge size="md" />}
          </View>

          <View style={styles.metaRow}>
            <CategoryChip category={business.category} isDark={isDark} />
            {business.founded_year != null && (
              <Text style={[styles.foundedText, { color: colors.textTertiary }]}>
                Est. {business.founded_year}
              </Text>
            )}
          </View>

          {/* Primary location */}
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {business.location}
            </Text>
          </View>
        </Animated.View>

        {/* ── Stats banner ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(500).delay(140)} style={styles.pagePad}>
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statBlock} accessible accessibilityLabel={`Rating: ${business.rating}`}>
                <Star size={16} color={colors.rating} fill={colors.rating} strokeWidth={0} style={{ marginBottom: Spacing.xs }} />
                <Text style={[styles.statValue, { color: colors.text }]}>{business.rating.toFixed(1)}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Rating</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statBlock} accessible accessibilityLabel={`${business.total_reviews} reviews`}>
                <Users size={16} color={colors.primary} strokeWidth={2} style={{ marginBottom: Spacing.xs }} />
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCount(business.total_reviews)}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Reviews</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statBlock} accessible accessibilityLabel={`${business.total_listings} listings`}>
                <Building2 size={16} color={colors.primary} strokeWidth={2} style={{ marginBottom: Spacing.xs }} />
                <Text style={[styles.statValue, { color: colors.text }]}>{business.total_listings}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Listings</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* ── Location(s) with map pins ─────────────────────────────────── */}
        {locations.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(180)} style={styles.pagePad}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Locations
            </Text>
            <Card style={styles.locationsCard}>
              {locations.map((loc, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <View style={[styles.locDivider, { backgroundColor: colors.borderLight }]} />}
                  <View style={styles.locRow}>
                    <View style={[styles.locIconWrap, { backgroundColor: colors.primary + '15' }]}>
                      <MapPin size={14} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.locInfo}>
                      <Text style={[styles.locName, { color: colors.text }]}>{loc.name}</Text>
                      <Text style={[styles.locAddress, { color: colors.textTertiary }]}>{loc.address}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* ── Brand story ──────────────────────────────────────────────── */}
        {brandStory.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(220)} style={styles.pagePad}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Our Story
            </Text>
            <Card style={styles.storyCard}>
              <Text
                style={[styles.storyText, { color: colors.textSecondary }]}
                numberOfLines={storyTrimmed ? 4 : undefined}
              >
                {brandStory}
              </Text>
              {brandStory.length > 180 && (
                <PressableScale
                  scaleValue={0.96}
                  onPress={() => { haptics.tap(); setStoryExpanded((e) => !e); }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={storyExpanded ? 'Show less' : 'Show more'}
                  style={styles.storyToggle}
                >
                  <Text style={[styles.storyToggleText, { color: colors.primary }]}>
                    {storyExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </PressableScale>
              )}
            </Card>
          </Animated.View>
        )}

        {/* ── Values chips ─────────────────────────────────────────────── */}
        {values.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(260)} style={styles.pagePad}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Our Values
            </Text>
            <View style={styles.valuesWrap}>
              {values.map((v) => (
                <ValueChip key={v} value={v} colors={colors} />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Active listings carousel ─────────────────────────────────── */}
        {listings.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <View style={[styles.pagePad, styles.sectionHeaderRow]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, marginTop: 0 }]} accessibilityRole="header">
                Active Listings
              </Text>
              <PressableScale
                scaleValue={0.95}
                onPress={handleViewAllListings}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="View all listings"
                style={styles.seeAllBtn}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
                <ChevronRight size={14} color={colors.primary} strokeWidth={2.5} />
              </PressableScale>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            >
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  colors={colors}
                  onPress={() => router.push({ pathname: '/(listing)/[id]', params: { id: l.id } })}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Past creator collabs ─────────────────────────────────────── */}
        {collabs.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(340)}>
            <View style={styles.pagePad}>
              <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
                Creator Collabs
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            >
              {collabs.map((b) => (
                <CollabCard key={b.id} booking={b} colors={colors} />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Reviews ─────────────────────────────────────────────────── */}
        {reviewsVisible && (reviews.length > 0 || business.total_reviews > 0) && (
          <Animated.View entering={FadeInDown.duration(500).delay(380)} style={styles.pagePad}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Creator Reviews
            </Text>
            <Card style={styles.ratingCard}>
              <RatingSummary rating={business.rating} totalReviews={business.total_reviews} colors={colors} />
            </Card>
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                colors={colors}
                revieweeName={business.business_name}
                canRespond={isOwnProfile}
                onRespond={handleRespond}
              />
            ))}
          </Animated.View>
        )}

        {/* ── Social handles ───────────────────────────────────────────── */}
        {(socialHandles.length > 0 || business.website) && (
          <Animated.View entering={FadeInDown.duration(500).delay(420)} style={styles.pagePad}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Find Us Online
            </Text>
            <View style={styles.socialGrid}>
              {business.website && (
                <PressableScale
                  scaleValue={0.95}
                  onPress={() => { haptics.tap(); Linking.openURL(business.website!); }}
                  accessibilityRole="link"
                  accessibilityLabel={`Website: ${business.website}`}
                  style={[styles.socialPill, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                >
                  <View style={[styles.socialPillDot, { backgroundColor: colors.primary }]}>
                    <Globe size={10} color="#FFF" strokeWidth={2} />
                  </View>
                  <View style={styles.socialPillText}>
                    <Text style={[styles.socialPillLabel, { color: colors.textTertiary }]}>Website</Text>
                    <Text style={[styles.socialPillHandle, { color: colors.text }]} numberOfLines={1}>
                      {business.website.replace(/^https?:\/\//, '')}
                    </Text>
                  </View>
                  <ExternalLink size={14} color={colors.textTertiary} strokeWidth={2} />
                </PressableScale>
              )}
              {socialHandles.map(([platform, handle]) => (
                <SocialPill key={platform} platform={platform} handle={handle as string} colors={colors} />
              ))}
            </View>
          </Animated.View>
        )}
      </Animated.ScrollView>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
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
          title="View All Listings"
          onPress={handleViewAllListings}
          size="lg"
          style={styles.ctaFull}
          icon={<ChevronRight size={18} color={colors.onPrimary} strokeWidth={2.5} />}
        />
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  pagePad: { paddingHorizontal: Spacing.lg },

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroContainer: { height: HERO_HEIGHT, position: 'relative' },
  heroImage: { width: '100%', height: HERO_HEIGHT },
  logoOverlapWrap: {
    position: 'absolute',
    bottom: -LOGO_OVERLAP,
    left: Spacing.lg,
  },
  logoBorder: {
    borderRadius: BorderRadius.xl,
    borderWidth: 3,
    overflow: 'hidden',
    ...Shadows.md,
  },
  logoPlaceholder: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 2,
    right: -2,
    borderRadius: 12,
    padding: 2,
  },

  // ── Floating header ─────────────────────────────────────────────────────────
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

  // ── Identity ────────────────────────────────────────────────────────────────
  identitySection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  name: { ...Typography.title2 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  foundedText: { ...Typography.footnote },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationText: { ...Typography.subheadline },

  // ── Chips ───────────────────────────────────────────────────────────────────
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  chipText: { ...Typography.caption1, fontWeight: '700' },

  // ── Stats ───────────────────────────────────────────────────────────────────
  statsCard: { marginBottom: 0 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
  statValue: { ...Typography.headline, fontWeight: '700' },
  statLabel: { ...Typography.caption2, marginTop: Spacing.xxs },
  statDivider: { width: 1, height: 40 },

  // ── Section ─────────────────────────────────────────────────────────────────
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
    marginTop: Spacing.xxl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingLeft: Spacing.sm,
  },
  seeAllText: { ...Typography.subheadline, fontWeight: '600' },

  // ── Locations ───────────────────────────────────────────────────────────────
  locationsCard: { gap: 0 },
  locDivider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.md },
  locRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  locIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locInfo: { flex: 1 },
  locName: { ...Typography.subheadline, fontWeight: '600', marginBottom: 2 },
  locAddress: { ...Typography.footnote, lineHeight: 18 },

  // ── Story ───────────────────────────────────────────────────────────────────
  storyCard: { gap: 0 },
  storyText: { ...Typography.body, lineHeight: 26 },
  storyToggle: { marginTop: Spacing.sm, alignSelf: 'flex-start' },
  storyToggleText: { ...Typography.subheadline, fontWeight: '600' },

  // ── Values ──────────────────────────────────────────────────────────────────
  valuesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  // ── Carousel ────────────────────────────────────────────────────────────────
  carouselContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },

  // ── Listing card ────────────────────────────────────────────────────────────
  listingCard: {
    width: 200,
    height: 240,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  listingCardImage: { width: '100%', height: '100%' },
  listingCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
  },
  listingCardTitle: {
    color: '#FFF',
    ...Typography.subheadline,
    fontWeight: '700',
    marginBottom: 4,
  },
  listingCardPay: {
    color: '#FFFFFFCC',
    ...Typography.caption1,
    fontWeight: '600',
  },

  // ── Collab card ─────────────────────────────────────────────────────────────
  collabCard: {
    width: 160,
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
    position: 'relative',
  },
  collabThumb: { width: '100%', height: '100%' },
  collabAvatarWrap: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
    overflow: 'hidden',
  },
  collabOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
  },
  collabName: {
    color: '#FFF',
    ...Typography.caption1,
    fontWeight: '700',
  },
  collabListing: {
    color: '#FFFFFFB0',
    ...Typography.caption2,
  },

  // ── Rating ──────────────────────────────────────────────────────────────────
  ratingCard: { marginBottom: Spacing.md },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  ratingLarge: { ...Typography.title1, fontWeight: '800' },
  ratingRight: { gap: Spacing.xs },
  ratingStarsRow: { flexDirection: 'row', gap: 3 },
  ratingCount: { ...Typography.footnote },

  // ── Reviews ─────────────────────────────────────────────────────────────────
  reviewCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  reviewMeta: { flex: 1 },
  reviewerName: { ...Typography.subheadline, fontWeight: '600', marginBottom: Spacing.xs },
  reviewStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewDate: { ...Typography.caption2, marginLeft: Spacing.xs },
  reviewComment: { ...Typography.subheadline, lineHeight: 22 },
  replyBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    gap: 4,
  },
  replyLabel: { ...Typography.caption2, fontWeight: '700', letterSpacing: 0.8 },
  replyText: { ...Typography.footnote, lineHeight: 20 },
  replyDate: { ...Typography.caption2, marginTop: 2 },
  respondBtn: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  respondBtnText: { ...Typography.caption1, fontWeight: '600' },

  // ── Social ──────────────────────────────────────────────────────────────────
  socialGrid: { gap: Spacing.sm },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    ...Shadows.sm,
  },
  socialPillDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialPillText: { flex: 1 },
  socialPillLabel: { ...Typography.caption2 },
  socialPillHandle: { ...Typography.subheadline, fontWeight: '600' },

  // ── Bottom CTA ───────────────────────────────────────────────────────────────
  bottomCta: {
    flexDirection: 'row',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadows.lg,
  },
  ctaFull: { flex: 1 },
});
