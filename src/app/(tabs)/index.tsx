import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { useScrollToTop } from '@react-navigation/native';
import { Bell, Plus, AlertTriangle, RotateCcw, Compass } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { usePermissionPrime } from '../../hooks/usePermissionPrime';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { ListingCard } from '../../components/listing/ListingCard';
import { ListingFilterChips } from '../../components/listing/ListingFilters';
import { PressableScale } from '../../components/ui/PressableScale';
import { PermissionPrime } from '../../components/ui/PermissionPrime';
import { CreatorCard } from '../../components/creator/CreatorCard';
import { BusinessDashboard } from '../../components/dashboard/BusinessDashboard';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton, ListingCardSkeleton } from '../../components/ui/Skeleton';
import { ThemedText } from '../../components/ui/ThemedText';
import { categories } from '../../constants/filters';
import * as api from '../../lib/api';
import { Typography, Spacing, BorderRadius, Layout } from '../../constants/theme';
import type { Listing, Category, Creator } from '../../types';

const NOTIF_BANNER_DISMISSED_KEY = 'surve_notif_banner_dismissed';

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
        <ListingCardSkeleton delay={0} />
        <ListingCardSkeleton delay={150} />
        <ListingCardSkeleton delay={300} />
      </View>
    </View>
  );
}

function useNotificationPermission() {
  const user = useStore((s) => s.user);
  const notifPrime = usePermissionPrime('notifications');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const dismissed = await SecureStore.getItemAsync(NOTIF_BANNER_DISMISSED_KEY);
      if (dismissed || cancelled) return;
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted' && !cancelled) {
        notifPrime.prime(async () => {
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          await supabase.from('users').update({ expo_push_token: token }).eq('id', user.id);
          await SecureStore.setItemAsync(NOTIF_BANNER_DISMISSED_KEY, '1');
        });
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return notifPrime;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listings, user, listingsLoading, listingsError, fetchListings } = useStore();
  const savedScrollY = useStore((s) => s.scrollPositions.home);
  const setScrollPosition = useStore((s) => s.setScrollPosition);
  const notifPrime = useNotificationPermission();

  const listRef = useRef<FlatList<Listing>>(null);
  // Double-tap on the Home tab scrolls to top. We satisfy useScrollToTop by
  // passing a ref with a `scrollToTop` method.
  useScrollToTop(
    useRef({
      scrollToTop: () => listRef.current?.scrollToOffset({ offset: 0, animated: true }),
    })
  );

  const persistScroll = useCallback(
    (y: number) => setScrollPosition('home', y),
    [setScrollPosition]
  );

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      // Persist off the JS thread — cheap set into Zustand.
      runOnJS(persistScroll)(event.contentOffset.y);
    },
  });

  const restoredRef = useRef(false);
  const restoreScrollIfNeeded = useCallback(() => {
    if (restoredRef.current) return;
    if (savedScrollY > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: savedScrollY, animated: false });
      });
    }
    restoredRef.current = true;
  }, [savedScrollY]);

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [0, 1], Extrapolation.CLAMP),
  }));

  const headerBorderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [50, 60], [0, 1], Extrapolation.CLAMP),
  }));

  const isBusiness = user?.role === 'business';
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [topCreators, setTopCreators] = useState<Creator[]>([]);

  if (isBusiness) {
    return <BusinessDashboard />;
  }

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
    haptics.tap();
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }, [fetchListings, haptics]);

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
    haptics.confirm();
    router.push('/(listing)/create');
  }, [router, haptics]);

  const handleCategorySelect = useCallback((key: string) => {
    setSelectedCategory(key);
  }, []);

  if (listingsLoading && listings.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + Spacing.lg }]}>
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
          <ThemedText variant="title3" style={[styles.errorTitle, { color: colors.text }]}>
            Couldn't load listings
          </ThemedText>
          <ThemedText variant="subheadline" style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            {listingsError}
          </ThemedText>
          <PressableScale
            onPress={handleRefresh}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading listings"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <ThemedText variant="subheadline" style={[styles.retryText, { color: colors.onPrimary }]}>Try Again</ThemedText>
          </PressableScale>
        </View>
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      <View style={{ height: insets.top + Spacing.lg + 42 + Spacing.lg }} />

      <PermissionPrime
        kind="notifications"
        visible={notifPrime.visible}
        onConfirm={notifPrime.confirm}
        onDismiss={notifPrime.dismiss}
      />

      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={styles.titleSection}
      >
        <ThemedText variant="title1" style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
          {isBusiness ? 'Your Listings' : 'Discover Opportunities'}
        </ThemedText>
        <ThemedText variant="subheadline" style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          {isBusiness
            ? `${filteredListings.length} active listings`
            : `${filteredListings.length} listings available`}
        </ThemedText>
      </Animated.View>

      {isBusiness && (
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={styles.createListingRow}
        >
          <PressableScale
            onPress={handleCreateListing}
            style={[
              styles.createListingButton,
              { backgroundColor: colors.primary },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create new listing"
          >
            <Plus size={20} color={colors.onPrimary} strokeWidth={2} />
            <ThemedText variant="callout" style={[styles.createListingText, { color: colors.onPrimary }]}>Create New Listing</ThemedText>
          </PressableScale>
        </Animated.View>
      )}

      {isBusiness && topCreators.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <ThemedText
            variant="headline"
            style={{ color: colors.text, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}
          >
            Top Creators
          </ThemedText>
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
    <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyState} accessibilityRole="text">
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
        <Compass size={40} color={colors.textTertiary} strokeWidth={1.5} />
      </View>
      <ThemedText variant="title3" style={[styles.emptyTitle, { color: colors.text }]}>
        No listings yet
      </ThemedText>
      <ThemedText variant="subheadline" style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {isBusiness
          ? 'Create your first listing to connect with creators'
          : 'Check back soon for new opportunities'}
      </ThemedText>
      {isBusiness && (
        <PressableScale
          onPress={handleCreateListing}
          style={[styles.emptyCta, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Create your first listing"
        >
          <ThemedText variant="subheadline" style={[styles.emptyCtaText, { color: colors.onPrimary }]}>Create Listing</ThemedText>
        </PressableScale>
      )}
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.FlatList
        ref={listRef as any}
        data={filteredListings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onContentSizeChange={restoreScrollIfNeeded}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />

      <View style={styles.fixedHeader} pointerEvents="box-none">
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.surface },
            headerBgStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.fixedHeaderBorder,
            { backgroundColor: colors.border },
            headerBorderStyle,
          ]}
        />
        <View
          style={[styles.headerBar, { paddingTop: insets.top + Spacing.lg }]}
          pointerEvents="box-none"
        >
          <View style={styles.headerLeft}>
            <Avatar
              uri={user?.avatar_url ?? null}
              name={user?.full_name ?? 'User'}
              size={40}
            />
            <View style={styles.headerText}>
              <ThemedText variant="caption1" style={[styles.greeting, { color: colors.textSecondary }]} accessibilityRole="text">
                Welcome back
              </ThemedText>
              <ThemedText variant="headline" style={[styles.userName, { color: colors.text }]} accessibilityRole="header">
                {user?.full_name ?? 'User'}
              </ThemedText>
            </View>
          </View>
          <PressableScale
            scaleValue={0.9}
            onPress={() => {
              haptics.tap();
              router.push('/(profile)/notifications');
            }}
            style={[styles.notifButton, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={22} color={colors.text} strokeWidth={2} />
            <View style={[styles.notifDot, { backgroundColor: colors.primary, borderColor: colors.surface }]} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fixedHeaderBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
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

