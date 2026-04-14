import React, { useCallback } from 'react';
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
import { MessageCircle, AlertTriangle, RotateCcw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { Typography, Spacing, BorderRadius, Shadows, Springs, Layout } from '../../constants/theme';
import type { Conversation } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ConversationRowProps {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffHours < 48) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, Springs.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, Springs.bouncy);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(conversation);
  }, [conversation, onPress]);

  const hasUnread = conversation.unread_count > 0;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.conversationRow,
        {
          backgroundColor: hasUnread ? colors.activeLight : 'transparent',
        },
        animatedStyle,
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
    </AnimatedPressable>
  );
}

export default function MessagesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversations, messagesLoading, messagesError, fetchConversations } = useStore();

  const handleConversationPress = useCallback(
    (conversation: Conversation) => {
      router.push(`/(chat)/${conversation.id}`);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Conversation; index: number }) => (
      <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
        <ConversationRow
          conversation={item}
          onPress={handleConversationPress}
        />
      </Animated.View>
    ),
    [handleConversationPress]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyState} accessibilityRole="text">
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <MessageCircle size={40} color={colors.textTertiary} strokeWidth={1.5} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No messages yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          When you connect with a business or creator, your conversations will appear here
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/search');
          }}
          style={[styles.emptyCta, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Discover listings"
        >
          <Text style={[styles.emptyCtaText, { color: colors.onPrimary }]}>Discover Listings</Text>
        </Pressable>
      </View>
    ),
    [colors, router]
  );

  const totalUnread = conversations.reduce(
    (sum, c) => sum + c.unread_count,
    0
  );

  if (messagesLoading && conversations.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
        </View>
        <ConversationSkeleton />
      </View>
    );
  }

  if (messagesError && conversations.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} accessibilityRole="alert">
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
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
          <Pressable
            onPress={() => fetchConversations()}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading messages"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
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
