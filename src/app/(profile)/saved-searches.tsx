import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { Trash2, Search as SearchIcon } from 'lucide-react-native';
import { formatCurrency } from '../../lib/currency';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import {
  deleteSavedSearch,
  getSavedSearches,
  type SavedSearch,
} from '../../lib/api';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { PressableScale } from '../../components/ui/PressableScale';

function SavedSearchCard({
  item,
  index,
  onPress,
  onDelete,
}: {
  item: SavedSearch;
  index: number;
  onPress: (s: SavedSearch) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 40)}>
      <PressableScale
        onPress={() => onPress(item)}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Run saved search: ${item.name}`}
        accessibilityHint="Double tap to run this saved search"
      >
        <View
          style={[styles.iconWrap, { backgroundColor: colors.activeLight }]}
        >
          <SearchIcon size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text
            style={[styles.summary, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {summarise(item.filters)}
          </Text>
        </View>
        <PressableScale
          scaleValue={0.9}
          onPress={() => { haptics.warning(); onDelete(item.id, item.name); }}
          hitSlop={12}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Delete saved search: ${item.name}`}
        >
          <Trash2 size={18} color={colors.textTertiary} strokeWidth={2} />
        </PressableScale>
      </PressableScale>
    </Animated.View>
  );
}

export default function SavedSearchesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const user = useStore((s) => s.user);

  const [searches, setSearches] = useState<SavedSearch[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoadError(null);
      const data = await getSavedSearches(user.id);
      setSearches(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
      setSearches(null);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(
    (id: string, name: string) => {
      Alert.alert('Delete saved search?', `Remove "${name}" from your saved searches.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            haptics.warning();
            const ok = await deleteSavedSearch(id);
            if (ok) {
              haptics.success();
              load();
            } else {
              haptics.error();
            }
          },
        },
      ]);
    },
    [haptics, load]
  );

  const applySearch = useCallback(
    (s: SavedSearch) => {
      haptics.tap();
      router.push({
        pathname: '/(tabs)/search',
        params: { saved: JSON.stringify(s.filters) },
      });
    },
    [haptics, router]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Saved searches" />
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.huge,
          gap: Spacing.md,
        }}
      >
        {searches === null && !loadError && (
          <View style={{ gap: Spacing.md }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={68} width="100%" />
            ))}
          </View>
        )}

        {loadError && (
          <ErrorState
            message="We couldn't load your saved searches. Please try again."
            onRetry={load}
          />
        )}

        {searches !== null && searches.length === 0 && (
          <EmptyState
            icon="bookmark-outline"
            title="No saved searches"
            body="Save the filters you use most often from the search tab and jump back with one tap."
            ctaLabel="Go to search"
            onPress={() => router.push('/(tabs)/search')}
          />
        )}

        {searches?.map((s, i) => (
          <SavedSearchCard
            key={s.id}
            item={s}
            index={i}
            onPress={applySearch}
            onDelete={handleDelete}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function summarise(f: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof f.query === 'string' && f.query) parts.push(`"${f.query}"`);
  if (typeof f.category === 'string' && f.category && f.category !== 'all')
    parts.push(String(f.category));
  if (typeof f.platform === 'string' && f.platform && f.platform !== 'all')
    parts.push(String(f.platform));
  if (typeof f.followerRange === 'string' && f.followerRange && f.followerRange !== 'all')
    parts.push(String(f.followerRange));
  if (typeof f.engagement === 'string' && f.engagement && f.engagement !== 'all')
    parts.push(String(f.engagement));
  if (typeof f.mode === 'string' && f.mode === 'creators') parts.push('Creators');
  if (typeof f.minPay === 'number') parts.push(`${formatCurrency(f.minPay)}+`);
  return parts.length ? parts.join(' · ') : 'All listings';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...Typography.subheadline, fontWeight: '600' },
  summary: { ...Typography.footnote, marginTop: 2 },
  deleteBtn: {
    padding: Spacing.sm,
  },
});
