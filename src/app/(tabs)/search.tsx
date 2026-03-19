import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { SearchBar } from '../../components/ui/SearchBar';
import { ListingCard } from '../../components/listing/ListingCard';
import { CreatorCard } from '../../components/creator/CreatorCard';
import { ListingFilterChips } from '../../components/listing/ListingFilters';
import { platforms, categories, mockCreators } from '../../lib/mockData';
import { Typography, Spacing, BorderRadius, Layout } from '../../constants/theme';
import type { Listing, Creator, Platform as PlatformType } from '../../types';

const sortOptions = [
  { key: 'newest', label: 'Newest' },
  { key: 'highest_pay', label: 'Highest Pay' },
  { key: 'closest', label: 'Closest' },
];

type SearchMode = 'listings' | 'creators';

export default function SearchScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listings, user } = useStore();
  const isBusiness = user?.role === 'business';

  const [searchMode, setSearchMode] = useState<SearchMode>('listings');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortOptions, setShowSortOptions] = useState(false);

  const filteredListings = useMemo(() => {
    let results = [...listings];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.business.business_name.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q)
      );
    }

    if (selectedPlatform !== 'all') {
      results = results.filter((l) => l.platform === selectedPlatform);
    }

    if (selectedCategory !== 'all') {
      results = results.filter((l) => l.category === selectedCategory);
    }

    switch (sortBy) {
      case 'highest_pay':
        results.sort((a, b) => b.pay_max - a.pay_max);
        break;
      case 'newest':
      default:
        results.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }

    return results;
  }, [listings, searchQuery, selectedPlatform, selectedCategory, sortBy]);

  const filteredCreators = useMemo(() => {
    let results = [...mockCreators];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (c) =>
          c.user.full_name.toLowerCase().includes(q) ||
          c.bio.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          (c.instagram_handle?.toLowerCase().includes(q) ?? false) ||
          (c.tiktok_handle?.toLowerCase().includes(q) ?? false)
      );
    }

    if (selectedCategory !== 'all') {
      results = results.filter((c) => c.categories.includes(selectedCategory as any));
    }

    return results;
  }, [searchQuery, selectedCategory]);

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

  const toggleSort = useCallback(() => {
    Haptics.selectionAsync();
    setShowSortOptions((prev) => !prev);
  }, []);

  const handleSortSelect = useCallback((key: string) => {
    Haptics.selectionAsync();
    setSortBy(key);
    setShowSortOptions(false);
  }, []);

  const renderHeader = useCallback(
    () => (
      <View>
        <View style={[styles.searchSection, { paddingTop: insets.top + Spacing.sm }]}>
          <Text style={[styles.title, { color: colors.text }]}>Search</Text>

          {isBusiness && (
            <View style={styles.modeToggle}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setSearchMode('listings'); }}
                style={[
                  styles.modeTab,
                  {
                    backgroundColor: searchMode === 'listings' ? colors.primary : colors.surface,
                    borderColor: searchMode === 'listings' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.modeTabText, { color: searchMode === 'listings' ? '#FFFFFF' : colors.textSecondary }]}>
                  Listings
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setSearchMode('creators'); }}
                style={[
                  styles.modeTab,
                  {
                    backgroundColor: searchMode === 'creators' ? colors.primary : colors.surface,
                    borderColor: searchMode === 'creators' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.modeTabText, { color: searchMode === 'creators' ? '#FFFFFF' : colors.textSecondary }]}>
                  Creators
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.searchRow}>
            <View style={styles.searchBarWrapper}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={searchMode === 'creators' ? 'Search creators, locations...' : 'Search listings, venues, locations...'}
              />
            </View>
          </View>
        </View>

        {searchMode === 'listings' && (
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
              Platform
            </Text>
            <ListingFilterChips
              items={platforms}
              selectedKey={selectedPlatform}
              onSelect={setSelectedPlatform}
            />

            <Text
              style={[
                styles.filterLabel,
                { color: colors.textSecondary, marginTop: Spacing.md },
              ]}
            >
              Category
            </Text>
            <ListingFilterChips
              items={categories}
              selectedKey={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>
        )}

        {searchMode === 'creators' && (
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
              Category
            </Text>
            <ListingFilterChips
              items={categories}
              selectedKey={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>
        )}

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {searchMode === 'creators' ? filteredCreators.length : filteredListings.length} results
          </Text>
          {searchMode === 'listings' && (
            <Pressable
              onPress={toggleSort}
              style={[
                styles.sortButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <ArrowUpDown size={16} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.sortText, { color: colors.textSecondary }]}>
                {sortOptions.find((o) => o.key === sortBy)?.label}
              </Text>
            </Pressable>
          )}
        </View>

        {showSortOptions && searchMode === 'listings' && (
          <View
            style={[
              styles.sortDropdown,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {sortOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => handleSortSelect(option.key)}
                style={[
                  styles.sortOption,
                  sortBy === option.key && {
                    backgroundColor: colors.activeLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    {
                      color:
                        sortBy === option.key
                          ? colors.primary
                          : colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    ),
    [
      insets.top,
      searchQuery,
      searchMode,
      isBusiness,
      selectedPlatform,
      selectedCategory,
      sortBy,
      showSortOptions,
      filteredListings.length,
      filteredCreators.length,
      colors,
      toggleSort,
      handleSortSelect,
    ]
  );

  const renderListingItem = useCallback(
    ({ item, index }: { item: Listing; index: number }) => (
      <Animated.View
        entering={FadeInDown.duration(400).delay(index * 60)}
        style={styles.cardWrapper}
      >
        <ListingCard listing={item} onPress={handleListingPress} />
      </Animated.View>
    ),
    [handleListingPress]
  );

  const renderCreatorItem = useCallback(
    ({ item, index }: { item: Creator; index: number }) => (
      <Animated.View
        entering={FadeInDown.duration(400).delay(index * 60)}
        style={styles.cardWrapper}
      >
        <CreatorCard creator={item} onPress={handleCreatorPress} />
      </Animated.View>
    ),
    [handleCreatorPress]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {searchMode === 'creators' ? 'No creators found' : 'No listings found'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Try adjusting your filters or search terms
        </Text>
      </View>
    ),
    [colors, searchMode]
  );

  if (searchMode === 'creators') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={filteredCreators}
          renderItem={renderCreatorItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredListings}
        renderItem={renderListingItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.title1,
    marginBottom: Spacing.lg,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  modeTab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeTabText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  searchBarWrapper: {
    flex: 1,
  },
  filterSection: {
    marginBottom: Spacing.lg,
  },
  filterLabel: {
    ...Typography.caption1,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  resultsCount: {
    ...Typography.subheadline,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  sortText: {
    ...Typography.caption1,
    fontWeight: '600',
  },
  sortDropdown: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sortOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sortOptionText: {
    ...Typography.subheadline,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: Layout.tabBarHeight + 40,
  },
  cardWrapper: {
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.massive,
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    ...Typography.title3,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.subheadline,
    textAlign: 'center',
  },
});
