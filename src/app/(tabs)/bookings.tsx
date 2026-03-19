import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { CalendarCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { BookingCard } from '../../components/booking/BookingCard';
import {
  Typography,
  Spacing,
  BorderRadius,
  Springs,
  Layout,
} from '../../constants/theme';
import type { Booking, BookingStatus } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TabKey = 'active' | 'pending' | 'completed';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
];

function TabButton({
  label,
  selected,
  onPress,
  count,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  count: number;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, Springs.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, Springs.bouncy);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.tab,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
        animatedStyle,
      ]}
    >
      <Text
        style={[
          styles.tabText,
          { color: selected ? colors.onPrimary : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
      {count > 0 && (
        <View
          style={[
            styles.tabCount,
            {
              backgroundColor: selected
                ? 'rgba(255, 255, 255, 0.25)'
                : colors.surfaceSecondary,
            },
          ]}
        >
          <Text
            style={[
              styles.tabCountText,
              { color: selected ? colors.onPrimary : colors.textSecondary },
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

export default function BookingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings, user } = useStore();
  const [activeTab, setActiveTab] = useState<TabKey>('active');

  const filteredBookings = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return bookings.filter(
          (b) => b.status === 'active' || b.status === 'accepted'
        );
      case 'pending':
        return bookings.filter((b) => b.status === 'pending');
      case 'completed':
        return bookings.filter(
          (b) => b.status === 'completed' || b.status === 'cancelled'
        );
    }
  }, [bookings, activeTab]);

  const counts = useMemo(
    () => ({
      active: bookings.filter(
        (b) => b.status === 'active' || b.status === 'accepted'
      ).length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      completed: bookings.filter(
        (b) => b.status === 'completed' || b.status === 'cancelled'
      ).length,
    }),
    [bookings]
  );

  const handleBookingPress = useCallback((booking: Booking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(booking)/${booking.id}`);
  }, [router]);

  const renderItem = useCallback(
    ({ item, index }: { item: Booking; index: number }) => (
      <Animated.View
        entering={FadeInDown.duration(400).delay(index * 80)}
        style={styles.cardWrapper}
      >
        <BookingCard
          booking={item}
          onPress={handleBookingPress}
          userRole={user?.role ?? 'creator'}
        />
      </Animated.View>
    ),
    [handleBookingPress, user?.role]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <CalendarCheck
            size={40}
            color={colors.textTertiary}
            strokeWidth={1.5}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No {activeTab} bookings
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {activeTab === 'pending'
            ? 'When you apply to a listing, pending bookings will appear here'
            : activeTab === 'active'
              ? 'Your active collaborations will show up here'
              : 'Completed and cancelled bookings will appear here'}
        </Text>
        {activeTab !== 'completed' && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/search');
            }}
            style={[styles.emptyCta, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.emptyCtaText, { color: colors.onPrimary }]}>Browse Listings</Text>
          </Pressable>
        )}
      </View>
    ),
    [colors, activeTab, router]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={[styles.title, { color: colors.text }]}>Bookings</Text>
      </View>

      <View style={styles.tabsRow}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            label={tab.label}
            selected={activeTab === tab.key}
            onPress={() => setActiveTab(tab.key)}
            count={counts[tab.key]}
          />
        ))}
      </View>

      <FlatList
        data={filteredBookings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  title: {
    ...Typography.title1,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tabText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  tabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  tabCountText: {
    ...Typography.caption2,
    fontWeight: '700',
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
