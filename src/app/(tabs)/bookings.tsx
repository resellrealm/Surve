import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { EmptyState } from '../../components/ui/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { AlertTriangle, RotateCcw, CheckSquare, X, CheckCircle, XCircle, MessageCircle, Handshake, MapPin, DollarSign } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useHaptics } from '../../hooks/useHaptics';
import { toast } from '../../lib/toast';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import * as api from '../../lib/api';
import { BookingCard } from '../../components/booking/BookingCard';
import { SwipeableRow, type SwipeAction } from '../../components/ui/SwipeableRow';
import { PressableScale } from '../../components/ui/PressableScale';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
} from '../../constants/theme';
import type { Booking, BookingStatus, Invite, InviteStatus } from '../../types';
import { formatDateShort } from '../../lib/dateFormat';

type TabKey = 'invites' | 'active' | 'past';

const BOOKING_TABS: { key: TabKey; label: string }[] = [
  { key: 'invites', label: 'Invites' },
  { key: 'active', label: 'Active' },
  { key: 'past', label: 'Past' },
];

function InviteCard({
  invite,
  onAccept,
  onDecline,
  acting,
}: {
  invite: Invite;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  acting: boolean;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const isPending = invite.status === 'pending';

  const statusColor =
    invite.status === 'accepted'
      ? colors.success
      : invite.status === 'declined'
      ? colors.error
      : colors.warning;
  const statusBg =
    invite.status === 'accepted'
      ? colors.successLight
      : invite.status === 'declined'
      ? colors.cancelledLight
      : colors.pendingLight;
  const statusLabel =
    invite.status === 'accepted' ? 'Accepted' : invite.status === 'declined' ? 'Declined' : 'Pending';

  return (
    <Animated.View
      entering={FadeInDown.duration(350)}
      style={[styles.inviteCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
    >
      {/* Header */}
      <View style={styles.inviteCardHeader}>
        <Avatar
          uri={invite.business?.logo_url ?? invite.business?.image_url ?? null}
          name={invite.business?.business_name ?? 'Business'}
          size={44}
        />
        <View style={styles.inviteCardInfo}>
          <Text style={[styles.inviteBusinessName, { color: colors.text }]} numberOfLines={1}>
            {invite.business?.business_name ?? 'Business'}
          </Text>
          <Text style={[styles.inviteListingTitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {invite.listing?.title ?? 'Listing'}
          </Text>
        </View>
        <View style={[styles.inviteStatusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.inviteStatusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Meta */}
      {invite.listing && (
        <View style={styles.inviteMeta}>
          <View style={styles.inviteMetaItem}>
            <DollarSign size={13} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.inviteMetaText, { color: colors.textSecondary }]}>
              ${invite.listing.pay_min}–${invite.listing.pay_max}
            </Text>
          </View>
          <View style={styles.inviteMetaItem}>
            <MapPin size={13} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.inviteMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
              {invite.listing.location}
            </Text>
          </View>
        </View>
      )}

      {/* Message */}
      {!!invite.message && (
        <Text style={[styles.inviteMessage, { color: colors.textSecondary }]} numberOfLines={3}>
          "{invite.message}"
        </Text>
      )}

      {/* Date */}
      <Text style={[styles.inviteDate, { color: colors.textTertiary }]}>
        Invited {formatDateShort(invite.created_at)}
      </Text>

      {/* Actions */}
      {isPending && (
        <View style={styles.inviteActions}>
          <PressableScale
            onPress={() => { haptics.tap(); onDecline(invite.id); }}
            disabled={acting}
            scaleValue={0.96}
            accessibilityRole="button"
            accessibilityLabel="Decline invite"
            style={[
              styles.inviteActionBtn,
              { borderColor: colors.border, backgroundColor: colors.surface, opacity: acting ? 0.5 : 1 },
            ]}
          >
            <XCircle size={16} color={colors.error} strokeWidth={2} />
            <Text style={[styles.inviteActionText, { color: colors.error }]}>Decline</Text>
          </PressableScale>
          <PressableScale
            onPress={() => { haptics.confirm(); onAccept(invite.id); }}
            disabled={acting}
            scaleValue={0.96}
            accessibilityRole="button"
            accessibilityLabel="Accept invite"
            style={[
              styles.inviteActionBtn,
              { borderColor: colors.primary, backgroundColor: colors.primary, opacity: acting ? 0.5 : 1 },
            ]}
          >
            <CheckCircle size={16} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.inviteActionText, { color: colors.onPrimary }]}>Accept</Text>
          </PressableScale>
        </View>
      )}
    </Animated.View>
  );
}

function BookingsSkeleton() {
  return (
    <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ gap: Spacing.sm, padding: Spacing.lg, borderRadius: BorderRadius.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width={160} height={18} />
            <Skeleton width={70} height={24} borderRadius={BorderRadius.full} />
          </View>
          <Skeleton width="80%" height={14} />
          <Skeleton width="50%" height={14} />
        </View>
      ))}
    </View>
  );
}

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
  const haptics = useHaptics();

  const handlePress = useCallback(() => {
    haptics.select();
    onPress();
  }, [onPress, haptics]);

  return (
    <PressableScale
      scaleValue={0.95}
      onPress={handlePress}
      style={[
        styles.tab,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} bookings, ${count} items`}
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
    </PressableScale>
  );
}

function BatchActionBar({
  selectedCount,
  onComplete,
  onReject,
  onCancel,
  onSelectAll,
  totalCount,
  loading,
  activeTab,
}: {
  selectedCount: number;
  onComplete: () => void;
  onReject: () => void;
  onCancel: () => void;
  onSelectAll: () => void;
  totalCount: number;
  loading: boolean;
  activeTab: TabKey;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  const allSelected = selectedCount === totalCount && totalCount > 0;

  const handleSelectAll = useCallback(() => {
    haptics.select();
    onSelectAll();
  }, [haptics, onSelectAll]);

  const handleComplete = useCallback(() => {
    haptics.confirm();
    onComplete();
  }, [haptics, onComplete]);

  const handleReject = useCallback(() => {
    haptics.warning();
    onReject();
  }, [haptics, onReject]);

  const handleCancel = useCallback(() => {
    haptics.tap();
    onCancel();
  }, [haptics, onCancel]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.batchBar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + Spacing.sm,
        },
      ]}
    >
      <View style={styles.batchBarTop}>
        <PressableScale
          scaleValue={0.9}
          onPress={handleCancel}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Exit selection mode"
        >
          <X size={22} color={colors.textSecondary} strokeWidth={2} />
        </PressableScale>
        <Text style={[styles.batchCount, { color: colors.text }]}>
          {selectedCount} selected
        </Text>
        <PressableScale
          scaleValue={0.95}
          onPress={handleSelectAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={allSelected ? 'Deselect all' : 'Select all'}
        >
          <Text style={[styles.selectAllText, { color: colors.primary }]}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </Text>
        </PressableScale>
      </View>

      <View style={styles.batchActions}>
        {activeTab !== 'past' && (
          <PressableScale
            onPress={handleComplete}
            disabled={selectedCount === 0 || loading}
            scaleValue={0.95}
            style={[
              styles.batchButton,
              {
                backgroundColor: colors.success,
                opacity: selectedCount === 0 || loading ? 0.5 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${selectedCount} bookings as completed`}
          >
            <CheckCircle size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.batchButtonText}>Complete</Text>
          </PressableScale>
        )}
        {activeTab !== 'past' && (
          <PressableScale
            onPress={handleReject}
            disabled={selectedCount === 0 || loading}
            scaleValue={0.95}
            style={[
              styles.batchButton,
              {
                backgroundColor: colors.error,
                opacity: selectedCount === 0 || loading ? 0.5 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Cancel ${selectedCount} bookings`}
          >
            <XCircle size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.batchButtonText}>Cancel</Text>
          </PressableScale>
        )}
      </View>
    </Animated.View>
  );
}

export default function BookingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { bookings, user, bookingsLoading, bookingsError, fetchBookings, updateBooking } = useStore();
  const [activeTab, setActiveTab] = useState<TabKey>('invites');
  const [refreshing, setRefreshing] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [invites, setInvites] = useState<import('../../types').Invite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [actingInviteId, setActingInviteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    if (user.role !== 'creator') return;
    setInvitesLoading(true);
    const fetchInvites = async () => {
      const profile = await api.getCreators().then((cs) => cs.find((c) => c.user_id === user.id));
      if (profile) {
        const list = await api.getCreatorInvites(profile.id);
        setInvites(list);
      }
      setInvitesLoading(false);
    };
    fetchInvites();
  }, [user?.id, user?.role]);

  const handleRefresh = useCallback(async () => {
    haptics.tap();
    setRefreshing(true);
    try {
      await fetchBookings();
    } finally {
      setRefreshing(false);
    }
  }, [fetchBookings, haptics]);

  const filteredBookings = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return bookings.filter(
          (b) => b.status === 'active' || b.status === 'accepted' || b.status === 'pending'
        );
      case 'past':
        return bookings.filter(
          (b) => b.status === 'completed' || b.status === 'cancelled'
        );
      default:
        return [];
    }
  }, [bookings, activeTab]);

  const counts = useMemo(
    () => ({
      active: bookings.filter(
        (b) => b.status === 'active' || b.status === 'accepted' || b.status === 'pending'
      ).length,
      past: bookings.filter(
        (b) => b.status === 'completed' || b.status === 'cancelled'
      ).length,
    }),
    [bookings]
  );

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    exitSelectMode();
  }, [exitSelectMode]);

  const toggleSelectMode = useCallback(() => {
    haptics.confirm();
    if (selectMode) {
      exitSelectMode();
    } else {
      setSelectMode(true);
    }
  }, [selectMode, exitSelectMode, haptics]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = filteredBookings.map((b) => b.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [filteredBookings, selectedIds]);

  const performBatchAction = useCallback(async (status: BookingStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const label = status === 'completed' ? 'complete' : 'cancel';
    const count = ids.length;

    Alert.alert(
      `${label.charAt(0).toUpperCase() + label.slice(1)} ${count} booking${count > 1 ? 's' : ''}?`,
      `This will mark ${count} booking${count > 1 ? 's' : ''} as ${status}.`,
      [
        { text: 'Go back', style: 'cancel' },
        {
          text: label.charAt(0).toUpperCase() + label.slice(1),
          style: status === 'cancelled' ? 'destructive' : 'default',
          onPress: async () => {
            setBatchLoading(true);
            try {
              const updates: { status: BookingStatus; completed_at?: string } = { status };
              if (status === 'completed') {
                updates.completed_at = new Date().toISOString();
              }
              const ok = await api.batchUpdateBookings(ids, updates);
              if (ok) {
                ids.forEach((id) => updateBooking(id, updates));
                haptics.success();
              } else {
                haptics.error();
                toast.error('Some bookings could not be updated. Please try again.');
              }
            } catch {
              haptics.error();
              toast.error('Something went wrong. Please try again.');
            } finally {
              setBatchLoading(false);
              exitSelectMode();
            }
          },
        },
      ]
    );
  }, [selectedIds, updateBooking, haptics, exitSelectMode]);

  const handleBatchComplete = useCallback(() => {
    performBatchAction('completed');
  }, [performBatchAction]);

  const handleBatchReject = useCallback(() => {
    performBatchAction('cancelled');
  }, [performBatchAction]);

  const handleBookingPress = useCallback((booking: Booking) => {
    haptics.tap();
    router.push(`/(booking)/${booking.id}`);
  }, [router, haptics]);

  const handleLongPress = useCallback((booking: Booking) => {
    if (selectMode) return;
    haptics.heavy();
    setSelectMode(true);
    setSelectedIds(new Set([booking.id]));
  }, [selectMode, haptics]);

  const handleCancelBooking = useCallback((booking: Booking) => {
    if (booking.status === 'completed' || booking.status === 'cancelled') return;
    Alert.alert(
      'Cancel booking?',
      `Cancel your booking for "${booking.listing.title}"?`,
      [
        { text: 'Go back', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            try {
              const ok = await api.batchUpdateBookings([booking.id], { status: 'cancelled' });
              if (ok) {
                updateBooking(booking.id, { status: 'cancelled' });
                haptics.success();
                toast.success('Booking cancelled');
              } else {
                haptics.error();
                toast.error('Could not cancel booking');
              }
            } catch {
              haptics.error();
              toast.error('Something went wrong');
            }
          },
        },
      ],
    );
  }, [updateBooking, haptics]);

  const handleMessageFromBooking = useCallback((booking: Booking) => {
    const conversations = useStore.getState().conversations;
    const match = conversations.find(
      (c) =>
        c.participant_ids.includes(booking.creator_id) ||
        c.participant_ids.includes(booking.business_id),
    );
    if (match) {
      router.push(`/(chat)/${match.id}`);
    } else {
      router.push('/(tabs)/messages');
    }
  }, [router]);

  const getSwipeActions = useCallback((booking: Booking) => {
    const canCancel = booking.status !== 'completed' && booking.status !== 'cancelled';
    const rightActions: SwipeAction[] = canCancel
      ? [
          {
            key: 'cancel',
            label: 'Cancel',
            icon: <XCircle size={22} color="#FFFFFF" strokeWidth={2} />,
            color: Colors.light.error,
            onPress: () => handleCancelBooking(booking),
          },
        ]
      : [];
    const leftActions: SwipeAction[] = [
      {
        key: 'message',
        label: 'Message',
        icon: <MessageCircle size={22} color="#FFFFFF" strokeWidth={2} />,
        color: Colors.light.primary,
        onPress: () => handleMessageFromBooking(booking),
      },
    ];
    return { leftActions, rightActions };
  }, [handleCancelBooking, handleMessageFromBooking]);

  const renderItem = useCallback(
    ({ item, index }: { item: Booking; index: number }) => {
      const { leftActions, rightActions } = getSwipeActions(item);
      return (
        <Animated.View
          entering={FadeInDown.duration(400).delay(index * 80)}
          style={styles.cardWrapper}
        >
          <SwipeableRow
            leftActions={leftActions}
            rightActions={rightActions}
            enabled={!selectMode}
          >
            <PressableScale
              onLongPress={() => handleLongPress(item)}
              delayLongPress={400}
              style={{ flex: 1 }}
              accessibilityRole="button"
              accessibilityLabel={`Booking with ${item.listing?.title ?? 'unknown listing'}`}
              accessibilityHint="Long press to select multiple bookings. Swipe for quick actions."
            >
              <BookingCard
                booking={item}
                onPress={selectMode ? undefined : handleBookingPress}
                userRole={user?.role ?? 'creator'}
                selectable={selectMode}
                selected={selectedIds.has(item.id)}
                onToggleSelect={selectMode ? toggleSelectItem : undefined}
              />
            </PressableScale>
          </SwipeableRow>
        </Animated.View>
      );
    },
    [handleBookingPress, handleLongPress, user?.role, selectMode, selectedIds, toggleSelectItem, getSwipeActions]
  );

  const renderEmpty = useCallback(
    () => (
      <EmptyState
        icon={
          activeTab === 'past'
            ? 'checkmark-done-outline'
            : activeTab === 'invites'
              ? 'mail-outline'
              : 'calendar-outline'
        }
        title={
          activeTab === 'active'
            ? 'No active bookings'
            : activeTab === 'invites'
              ? 'No invites yet'
              : 'No past bookings yet'
        }
        body={
          activeTab === 'past'
            ? "Completed work shows up here — it's your history you can be proud of."
            : activeTab === 'invites'
              ? 'Businesses will invite you to collabs here.'
              : 'Browse open listings and apply to the ones that fit.'
        }
        ctaLabel={activeTab !== 'past' ? 'Browse listings' : undefined}
        onPress={activeTab !== 'past' ? () => router.push('/(tabs)/search') : undefined}
      />
    ),
    [activeTab, router]
  );

  if (bookingsLoading && bookings.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Bookings</Text>
        </View>
        <View style={styles.tabsRow}>
          {BOOKING_TABS.map((tab) => (
            <Skeleton key={tab.key} width={90} height={36} borderRadius={BorderRadius.full} />
          ))}
        </View>
        <BookingsSkeleton />
      </View>
    );
  }

  if (bookingsError && bookings.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} accessibilityRole="alert">
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Bookings</Text>
        </View>
        <View style={styles.errorState}>
          <View style={[styles.errorIcon, { backgroundColor: colors.cancelledLight }]}>
            <AlertTriangle size={40} color={colors.error} strokeWidth={1.5} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Couldn't load bookings
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            {bookingsError}
          </Text>
          <PressableScale
            onPress={() => {
              haptics.tap();
              fetchBookings();
            }}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading bookings"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>Try Again</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  const canBatch = activeTab !== 'past' && filteredBookings.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Bookings</Text>
          {canBatch && (
            <PressableScale
              scaleValue={0.95}
              onPress={toggleSelectMode}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={selectMode ? 'Exit selection mode' : 'Enter selection mode'}
              style={[
                styles.selectButton,
                {
                  backgroundColor: selectMode ? colors.primary : colors.surfaceSecondary,
                },
              ]}
            >
              <CheckSquare
                size={16}
                color={selectMode ? colors.onPrimary : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.selectButtonText,
                  { color: selectMode ? colors.onPrimary : colors.textSecondary },
                ]}
              >
                {selectMode ? 'Done' : 'Select'}
              </Text>
            </PressableScale>
          )}
        </View>
      </View>

      <View style={styles.tabsRow} accessibilityRole="tablist">
        {BOOKING_TABS.map((tab) => (
          <TabButton
            key={tab.key}
            label={tab.label}
            selected={activeTab === tab.key}
            onPress={() => handleTabChange(tab.key)}
            count={tab.key === 'invites' ? invites.filter((i) => i.status === 'pending').length : (counts as any)[tab.key]}
          />
        ))}
      </View>

      {activeTab === 'invites' ? (
        <FlatList
          data={invites}
          renderItem={({ item }) => (
            <InviteCard
              invite={item}
              onAccept={async (id) => {
                setActingInviteId(id);
                const { error } = await (api as any).supabase.from('invites').update({ status: 'accepted' }).eq('id', id);
                if (!error) setInvites((prev) => prev.map((i) => i.id === id ? { ...i, status: 'accepted' as any } : i));
                setActingInviteId(null);
              }}
              onDecline={async (id) => {
                setActingInviteId(id);
                const { error } = await (api as any).supabase.from('invites').update({ status: 'declined' }).eq('id', id);
                if (!error) setInvites((prev) => prev.map((i) => i.id === id ? { ...i, status: 'declined' as any } : i));
                setActingInviteId(null);
              }}
              acting={actingInviteId === item.id}
            />
          )}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={invitesLoading} onRefresh={() => {}} tintColor={colors.primary} />}
        />
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            selectMode && { paddingBottom: Layout.tabBarHeight + 140 },
          ]}
          showsVerticalScrollIndicator={false}
          extraData={selectedIds}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {selectMode && (
        <BatchActionBar
          selectedCount={selectedIds.size}
          onComplete={handleBatchComplete}
          onReject={handleBatchReject}
          onCancel={exitSelectMode}
          onSelectAll={handleSelectAll}
          totalCount={filteredBookings.length}
          loading={batchLoading}
          activeTab={activeTab}
        />
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Typography.title1,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  selectButtonText: {
    ...Typography.footnote,
    fontWeight: '600',
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
  errorState: {
    alignItems: 'center',
    paddingTop: 60,
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
  batchBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadows.lg,
  },
  batchBarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  batchCount: {
    ...Typography.headline,
  },
  selectAllText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  batchActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  batchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minHeight: 48,
  },
  batchButtonText: {
    ...Typography.subheadline,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── InviteCard styles ──────────────────────────────────────────────────────
  inviteCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  inviteCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  inviteCardInfo: { flex: 1 },
  inviteBusinessName: { ...Typography.subheadline, fontWeight: '600' },
  inviteListingTitle: { ...Typography.caption1, marginTop: 2 },
  inviteStatusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  inviteStatusText: { ...Typography.caption2, fontWeight: '600' },
  inviteMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  inviteMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inviteMetaText: { ...Typography.caption1 },
  inviteMessage: { ...Typography.footnote, marginTop: Spacing.sm, fontStyle: 'italic', lineHeight: 18 },
  inviteDate: { ...Typography.caption2, marginTop: Spacing.xs },
  inviteActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  inviteActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, minHeight: 44 },
  inviteActionText: { ...Typography.subheadline, fontWeight: '600' },
});
