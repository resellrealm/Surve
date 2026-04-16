import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Calendar,
  MessageSquare,
  Star,
  CreditCard,
  Bell,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useChime } from '../../hooks/useChime';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import { EmptyState } from '../../components/ui/EmptyState';
import { PressableScale } from '../../components/ui/PressableScale';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { AppNotification } from '../../lib/mockData';
import { useStore } from '../../lib/store';
import { formatRelative } from '../../lib/dateFormat';

const TYPE_ICON: Record<AppNotification['type'], any> = {
  booking: Calendar,
  message: MessageSquare,
  review: Star,
  payment: CreditCard,
  system: Bell,
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { playChime } = useChime();

  const items = useStore((s) => s.notifications);
  const markNotificationRead = useStore((s) => s.markNotificationRead);
  const storeMarkAllRead = useStore((s) => s.markAllNotificationsRead);
  const fetchNotifications = useStore((s) => s.fetchNotifications);

  const [refreshing, setRefreshing] = useState(false);
  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);
  const chimePlayedRef = useRef(false);

  // Play chime once on mount when there are unread notifications (simulates
  // the in-app sound that would accompany a push notification banner).
  useEffect(() => {
    if (!chimePlayedRef.current && unread > 0) {
      chimePlayedRef.current = true;
      playChime();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(async () => {
    haptics.tap();
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [haptics, fetchNotifications]);

  const markAllRead = useCallback(() => {
    haptics.tap();
    storeMarkAllRead();
  }, [haptics, storeMarkAllRead]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={`Notifications${unread > 0 ? ` (${unread})` : ''}`}
        right={
          <PressableScale onPress={markAllRead} hitSlop={8} scaleValue={0.92} accessibilityRole="button" accessibilityLabel="Mark all notifications as read">
            <Text style={[styles.headerAction, { color: unread > 0 ? colors.primary : colors.textTertiary }]}>
              Mark all read
            </Text>
          </PressableScale>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 40, gap: Spacing.sm }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {items.length === 0 && (
          <EmptyState
            icon="notifications-outline"
            title="No notifications yet"
            body="When you get booking updates, messages, or reviews, they'll show up here."
            ctaLabel="Browse listings"
            onPress={() => router.push('/(tabs)/search')}
          />
        )}
        {items.map((n, i) => {
          const Icon = TYPE_ICON[n.type];
          return (
            <Animated.View
              key={n.id}
              entering={FadeInDown.duration(350).delay(i * 40)}
            >
              <PressableScale
                onPress={() => {
                  haptics.tap();
                  if (!n.read) markNotificationRead(n.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${n.read ? '' : 'Unread '}notification: ${n.title}`}
                accessibilityHint={n.read ? undefined : 'Double tap to mark as read'}
                style={[
                  styles.item,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                {n.avatar_url ? (
                  <AdaptiveImage
                    source={{ uri: n.avatar_url }}
                    contentFit="cover"
                    circular
                    overlayOpacity={0.12}
                    style={styles.avatar}
                    accessibilityLabel={`${n.title} avatar`}
                  />
                ) : (
                  <View style={[styles.iconWrap, { backgroundColor: colors.activeLight }]}>
                    <Icon size={20} color={colors.primary} strokeWidth={2} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                    <Text style={[styles.itemTitle, { color: colors.text, fontWeight: n.read ? '600' : '700' }]} numberOfLines={1}>
                      {n.title}
                    </Text>
                    {!n.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.itemBody, { color: colors.textSecondary }]} numberOfLines={2}>
                    {n.body}
                  </Text>
                  <Text style={[styles.itemTime, { color: colors.textTertiary }]}>
                    {formatRelative(n.created_at)}
                  </Text>
                </View>
              </PressableScale>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerAction: { ...Typography.footnote, fontWeight: '700' },

  item: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  itemTitle: { ...Typography.subheadline, flexShrink: 1 },
  itemBody: { ...Typography.footnote, marginTop: 2, lineHeight: 18 },
  itemTime: { ...Typography.caption1, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
