import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, RefreshControl, Alert, TextInput, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import { toast } from '../../lib/toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { SlidersHorizontal, ArrowUpDown, AlertTriangle, RotateCcw, Bookmark } from 'lucide-react-native';
import { useTheme} from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { SearchBar } from '../../components/ui/SearchBar';
import { ListingCard } from '../../components/listing/ListingCard';
import { CreatorCard } from '../../components/creator/CreatorCard';
import { ListingFilterChips } from '../../components/listing/ListingFilters';
import { PressableScale } from '../../components/ui/PressableScale';
import { Skeleton, ListingCardSkeleton } from '../../components/ui/Skeleton';
import { platforms, categories, followerRanges, engagementRanges, payRanges } from '../../constants/filters';
import * as api from '../../lib/api';
import { Typography, Spacing, BorderRadius, Layout } from '../../constants/theme';
import type { Listing, Creator, Platform as PlatformType } from '../../types';

const sortOptions = [
  { key: 'newest', label: 'Newest' },
  { key: 'highest_pay', label: 'Highest Pay' },
  { key: 'closest', label: 'Closest' },
];

type SearchMode = 'listings' | 'creators';

function SaveSearchButton({
  hasFilters,
  filters,
}: {
  hasFilters: boolean;
  filters: Record<string, unknown>;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const user = useStore((s) => s.user);
  const [saving, setSaving] = React.useState(false);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [searchName, setSearchName] = React.useState('');
  const inputRef = React.useRef<TextInput>(null);

  const doSave = useCallback(async (name: string) => {
    if (!user || !name.trim()) return;
    setSaving(true);
    const result = await api.createSavedSearch(user.id, name.trim(), filters);
    setSaving(false);
    if (result) {
      haptics.success();
      toast.success('Saved! Find it under Profile → Saved searches.');
    } else {
      haptics.error();
      toast.error('Could not save. Please try again.');
    }
  }, [filters, haptics, user]);

  const handleSave = useCallback(() => {
    if (!user || !hasFilters || saving) return;
    haptics.tap();

    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt(
        'Save this search',
        'Give it a name so you can find it later.',
        (name?: string) => {
          if (name?.trim()) doSave(name);
        },
      );
    } else {
      const autoName =
        (typeof filters.query === 'string' && filters.query) ||
        (typeof filters.category === 'string' && filters.category !== 'all' && filters.category) ||
        '';
      setSearchName(autoName || '');
      setModalVisible(true);
    }
  }, [doSave, filters, haptics, hasFilters, saving, user]);

  const handleModalSave = useCallback(() => {
    setModalVisible(false);
    doSave(searchName || 'My search');
  }, [doSave, searchName]);

  return (
    <>
      <PressableScale
        scaleValue={0.9}
        onPress={handleSave}
        disabled={!hasFilters || saving}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Save current search"
        accessibilityHint="Saves the current filters so you can reuse them later"
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: hasFilters
            ? colors.activeLight
            : colors.surfaceSecondary,
          opacity: hasFilters ? 1 : 0.4,
          marginLeft: 8,
        }}
      >
        <Bookmark
          size={20}
          color={hasFilters ? colors.primary : colors.textTertiary}
          strokeWidth={2}
        />
      </PressableScale>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        onShow={() => setTimeout(() => inputRef.current?.focus(), 100)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close save search dialog"
          >
            <Pressable
              style={[styles.modalCard, { backgroundColor: colors.surface }]}
              onPress={() => {}}
              accessibilityRole="none"
              accessibilityLabel="Save search dialog"
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Save this search
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Give it a name so you can find it later.
              </Text>
              <TextInput
                ref={inputRef}
                value={searchName}
                onChangeText={setSearchName}
                placeholder="e.g. Hotels in LA"
                placeholderTextColor={colors.textTertiary}
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={handleModalSave}
                style={[
                  styles.modalInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {searchName.length}/50
              </Text>
              <View style={styles.modalActions}>
                <PressableScale
                  onPress={() => { haptics.tap(); setModalVisible(false); }}
                  style={[styles.modalBtn, { backgroundColor: colors.surfaceSecondary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>
                    Cancel
                  </Text>
                </PressableScale>
                <PressableScale
                  onPress={() => { haptics.confirm(); handleModalSave(); }}
                  style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Save search"
                >
                  <Text style={[styles.modalBtnText, { color: colors.onPrimary }]}>
                    Save
                  </Text>
                </PressableScale>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function SearchSkeleton() {
  return (
    <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg, paddingTop: Spacing.xl }}>
      <Skeleton width="100%" height={44} borderRadius={BorderRadius.md} />
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Skeleton width={80} height={32} borderRadius={BorderRadius.full} />
        <Skeleton width={100} height={32} borderRadius={BorderRadius.full} />
        <Skeleton width={90} height={32} borderRadius={BorderRadius.full} />
      </View>
      <ListingCardSkeleton />
      <ListingCardSkeleton />
      <ListingCardSkeleton />
    </View>
  );
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listings, user, listingsLoading, listingsError, fetchListings } = useStore();
  const savedFilters = useStore((s) => s.searchFilters);
  const setSavedFilters = useStore((s) => s.setSearchFilters);
  const resetSavedFilters = useStore((s) => s.resetSearchFilters);
  const savedScrollY = useStore((s) => s.scrollPositions.search);
  const setScrollPosition = useStore((s) => s.setScrollPosition);
  const isBusiness = user?.role === 'business';
  const params = useLocalSearchParams<{ saved?: string }>();

  // Restore saved filters if navigated with ?saved=<json>
  const savedInitial = React.useMemo(() => {
    if (!params.saved || typeof params.saved !== 'string') return null;
    try {
      return JSON.parse(params.saved) as {
        query?: string;
        platform?: string;
        category?: string;
        mode?: SearchMode;
      };
    } catch {
      return null;
    }
  }, [params.saved]);

  const [searchMode, setSearchMode] = useState<SearchMode>(
    savedInitial?.mode ?? savedFilters.mode ?? 'listings'
  );
  const [searchQuery, setSearchQuery] = useState(
    savedInitial?.query ?? savedFilters.query ?? ''
  );
  const [selectedPlatform, setSelectedPlatform] = useState(
    savedInitial?.platform ?? savedFilters.platform ?? 'all'
  );
  const [selectedCategory, setSelectedCategory] = useState(
    savedInitial?.category ?? savedFilters.category ?? 'all'
  );
  const [sortBy, setSortBy] = useState(savedFilters.sortBy ?? 'newest');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [selectedFollowerRange, setSelectedFollowerRange] = useState(
    savedFilters.followerRange ?? 'all'
  );
  const [selectedEngagement, setSelectedEngagement] = useState(
    savedFilters.engagement ?? 'all'
  );
  const [selectedPayRange, setSelectedPayRange] = useState(
    savedFilters.payRange ?? 'all'
  );
  const [locationQuery, setLocationQuery] = useState(
    savedFilters.location ?? ''
  );

  // Persist any filter change back to the session store so navigating away
  // and back preserves state (S122).
  useEffect(() => {
    setSavedFilters({
      query: searchQuery,
      platform: selectedPlatform,
      category: selectedCategory,
      followerRange: selectedFollowerRange,
      engagement: selectedEngagement,
      sortBy,
      mode: searchMode,
      payRange: selectedPayRange,
      location: locationQuery,
    });
  }, [
    searchQuery,
    selectedPlatform,
    selectedCategory,
    selectedFollowerRange,
    selectedEngagement,
    sortBy,
    searchMode,
    selectedPayRange,
    locationQuery,
    setSavedFilters,
  ]);

  const listRef = useRef<FlatList<Listing | Creator>>(null);
  useScrollToTop(
    useRef({
      scrollToTop: () => listRef.current?.scrollToOffset({ offset: 0, animated: true }),
    })
  );
  const restoredScrollRef = useRef(false);
  const restoreScrollIfNeeded = useCallback(() => {
    if (restoredScrollRef.current) return;
    if (savedScrollY > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: savedScrollY, animated: false });
      });
    }
    restoredScrollRef.current = true;
  }, [savedScrollY]);
  const handleListScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      setScrollPosition('search', e.nativeEvent.contentOffset.y);
    },
    [setScrollPosition]
  );
  const [creators, setCreators] = useState<Creator[]>([]);
  const [searchResults, setSearchResults] = useState<Listing[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creatorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bottom sheet filter state
  const filterSheetRef = useRef<BottomSheet>(null);
  const filterSnapPoints = useMemo(() => ['25%', '75%'], []);
  const [draftPlatform, setDraftPlatform] = useState(selectedPlatform);
  const [draftCategory, setDraftCategory] = useState(selectedCategory);
  const [draftFollowerRange, setDraftFollowerRange] = useState(selectedFollowerRange);
  const [draftEngagement, setDraftEngagement] = useState(selectedEngagement);
  const [draftPayRange, setDraftPayRange] = useState(selectedPayRange);
  const [draftLocation, setDraftLocation] = useState(locationQuery);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedPlatform !== 'all') count++;
    if (selectedCategory !== 'all') count++;
    if (selectedFollowerRange !== 'all') count++;
    if (selectedEngagement !== 'all') count++;
    if (selectedPayRange !== 'all') count++;
    if (locationQuery.trim()) count++;
    return count;
  }, [selectedPlatform, selectedCategory, selectedFollowerRange, selectedEngagement, selectedPayRange, locationQuery]);

  const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim().length > 0 || sortBy !== 'newest';

  const handleResetAll = useCallback(() => {
    haptics.warning();
    setSearchQuery('');
    setSelectedPlatform('all');
    setSelectedCategory('all');
    setSelectedFollowerRange('all');
    setSelectedEngagement('all');
    setSelectedPayRange('all');
    setLocationQuery('');
    setSortBy('newest');
    setShowSortOptions(false);
    resetSavedFilters();
  }, [haptics, resetSavedFilters]);

  const openFilterSheet = useCallback(() => {
    haptics.tap();
    setDraftPlatform(selectedPlatform);
    setDraftCategory(selectedCategory);
    setDraftFollowerRange(selectedFollowerRange);
    setDraftEngagement(selectedEngagement);
    setDraftPayRange(selectedPayRange);
    setDraftLocation(locationQuery);
    filterSheetRef.current?.snapToIndex(0);
  }, [haptics, selectedPlatform, selectedCategory, selectedFollowerRange, selectedEngagement, selectedPayRange, locationQuery]);

  const applyFilters = useCallback(() => {
    haptics.confirm();
    setSelectedPlatform(draftPlatform);
    setSelectedCategory(draftCategory);
    setSelectedFollowerRange(draftFollowerRange);
    setSelectedEngagement(draftEngagement);
    setSelectedPayRange(draftPayRange);
    setLocationQuery(draftLocation);
  }, [haptics, draftPlatform, draftCategory, draftFollowerRange, draftEngagement, draftPayRange, draftLocation]);

  const handleFilterSheetChange = useCallback((index: number) => {
    if (index === -1) {
      applyFilters();
    }
  }, [applyFilters]);

  const resetDraftFilters = useCallback(() => {
    haptics.warning();
    // Reset drafts in the sheet
    setDraftPlatform('all');
    setDraftCategory('all');
    setDraftFollowerRange('all');
    setDraftEngagement('all');
    setDraftPayRange('all');
    setDraftLocation('');
    // Also reset all local filter state so closing the sheet doesn't
    // re-sync stale values back to the store.
    setSearchQuery('');
    setSelectedPlatform('all');
    setSelectedCategory('all');
    setSelectedFollowerRange('all');
    setSelectedEngagement('all');
    setSelectedPayRange('all');
    setLocationQuery('');
    setSortBy('newest');
    setShowSortOptions(false);
    resetSavedFilters();
  }, [haptics, resetSavedFilters]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.4}
      />
    ),
    [],
  );

  useEffect(() => {
    if (!(isBusiness || searchMode === 'creators')) return;

    if (creatorDebounceRef.current) clearTimeout(creatorDebounceRef.current);
    creatorDebounceRef.current = setTimeout(async () => {
      const followerPreset = followerRanges.find((r) => r.key === selectedFollowerRange);
      const engagementPreset = engagementRanges.find((r) => r.key === selectedEngagement);
      const hasFilters =
        searchQuery.trim() ||
        selectedCategory !== 'all' ||
        selectedFollowerRange !== 'all' ||
        selectedEngagement !== 'all';

      if (hasFilters) {
        const results = await api.searchCreators(searchQuery, {
          category: selectedCategory as any,
          followersMin: followerPreset?.min ?? null,
          followersMax: followerPreset?.max ?? null,
          engagementMin: engagementPreset?.min ?? null,
        });
        setCreators(results);
      } else {
        const results = await api.getCreators();
        setCreators(results);
      }
    }, 400);

    return () => {
      if (creatorDebounceRef.current) clearTimeout(creatorDebounceRef.current);
    };
  }, [isBusiness, searchMode, searchQuery, selectedCategory, selectedFollowerRange, selectedEngagement]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const payPreset = payRanges.find((r) => r.key === selectedPayRange);
      const hasAnyFilter =
        searchQuery.trim() ||
        selectedPlatform !== 'all' ||
        selectedCategory !== 'all' ||
        selectedPayRange !== 'all' ||
        locationQuery.trim();

      if (!hasAnyFilter) {
        setSearchResults(null);
        return;
      }
      setSearchLoading(true);
      try {
        const results = await api.searchListings(searchQuery, {
          platform: selectedPlatform,
          category: selectedCategory,
          sortBy,
          payMin: payPreset?.min ?? null,
          payMax: payPreset?.max ?? null,
          location: locationQuery,
        });
        setSearchResults(results);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, selectedPlatform, selectedCategory, sortBy, selectedPayRange, locationQuery]);

  const handleRefresh = useCallback(async () => {
    haptics.tap();
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }, [fetchListings, haptics]);

  const filteredListings = useMemo(() => {
    const base = searchResults ?? listings;
    let results = [...base];

    if (!searchResults) {
      if (selectedPlatform !== 'all') {
        results = results.filter((l) => l.platform === selectedPlatform);
      }
      if (selectedCategory !== 'all') {
        results = results.filter((l) => l.category === selectedCategory);
      }
      const payPreset = payRanges.find((r) => r.key === selectedPayRange);
      if (payPreset && selectedPayRange !== 'all') {
        if (payPreset.min != null) {
          results = results.filter((l) => l.pay_max >= (payPreset.min as number));
        }
        if (payPreset.max != null && payPreset.max > 0) {
          results = results.filter((l) => l.pay_min <= (payPreset.max as number));
        }
      }
      if (locationQuery.trim()) {
        const loc = locationQuery.trim().toLowerCase();
        results = results.filter((l) => l.location?.toLowerCase().includes(loc));
      }
    }

    if (!searchResults) {
      switch (sortBy) {
        case 'highest_pay':
          results.sort((a, b) => b.pay_max - a.pay_max);
          break;
        default:
          results.sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          break;
      }
    }

    return results;
  }, [listings, searchResults, selectedPlatform, selectedCategory, sortBy, selectedPayRange, locationQuery]);

  const hiddenCreators = useStore((s) => s.hiddenCreators);
  const filteredCreators = useMemo(
    () => creators.filter((c) => !hiddenCreators.includes(c.id)),
    [creators, hiddenCreators]
  );

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
    haptics.select();
    setShowSortOptions((prev) => !prev);
  }, []);

  const handleSortSelect = useCallback((key: string) => {
    haptics.select();
    setSortBy(key);
    setShowSortOptions(false);
  }, []);

  if (listingsLoading && listings.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + Spacing.lg }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text, paddingHorizontal: Spacing.lg }]}>Search</Text>
        <SearchSkeleton />
      </View>
    );
  }

  if (listingsError && listings.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} accessibilityRole="alert">
        <View style={[styles.errorState, { paddingTop: insets.top + 80 }]}>
          <View style={[styles.errorIcon, { backgroundColor: colors.cancelledLight }]}>
            <AlertTriangle size={40} color={colors.error} strokeWidth={1.5} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Couldn't load results
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            {listingsError}
          </Text>
          <PressableScale
            onPress={() => { haptics.tap(); fetchListings(); }}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading search results"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>Try Again</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      <View style={[styles.searchSection, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Search</Text>

        {isBusiness && (
          <View style={styles.modeToggle}>
            <PressableScale
              scaleValue={0.95}
              onPress={() => { haptics.select(); setSearchMode('listings'); }}
              style={[
                styles.modeTab,
                {
                  backgroundColor: searchMode === 'listings' ? colors.primary : colors.surface,
                  borderColor: searchMode === 'listings' ? colors.primary : colors.border,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: searchMode === 'listings' }}
              accessibilityLabel="Search listings"
            >
              <Text style={[styles.modeTabText, { color: searchMode === 'listings' ? '#FFFFFF' : colors.textSecondary }]}>
                Listings
              </Text>
            </PressableScale>
            <PressableScale
              scaleValue={0.95}
              onPress={() => { haptics.select(); setSearchMode('creators'); }}
              style={[
                styles.modeTab,
                {
                  backgroundColor: searchMode === 'creators' ? colors.primary : colors.surface,
                  borderColor: searchMode === 'creators' ? colors.primary : colors.border,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: searchMode === 'creators' }}
              accessibilityLabel="Search creators"
            >
              <Text style={[styles.modeTabText, { color: searchMode === 'creators' ? '#FFFFFF' : colors.textSecondary }]}>
                Creators
              </Text>
            </PressableScale>
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
          <PressableScale
            scaleValue={0.9}
            onPress={openFilterSheet}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
            style={[
              styles.filterButton,
              {
                backgroundColor: activeFilterCount > 0 ? colors.activeLight : colors.surfaceSecondary,
              },
            ]}
          >
            <SlidersHorizontal
              size={20}
              color={activeFilterCount > 0 ? colors.primary : colors.textTertiary}
              strokeWidth={2}
            />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </PressableScale>
          <SaveSearchButton
            hasFilters={
              Boolean(searchQuery.trim()) ||
              selectedPlatform !== 'all' ||
              selectedCategory !== 'all' ||
              selectedFollowerRange !== 'all' ||
              selectedEngagement !== 'all' ||
              selectedPayRange !== 'all' ||
              Boolean(locationQuery.trim())
            }
            filters={{
              query: searchQuery,
              platform: selectedPlatform,
              category: selectedCategory,
              followerRange: selectedFollowerRange,
              engagement: selectedEngagement,
              payRange: selectedPayRange,
              location: locationQuery,
              mode: searchMode,
            }}
          />
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {searchMode === 'creators' ? filteredCreators.length : filteredListings.length} results
        </Text>
        <View style={styles.resultsActions}>
          {hasActiveFilters && (
            <PressableScale
              scaleValue={0.93}
              onPress={handleResetAll}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              style={[styles.clearAllButton, { backgroundColor: colors.cancelledLight }]}
            >
              <RotateCcw size={14} color={colors.error} strokeWidth={2} />
              <Text style={[styles.clearAllText, { color: colors.error }]}>Clear</Text>
            </PressableScale>
          )}
          {searchMode === 'listings' && (
            <PressableScale
              scaleValue={0.95}
              onPress={toggleSort}
              style={[
                styles.sortButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${sortOptions.find((o) => o.key === sortBy)?.label}`}
            >
              <ArrowUpDown size={16} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.sortText, { color: colors.textSecondary }]}>
                {sortOptions.find((o) => o.key === sortBy)?.label}
              </Text>
            </PressableScale>
          )}
        </View>
      </View>

      {showSortOptions && searchMode === 'listings' && (
        <View
          style={[
            styles.sortDropdown,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          accessibilityRole="menu"
        >
          {sortOptions.map((option) => (
            <PressableScale
              key={option.key}
              scaleValue={0.98}
              onPress={() => handleSortSelect(option.key)}
              style={[
                styles.sortOption,
                sortBy === option.key && {
                  backgroundColor: colors.activeLight,
                },
              ]}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: sortBy === option.key }}
              accessibilityLabel={`Sort by ${option.label}`}
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
            </PressableScale>
          ))}
        </View>
      )}
    </View>
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

  const renderEmpty = () => (
    <EmptyState
      icon={searchQuery.trim() ? 'search-outline' : 'compass-outline'}
      title={
        searchQuery.trim()
          ? `No ${searchMode === 'creators' ? 'creators' : 'listings'} match "${searchQuery.trim()}"`
          : searchMode === 'creators'
            ? 'No creators found'
            : 'No listings yet'
      }
      body={
        searchQuery.trim()
          ? 'Try different keywords or loosen the filters above.'
          : 'New opportunities land here daily — check back soon.'
      }
      tint="muted"
    />
  );

  const draftHasFilters =
    draftPlatform !== 'all' ||
    draftCategory !== 'all' ||
    draftFollowerRange !== 'all' ||
    draftEngagement !== 'all' ||
    draftPayRange !== 'all' ||
    draftLocation.trim().length > 0;

  const filterSheetContent = (
    <BottomSheet
      ref={filterSheetRef}
      index={-1}
      snapPoints={filterSnapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleFilterSheetChange}
      handleIndicatorStyle={[styles.sheetHandle, { backgroundColor: colors.border }]}
      backgroundStyle={{ backgroundColor: colors.surface }}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Filters</Text>
          {draftHasFilters && (
            <PressableScale
              scaleValue={0.95}
              onPress={resetDraftFilters}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Reset all filters"
              style={[styles.resetButton, { backgroundColor: colors.surfaceSecondary }]}
            >
              <RotateCcw size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.resetText, { color: colors.textSecondary }]}>Reset</Text>
            </PressableScale>
          )}
        </View>

        {searchMode === 'listings' && (
          <>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Platform</Text>
            <ListingFilterChips
              items={platforms}
              selectedKey={draftPlatform}
              onSelect={setDraftPlatform}
            />

            <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
              Category
            </Text>
            <ListingFilterChips
              items={categories}
              selectedKey={draftCategory}
              onSelect={setDraftCategory}
            />

            <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
              Pay Range
            </Text>
            <ListingFilterChips
              items={payRanges}
              selectedKey={draftPayRange}
              onSelect={setDraftPayRange}
            />

            <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
              Location
            </Text>
            <View style={[styles.locationInputWrapper, { backgroundColor: colors.background, borderColor: draftLocation.trim() ? colors.primary : colors.border }]}>
              <TextInput
                value={draftLocation}
                onChangeText={setDraftLocation}
                placeholder="City or neighbourhood…"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
                autoCorrect={false}
                autoCapitalize="words"
                style={[styles.locationInput, { color: colors.text }]}
                accessibilityLabel="Filter by location"
              />
              {draftLocation.trim().length > 0 && (
                <PressableScale
                  onPress={() => { haptics.tap(); setDraftLocation(''); }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear location filter"
                  style={styles.locationClear}
                >
                  <Text style={[styles.locationClearText, { color: colors.textTertiary }]}>✕</Text>
                </PressableScale>
              )}
            </View>
          </>
        )}

        {searchMode === 'creators' && (
          <>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Category</Text>
            <ListingFilterChips
              items={categories}
              selectedKey={draftCategory}
              onSelect={setDraftCategory}
            />

            <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
              Followers
            </Text>
            <ListingFilterChips
              items={followerRanges}
              selectedKey={draftFollowerRange}
              onSelect={setDraftFollowerRange}
            />

            <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
              Engagement Rate
            </Text>
            <ListingFilterChips
              items={engagementRanges}
              selectedKey={draftEngagement}
              onSelect={setDraftEngagement}
            />
          </>
        )}

        <PressableScale
          scaleValue={0.97}
          onPress={() => {
            filterSheetRef.current?.close();
          }}
          accessibilityRole="button"
          accessibilityLabel="Apply filters"
          style={[styles.applyButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.applyButtonText, { color: colors.onPrimary }]}>
            Apply Filters
          </Text>
        </PressableScale>
      </BottomSheetScrollView>
    </BottomSheet>
  );

  if (searchMode === 'creators') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          ref={listRef as any}
          data={filteredCreators}
          renderItem={renderCreatorItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          onContentSizeChange={restoreScrollIfNeeded}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
        {filterSheetContent}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={listRef as any}
        data={filteredListings}
        renderItem={renderListingItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleListScroll}
        scrollEventThrottle={16}
        onContentSizeChange={restoreScrollIfNeeded}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
      {filterSheetContent}
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    ...Typography.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 14,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetContent: {
    paddingBottom: Spacing.xxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  sheetTitle: {
    ...Typography.title3,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  resetText: {
    ...Typography.caption1,
    fontWeight: '600',
  },
  applyButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  applyButtonText: {
    ...Typography.subheadline,
    fontWeight: '700',
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
  resultsActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultsCount: {
    ...Typography.subheadline,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    minHeight: 44,
  },
  clearAllText: {
    ...Typography.caption1,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minHeight: 44,
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
  errorState: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalTitle: {
    ...Typography.title3,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    ...Typography.subheadline,
    marginBottom: Spacing.lg,
  },
  modalInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  charCount: {
    ...Typography.caption2,
    textAlign: 'right',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  modalBtnText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  locationInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: Spacing.sm + 2,
  },
  locationClear: {
    paddingLeft: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  locationClearText: {
    ...Typography.body,
    lineHeight: 20,
  },
});
