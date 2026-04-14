import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  Calendar,
  MessageSquare,
  Star,
  CreditCard,
  Bell,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { mockNotifications, type AppNotification } from '../../lib/mockData';

const TYPE_ICON: Record<AppNotification['type'], any> = {
  booking: Calendar,
  message: MessageSquare,
  review: Star,
  payment: CreditCard,
  system: Bell,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const [items, setItems] = useState(mockNotifications);
  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const markAllRead = () => {
    haptics.light();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Pressable
          onPress={() => { haptics.light(); router.back(); }}
          style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
          hitSlop={8}
        >
          <ChevronLeft size={20} color={colors.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          Notifications {unread > 0 ? `(${unread})` : ''}
        </Text>
        <Pressable onPress={markAllRead} hitSlop={8}>
          <Text style={[styles.headerAction, { color: unread > 0 ? colors.primary : colors.textTertiary }]}>
            Mark all read
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 40, gap: Spacing.sm }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((n, i) => {
          const Icon = TYPE_ICON[n.type];
          return (
            <Animated.View
              key={n.id}
              entering={FadeInDown.duration(350).delay(i * 40)}
            >
              <Pressable
                onPress={() => {
                  haptics.light();
                  setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                }}
                style={[
                  styles.item,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                {n.avatar_url ? (
                  <Image source={{ uri: n.avatar_url }} style={styles.avatar} />
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
                    {relativeTime(n.created_at)} ago
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.headline, fontWeight: '700' },
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
