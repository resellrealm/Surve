import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';
import {
  LayoutGrid,
  Users,
  Calendar,
  Star,
  Plus,
  ChevronRight,
  Instagram,
  MapPin,
  Bell,
  AlertTriangle,
  RotateCcw,
  FileText,
  Trash2,
  Send,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import * as api from '../../lib/api';
import { toast } from '../../lib/toast';
import { Avatar } from '../../components/ui/Avatar';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';
import { PressableScale } from '../../components/ui/PressableScale';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
} from '../../constants/theme';
import type { Application, Business, Listing } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

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
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </PressableScale>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

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

// ─── Active Listing Row ───────────────────────────────────────────────────────

function ActiveListingRow({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress: (listing: Listing) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        onPress(listing);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${listing.applicants_count} applicants`}
      style={[
        styles.listingRow,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={[styles.activeDot, { backgroundColor: colors.completed }]} />
      <View style={styles.listingInfo}>
        <Text style={[styles.listingTitle, { color: colors.text }]} numberOfLines={1}>
          {listing.title}
        </Text>
        <View style={styles.listingMeta}>
          <Users size={12} color={colors.textTertiary} strokeWidth={2} />
          <Text style={[styles.listingMetaText, { color: colors.textTertiary }]}>
            {listing.applicants_count} applicant{listing.applicants_count !== 1 ? 's' : ''}
          </Text>
          <Text style={[styles.listingMetaDot, { color: colors.textTertiary }]}>·</Text>
          <Text style={[styles.listingMetaText, { color: colors.primary }]}>
            ${listing.pay_min}–${listing.pay_max}
          </Text>
        </View>
      </View>
      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.5} />
    </PressableScale>
  );
}

// ─── Draft Listing Row ────────────────────────────────────────────────────────

function DraftListingRow({
  listing,
  onPublish,
  onDelete,
  publishing,
  deleting,
}: {
  listing: Listing;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  publishing: boolean;
  deleting: boolean;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <View
      style={[
        styles.draftRow,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={[styles.draftIconWrap, { backgroundColor: colors.surfaceSecondary }]}>
        <FileText size={18} color={colors.textSecondary} strokeWidth={1.5} />
      </View>
      <View style={styles.draftInfo}>
        <Text style={[styles.draftTitle, { color: colors.text }]} numberOfLines={1}>
          {listing.title || 'Untitled draft'}
        </Text>
        <Text style={[styles.draftMeta, { color: colors.textTertiary }]}>
          ${listing.pay_min}–${listing.pay_max} · {listing.category}
        </Text>
      </View>
      <PressableScale
        scaleValue={0.9}
        onPress={() => {
          haptics.confirm();
          onPublish(listing.id);
        }}
        disabled={publishing || deleting}
        style={[styles.draftActionBtn, { backgroundColor: colors.primary + '18' }]}
        accessibilityRole="button"
        accessibilityLabel="Publish draft"
      >
        <Send size={15} color={colors.primary} strokeWidth={2} />
      </PressableScale>
      <PressableScale
        scaleValue={0.9}
        onPress={() => {
          haptics.error();
          onDelete(listing.id);
        }}
        disabled={publishing || deleting}
        style={[styles.draftActionBtn, { backgroundColor: colors.cancelledLight }]}
        accessibilityRole="button"
        accessibilityLabel="Delete draft"
      >
        <Trash2 size={15} color={colors.error} strokeWidth={2} />
      </PressableScale>
    </View>
  );
}

// ─── Applicant Row ────────────────────────────────────────────────────────────

function ApplicantRow({
  application,
  onPress,
}: {
  application: Application;
  onPress: (application: Application) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const creatorName = application.creator?.user?.full_name ?? 'Creator';
  const listingTitle = application.listing?.title ?? 'Listing';
  const creatorAvatar = application.creator?.user?.avatar_url ?? null;
  const followers =
    (application.creator?.instagram_followers ?? 0) +
    (application.creator?.tiktok_followers ?? 0);

  const daysAgo = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(application.created_at).getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        onPress(application);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Application from ${creatorName} for ${listingTitle}`}
      style={[
        styles.applicantRow,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <Avatar uri={creatorAvatar} name={creatorName} size={44} />
      <View style={styles.applicantInfo}>
        <Text style={[styles.applicantName, { color: colors.text }]} numberOfLines={1}>
          {creatorName}
        </Text>
        <Text
          style={[styles.applicantListing, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {listingTitle}
        </Text>
        <View style={styles.applicantMeta}>
          {followers > 0 && (
            <>
              <Instagram size={11} color={colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.applicantMetaText, { color: colors.textTertiary }]}>
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
                style={[styles.applicantMetaText, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {application.creator.location}
              </Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.applicantRight}>
        <Text style={[styles.applicantAge, { color: colors.textTertiary }]}>
          {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
        </Text>
        <View style={[styles.viewBadge, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[styles.viewBadgeText, { color: colors.primary }]}>View</Text>
        </View>
      </View>
    </PressableScale>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
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
        <Skeleton width="100%" height={52} borderRadius={BorderRadius.lg} />
        <Skeleton width="50%" height={20} />
        <Skeleton width="100%" height={72} borderRadius={BorderRadius.md} />
        <Skeleton width="100%" height={72} borderRadius={BorderRadius.md} />
        <Skeleton width="50%" height={20} />
        <Skeleton width="100%" height={72} borderRadius={BorderRadius.md} />
        <Skeleton width="100%" height={72} borderRadius={BorderRadius.md} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BusinessDashboardScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const entering = (delay: number) =>
    reducedMotion ? undefined : FadeInDown.duration(400).delay(delay);

  const { user, listings, bookings, listingsLoading, listingsError, fetchListings, fetchBookings } =
    useStore();

  const [refreshing, setRefreshing] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<Business | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [draftListings, setDraftListings] = useState<Listing[]>([]);
  const [publishingDraftId, setPublishingDraftId] = useState<string | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  // Role guard — non-business users bounce back to tabs
  if (user && user.role !== 'business') {
    return <Redirect href="/(tabs)" />;
  }

  useEffect(() => {
    if (user?.id) {
      api.getBusinessProfile(user.id).then(setBusinessProfile);
      api.getBusinessApplications(user.id).then(setApplications);
      api.getDraftListings(user.id).then(setDraftListings);
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

  const applicantsThisWeek = useMemo(() => {
    return applications.filter((a) => isThisWeek(a.created_at)).length;
  }, [applications]);

  const bookingsThisMonth = useMemo(
    () => myBookings.filter((b) => isThisMonth(b.created_at)).length,
    [myBookings],
  );

  const avgRating = businessProfile?.rating ?? 0;

  const recentApplications = useMemo(
    () =>
      [...applications]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [applications],
  );

  const handleRefresh = useCallback(async () => {
    haptics.confirm();
    setRefreshing(true);
    await Promise.all([fetchListings(), fetchBookings()]);
    if (user?.id) {
      api.getBusinessProfile(user.id).then(setBusinessProfile);
      api.getBusinessApplications(user.id).then(setApplications);
      api.getDraftListings(user.id).then(setDraftListings);
    }
    setRefreshing(false);
  }, [fetchListings, fetchBookings, user?.id, haptics]);

  const handlePublishDraft = useCallback(
    async (listingId: string) => {
      haptics.confirm();
      setPublishingDraftId(listingId);
      const ok = await api.publishDraftListing(listingId);
      setPublishingDraftId(null);
      if (ok) {
        setDraftListings((prev) => prev.filter((l) => l.id !== listingId));
        await fetchListings();
        toast.success('Listing published!');
      } else {
        toast.error('Failed to publish listing');
      }
    },
    [haptics, fetchListings],
  );

  const handleDeleteDraft = useCallback(
    async (listingId: string) => {
      haptics.error();
      setDeletingDraftId(listingId);
      const ok = await api.deleteDraftListing(listingId);
      setDeletingDraftId(null);
      if (ok) {
        setDraftListings((prev) => prev.filter((l) => l.id !== listingId));
        toast.success('Draft deleted');
      } else {
        toast.error('Failed to delete draft');
      }
    },
    [haptics],
  );

  const handleListingPress = useCallback(
    (listing: Listing) => {
      router.push(`/(listing)/${listing.id}`);
    },
    [router],
  );

  const handleApplicationPress = useCallback(
    (application: Application) => {
      if (application.creator_id) {
        router.push(`/(creator)/${application.creator_id}`);
      }
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorState}>
          <View style={[styles.errorIconWrap, { backgroundColor: colors.cancelledLight }]}>
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
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading dashboard"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>Try Again</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Layout.tabBarHeight + 40 }}
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
            <Avatar uri={user?.avatar_url ?? null} name={user?.full_name ?? 'Business'} size={40} />
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
            style={[styles.notifBtn, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={22} color={colors.text} strokeWidth={2} />
          </PressableScale>
        </Animated.View>

        {/* Hero Stats */}
        <Animated.View entering={entering(80)} style={styles.statsGrid}>
          <StatCard
            icon={LayoutGrid}
            label="Active Listings"
            value={activeListings.length}
            color={colors.primary}
            onPress={() => router.push('/(tabs)/search')}
          />
          <StatCard
            icon={Users}
            label="Applicants This Week"
            value={applicantsThisWeek}
            color={colors.secondary}
          />
          <StatCard
            icon={Calendar}
            label="Bookings This Month"
            value={bookingsThisMonth}
            color={colors.completed}
            onPress={() => router.push('/(tabs)/bookings')}
          />
          <StatCard
            icon={Star}
            label="Avg Rating"
            value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
            color={colors.rating}
          />
        </Animated.View>

        {/* Create Listing CTA */}
        <Animated.View entering={entering(160)} style={styles.ctaRow}>
          <PressableScale
            onPress={handleCreateListing}
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Create new listing"
          >
            <Plus size={20} color={colors.onPrimary} strokeWidth={2.5} />
            <Text style={[styles.createBtnText, { color: colors.onPrimary }]}>
              Create New Listing
            </Text>
          </PressableScale>
        </Animated.View>

        {/* Active Listings */}
        <Animated.View entering={entering(220)}>
          <SectionHeader
            title="Active Listings"
            action={activeListings.length > 0 ? 'View all' : undefined}
            onAction={() => router.push('/(tabs)/search')}
          />
          {activeListings.length === 0 ? (
            <EmptyState
              icon="briefcase-outline"
              title="No active listings"
              body="Create your first listing to connect with creators."
              ctaLabel="Create Listing"
              onPress={handleCreateListing}
            />
          ) : (
            activeListings.slice(0, 5).map((listing) => (
              <View key={listing.id} style={{ paddingHorizontal: Spacing.lg }}>
                <ActiveListingRow listing={listing} onPress={handleListingPress} />
              </View>
            ))
          )}
        </Animated.View>

        {/* Drafts */}
        {draftListings.length > 0 && (
          <Animated.View entering={entering(260)}>
            <SectionHeader title={`Drafts (${draftListings.length})`} />
            {draftListings.map((listing) => (
              <View key={listing.id} style={{ paddingHorizontal: Spacing.lg }}>
                <DraftListingRow
                  listing={listing}
                  onPublish={handlePublishDraft}
                  onDelete={handleDeleteDraft}
                  publishing={publishingDraftId === listing.id}
                  deleting={deletingDraftId === listing.id}
                />
              </View>
            ))}
          </Animated.View>
        )}

        {/* Recent Applicants */}
        <Animated.View entering={entering(300)}>
          <SectionHeader
            title={
              recentApplications.length > 0
                ? `Recent Applicants (${recentApplications.length})`
                : 'Recent Applicants'
            }
            action={recentApplications.length > 0 ? 'View all' : undefined}
            onAction={() => router.push('/(tabs)/search')}
          />
          {recentApplications.length === 0 ? (
            <View style={[styles.emptyApplicants, { borderColor: colors.borderLight }]}>
              <Text style={[styles.emptyApplicantsText, { color: colors.textSecondary }]}>
                No applicants yet — create a listing to get started.
              </Text>
            </View>
          ) : (
            recentApplications.map((application) => (
              <View key={application.id} style={{ paddingHorizontal: Spacing.lg }}>
                <ApplicantRow application={application} onPress={handleApplicationPress} />
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 52,
  },
  createBtnText: {
    ...Typography.headline,
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
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listingInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  listingTitle: {
    ...Typography.headline,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  listingMetaText: {
    ...Typography.caption1,
  },
  listingMetaDot: {
    ...Typography.caption1,
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  draftIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftInfo: {
    flex: 1,
    gap: 2,
  },
  draftTitle: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  draftMeta: {
    ...Typography.caption1,
  },
  draftActionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  applicantInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  applicantName: {
    ...Typography.headline,
  },
  applicantListing: {
    ...Typography.caption1,
  },
  applicantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  applicantMetaText: {
    ...Typography.caption2,
  },
  applicantRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  applicantAge: {
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
  emptyApplicants: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  emptyApplicantsText: {
    ...Typography.subheadline,
    textAlign: 'center',
  },
  skeletonWrap: {
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
  errorIconWrap: {
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
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    minHeight: 44,
  },
  retryText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
});
