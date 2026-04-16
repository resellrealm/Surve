import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useReducedMotion,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, ChevronDown } from 'lucide-react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PressableScale } from '../../components/ui/PressableScale';
import { EmptyState } from '../../components/ui/EmptyState';
import { ReviewCard } from '../../components/review/ReviewCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import {
  BorderRadius,
  Shadows,
  Spacing,
  Springs,
  Typography,
} from '../../constants/theme';
import * as api from '../../lib/api';
import type { Review } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type StarFilter = 'all' | 1 | 2 | 3 | 4 | 5 | 'photos';
type SortKey = 'recent' | 'highest' | 'lowest';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAR_FILTERS: { key: StarFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 5, label: '5★' },
  { key: 4, label: '4★' },
  { key: 3, label: '3★' },
  { key: 2, label: '2★' },
  { key: 1, label: '1★' },
  { key: 'photos', label: 'With photos' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Most recent' },
  { key: 'highest', label: 'Highest rated' },
  { key: 'lowest', label: 'Lowest rated' },
];

// ─── Aggregate helpers ────────────────────────────────────────────────────────

function computeAggregate(reviews: Review[]) {
  if (reviews.length === 0) {
    return { avg: 0, total: 0, breakdown: [0, 0, 0, 0, 0], tags: [] as string[] };
  }
  const breakdown = [0, 0, 0, 0, 0]; // index 0 = 1★ … 4 = 5★
  let sum = 0;
  const tagCount: Record<string, number> = {};

  for (const r of reviews) {
    sum += r.rating;
    const idx = Math.max(0, Math.min(4, Math.round(r.rating) - 1));
    breakdown[idx]++;
    if (Array.isArray(r.tags)) {
      for (const t of r.tags) {
        tagCount[t] = (tagCount[t] ?? 0) + 1;
      }
    }
  }

  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  return {
    avg: sum / reviews.length,
    total: reviews.length,
    breakdown,
    tags: topTags,
  };
}

// ─── Star display ─────────────────────────────────────────────────────────────

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color={colors.rating}
          fill={i <= Math.round(rating) ? colors.rating : 'transparent'}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );
}

// ─── Breakdown bar ────────────────────────────────────────────────────────────

function BreakdownBar({ star, count, total }: { star: number; count: number; total: number }) {
  const { colors } = useTheme();
  const pct = total === 0 ? 0 : count / total;
  const width = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      width.value = pct;
    } else {
      width.value = withSpring(pct, Springs.gentle);
    }
  }, [pct, reducedMotion, width]);

  const barStyle = useAnimatedStyle(() => ({ flex: width.value }));

  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{star}★</Text>
      <View style={[styles.barTrack, { backgroundColor: colors.surfaceSecondary }]}>
        {pct > 0 && (
          <Animated.View style={[styles.barFill, { backgroundColor: colors.rating }, barStyle]} />
        )}
      </View>
      <Text style={[styles.barCount, { color: colors.textTertiary }]}>{count}</Text>
    </View>
  );
}

// ─── Aggregate header ─────────────────────────────────────────────────────────

function AggregateHeader({ reviews }: { reviews: Review[] }) {
  const { colors } = useTheme();
  const { avg, total, breakdown, tags } = useMemo(() => computeAggregate(reviews), [reviews]);

  if (total === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(320)}
      style={[styles.aggregateCard, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadows.sm }]}
    >
      {/* Score */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreLeft}>
          <Text style={[styles.avgNumber, { color: colors.text }]}>{avg.toFixed(1)}</Text>
          <StarRow rating={avg} size={18} />
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
            {total} {total === 1 ? 'review' : 'reviews'}
          </Text>
        </View>
        <View style={styles.barsWrap}>
          {[5, 4, 3, 2, 1].map((star) => (
            <BreakdownBar
              key={star}
              star={star}
              count={breakdown[star - 1]}
              total={total}
            />
          ))}
        </View>
      </View>

      {/* Top tags */}
      {tags.length > 0 && (
        <View>
          <Text style={[styles.tagsHeading, { color: colors.textSecondary }]}>Most mentioned</Text>
          <View style={styles.tagsWrap}>
            {tags.map((tag) => (
              <View
                key={tag}
                style={[styles.tagChip, { backgroundColor: colors.activeLight, borderColor: colors.active }]}
              >
                <Text style={[styles.tagText, { color: colors.active }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Sort picker ──────────────────────────────────────────────────────────────

function SortPicker({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [open, setOpen] = useState(false);
  const label = SORT_OPTIONS.find((o) => o.key === value)?.label ?? 'Sort';

  const toggle = useCallback(() => {
    haptics.tap();
    setOpen((v) => !v);
  }, [haptics]);

  const pick = useCallback(
    (k: SortKey) => {
      haptics.select();
      onChange(k);
      setOpen(false);
    },
    [haptics, onChange],
  );

  return (
    <View style={styles.sortWrap}>
      <PressableScale
        scaleValue={0.96}
        onPress={toggle}
        style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadows.sm }]}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${label}`}
        hitSlop={8}
      >
        <Text style={[styles.sortLabel, { color: colors.text }]}>{label}</Text>
        <ChevronDown size={14} color={colors.textSecondary} strokeWidth={2} />
      </PressableScale>

      {open && (
        <Animated.View
          entering={FadeInDown.duration(180)}
          style={[styles.sortDropdown, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadows.md }]}
        >
          {SORT_OPTIONS.map((opt) => (
            <PressableScale
              key={opt.key}
              scaleValue={0.97}
              onPress={() => pick(opt.key)}
              style={[styles.sortOption, opt.key === value && { backgroundColor: colors.activeLight }]}
              accessibilityRole="menuitem"
              hitSlop={4}
            >
              <Text style={[styles.sortOptionText, { color: opt.key === value ? colors.primary : colors.text }]}>
                {opt.label}
              </Text>
            </PressableScale>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handlePress = useCallback(() => {
    haptics.select();
    onPress();
  }, [haptics, onPress]);

  return (
    <PressableScale
      scaleValue={0.95}
      onPress={handlePress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border },
        Shadows.sm,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={6}
    >
      <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.text }]}>
        {label}
      </Text>
    </PressableScale>
  );
}

// ─── Loading skeletons ────────────────────────────────────────────────────────

function ReviewSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.skeletonHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ gap: Spacing.xs, flex: 1 }}>
          <Skeleton width={120} height={13} borderRadius={6} />
          <Skeleton width={80} height={11} borderRadius={6} />
        </View>
        <Skeleton width={70} height={13} borderRadius={6} />
      </View>
      <Skeleton width="100%" height={13} borderRadius={6} />
      <Skeleton width="80%" height={13} borderRadius={6} />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ReviewsListScreen() {
  const { targetId } = useLocalSearchParams<{ targetId: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const currentUserId = useStore((s) => s.user?.id);
  const isOwner = !!currentUserId && currentUserId === targetId;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState<StarFilter>('all');
  const [sort, setSort] = useState<SortKey>('recent');

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    api.getReviews(targetId)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [targetId]);

  const filtered = useMemo(() => {
    let list = [...reviews];

    if (starFilter === 'photos') {
      list = list.filter((r) => Array.isArray(r.photos) && r.photos.length > 0);
    } else if (starFilter !== 'all') {
      list = list.filter((r) => Math.round(r.rating) === starFilter);
    }

    if (sort === 'recent') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === 'highest') {
      list.sort((a, b) => b.rating - a.rating);
    } else {
      list.sort((a, b) => a.rating - b.rating);
    }

    return list;
  }, [reviews, starFilter, sort]);

  const handleFilterPress = useCallback((key: StarFilter) => {
    setStarFilter(key);
  }, []);

  const handleSortChange = useCallback((k: SortKey) => {
    setSort(k);
  }, []);

  const renderHeader = useCallback(() => (
    <View>
      {/* Aggregate */}
      {!loading && <AggregateHeader reviews={reviews} />}

      {/* Controls row */}
      <View style={styles.controlsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          style={{ flex: 1 }}
        >
          {STAR_FILTERS.map((f) => (
            <FilterChip
              key={String(f.key)}
              label={f.label}
              active={starFilter === f.key}
              onPress={() => handleFilterPress(f.key)}
            />
          ))}
        </ScrollView>
        <SortPicker value={sort} onChange={handleSortChange} />
      </View>
    </View>
  ), [loading, reviews, starFilter, sort, handleFilterPress, handleSortChange]);

  const renderItem = useCallback(({ item, index }: { item: Review; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(280)}
      style={styles.cardWrap}
    >
      <ReviewCard
        review={item}
        onRespond={isOwner ? () => router.push(`/(review)/respond?reviewId=${item.id}`) : undefined}
      />
    </Animated.View>
  ), [isOwner, router]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => <ReviewSkeleton key={i} />)}
        </View>
      );
    }
    return (
      <EmptyState
        icon="star-outline"
        title="No reviews yet"
        body={
          starFilter !== 'all'
            ? 'No reviews match this filter.'
            : 'Be the first to leave a review.'
        }
        tint="muted"
      />
    );
  }, [loading, starFilter]);

  const keyExtractor = useCallback((item: Review) => item.id, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Reviews" />

      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={5}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // List
  listContent: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  cardWrap: {
    // intentionally empty — ReviewCard handles its own style
  },

  // Aggregate card
  aggregateCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  scoreLeft: {
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 72,
  },
  avgNumber: {
    ...Typography.largeTitle,
    lineHeight: 40,
  },
  totalLabel: {
    ...Typography.footnote,
    textAlign: 'center',
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },

  // Breakdown bars
  barsWrap: {
    flex: 1,
    gap: Spacing.xs,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 16,
  },
  barLabel: {
    ...Typography.caption1,
    width: 22,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  barFill: {
    borderRadius: BorderRadius.full,
  },
  barCount: {
    ...Typography.caption1,
    width: 22,
  },

  // Tags
  tagsHeading: {
    ...Typography.caption1,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tagChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tagText: {
    ...Typography.caption1,
    fontWeight: '500',
  },

  // Controls
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  filtersContent: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    ...Typography.footnote,
    fontWeight: '600',
  },

  // Sort
  sortWrap: {
    position: 'relative',
    zIndex: 10,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 36,
  },
  sortLabel: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  sortDropdown: {
    position: 'absolute',
    top: 42,
    right: 0,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 150,
  },
  sortOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  sortOptionText: {
    ...Typography.subheadline,
    fontWeight: '500',
  },

  // Skeletons
  skeletonList: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  skeletonCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
});
