import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Bell, Plus, AlertTriangle, RotateCcw, Compass } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { ListingCard } from '../../components/listing/ListingCard';
import { ListingFilterChips } from '../../components/listing/ListingFilters';
import { CreatorCard } from '../../components/creator/CreatorCard';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton, ListingCardSkeleton } from '../../components/ui/Skeleton';
import { categories } from '../../constants/filters';
import * as api from '../../lib/api';
import { Typography, Spacing, BorderRadius, Layout } from '../../constants/theme';
import type { Listing, Category, Creator } from '../../types';

function HomeSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ gap: Spacing.xs }}>
          <Skeleton width={100} height={14} />
          <Skeleton width={140} height={18} />
        </View>
      </View>
      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
        <Skeleton width="60%" height={24} />
        <Skeleton width="40%" height={16} />
      </View>
      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl }}>
        <ListingCardSkeleton />
        <ListingCardSkeleton />
        <ListingCardSkeleton />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listings, user, listingsLoading, listingsError, fetchListings } = useStore();

  const isBusiness = user?.role === 'business';
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [topCreators, setTopCreators] = useState<Creator[]>([]);

  const filteredListings = useMemo(() => {
    let items = listings;
    if (isBusiness) {
      items = items.filter((l) => l.business.user_id === user?.id);
    }
    if (selectedCategory === 'all') return items;
    return items.filter((l) => l.category === selectedCategory);
  }, [listings, selectedCategory, isBusiness, user?.id]);

  React.useEffect(() => {
    if (isBusiness) {
      api.getCreators().then((c) => setTopCreators(c.slice(0, 5)));
    }
  }, [isBusiness]);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }, [fetchListings]);

  const handleListingPress = useCallback(
    (listing: Listing) => {
      router.push(`/(listing)/${listing.id}`);
    },
    [router]
  );

  const handleCreatorPress = useCallback(
    (creator: Creator) => {
      router.push(`/(creator)/${creator.id}`);
    },
    [router]
  );

  const handleCreateListing = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(listing)/create');
  }, [router]);

  const handleCategorySelect = useCallback((key: string) => {
    setSelectedCategory(key);
  }, []);

  if (listingsLoading && listings.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + Spacing.sm }]}>
        <HomeSkeleton />
      </View>
    );
  }

  if (listingsError && listings.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} accessibilityRole="alert">
        <View style={styles.errorState}>
          <View style={[styles.errorIcon, { backgroundColor: colors.cancelledLight }]}>
            <AlertTriangle size={40} color={colors.error} strokeWidth={1.5} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Couldn't load listings
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            {listingsError}
          </Text>
          <Pressable
            onPress={handleRefresh}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading listings"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      <View
        style={[
          styles.headerBar,
          { paddingTop: insets.top + Spacing.sm },
        ]}
      >
        <View style={styles.headerLeft}>
          <Avatar
            uri={user?.avatar_url ?? null}
            name={user?.full_name ?? 'User'}
            size={40}
          />
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Welcome back
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.full_name ?? 'User'}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(profile)/notifications');
          }}
          style={[styles.notifButton, { backgroundColor: colors.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Bell size={22} color={colors.text} strokeWidth={2} />
          <View style={[styles.notifDot, { backgroundColor: colors.primary, borderColor: colors.surface }]} />
        </Pressable>
      </View>

      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={styles.titleSection}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isBusiness ? 'Your Listings' : 'Discover Opportunities'}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          {isBusiness
            ? `${filteredListings.length} active listings`
            : `${filteredListings.length} listings available`}
        </Text>
      </Animated.View>

      {isBusiness && (
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={styles.createListingRow}
        >
          <Pressable
            onPress={handleCreateListing}
            style={[
              styles.createListingButton,
              { backgroundColor: colors.primary },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create new listing"
          >
            <Plus size={20} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.createListingText, { color: colors.onPrimary }]}>Create New Listing</Text>
          </Pressable>
        </Animated.View>
      )}

      {isBusiness && topCreators.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text
            style={[
              styles.sectionSubtitle,
              { color: colors.text, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md, fontWeight: '600', fontSize: 17 },
            ]}
          >
            Top Creators
          </Text>
          <FlatList
            horizontal
            data={topCreators}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}
            renderItem={({ item }) => (
              <View style={{ width: 280 }}>
                <CreatorCard creator={item} onPress={handleCreatorPress} />
              </View>
            )}
          />
          <View style={{ height: Spacing.xl }} />
        </Animated.View>
      )}

      <View style={styles.filtersContainer}>
        <ListingFilterChips
          items={categories}
          selectedKey={selectedCategory}
          onSelect={handleCategorySelect}
        />
      </View>
    </View>
  );

  const renderItem = ({ item, index }: { item: Listing; index: number }) => (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 80)}
      style={styles.cardWrapper}
    >
      <ListingCard listing={item} onPress={handleListingPress} />
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState} accessibilityRole="text">
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
        <Compass size={40} color={colors.textTertiary} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No listings yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {isBusiness
          ? 'Create your first listing to connect with creators'
          : 'New opportunities are posted daily — check back soon'}
      </Text>
      {isBusiness && (
        <Pressable
          onPress={handleCreateListing}
          style={[styles.emptyCta, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Create your first listing"
        >
          <Text style={[styles.emptyCtaText, { color: colors.onPrimary }]}>Create Listing</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredListings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

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
  headerText: {},
  greeting: {
    ...Typography.caption1,
  },
  userName: {
    ...Typography.headline,
  },
  notifButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  titleSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.title1,
  },
  sectionSubtitle: {
    ...Typography.subheadline,
    marginTop: Spacing.xs,
  },
  filtersContainer: {
    marginBottom: Spacing.lg,
  },
  createListingRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  createListingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
  },
  createListingText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  listContent: {
    paddingBottom: Layout.tabBarHeight + 40,
  },
  cardWrapper: {
    paddingHorizontal: Spacing.lg,
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
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.title3,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.subheadline,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  emptyCtaText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
});
