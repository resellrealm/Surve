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
import { Bell, Plus } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { ListingCard } from '../../components/listing/ListingCard';
import { ListingFilterChips } from '../../components/listing/ListingFilters';
import { CreatorCard } from '../../components/creator/CreatorCard';
import { Avatar } from '../../components/ui/Avatar';
import { categories } from '../../constants/filters';
import * as api from '../../lib/api';
import { Typography, Spacing, BorderRadius, Layout } from '../../constants/theme';
import type { Listing, Category, Creator } from '../../types';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listings, user } = useStore();

  const isBusiness = user?.role === 'business';
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [topCreators, setTopCreators] = useState<Creator[]>([]);

  const filteredListings = useMemo(() => {
    let items = listings;
    // Business sees only their own listings
    if (isBusiness) {
      items = items.filter((l) => l.business.user_id === user?.id);
    }
    if (selectedCategory === 'all') return items;
    return items.filter((l) => l.category === selectedCategory);
  }, [listings, selectedCategory, isBusiness, user?.id]);

  // Top creators for business home
  React.useEffect(() => {
    if (isBusiness) {
      api.getCreators().then((c) => setTopCreators(c.slice(0, 5)));
    }
  }, [isBusiness]);

  const { fetchListings } = useStore();
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

  const renderHeader = useCallback(
    () => (
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
    ),
    [
      insets.top,
      user,
      colors,
      isBusiness,
      filteredListings.length,
      selectedCategory,
      handleCategorySelect,
      handleCreateListing,
      handleCreatorPress,
      topCreators,
    ]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Listing; index: number }) => (
      <Animated.View
        entering={FadeInDown.duration(400).delay(index * 80)}
        style={styles.cardWrapper}
      >
        <ListingCard listing={item} onPress={handleListingPress} />
      </Animated.View>
    ),
    [handleListingPress]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredListings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
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
});
