import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { EmptyState } from '../../components/ui/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { AlertTriangle, RotateCcw, Archive, BellOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useHaptics } from '../../hooks/useHaptics';
import { toast } from '../../lib/toast';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { Avatar } from '../../components/ui/Avatar';
import { SwipeableRow, type SwipeAction } from '../../components/ui/SwipeableRow';
import { PressableScale } from '../../components/ui/PressableScale';
import { Skeleton } from '../../components/ui/Skeleton';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout } from '../../constants/theme';
import type { Conversation } from '../../types';

interface ConversationRowProps {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
}

import { formatSmartDate } from '../../lib/dateFormat';

function formatTime(dateStr: string): string {
  return formatSmartDate(dateStr);
}

function ConversationSkeleton() {
  return (
    <View style={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md }}>
          <Skeleton width={52} height={52} borderRadius={26} />
          <View style={{ flex: 1, gap: Spacing.xs, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width={120} height={16} />
              <Skeleton width={50} height={12} />
            </View>
            <Skeleton width="80%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ConversationRow({ conversation, onPress }: ConversationRowProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handlePress = useCallback(() => {
    haptics.tap();
    onPress(conversation);
  }, [conversation, onPress]);

  const hasUnread = conversation.unread_count > 0;

  return (
    <PressableScale
      scaleValue={0.98}
      onPress={handlePress}
      style={[
        styles.conversationRow,
        {
          backgroundColor: hasUnread ? colors.activeLight : 'transparent',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${conversation.participant_name}${hasUnread ? `, ${conversation.unread_count} unread` : ''}`}
    >
      <Avatar
        uri={conversation.participant_avatar}
        name={conversation.participant_name}
        size={52}
        showOnline
        online={hasUnread}
      />
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text
            style={[
              styles.participantName,
              {
                color: colors.text,
                fontWeight: hasUnread ? '700' : '600',
              },
            ]}
            numberOfLines={1}
          >
            {conversation.participant_name}
          </Text>
          <Text
            style={[
              styles.timestamp,
              {
                color: hasUnread ? colors.primary : colors.textTertiary,
              },
            ]}
          >
            {formatTime(conversation.last_message_at)}
          </Text>
        </View>
        {conversation.listing_title && (
          <Text
            style={[styles.listingRef, { color: colors.primary }]}
            numberOfLines={1}
          >
            {conversation.listing_title}
          </Text>
        )}
        <View style={styles.messagePreviewRow}>
          <Text
            style={[
              styles.messagePreview,
              {
                color: hasUnread ? colors.text : colors.textSecondary,
                fontWeight: hasUnread ? '500' : '400',
              },
            ]}
            numberOfLines={1}
          >
            {conversation.last_message}
          </Text>
          {hasUnread && (
            <View
              style={[
                styles.unreadBadge,
                { backgroundColor: colors.primary },
              ]}
              accessibilityLabel={`${conversation.unread_count} unread messages`}
            >
              <Text style={[styles.unreadCount, { color: colors.onPrimary }]}>
                {conversation.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

export default function MessagesScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversations, messagesLoading, messagesError, fetchConversations, removeConversation } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    haptics.tap();
    setRefreshing(true);
    try {
      await fetchConversations();
    } finally {
      setRefreshing(false);
    }
  }, [fetchConversations]);

  const handleConversationPress = useCallback(
    (conversation: Conversation) => {
      router.push(`/(chat)/${conversation.id}`);
    },
    [router]
  );

  const handleArchive = useCallback(
    (conversation: Conversation) => {
      Alert.alert(
        'Archive conversation?',
        `Remove your chat with ${conversation.participant_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Archive',
            style: 'destructive',
            onPress: () => {
              removeConversation(conversation.id);
              haptics.success();
              toast.success('Conversation archived');
            },
          },
        ],
      );
    },
    [removeConversation, haptics],
  );

  const handleMute = useCallback(
    (conversation: Conversation) => {
      haptics.confirm();
      toast.success(`${conversation.participant_name} muted`);
    },
    [haptics],
  );

  const getSwipeActions = useCallback(
    (conversation: Conversation): SwipeAction[] => [
      {
        key: 'mute',
        label: 'Mute',
        icon: <BellOff size={22} color="#FFFFFF" strokeWidth={2} />,
        color: Colors.light.warning,
        onPress: () => handleMute(conversation),
      },
      {
        key: 'archive',
        label: 'Archive',
        icon: <Archive size={22} color="#FFFFFF" strokeWidth={2} />,
        color: Colors.light.error,
        onPress: () => handleArchive(conversation),
      },
    ],
    [handleArchive, handleMute],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Conversation; index: number }) => (
      <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
        <SwipeableRow rightActions={getSwipeActions(item)}>
          <ConversationRow
            conversation={item}
            onPress={handleConversationPress}
          />
        </SwipeableRow>
      </Animated.View>
    ),
    [handleConversationPress, getSwipeActions]
  );

  const renderEmpty = useCallback(
    () => (
      <EmptyState
        icon="chatbubbles-outline"
        title="No conversations yet"
        body="Start chatting after you apply to a listing or get a booking request."
        ctaLabel="Discover listings"
        onPress={() => router.push('/(tabs)/search')}
      />
    ),
    [router]
  );

  const totalUnread = conversations.reduce(
    (sum, c) => sum + c.unread_count,
    0
  );

  if (messagesLoading && conversations.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Messages</Text>
        </View>
        <ConversationSkeleton />
      </View>
    );
  }

  if (messagesError && conversations.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} accessibilityRole="alert">
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Messages</Text>
        </View>
        <View style={styles.errorState}>
          <View style={[styles.errorIcon, { backgroundColor: colors.cancelledLight }]}>
            <AlertTriangle size={40} color={colors.error} strokeWidth={1.5} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Couldn't load messages
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            {messagesError}
          </Text>
          <PressableScale
            onPress={() => fetchConversations()}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading messages"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>Try Again</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Messages</Text>
        {totalUnread > 0 && (
          <View
            style={[
              styles.headerBadge,
              { backgroundColor: colors.primary },
            ]}
            accessibilityLabel={`${totalUnread} new messages`}
          >
            <Text style={[styles.headerBadgeText, { color: colors.onPrimary }]}>
              {totalUnread} new
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ItemSeparatorComponent={() => (
          <View
            style={[
              styles.separator,
              { backgroundColor: colors.borderLight },
            ]}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  title: {
    ...Typography.title1,
  },
  headerBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  headerBadgeText: {
    ...Typography.caption1,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: Layout.tabBarHeight + 40,
  },
  conversationRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantName: {
    ...Typography.headline,
    flex: 1,
    marginRight: Spacing.sm,
  },
  timestamp: {
    ...Typography.caption1,
  },
  listingRef: {
    ...Typography.caption2,
    fontWeight: '600',
    marginTop: Spacing.xxs,
  },
  messagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  messagePreview: {
    ...Typography.subheadline,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  unreadCount: {
    ...Typography.caption2,
    fontWeight: '700',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 80,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
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
});
