import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  RefreshControl,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  Plus,
  LayoutGrid,
  Clock,
  DollarSign,
  Users,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Camera,
  TrendingUp,
  Activity,
  Star,
  MapPin,
  Instagram,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import * as api from '../../lib/api';
import { BookingCard } from '../booking/BookingCard';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
} from '../../constants/theme';
import { PressableScale } from '../ui/PressableScale';
import { formatCurrency, formatCurrencyRange } from '../../lib/currency';
import type { Listing, Booking, Business, Application } from '../../types';

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  onPress,
}: {
  icon: typeof LayoutGrid;
  label: string;
  value: string | number;
  color: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <PressableScale
      scaleValue={0.96}
      onPress={() => {
        if (onPress) {
          haptics.tap();
          onPress();
        }
      }}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${label}: ${value}`}
      style={[
        styles.statCard,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </PressableScale>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action && onAction && (
        <PressableScale
          scaleValue={0.95}
          onPress={() => {
            haptics.tap();
            onAction();
          }}
          style={styles.sectionAction}
          accessibilityRole="button"
          accessibilityLabel={action}
          hitSlop={8}
        >
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>
            {action}
          </Text>
          <ChevronRight size={16} color={colors.primary} strokeWidth={2} />
        </PressableScale>
      )}
    </View>
  );
}

// ─── Compact Listing Row ────────────────────────────────────────────────────

function CompactListingRow({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress: (listing: Listing) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const statusColor =
    listing.status === 'active'
      ? colors.completed
      : listing.status === 'paused'
        ? colors.pending
        : colors.textTertiary;

  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        onPress(listing);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${listing.applicants_count} applicants`}
      style={[
        styles.compactRow,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <View style={styles.compactInfo}>
        <Text
          style={[styles.compactTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {listing.title}
        </Text>
        <View style={styles.compactMeta}>
          <Users size={12} color={colors.textTertiary} strokeWidth={2} />
          <Text style={[styles.compactMetaText, { color: colors.textTertiary }]}>
            {listing.applicants_count} applicant
            {listing.applicants_count !== 1 ? 's' : ''}
          </Text>
          <Text style={[styles.compactMetaDot, { color: colors.textTertiary }]}>
            {'\u00B7'}
          </Text>
          <Text style={[styles.compactMetaText, { color: colors.primary }]}>
            {formatCurrencyRange(listing.pay_min, listing.pay_max)}
          </Text>
        </View>
      </View>
      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.5} />
    </PressableScale>
  );
}

// ─── Performance Card ───────────────────────────────────────────────────────

function PerformanceCard({
  completionRate,
  avgRating,
  totalCompleted,
  inProgressCount,
}: {
  completionRate: number;
  avgRating: number;
  totalCompleted: number;
  inProgressCount: number;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.performanceCard,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Performance: ${completionRate}% completion rate, ${avgRating.toFixed(1)} average rating, ${totalCompleted} completed, ${inProgressCount} in progress`}
    >
      <Text style={[styles.performanceTitle, { color: colors.text }]}>
        Performance
      </Text>
      <View style={styles.performanceGrid}>
        <View style={styles.performanceItem}>
          <View style={[styles.performanceIconWrap, { backgroundColor: colors.completedLight }]}>
            <TrendingUp size={16} color={colors.completed} strokeWidth={2} />
          </View>
          <Text style={[styles.performanceValue, { color: colors.text }]}>
            {completionRate}%
          </Text>
          <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
            Completion
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <View style={[styles.performanceIconWrap, { backgroundColor: colors.pendingLight }]}>
            <Star size={16} color={colors.pending} strokeWidth={2} />
          </View>
          <Text style={[styles.performanceValue, { color: colors.text }]}>
            {avgRating > 0 ? avgRating.toFixed(1) : '\u2014'}
          </Text>
          <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
            Avg Rating
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <View style={[styles.performanceIconWrap, { backgroundColor: colors.activeLight }]}>
            <CheckCircle2 size={16} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={[styles.performanceValue, { color: colors.text }]}>
            {totalCompleted}
          </Text>
          <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
            Completed
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <View style={[styles.performanceIconWrap, { backgroundColor: colors.activeLight }]}>
            <Activity size={16} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={[styles.performanceValue, { color: colors.text }]}>
            {inProgressCount}
          </Text>
          <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
            In Progress
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Proof Review Row ───────────────────────────────────────────────────────

function ProofReviewRow({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: (booking: Booking) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const daysAgo = booking.proof_submitted_at
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(booking.proof_submitted_at).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        onPress(booking);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Review proof from ${booking.creator.user.full_name} for ${booking.listing.title}`}
      style={[
        styles.proofRow,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={[styles.proofIconWrap, { backgroundColor: colors.pendingLight }]}>
        <Camera size={18} color={colors.pending} strokeWidth={2} />
      </View>
      <View style={styles.proofInfo}>
        <Text
          style={[styles.proofCreator, { color: colors.text }]}
          numberOfLines={1}
        >
          {booking.creator.user.full_name}
        </Text>
        <Text
          style={[styles.proofListing, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {booking.listing.title}
        </Text>
      </View>
      <View style={styles.proofRight}>
        {daysAgo > 0 && (
          <Text style={[styles.proofAge, { color: colors.pending }]}>
            {daysAgo}d ago
          </Text>
        )}
        <View style={[styles.reviewBadge, { backgroundColor: colors.pendingLight }]}>
          <Text style={[styles.reviewBadgeText, { color: colors.pending }]}>
            Review
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

// ─── Application Row ────────────────────────────────────────────────────────

function ApplicationRow({
  application,
  onPress,
}: {
  application: Application;
  onPress: (application: Application) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const daysAgo = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(application.created_at).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  const creatorName =
    application.creator?.user?.full_name ?? 'Creator';
  const listingTitle =
    application.listing?.title ?? 'Listing';
  const creatorAvatar =
    application.creator?.user?.avatar_url ?? null;
  const followers =
    (application.creator?.instagram_followers ?? 0) +
    (application.creator?.tiktok_followers ?? 0);

  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        onPress(application);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Application from ${creatorName} for ${listingTitle}`}
      style={[
        styles.applicationRow,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <Avatar
        uri={creatorAvatar}
        name={creatorName}
        size={44}
      />
      <View style={styles.applicationInfo}>
        <Text
          style={[styles.applicationCreator, { color: colors.text }]}
          numberOfLines={1}
        >
          {creatorName}
        </Text>
        <Text
          style={[styles.applicationListing, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {listingTitle}
        </Text>
        <View style={styles.applicationMeta}>
          {followers > 0 && (
            <>
              <Instagram size={11} color={colors.textTertiary} strokeWidth={2} />
              <Text
                style={[styles.applicationMetaText, { color: colors.textTertiary }]}
              >
                {followers >= 1000
                  ? `${(followers / 1000).toFixed(followers >= 10000 ? 0 : 1)}K`
                  : followers}
              </Text>
            </>
          )}
          {application.creator?.location && (
            <>
              <MapPin size={11} color={colors.textTertiary} strokeWidth={2} />
              <Text
                style={[styles.applicationMetaText, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {application.creator.location}
              </Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.applicationRight}>
        <Text style={[styles.applicationAge, { color: colors.textTertiary }]}>
          {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
        </Text>
        <View style={[styles.viewBadge, { backgroundColor: colors.primaryLight + '18' }]}>
          <Text style={[styles.viewBadgeText, { color: colors.primary }]}>
            View
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

// ─── Dashboard Skeleton ─────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ gap: Spacing.xs }}>
          <Skeleton width={100} height={14} />
          <Skeleton width={140} height={18} />
        </View>
      </View>
      <View style={styles.statsGrid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.statCardSkeleton}>
            <Skeleton width={40} height={40} borderRadius={BorderRadius.md} />
            <Skeleton width={50} height={24} />
            <Skeleton width={80} height={14} />
          </View>
        ))}
      </View>
      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
        <Skeleton width="100%" height={100} borderRadius={BorderRadius.lg} />
        <Skeleton width="50%" height={20} />
        <Skeleton width="100%" height={60} borderRadius={BorderRadius.md} />
        <Skeleton width="100%" height={60} borderRadius={BorderRadius.md} />
        <Skeleton width="50%" height={20} />
        <Skeleton width="100%" height={80} borderRadius={BorderRadius.md} />
      </View>
    </View>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function BusinessDashboard() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const entering = (delay: number) =>
    reducedMotion ? undefined : FadeInDown.duration(400).delay(delay);

  const {
    listings,
    bookings,
    user,
    listingsLoading,
    listingsError,
    fetchListings,
    fetchBookings,
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<Business | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (user?.id) {
      api.getBusinessProfile(user.id).then(setBusinessProfile);
      api.getBusinessApplications(user.id).then(setApplications);
    }
  }, [user?.id]);

  const myListings = useMemo(
    () => listings.filter((l) => l.business.user_id === user?.id),
    [listings, user?.id],
  );

  const activeListings = useMemo(
    () => myListings.filter((l) => l.status === 'active'),
    [myListings],
  );

  const myBookings = useMemo(
    () => bookings.filter((b) => b.business.user_id === user?.id),
    [bookings, user?.id],
  );

  const pendingBookings = useMemo(
    () => myBookings.filter((b) => b.status === 'pending'),
    [myBookings],
  );

  const proofToReview = useMemo(
    () => myBookings.filter((b) => b.status === 'proof_submitted'),
    [myBookings],
  );

  const inProgressBookings = useMemo(
    () =>
      myBookings.filter(
        (b) =>
          b.status === 'active' ||
          b.status === 'accepted' ||
          b.status === 'in_progress',
      ),
    [myBookings],
  );

  const disputedBookings = useMemo(
    () => myBookings.filter((b) => b.status === 'disputed'),
    [myBookings],
  );

  const completedBookings = useMemo(
    () => myBookings.filter((b) => b.status === 'completed'),
    [myBookings],
  );

  const recentBookings = useMemo(
    () =>
      [...myBookings]
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
        .slice(0, 5),
    [myBookings],
  );

  const pendingApplications = useMemo(
    () => applications.filter((a) => a.status === 'pending'),
    [applications],
  );

  const totalApplicants = useMemo(
    () => myListings.reduce((sum, l) => sum + l.applicants_count, 0),
    [myListings],
  );

  const totalRevenue = useMemo(
    () => completedBookings.reduce((sum, b) => sum + b.pay_agreed, 0),
    [completedBookings],
  );

  const completionRate = useMemo(() => {
    const resolved = myBookings.filter(
      (b) => b.status === 'completed' || b.status === 'cancelled',
    );
    if (resolved.length === 0) return 0;
    return Math.round(
      (completedBookings.length / resolved.length) * 100,
    );
  }, [myBookings, completedBookings]);

  const avgRating = businessProfile?.rating ?? 0;

  const attentionCount =
    pendingBookings.length + proofToReview.length + disputedBookings.length;

  const handleRefresh = useCallback(async () => {
    haptics.confirm();
    setRefreshing(true);
    await Promise.all([fetchListings(), fetchBookings()]);
    if (user?.id) {
      api.getBusinessProfile(user.id).then(setBusinessProfile);
      api.getBusinessApplications(user.id).then(setApplications);
    }
    setRefreshing(false);
  }, [fetchListings, fetchBookings, user?.id, haptics]);

  const handleListingPress = useCallback(
    (listing: Listing) => {
      router.push(`/(listing)/${listing.id}`);
    },
    [router],
  );

  const handleBookingPress = useCallback(
    (booking: Booking) => {
      haptics.tap();
      router.push(`/(booking)/${booking.id}`);
    },
    [router, haptics],
  );

  const handleApplicationPress = useCallback(
    (_application: Application) => {
      router.push('/(business)/applicants');
    },
    [router],
  );

  const handleCreateListing = useCallback(() => {
    haptics.confirm();
    router.push('/(listing)/create');
  }, [router, haptics]);

  const isLoading = listingsLoading && listings.length === 0;

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top + Spacing.lg },
        ]}
      >
        <DashboardSkeleton />
      </View>
    );
  }

  if (listingsError && listings.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
        accessibilityRole="alert"
      >
        <View style={styles.errorState}>
          <View
            style={[styles.errorIcon, { backgroundColor: colors.cancelledLight }]}
          >
            <AlertTriangle size={40} color={colors.error} strokeWidth={1.5} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Couldn't load dashboard
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            {listingsError}
          </Text>
          <PressableScale
            scaleValue={0.95}
            onPress={handleRefresh}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading dashboard"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>
              Try Again
            </Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Layout.tabBarHeight + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <Animated.View
          entering={entering(0)}
          style={[styles.headerBar, { paddingTop: insets.top + Spacing.lg }]}
        >
          <View style={styles.headerLeft}>
            <Avatar
              uri={user?.avatar_url ?? null}
              name={user?.full_name ?? 'User'}
              size={40}
            />
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                {getGreeting()}
              </Text>
              <Text style={[styles.userName, { color: colors.text }]}>
                {businessProfile?.business_name ?? user?.full_name ?? 'Business'}
              </Text>
            </View>
          </View>
          <PressableScale
            scaleValue={0.88}
            onPress={() => {
              haptics.tap();
              router.push('/(profile)/notifications');
            }}
            style={[styles.notifButton, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={22} color={colors.text} strokeWidth={2} />
            {attentionCount > 0 && (
              <View
                style={[
                  styles.notifDot,
                  { backgroundColor: colors.error, borderColor: colors.surface },
                ]}
              />
            )}
          </PressableScale>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View
          entering={entering(80)}
          style={styles.statsGrid}
        >
          <StatCard
            icon={LayoutGrid}
            label="Active Listings"
            value={activeListings.length}
            color={colors.primary}
            onPress={() => router.push('/(tabs)/search')}
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={pendingBookings.length}
            color={colors.pending}
            onPress={() => router.push('/(tabs)/bookings')}
          />
          <StatCard
            icon={Users}
            label="Applicants"
            value={totalApplicants}
            color={colors.secondary}
          />
          <StatCard
            icon={DollarSign}
            label="Revenue"
            value={formatCurrency(totalRevenue)}
            color={colors.completed}
            onPress={() => router.push('/(profile)/earnings')}
          />
        </Animated.View>

        {/* Create Listing CTA */}
        <Animated.View
          entering={entering(160)}
          style={styles.ctaRow}
        >
          <PressableScale
            onPress={handleCreateListing}
            style={[
              styles.createBtn,
              { backgroundColor: colors.primary },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create new listing"
          >
            <Plus size={20} color={colors.onPrimary} strokeWidth={2.5} />
            <Text style={[styles.createBtnText, { color: colors.onPrimary }]}>
              Create New Listing
            </Text>
          </PressableScale>
        </Animated.View>

        {/* Performance Card */}
        {myBookings.length > 0 && (
          <Animated.View
            entering={entering(200)}
            style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xxl }}
          >
            <PerformanceCard
              completionRate={completionRate}
              avgRating={avgRating}
              totalCompleted={completedBookings.length}
              inProgressCount={inProgressBookings.length}
            />
          </Animated.View>
        )}

        {/* Pending Applications */}
        {pendingApplications.length > 0 && (
          <Animated.View entering={entering(220)}>
            <SectionHeader
              title={`Pending Applications (${pendingApplications.length})`}
              action="View all"
              onAction={() => router.push('/(business)/applicants')}
            />
            {pendingApplications.slice(0, 4).map((application) => (
              <View key={application.id} style={{ paddingHorizontal: Spacing.lg }}>
                <ApplicationRow
                  application={application}
                  onPress={handleApplicationPress}
                />
              </View>
            ))}
          </Animated.View>
        )}

        {/* Proof to Review */}
        {proofToReview.length > 0 && (
          <Animated.View entering={entering(240)}>
            <SectionHeader
              title={`Proof to Review (${proofToReview.length})`}
              action="All bookings"
              onAction={() => router.push('/(tabs)/bookings')}
            />
            {proofToReview.slice(0, 3).map((booking) => (
              <View key={booking.id} style={{ paddingHorizontal: Spacing.lg }}>
                <ProofReviewRow
                  booking={booking}
                  onPress={handleBookingPress}
                />
              </View>
            ))}
          </Animated.View>
        )}

        {/* Pending Bookings / Attention */}
        <Animated.View entering={entering(280)}>
          <SectionHeader
            title={
              attentionCount > 0
                ? `Needs Your Attention (${attentionCount})`
                : 'Needs Your Attention'
            }
            action={pendingBookings.length > 0 ? 'All bookings' : undefined}
            onAction={() => router.push('/(tabs)/bookings')}
          />
          {pendingBookings.length === 0 && disputedBookings.length === 0 ? (
            <View style={styles.emptySection}>
              <View
                style={[
                  styles.emptySectionIcon,
                  { backgroundColor: colors.completedLight },
                ]}
              >
                <CheckCircle2
                  size={20}
                  color={colors.completed}
                  strokeWidth={2}
                />
              </View>
              <Text
                style={[styles.emptySectionText, { color: colors.textSecondary }]}
              >
                All caught up \u2014 no pending actions
              </Text>
            </View>
          ) : (
            <>
              {disputedBookings.slice(0, 2).map((booking) => (
                <View
                  key={booking.id}
                  style={{ paddingHorizontal: Spacing.lg }}
                >
                  <BookingCard
                    booking={booking}
                    onPress={handleBookingPress}
                    userRole="business"
                  />
                </View>
              ))}
              {pendingBookings.slice(0, 3).map((booking) => (
                <View
                  key={booking.id}
                  style={{ paddingHorizontal: Spacing.lg }}
                >
                  <BookingCard
                    booking={booking}
                    onPress={handleBookingPress}
                    userRole="business"
                  />
                </View>
              ))}
            </>
          )}
        </Animated.View>

        {/* Active Listings */}
        <Animated.View entering={entering(340)}>
          <SectionHeader
            title="Active Listings"
            action={activeListings.length > 0 ? 'View all' : undefined}
            onAction={() => router.push('/(tabs)/search')}
          />
          {activeListings.length === 0 ? (
            <EmptyState
              icon="briefcase-outline"
              title="No active listings"
              body="Create a listing to start connecting with creators."
              ctaLabel="Create Listing"
              onPress={handleCreateListing}
            />
          ) : (
            activeListings.slice(0, 3).map((listing) => (
              <View key={listing.id} style={{ paddingHorizontal: Spacing.lg }}>
                <CompactListingRow
                  listing={listing}
                  onPress={handleListingPress}
                />
              </View>
            ))
          )}
        </Animated.View>

        {/* In Progress */}
        {inProgressBookings.length > 0 && (
          <Animated.View entering={entering(400)}>
            <SectionHeader
              title="In Progress"
              action="All bookings"
              onAction={() => router.push('/(tabs)/bookings')}
            />
            {inProgressBookings.slice(0, 3).map((booking) => (
              <View
                key={booking.id}
                style={{ paddingHorizontal: Spacing.lg }}
              >
                <BookingCard
                  booking={booking}
                  onPress={handleBookingPress}
                  userRole="business"
                />
              </View>
            ))}
          </Animated.View>
        )}

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <Animated.View entering={entering(460)}>
            <SectionHeader
              title="Recent Activity"
              action="All bookings"
              onAction={() => router.push('/(tabs)/bookings')}
            />
            {recentBookings.map((booking) => (
              <View
                key={booking.id}
                style={{ paddingHorizontal: Spacing.lg }}
              >
                <BookingCard
                  booking={booking}
                  onPress={handleBookingPress}
                  userRole="business"
                />
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  greeting: {
    ...Typography.caption1,
  },
  userName: {
    ...Typography.headline,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: (Layout.screenWidth - Spacing.lg * 2 - Spacing.md) / 2,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  statCardSkeleton: {
    width: (Layout.screenWidth - Spacing.lg * 2 - Spacing.md) / 2,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...Typography.title2,
  },
  statLabel: {
    ...Typography.caption1,
  },
  ctaRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
  },
  createBtnText: {
    ...Typography.headline,
  },
  performanceCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  performanceTitle: {
    ...Typography.headline,
    marginBottom: Spacing.lg,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceItem: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.xs,
  },
  performanceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxs,
  },
  performanceValue: {
    ...Typography.headline,
  },
  performanceLabel: {
    ...Typography.caption2,
  },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  proofIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  proofCreator: {
    ...Typography.headline,
  },
  proofListing: {
    ...Typography.caption1,
  },
  proofRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  proofAge: {
    ...Typography.caption2,
    fontWeight: '500',
  },
  reviewBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs + 1,
    borderRadius: BorderRadius.sm,
  },
  reviewBadgeText: {
    ...Typography.caption2,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title3,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
    justifyContent: 'center',
  },
  sectionActionText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  compactTitle: {
    ...Typography.headline,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  compactMetaText: {
    ...Typography.caption1,
  },
  compactMetaDot: {
    ...Typography.caption1,
  },
  emptySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  emptySectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySectionText: {
    ...Typography.subheadline,
    flex: 1,
  },
  applicationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  applicationInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  applicationCreator: {
    ...Typography.headline,
  },
  applicationListing: {
    ...Typography.caption1,
  },
  applicationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  applicationMetaText: {
    ...Typography.caption2,
  },
  applicationRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  applicationAge: {
    ...Typography.caption2,
  },
  viewBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs + 1,
    borderRadius: BorderRadius.sm,
  },
  viewBadgeText: {
    ...Typography.caption2,
    fontWeight: '600',
  },
  skeletonContainer: {
    gap: Spacing.xl,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  errorTitle: {
    ...Typography.title3,
    marginBottom: Spacing.sm,
  },
  errorSubtitle: {
    ...Typography.subheadline,
    textAlign: 'center',
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
  retryText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
});
