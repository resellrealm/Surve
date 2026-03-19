import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ArrowLeft, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { Avatar } from '../../components/ui/Avatar';
import { mockMessages } from '../../lib/mockData';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Springs,
  Layout,
} from '../../constants/theme';
import type { Message } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// User ID is resolved from store in ChatDetailScreen

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;

  if (diff < dayMs) return 'Today';
  if (diff < dayMs * 2) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  index: number;
}

function MessageBubble({ message, isSent, colors, index }: MessageBubbleProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(300).springify()}
      style={[
        styles.messageBubbleWrapper,
        isSent ? styles.sentWrapper : styles.receivedWrapper,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isSent
            ? [styles.sentBubble, { backgroundColor: colors.primary }]
            : [styles.receivedBubble, { backgroundColor: colors.surface }],
        ]}
      >
        <Text
          style={[
            styles.messageText,
            {
              color: isSent ? colors.onPrimary : colors.text,
            },
          ]}
        >
          {message.text}
        </Text>
        <Text
          style={[
            styles.messageTime,
            {
              color: isSent
                ? 'rgba(255,255,255,0.6)'
                : colors.textTertiary,
            },
          ]}
        >
          {formatMessageTime(message.created_at)}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const conversations = useStore((s) => s.conversations);
  const currentUserId = useStore((s) => s.user?.id) ?? 'user-c1';

  const conversation = useMemo(
    () => conversations.find((c) => c.id === id),
    [conversations, id]
  );

  const messages = useMemo(() => {
    if (!id) return [];
    return mockMessages[id] ?? [];
  }, [id]);

  const [inputText, setInputText] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);
  const flatListRef = useRef<FlatList>(null);

  const sendScale = useSharedValue(1);
  const backScale = useSharedValue(1);

  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backScale.value }],
  }));

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    backScale.value = withSpring(0.9, Springs.snappy, () => {
      backScale.value = withSpring(1, Springs.gentle);
    });
    router.back();
  }, [router, backScale]);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || !id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendScale.value = withSpring(0.85, Springs.snappy, () => {
      sendScale.value = withSpring(1, Springs.gentle);
    });

    const newMessage: Message = {
      id: `msg-local-${Date.now()}`,
      conversation_id: id,
      sender_id: currentUserId,
      text: trimmed,
      read: false,
      created_at: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, newMessage]);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, id, sendScale, currentUserId]);

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <MessageBubble
        message={item}
        isSent={item.sender_id === currentUserId}
        colors={colors}
        index={index}
      />
    ),
    [colors]
  );

  const renderDateSeparator = useCallback(
    () => (
      <View style={styles.dateSeparator}>
        <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dateText, { color: colors.textTertiary }]}>
          {localMessages.length > 0
            ? formatMessageDate(localMessages[0].created_at)
            : 'Today'}
        </Text>
        <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
      </View>
    ),
    [colors, localMessages]
  );

  if (!conversation) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <Text style={[Typography.headline, { color: colors.text }]}>
          Conversation not found
        </Text>
      </View>
    );
  }

  const canSend = inputText.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <AnimatedPressable
          onPress={handleBack}
          style={[styles.backButton, backAnimatedStyle]}
          hitSlop={12}
        >
          <ArrowLeft size={24} color={colors.text} />
        </AnimatedPressable>

        <View style={styles.headerCenter}>
          <Avatar
            uri={conversation.participant_avatar}
            name={conversation.participant_name}
            size={36}
          />
          <View style={styles.headerInfo}>
            <Text
              style={[
                Typography.headline,
                { color: colors.text },
              ]}
              numberOfLines={1}
            >
              {conversation.participant_name}
            </Text>
            {conversation.listing_title && (
              <Text
                style={[
                  Typography.caption1,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {conversation.listing_title}
              </Text>
            )}
          </View>
        </View>

        {/* Spacer to balance back button */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={localMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: Spacing.sm },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderDateSeparator}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.sm),
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                },
              ]}
              placeholder="Type a message..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />
          </View>

          <AnimatedPressable
            onPress={handleSend}
            disabled={!canSend}
            style={[
              styles.sendButton,
              sendAnimatedStyle,
              {
                backgroundColor: canSend ? colors.primary : colors.surfaceSecondary,
              },
            ]}
          >
            <Send
              size={18}
              color={canSend ? colors.onPrimary : colors.textTertiary}
            />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    gap: Spacing.md,
  },
  headerInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  headerSpacer: {
    width: 40,
  },

  // Messages
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  messageBubbleWrapper: {
    marginBottom: Spacing.sm,
    maxWidth: '80%',
  },
  sentWrapper: {
    alignSelf: 'flex-end',
  },
  receivedWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  sentBubble: {
    borderBottomRightRadius: BorderRadius.xs,
  },
  receivedBubble: {
    borderBottomLeftRadius: BorderRadius.xs,
  },
  messageText: {
    ...Typography.body,
  },
  messageTime: {
    ...Typography.caption2,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },

  // Date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    gap: Spacing.md,
  },
  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dateText: {
    ...Typography.caption1,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
  },
  textInput: {
    ...Typography.body,
    padding: 0,
    margin: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 0 : Spacing.xxs,
  },
});
