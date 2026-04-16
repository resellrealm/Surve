import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { Share } from 'react-native';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsOffline } from '../../hooks/useIsOffline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import { ImageGallery } from '../../components/ui/ImageGallery';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Share2,
  Heart,
  MapPin,
  Clock,
  Users,
  DollarSign,
  CheckCircle,
  Calendar,
  Camera,
  TrendingUp,
  BarChart3,
  Eye,
  MousePointerClick,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { AnimatedLikeButton } from '../../components/ui/AnimatedLikeButton';
import { fetchListingAnalytics } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { Avatar } from '../../components/ui/Avatar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PlatformBadge } from '../../components/creator/PlatformBadge';
import { RequirementTag, formatFollowers } from '../../components/listing/RequirementTag';
import { ListingCard } from '../../components/listing/ListingCard';
import {
  AnalyticsChart,
  AnalyticsSkeletonCard,
} from '../../components/listing/AnalyticsChart';
import { ListingDetailSkeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { formatCurrencyRange } from '../../lib/currency';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Colors,
} from '../../constants/theme';
import type { Listing, ListingAnalyticsSummary } from '../../types';

import { formatDateLong } from '../../lib/dateFormat';

const formatDeadline = formatDateLong;

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOffline = useIsOffline();
  const { listings, user, listingsLoading, savedListings, toggleSavedListing, fetchListings } = useStore();

  const listing = useMemo(
    () => listings.find((l) => l.id === id),
    [listings, id]
  );

  const similarListings = useMemo(() => {
    if (!listing) return [];
    return listings
      .filter(
        (l) =>
          l.id !== listing.id &&
          (l.category === listing.category ||
            l.platform === listing.platform)
      )
      .slice(0, 3);
  }, [listings, listing]);

  const isCreator = user?.role === 'creator';
  const isBusiness = user?.role === 'business';
  const haptics = useHaptics();

  const [analytics, setAnalytics] = useState<ListingAnalyticsSummary | null>(
    null
  );
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const galleryImages = useMemo(
    () => (listing?.image_url ? [listing.image_url] : []),
    [listing?.image_url]
  );

  const openGallery = useCallback(() => {
    haptics.tap();
    setGalleryOpen(true);
  }, [haptics]);

  useEffect(() => {
    if (!isBusiness || !id) return;
    setAnalyticsLoading(true);
    fetchListingAnalytics(id)
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, [isBusiness, id]);

  const handleApply = useCallback(() => {
    haptics.success();
    if (isCreator) {
      toast.success('Application Sent: Your application has been submitted. The business will review your profile.');
    } else {
      router.push(`/(listing)/create`);
    }
  }, [isCreator, router]);

  const handleSimilarPress = useCallback(
    (l: Listing) => {
      router.push(`/(listing)/${l.id}`);
    },
    [router]
  );

  if (!listing && listingsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader transparent />
        <ListingDetailSkeleton />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader />
        <ErrorState
          title="Listing not found"
          message="We couldn't load this listing. It may have been removed or there was a connection issue."
          onRetry={fetchListings}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image */}
        <Pressable
          style={styles.heroContainer}
          onPress={openGallery}
          accessibilityRole="imagebutton"
          accessibilityLabel={`${listing.title} cover image, tap to open gallery`}
          accessibilityHint="Opens a full-screen image viewer with pinch-to-zoom"
        >
          <AdaptiveImage source={{ uri: listing.image_url }} style={styles.heroImage} contentFit="cover" gradient overlayOpacity={0.2} blurhash={listing.image_blurhash} accessibilityLabel={`${listing.title} cover image`} />
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <View style={styles.badgesRow}>
              <PlatformBadge platform={listing.platform} />
              <Badge text={capitalizeFirst(listing.category)} />
              <Badge text={`${listing.applicants_count} applicants`} variant="info" />
            </View>

            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
              {listing.title}
            </Text>

            {/* Business Info */}
            <PressableScale
              style={[
                styles.businessRow,
                { borderColor: colors.borderLight },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Business: ${listing.business.business_name}, ${listing.business.location}`}
              accessibilityHint="Double tap to view business profile"
            >
              <Avatar
                uri={listing.business.image_url}
                name={listing.business.business_name}
                size={44}
              />
              <View style={styles.businessInfo}>
                <View style={styles.businessNameRow}>
                  <Text
                    style={[styles.businessName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {listing.business.business_name}
                  </Text>
                  {listing.business.verified && (
                    <CheckCircle
                      size={16}
                      color={colors.primary}
                      fill={colors.primary}
                      strokeWidth={2}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.businessLocation,
                    { color: colors.textSecondary },
                  ]}
                >
                  {listing.business.location}
                </Text>
              </View>
            </PressableScale>
          </Animated.View>

          {/* Pay Range */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Card style={styles.payCard}>
              <View style={styles.payRow}>
                <DollarSign
                  size={24}
                  color={colors.primary}
                  strokeWidth={2}
                />
                <View>
                  <Text style={[styles.payAmount, { color: colors.primary }]}>
                    {formatCurrencyRange(listing.pay_min, listing.pay_max)}
                  </Text>
                  <Text
                    style={[styles.payLabel, { color: colors.textSecondary }]}
                  >
                    Compensation
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Description
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {listing.description}
            </Text>
          </Animated.View>

          {/* Requirements */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Requirements
            </Text>
            <View style={styles.requirementsGrid}>
              <RequirementTag
                type="followers"
                value={`${formatFollowers(listing.min_followers)}+ followers`}
              />
              <RequirementTag
                type="engagement"
                value={`${listing.min_engagement_rate}%+ engagement`}
              />
              <RequirementTag
                type="content"
                value={listing.content_type}
              />
            </View>
          </Animated.View>

          {/* Details */}
          <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Details
            </Text>
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Calendar
                  size={18}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.detailText, { color: colors.textSecondary }]}
                >
                  Deadline: {formatDeadline(listing.deadline)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <MapPin
                  size={18}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.detailText, { color: colors.textSecondary }]}
                >
                  {listing.location}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Camera
                  size={18}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.detailText, { color: colors.textSecondary }]}
                >
                  Content: {listing.content_type}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Analytics (Business only) */}
          {isBusiness && (
            <Animated.View entering={FadeInDown.duration(500).delay(550)}>
              <PressableScale
                onPress={() => {
                  haptics.tap();
                  setAnalyticsExpanded((v) => !v);
                }}
                style={styles.analyticsSectionHeader}
                accessibilityRole="button"
                accessibilityLabel={`Performance analytics, ${analyticsExpanded ? 'collapse' : 'expand'}`}
                accessibilityState={{ expanded: analyticsExpanded }}
              >
                <View style={styles.analyticsTitleRow}>
                  <BarChart3
                    size={20}
                    color={colors.primary}
                    strokeWidth={2}
                  />
                  <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                    Performance
                  </Text>
                </View>
                <Text style={[styles.expandToggle, { color: colors.primary }]}>
                  {analyticsExpanded ? 'Hide' : 'Show'}
                </Text>
              </PressableScale>

              {/* Summary row (always visible) */}
              {analyticsLoading ? (
                <View style={styles.analyticsSummaryRow}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.summaryCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.borderLight,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.skeletonBlock,
                          { backgroundColor: colors.skeleton },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              ) : analytics ? (
                <View style={styles.analyticsSummaryRow}>
                  <View
                    style={[
                      styles.summaryCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  >
                    <Eye
                      size={18}
                      color={colors.primary}
                      strokeWidth={2}
                    />
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {analytics.total_views.toLocaleString()}
                    </Text>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Views
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.summaryCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  >
                    <MousePointerClick
                      size={18}
                      color={colors.secondary}
                      strokeWidth={2}
                    />
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {analytics.total_clicks.toLocaleString()}
                    </Text>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Clicks
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.summaryCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  >
                    <FileText
                      size={18}
                      color={colors.warning}
                      strokeWidth={2}
                    />
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {analytics.total_applications.toLocaleString()}
                    </Text>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Applications
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Expanded charts */}
              {analyticsExpanded && analytics && analytics.daily.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chartsScroll}
                >
                  <AnalyticsChart
                    data={analytics.daily}
                    metric="views"
                    color={colors.primary}
                    label="Views"
                    total={analytics.total_views}
                    delta={analytics.views_delta}
                  />
                  <AnalyticsChart
                    data={analytics.daily}
                    metric="clicks"
                    color={colors.secondary}
                    label="Clicks"
                    total={analytics.total_clicks}
                    delta={analytics.clicks_delta}
                  />
                  <AnalyticsChart
                    data={analytics.daily}
                    metric="applications"
                    color={colors.warning}
                    label="Applications"
                    total={analytics.total_applications}
                    delta={analytics.applications_delta}
                  />
                </ScrollView>
              )}

              {analyticsExpanded && analyticsLoading && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chartsScroll}
                >
                  {[0, 1, 2].map((i) => (
                    <AnalyticsSkeletonCard key={i} colors={colors} />
                  ))}
                </ScrollView>
              )}

              <View style={{ height: Spacing.xxl }} />
            </Animated.View>
          )}

          {/* Similar Listings */}
          {similarListings.length > 0 && (
            <Animated.View entering={FadeInDown.duration(500).delay(600)}>
              <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
                Similar Listings
              </Text>
              {similarListings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  onPress={handleSimilarPress}
                />
              ))}
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating header over hero */}
      <View style={styles.floatingHeader} pointerEvents="box-none">
        <ScreenHeader
          transparent
          right={
            <View style={styles.topRight}>
              <AnimatedLikeButton
                active={!!id && savedListings.includes(id)}
                onToggle={() => id && toggleSavedListing(id)}
                activeColor="#FF3B6F"
                inactiveColor={colors.onPrimary}
                size={44}
                style={{ backgroundColor: colors.overlay }}
                accessibilityLabel={savedListings.includes(id ?? '') ? 'Unsave listing' : 'Save listing'}
              >
                {({ color, fill }) => (
                  <Heart size={20} color={color} fill={fill} strokeWidth={2} />
                )}
              </AnimatedLikeButton>
              <PressableScale
                scaleValue={0.9}
                hitSlop={8}
                onPress={async () => {
                  haptics.tap();
                  try {
                    await Share.share({
                      title: listing.title,
                      message: `${listing.title} — on Surve\nhttps://surve.app/listing/${listing.id}`,
                      url: `https://surve.app/listing/${listing.id}`,
                    });
                  } catch {
                    // user cancelled
                  }
                }}
                style={[styles.topButton, { backgroundColor: colors.overlay }]}
                accessibilityRole="button"
                accessibilityLabel="Share listing"
              >
                <Share2 size={20} color={colors.onPrimary} strokeWidth={2} />
              </PressableScale>
            </View>
          }
        />
      </View>

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
        <View style={styles.ctaPayInfo}>
          <Text style={[styles.ctaPayLabel, { color: colors.textSecondary }]}>
            Pay range
          </Text>
          <Text style={[styles.ctaPayAmount, { color: colors.text }]}>
            {formatCurrencyRange(listing.pay_min, listing.pay_max)}
          </Text>
        </View>
        <Button
          title={isOffline && isCreator ? 'Offline' : isCreator ? 'Apply Now' : 'Edit Listing'}
          onPress={handleApply}
          disabled={isOffline && isCreator}
          size="lg"
          style={styles.ctaButton}
        />
      </Animated.View>

      <ImageGallery
        visible={galleryOpen}
        images={galleryImages}
        onClose={() => setGalleryOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroContainer: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 280,
    resizeMode: 'cover',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  title: {
    ...Typography.title1,
    marginBottom: Spacing.lg,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
  businessInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  businessName: {
    ...Typography.headline,
  },
  businessLocation: {
    ...Typography.caption1,
    marginTop: Spacing.xxs,
  },
  payCard: {
    marginBottom: Spacing.xl,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  payAmount: {
    ...Typography.title2,
    fontWeight: '800',
  },
  payLabel: {
    ...Typography.caption1,
    marginTop: Spacing.xxs,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    lineHeight: 26,
    marginBottom: Spacing.xxl,
  },
  requirementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  detailsList: {
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailText: {
    ...Typography.subheadline,
  },
  bottomCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadows.lg,
  },
  ctaPayInfo: {},
  ctaPayLabel: {
    ...Typography.caption1,
  },
  ctaPayAmount: {
    ...Typography.title3,
    fontWeight: '700',
  },
  ctaButton: {
    minWidth: 150,
  },
  analyticsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    minHeight: 44,
  },
  analyticsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expandToggle: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  analyticsSummaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  summaryValue: {
    ...Typography.headline,
    fontWeight: '700',
  },
  summaryLabel: {
    ...Typography.caption2,
  },
  chartsScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  skeletonBlock: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
  },
});
