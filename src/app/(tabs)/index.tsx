import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  Platform,
  ScrollView,
  LayoutChangeEvent,
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
  withSpring,
  clamp,
} from 'react-native-reanimated';
// @ts-ignore — useAnimatedGestureHandler was removed in Reanimated 3 but is still provided at runtime via gesture-handler bridge
import { useAnimatedGestureHandler } from 'react-native-reanimated';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useScrollToTop } from '@react-navigation/native';
import { Bell, AlertTriangle, RotateCcw, Compass, SlidersHorizontal, Bookmark, BookmarkCheck, Users } from 'lucide-react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
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
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton, ListingCardSkeleton } from '../../components/ui/Skeleton';
import { ThemedText } from '../../components/ui/ThemedText';
import { categories, followerRanges, engagementRanges, platforms } from '../../constants/filters';
import * as api from '../../lib/api';
import { Typography, Spacing, BorderRadius, Layout, Shadows } from '../../constants/theme';
import type { Listing, Category, Creator } from '../../types';

const NOTIF_BANNER_DISMISSED_KEY = 'surve_notif_banner_dismissed';

// ─── Filter chip helper ───────────────────────────────────────────────────────

function FilterRow({
  label,
  items,
  selectedKey,
  onSelect,
}: {
  label: string;
  items: { key: string; label: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  return (
    <View style={filterRowStyles.wrapper}>
      <ThemedText variant="subheadline" style={[filterRowStyles.label, { color: colors.textSecondary }]}>
        {label}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={filterRowStyles.row}>
        {items.map((item) => {
          const selected = item.key === selectedKey;
          return (
            <PressableScale
              key={item.key}
              scaleValue={0.93}
              onPress={() => { haptics.select(); onSelect(item.key); }}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${item.label}`}
              accessibilityState={{ selected }}
              style={[
                filterRowStyles.chip,
                {
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <ThemedText
                variant="caption1"
                style={[filterRowStyles.chipText, { color: selected ? colors.onPrimary : colors.textSecondary }]}
              >
                {item.label}
              </ThemedText>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const filterRowStyles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm, fontWeight: '600' },
  row: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontWeight: '500' },
});

// ─── Follower range slider ────────────────────────────────────────────────────

const FOLLOWER_STEPS = [0, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

function formatFollowerLabel(val: number): string {
  if (val === 0) return 'Any';
  if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M+`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K+`;
  return `${val}+`;
}

function FollowerSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const sliderWidth = useSharedValue(0);
  const thumbX = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const stepIndex = FOLLOWER_STEPS.indexOf(value);
  const currentStep = useSharedValue(stepIndex >= 0 ? stepIndex : 0);

  // Sync thumb position when value changes externally
  useEffect(() => {
    const idx = FOLLOWER_STEPS.indexOf(value);
    if (idx >= 0 && sliderWidth.value > 0) {
      thumbX.value = withSpring((idx / (FOLLOWER_STEPS.length - 1)) * sliderWidth.value);
      currentStep.value = idx;
    }
  }, [value]);

  const gestureHandler = useAnimatedGestureHandler<any, { startX: number }>({
    onStart: (_: any, ctx: { startX: number }) => {
      ctx.startX = thumbX.value;
      isDragging.value = true;
    },
    onActive: (event: any, ctx: { startX: number }) => {
      const maxW = sliderWidth.value;
      if (maxW === 0) return;
      const raw = clamp(ctx.startX + event.translationX, 0, maxW);
      thumbX.value = raw;
      const ratio = raw / maxW;
      const idx = Math.round(ratio * (FOLLOWER_STEPS.length - 1));
      if (idx !== currentStep.value) {
        currentStep.value = idx;
        runOnJS(onChange)(FOLLOWER_STEPS[idx]);
        runOnJS(haptics.select)();
      }
    },
    onEnd: () => {
      isDragging.value = false;
      const maxW = sliderWidth.value;
      if (maxW === 0) return;
      const snappedX = (currentStep.value / (FOLLOWER_STEPS.length - 1)) * maxW;
      thumbX.value = withSpring(snappedX, { damping: 20, stiffness: 300 });
    },
  });

  const trackFillStyle = useAnimatedStyle(() => ({
    width: `${(currentStep.value / (FOLLOWER_STEPS.length - 1)) * 100}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const maxW = sliderWidth.value;
    return {
      transform: [{ translateX: maxW > 0 ? thumbX.value - 14 : -14 }],
      shadowOpacity: isDragging.value ? 0.3 : 0.15,
    };
  });

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    sliderWidth.value = w;
    const idx = FOLLOWER_STEPS.indexOf(value);
    const safeIdx = idx >= 0 ? idx : 0;
    thumbX.value = (safeIdx / (FOLLOWER_STEPS.length - 1)) * w;
    currentStep.value = safeIdx;
  }, [value]);

  return (
    <View style={sliderStyles.wrapper}>
      <View style={sliderStyles.labelRow}>
        <ThemedText variant="subheadline" style={[{ color: colors.textSecondary, fontWeight: '600' }]}>
          Min Followers
        </ThemedText>
        <View style={[sliderStyles.valueBadge, { backgroundColor: value > 0 ? colors.primary : colors.surfaceSecondary }]}>
          <ThemedText variant="caption1" style={[{ color: value > 0 ? colors.onPrimary : colors.textSecondary, fontWeight: '700' }]}>
            {formatFollowerLabel(value)}
          </ThemedText>
        </View>
      </View>
      <View style={sliderStyles.track} onLayout={handleLayout}>
        <View style={[sliderStyles.trackBg, { backgroundColor: colors.border }]} />
        <Animated.View style={[sliderStyles.trackFill, { backgroundColor: colors.primary }, trackFillStyle]} />
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View
            style={[
              sliderStyles.thumb,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
                elevation: 4,
              },
              thumbStyle,
            ]}
            accessibilityRole="adjustable"
            accessibilityLabel={`Minimum followers: ${formatFollowerLabel(value)}`}
          />
        </PanGestureHandler>
      </View>
      <View style={sliderStyles.stepLabels}>
        <ThemedText variant="caption2" style={[{ color: colors.textTertiary }]}>Any</ThemedText>
        <ThemedText variant="caption2" style={[{ color: colors.textTertiary }]}>10K</ThemedText>
        <ThemedText variant="caption2" style={[{ color: colors.textTertiary }]}>100K</ThemedText>
        <ThemedText variant="caption2" style={[{ color: colors.textTertiary }]}>1M+</ThemedText>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrapper: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  valueBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    minWidth: 60,
    alignItems: 'center',
  },
  track: { height: 28, justifyContent: 'center' },
  trackBg: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2 },
  trackFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2 },
  thumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    top: 0,
  },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
});

// ─── Business creator discovery screen ───────────────────────────────────────

function BusinessDiscovery() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useStore((s) => s.user);
  const followedCreators = useStore((s) => s.followedCreators);
  const toggleFollowedCreator = useStore((s) => s.toggleFollowedCreator);

  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [selectedNiche, setSelectedNiche] = useState('all');
  const [minFollowers, setMinFollowers] = useState(0);
  const [selectedEngagement, setSelectedEngagement] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Bottom sheet
  const filterSheetRef = useRef<BottomSheet>(null);
  const filterSnapPoints = useMemo(() => ['50%', '80%'], []);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({ onScroll: (e) => { scrollY.value = e.contentOffset.y; } });

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [0, 1], Extrapolation.CLAMP),
  }));
  const headerBorderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [50, 60], [0, 1], Extrapolation.CLAMP),
  }));

  useEffect(() => {
    api.getCreators().then((c) => { setCreators(c); setLoading(false); });
  }, []);

  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    creators.forEach((c) => c.languages?.forEach((l) => langs.add(l)));
    return Array.from(langs);
  }, [creators]);

  const languageOptions = useMemo(() => [
    { key: 'all', label: 'Any' },
    ...allLanguages.map((l) => ({ key: l, label: l })),
  ], [allLanguages]);

  const allLocations = useMemo(() => {
    const locs = new Set<string>();
    creators.forEach((c) => { if (c.location) locs.add(c.location); });
    return Array.from(locs).sort();
  }, [creators]);

  const locationOptions = useMemo(() => [
    { key: 'all', label: 'Any' },
    ...allLocations.map((l) => ({ key: l, label: l.split(',')[0].trim() })),
  ], [allLocations]);

  const filteredCreators = useMemo(() => {
    return creators.filter((c) => {
      if (selectedNiche !== 'all' && !c.categories.includes(selectedNiche as Category)) return false;
      if (minFollowers > 0) {
        const maxF = Math.max(c.instagram_followers ?? 0, c.tiktok_followers ?? 0);
        if (maxF < minFollowers) return false;
      }
      const engEntry = engagementRanges.find((e) => e.key === selectedEngagement);
      if (engEntry?.min != null && c.engagement_rate < engEntry.min) return false;
      if (selectedPlatform === 'instagram' && !c.instagram_handle) return false;
      if (selectedPlatform === 'tiktok' && !c.tiktok_handle) return false;
      if (selectedLanguage !== 'all' && !c.languages?.includes(selectedLanguage)) return false;
      if (selectedLocation !== 'all' && c.location !== selectedLocation) return false;
      return true;
    });
  }, [creators, selectedNiche, minFollowers, selectedEngagement, selectedPlatform, selectedLanguage, selectedLocation]);

  const activeFilterCount = [
    selectedNiche !== 'all',
    minFollowers > 0,
    selectedEngagement !== 'all',
    selectedPlatform !== 'all',
    selectedLanguage !== 'all',
    selectedLocation !== 'all',
  ].filter(Boolean).length;

  const handleCreatorPress = useCallback((creator: Creator) => {
    router.push(`/(creator)/${creator.id}`);
  }, [router]);

  const handleBookmark = useCallback((creatorId: string) => {
    haptics.tap();
    toggleFollowedCreator(creatorId);
  }, [haptics, toggleFollowedCreator]);

  const handleRefresh = useCallback(async () => {
    haptics.tap();
    setRefreshing(true);
    const c = await api.getCreators();
    setCreators(c);
    setRefreshing(false);
  }, [haptics]);

  const handleOpenFilters = useCallback(() => {
    haptics.tap();
    filterSheetRef.current?.snapToIndex(0);
  }, [haptics]);

  const handleClearFilters = useCallback(() => {
    haptics.tap();
    setSelectedNiche('all');
    setMinFollowers(0);
    setSelectedEngagement('all');
    setSelectedPlatform('all');
    setSelectedLanguage('all');
    setSelectedLocation('all');
  }, [haptics]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  if (loading) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + Spacing.lg }]}>
        <HomeSkeleton />
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: Creator; index: number }) => {
    const isBookmarked = followedCreators.includes(item.id);
    return (
      <Animated.View entering={FadeInDown.duration(400).delay(index * 60)} style={discStyles.cardWrapper}>
        <View>
          <CreatorCard creator={item} onPress={handleCreatorPress} />
          <PressableScale
            onPress={() => handleBookmark(item.id)}
            scaleValue={0.85}
            style={[discStyles.bookmarkBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark creator'}
            accessibilityState={{ selected: isBookmarked }}
          >
            {isBookmarked
              ? <BookmarkCheck size={18} color={colors.primary} strokeWidth={2} />
              : <Bookmark size={18} color={colors.textSecondary} strokeWidth={2} />
            }
          </PressableScale>
        </View>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={discStyles.emptyState}>
      <View style={[discStyles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
        <Users size={40} color={colors.textTertiary} strokeWidth={1.5} />
      </View>
      <ThemedText variant="title3" style={[discStyles.emptyTitle, { color: colors.text }]}>
        No creators found
      </ThemedText>
      <ThemedText variant="subheadline" style={[discStyles.emptySubtitle, { color: colors.textSecondary }]}>
        {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Check back soon for new creators'}
      </ThemedText>
      {activeFilterCount > 0 && (
        <PressableScale
          onPress={handleClearFilters}
          style={[discStyles.clearBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Clear all filters"
        >
          <ThemedText variant="subheadline" style={[discStyles.clearBtnText, { color: colors.onPrimary }]}>
            Clear Filters
          </ThemedText>
        </PressableScale>
      )}
    </Animated.View>
  );

  const renderHeader = () => (
    <View>
      <View style={{ height: insets.top + Spacing.lg + 44 + Spacing.lg }} />
      <Animated.View entering={FadeInDown.duration(400).delay(100)} style={discStyles.titleRow}>
        <View>
          <ThemedText variant="title1" style={[discStyles.title, { color: colors.text }]} accessibilityRole="header">
            Discover Creators
          </ThemedText>
          <ThemedText variant="subheadline" style={[discStyles.subtitle, { color: colors.textSecondary }]}>
            {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''} available
          </ThemedText>
        </View>
        <View style={discStyles.titleActions}>
          {activeFilterCount > 0 && (
            <PressableScale
              scaleValue={0.9}
              onPress={handleClearFilters}
              style={[discStyles.clearChip, { backgroundColor: colors.cancelledLight, borderColor: colors.cancelled }]}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
            >
              <ThemedText variant="caption1" style={[discStyles.clearChipText, { color: colors.cancelled }]}>
                Clear
              </ThemedText>
            </PressableScale>
          )}
          <PressableScale
            scaleValue={0.9}
            onPress={handleOpenFilters}
            style={[
              discStyles.filterBtn,
              { backgroundColor: activeFilterCount > 0 ? colors.primary : colors.surface, borderColor: activeFilterCount > 0 ? colors.primary : colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
          >
            <SlidersHorizontal size={18} color={activeFilterCount > 0 ? colors.onPrimary : colors.text} strokeWidth={2} />
            {activeFilterCount > 0 && (
              <View style={[discStyles.filterBadge, { backgroundColor: colors.onPrimary }]}>
                <ThemedText variant="caption1" style={[discStyles.filterBadgeText, { color: colors.primary }]}>
                  {activeFilterCount}
                </ThemedText>
              </View>
            )}
          </PressableScale>
        </View>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(400).delay(150)}>
        <ListingFilterChips
          items={categories}
          selectedKey={selectedNiche}
          onSelect={setSelectedNiche}
        />
      </Animated.View>
    </View>
  );

  return (
    <View style={[discStyles.container, { backgroundColor: colors.background }]}>
      <Animated.FlatList
        data={filteredCreators}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[discStyles.listContent, { paddingBottom: insets.bottom + Layout.tabBarHeight + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      />

      {/* Fixed header bar */}
      <View style={discStyles.fixedHeader} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }, headerBgStyle]} />
        <Animated.View style={[discStyles.fixedHeaderBorder, { backgroundColor: colors.border }, headerBorderStyle]} />
        <View style={[discStyles.headerBar, { paddingTop: insets.top + Spacing.sm }]} pointerEvents="box-none">
          <View style={discStyles.headerLeft}>
            <Avatar uri={user?.avatar_url ?? null} name={user?.full_name ?? 'User'} size={40} />
            <View>
              <ThemedText variant="caption1" style={[{ color: colors.textSecondary }]}>Welcome back</ThemedText>
              <ThemedText variant="headline" style={[{ color: colors.text }]}>{user?.full_name ?? 'User'}</ThemedText>
            </View>
          </View>
          <PressableScale
            scaleValue={0.9}
            onPress={() => { haptics.tap(); router.push('/(profile)/notifications'); }}
            style={[discStyles.notifButton, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={22} color={colors.text} strokeWidth={2} />
            <View style={[discStyles.notifDot, { backgroundColor: colors.primary, borderColor: colors.surface }]} />
          </PressableScale>
        </View>
      </View>

      {/* Filter bottom sheet */}
      <BottomSheet
        ref={filterSheetRef}
        index={-1}
        snapPoints={filterSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={[{ backgroundColor: colors.border }]}
        backgroundStyle={{ backgroundColor: colors.surface }}
      >
        <BottomSheetScrollView contentContainerStyle={discStyles.sheetContent} showsVerticalScrollIndicator={false}>
          <ThemedText variant="title3" style={[discStyles.sheetTitle, { color: colors.text }]}>
            Filter Creators
          </ThemedText>

          <FilterRow label="Platform" items={platforms} selectedKey={selectedPlatform} onSelect={setSelectedPlatform} />
          <FilterRow label="Niche" items={categories} selectedKey={selectedNiche} onSelect={setSelectedNiche} />
          <FollowerSlider value={minFollowers} onChange={setMinFollowers} />
          <FilterRow
            label="Engagement Rate"
            items={engagementRanges.map((e) => ({ key: e.key, label: e.label }))}
            selectedKey={selectedEngagement}
            onSelect={setSelectedEngagement}
          />
          {languageOptions.length > 1 && (
            <FilterRow label="Language" items={languageOptions} selectedKey={selectedLanguage} onSelect={setSelectedLanguage} />
          )}
          {locationOptions.length > 1 && (
            <FilterRow label="Location" items={locationOptions} selectedKey={selectedLocation} onSelect={setSelectedLocation} />
          )}

          <View style={discStyles.sheetActions}>
            <PressableScale
              scaleValue={0.97}
              onPress={() => filterSheetRef.current?.close()}
              style={[discStyles.applyBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Apply filters"
            >
              <ThemedText variant="callout" style={[discStyles.applyBtnText, { color: colors.onPrimary }]}>
                Apply Filters
              </ThemedText>
            </PressableScale>
            {activeFilterCount > 0 && (
              <PressableScale
                scaleValue={0.97}
                onPress={() => { handleClearFilters(); filterSheetRef.current?.close(); }}
                style={[discStyles.resetBtn, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel="Reset filters"
              >
                <ThemedText variant="callout" style={[discStyles.resetBtnText, { color: colors.textSecondary }]}>
                  Reset All
                </ThemedText>
              </PressableScale>
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const discStyles = StyleSheet.create({
  container: { flex: 1 },
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  fixedHeaderBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  notifButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.title1 },
  subtitle: { ...Typography.subheadline, marginTop: Spacing.xs },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 10, fontWeight: '700' },
  clearChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearChipText: { fontWeight: '600', fontSize: 12 },
  cardWrapper: { paddingHorizontal: Spacing.lg },
  bookmarkBtn: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg + Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  listContent: { paddingTop: Spacing.sm },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xxl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  emptyTitle: { ...Typography.title3, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.subheadline, textAlign: 'center' },
  clearBtn: { marginTop: Spacing.xl, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: BorderRadius.full },
  clearBtnText: { fontWeight: '600' },
  sheetContent: { paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  sheetTitle: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl, fontWeight: '700' },
  sheetActions: { paddingHorizontal: Spacing.lg, gap: Spacing.md, marginTop: Spacing.lg },
  applyBtn: { paddingVertical: Spacing.md + 2, borderRadius: BorderRadius.lg, alignItems: 'center' },
  applyBtnText: { fontWeight: '600' },
  resetBtn: { paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  resetBtnText: { fontWeight: '500' },
});

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
  const [boostedIds, setBoostedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    api.listListingsWithBoost().then((ids) => setBoostedIds(new Set(ids)));
  }, []);
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
  const [businessTab, setBusinessTab] = useState<'dashboard' | 'discover'>('discover');

  if (isBusiness) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Segmented control */}
        <View style={{ paddingTop: insets.top + Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceSecondary, borderRadius: BorderRadius.md, padding: 3 }}>
            {(['discover', 'dashboard'] as const).map((tab) => (
              <PressableScale
                key={tab}
                scaleValue={0.97}
                onPress={() => { haptics.tap(); setBusinessTab(tab); }}
                style={{ flex: 1, paddingVertical: 8, borderRadius: BorderRadius.sm - 1, alignItems: 'center', backgroundColor: businessTab === tab ? colors.surface : 'transparent', ...(businessTab === tab ? Shadows.sm : {}) }}
                accessibilityRole="tab"
                accessibilityState={{ selected: businessTab === tab }}
                accessibilityLabel={tab === 'discover' ? 'Find Creators' : 'Dashboard'}
              >
                <ThemedText variant="subheadline" style={{ fontWeight: businessTab === tab ? '600' : '400', color: businessTab === tab ? colors.text : colors.textSecondary }}>
                  {tab === 'discover' ? 'Find Creators' : 'Dashboard'}
                </ThemedText>
              </PressableScale>
            ))}
          </View>
        </View>
        {businessTab === 'discover' ? (
          <BusinessDiscovery />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xl }}>
            <ThemedText variant="title2" style={{ color: colors.text, textAlign: 'center' }}>Business Dashboard</ThemedText>
            <ThemedText variant="body" style={{ color: colors.textSecondary, textAlign: 'center' }}>Manage listings, applications and bookings</ThemedText>
            <PressableScale
              scaleValue={0.96}
              onPress={() => { haptics.confirm(); router.push('/(business-dashboard)/'); }}
              style={{ backgroundColor: colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md }}
              accessibilityRole="button"
              accessibilityLabel="Go to full dashboard"
            >
              <ThemedText variant="headline" style={{ color: colors.onPrimary }}>Open Dashboard</ThemedText>
            </PressableScale>
          </View>
        )}
      </View>
    );
  }

  const filteredListings = useMemo(() => {
    const base = selectedCategory === 'all' ? listings : listings.filter((l) => l.category === selectedCategory);
    // Mark boosted, then sort boosted to top
    const tagged = base.map((l) => boostedIds.has(l.id) ? { ...l, is_boosted: true } : l);
    return [...tagged.filter((l) => l.is_boosted), ...tagged.filter((l) => !l.is_boosted)];
  }, [listings, selectedCategory, boostedIds]);

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
          Discover Opportunities
        </ThemedText>
        <ThemedText variant="subheadline" style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          {filteredListings.length} listings available
        </ThemedText>
      </Animated.View>

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
        Check back soon for new opportunities
      </ThemedText>
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

