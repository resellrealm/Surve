import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsOffline } from '../../hooks/useIsOffline';
import { toast } from '../../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import {
  Send,
  Check,
  CheckCheck,
  Clock,
  X,
  Reply,
  Search,
  ChevronUp,
  ChevronDown,
  ThumbsUp,
  Heart,
  Laugh,
  AlertCircle,
  Frown,
  HandHeart,
  type LucideIcon,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { moderateText, friendlyFlagReason } from '../../lib/moderation';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { Avatar } from '../../components/ui/Avatar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PressableScale } from '../../components/ui/PressableScale';
import { ErrorState } from '../../components/ui/ErrorState';
import * as api from '../../lib/api';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Springs,
} from '../../constants/theme';
import { formatDateCompact, formatTime as formatLocaleTime } from '../../lib/dateFormat';
import type { Message } from '../../types';

const REACTION_ICONS: { name: ReactionIconName; Icon: LucideIcon; label: string }[] = [
  { name: 'thumbs_up', Icon: ThumbsUp, label: 'Thumbs up' },
  { name: 'heart', Icon: Heart, label: 'Heart' },
  { name: 'laugh', Icon: Laugh, label: 'Laugh' },
  { name: 'wow', Icon: AlertCircle, label: 'Wow' },
  { name: 'sad', Icon: Frown, label: 'Sad' },
  { name: 'care', Icon: HandHeart, label: 'Care' },
];

type ReactionIconName =
  | 'thumbs_up'
  | 'heart'
  | 'laugh'
  | 'wow'
  | 'sad'
  | 'care';

const REACTION_ICON_MAP: Record<ReactionIconName, LucideIcon> = {
  thumbs_up: ThumbsUp,
  heart: Heart,
  laugh: Laugh,
  wow: AlertCircle,
  sad: Frown,
  care: HandHeart,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ListRow =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'msg'; id: string; message: Message };

function dayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yKey = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
  const key = d.toISOString().slice(0, 10);
  if (key === todayKey) return 'Today';
  if (key === yKey) return 'Yesterday';
  return formatDateCompact(dateStr);
}

function formatMessageTime(dateStr: string): string {
  return formatLocaleTime(dateStr);
}

function buildRows(messages: Message[]): ListRow[] {
  const rows: ListRow[] = [];
  let lastKey = '';
  for (const m of messages) {
    const k = dayKey(m.created_at);
    if (k !== lastKey) {
      rows.push({ kind: 'day', id: `day-${k}`, label: dayLabel(m.created_at) });
      lastKey = k;
    }
    rows.push({ kind: 'msg', id: m.id, message: m });
  }
  return rows;
}

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

function statusFor(
  msg: Message,
  currentUserId: string,
  counterpartyLastRead: string | null,
  deliveredIds: Set<string>
): MessageStatus | null {
  if (msg.sender_id !== currentUserId) return null;
  if (msg.id.startsWith('msg-local-')) return 'sending';
  if (counterpartyLastRead && counterpartyLastRead >= msg.created_at) return 'read';
  if (deliveredIds.has(msg.id)) return 'delivered';
  return 'sent';
}

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  status: MessageStatus | null;
  currentUserId: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onLongPress: () => void;
  onReaction: (icon: ReactionIconName) => void;
  reactions: Record<ReactionIconName, string[]>;
  highlightQuery?: string;
  isActiveResult?: boolean;
}

const PILL_PARTICLE_COUNT = 5;
const PILL_PARTICLE_ANGLES = Array.from(
  { length: PILL_PARTICLE_COUNT },
  (_, i) => (i * 360) / PILL_PARTICLE_COUNT,
);

function ReactionParticle({
  angle,
  color,
  trigger,
}: {
  angle: number;
  color: string;
  trigger: SharedValue<number>;
}) {
  const rad = (angle * Math.PI) / 180;
  const dist = 16;
  const dx = Math.cos(rad) * dist;
  const dy = Math.sin(rad) * dist;

  const animStyle = useAnimatedStyle(() => {
    const t = trigger.value;
    return {
      opacity: t * (1 - t) * 4,
      transform: [
        { translateX: dx * t },
        { translateY: dy * t },
        { scale: 1 - t * 0.6 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 3,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

function ReactionPill({
  iconName,
  users,
  currentUserId,
  colors,
  onReaction,
}: {
  iconName: ReactionIconName;
  users: string[];
  currentUserId: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onReaction: (icon: ReactionIconName) => void;
}) {
  const isMine = users.includes(currentUserId);
  const scale = useSharedValue(1);
  const particleProgress = useSharedValue(0);
  const haptics = useHaptics();
  const Icon = REACTION_ICON_MAP[iconName];

  const handlePress = useCallback(() => {
    haptics.confirm();
    scale.value = withSequence(
      withSpring(1.35, Springs.snappy),
      withSpring(1, Springs.bouncy),
    );
    if (!isMine) {
      particleProgress.value = 0;
      particleProgress.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
    }
    onReaction(iconName);
  }, [iconName, onReaction, haptics, scale, isMine, particleProgress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const tint = isMine ? colors.primary : colors.textSecondary;

  return (
    <AnimatedPressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${iconName} reaction, ${users.length} ${users.length === 1 ? 'person' : 'people'}${isMine ? ', you reacted' : ''}`}
      accessibilityHint={isMine ? 'Double tap to remove your reaction' : 'Double tap to add this reaction'}
      style={[
        styles.reactionPill,
        {
          backgroundColor: isMine ? colors.activeLight : colors.surfaceSecondary,
          borderColor: isMine ? colors.primary : colors.border,
          overflow: 'visible' as const,
        },
        animStyle,
      ]}
    >
      {PILL_PARTICLE_ANGLES.map((angle) => (
        <ReactionParticle
          key={angle}
          angle={angle}
          color={colors.primary}
          trigger={particleProgress}
        />
      ))}
      <Icon size={14} color={tint} strokeWidth={2} />
      {users.length > 1 && (
        <Text
          style={[
            styles.reactionPillCount,
            { color: tint },
          ]}
        >
          {users.length}
        </Text>
      )}
    </AnimatedPressable>
  );
}

function ReactionPills({
  reactions,
  currentUserId,
  isSent,
  colors,
  onReaction,
}: {
  reactions: Record<ReactionIconName, string[]>;
  currentUserId: string;
  isSent: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  onReaction: (icon: ReactionIconName) => void;
}) {
  const entries = (Object.entries(reactions) as [ReactionIconName, string[]][]).filter(
    ([, users]) => users.length > 0,
  );
  if (entries.length === 0) return null;

  return (
    <View style={[styles.reactionPillsRow, isSent ? styles.pillsSent : styles.pillsReceived]}>
      {entries.map(([iconName, users]) => (
        <ReactionPill
          key={iconName}
          iconName={iconName}
          users={users}
          currentUserId={currentUserId}
          colors={colors}
          onReaction={onReaction}
        />
      ))}
    </View>
  );
}

function ReactionPickerItem({
  iconName,
  label,
  Icon,
  onSelect,
  colors,
}: {
  iconName: ReactionIconName;
  label: string;
  Icon: LucideIcon;
  onSelect: (icon: ReactionIconName) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const haptics = useHaptics();
  const scale = useSharedValue(1);
  const particleProgress = useSharedValue(0);

  const handlePress = useCallback(() => {
    haptics.confirm();
    scale.value = withSequence(
      withSpring(1.35, Springs.snappy),
      withSpring(1, Springs.bouncy),
    );
    particleProgress.value = 0;
    particleProgress.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    onSelect(iconName);
  }, [iconName, onSelect, haptics, scale, particleProgress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`React with ${label}`}
      style={[styles.reactionPickerItem, { overflow: 'visible' as const }, animStyle]}
      hitSlop={8}
    >
      {PILL_PARTICLE_ANGLES.map((angle) => (
        <ReactionParticle
          key={angle}
          angle={angle}
          color={colors.primary}
          trigger={particleProgress}
        />
      ))}
      <Icon size={24} color={colors.text} strokeWidth={2} />
    </AnimatedPressable>
  );
}

function ReactionPicker({
  isSent,
  colors,
  onSelect,
}: {
  isSent: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  onSelect: (icon: ReactionIconName) => void;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(150).springify()}
      style={[
        styles.reactionPicker,
        { backgroundColor: colors.surface },
        Shadows.md,
        isSent ? styles.pickerSent : styles.pickerReceived,
      ]}
    >
      {REACTION_ICONS.map(({ name, Icon, label }) => (
        <ReactionPickerItem
          key={name}
          iconName={name}
          Icon={Icon}
          label={label}
          onSelect={onSelect}
          colors={colors}
        />
      ))}
    </Animated.View>
  );
}

function HighlightedText({
  text,
  query,
  baseColor,
  colors,
}: {
  text: string;
  query: string;
  baseColor: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  if (!query) {
    return <Text style={[styles.messageText, { color: baseColor }]}>{text}</Text>;
  }
  const parts: { text: string; match: boolean }[] = [];
  const lowerText = text.toLowerCase();
  const lowerQ = query.toLowerCase();
  let cursor = 0;
  let idx = lowerText.indexOf(lowerQ, cursor);
  while (idx !== -1) {
    if (idx > cursor) parts.push({ text: text.slice(cursor, idx), match: false });
    parts.push({ text: text.slice(idx, idx + query.length), match: true });
    cursor = idx + query.length;
    idx = lowerText.indexOf(lowerQ, cursor);
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });

  return (
    <Text style={[styles.messageText, { color: baseColor }]}>
      {parts.map((p, i) =>
        p.match ? (
          <Text
            key={i}
            style={{
              backgroundColor: colors.warning,
              color: '#000',
              borderRadius: 2,
            }}
          >
            {p.text}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        )
      )}
    </Text>
  );
}

function MessageBubble({
  message,
  isSent,
  status,
  currentUserId,
  colors,
  onLongPress,
  onReaction,
  reactions,
  highlightQuery,
  isActiveResult,
}: MessageBubbleProps) {
  const [showPicker, setShowPicker] = useState(false);
  const haptics = useHaptics();

  const handleDoubleTap = useCallback(() => {
    haptics.tap();
    setShowPicker((v) => !v);
  }, [haptics]);

  const lastTapRef = useRef(0);
  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTap();
    }
    lastTapRef.current = now;
  }, [handleDoubleTap]);

  const handlePickerSelect = useCallback(
    (icon: ReactionIconName) => {
      setShowPicker(false);
      onReaction(icon);
    },
    [onReaction]
  );

  return (
    <Animated.View
      entering={FadeInDown.duration(180).springify()}
      style={[
        styles.messageBubbleWrapper,
        isSent ? styles.sentWrapper : styles.receivedWrapper,
      ]}
    >
      {showPicker && (
        <ReactionPicker isSent={isSent} colors={colors} onSelect={handlePickerSelect} />
      )}
      <PressableScale
        onPress={handlePress}
        onLongPress={() => {
          setShowPicker(false);
          onLongPress();
        }}
        delayLongPress={250}
        accessibilityRole="text"
        accessibilityLabel={`${isSent ? 'You' : 'Them'}: ${message.text}. ${formatMessageTime(message.created_at)}`}
        accessibilityHint="Double tap to react. Long press for more options."
      >
        <View
          style={[
            styles.messageBubble,
            isSent
              ? [styles.sentBubble, { backgroundColor: colors.primary }]
              : [styles.receivedBubble, { backgroundColor: colors.surface }],
            isActiveResult && { borderWidth: 2, borderColor: colors.warning },
          ]}
        >
          <HighlightedText
            text={message.text}
            query={highlightQuery ?? ''}
            baseColor={isSent ? colors.onPrimary : colors.text}
            colors={colors}
          />
          <View style={styles.metaRow}>
            <Text
              style={[
                styles.messageTime,
                {
                  color: isSent ? 'rgba(255,255,255,0.65)' : colors.textTertiary,
                },
              ]}
            >
              {formatMessageTime(message.created_at)}
            </Text>
            {status === 'sending' && (
              <Clock size={12} color="rgba(255,255,255,0.65)" strokeWidth={2} />
            )}
            {status === 'sent' && (
              <Check size={14} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
            )}
            {status === 'delivered' && (
              <CheckCheck size={14} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
            )}
            {status === 'read' && (
              <CheckCheck size={14} color="#B8D0FF" strokeWidth={2.5} />
            )}
          </View>
        </View>
      </PressableScale>
      <ReactionPills
        reactions={reactions}
        currentUserId={currentUserId}
        isSent={isSent}
        colors={colors}
        onReaction={onReaction}
      />
    </Animated.View>
  );
}

function TypingIndicator({
  colors,
  avatarUri,
  avatarName,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  avatarUri: string | null;
  avatarName: string;
}) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  const avatarPulse = useSharedValue(1);

  useEffect(() => {
    const loop = (sv: { value: number }, delay: number) => {
      setTimeout(() => {
        sv.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0, { duration: 400 }),
          ),
          -1,
          false,
        );
      }, delay);
    };
    loop(dot1, 0);
    loop(dot2, 150);
    loop(dot3, 300);
    avatarPulse.value = withRepeat(
      withSequence(
        withSpring(1.08, Springs.gentle),
        withSpring(1, Springs.gentle),
      ),
      -1,
      false,
    );
  }, [dot1, dot2, dot3, avatarPulse]);

  const s1 = useAnimatedStyle(() => ({ opacity: 0.3 + dot1.value * 0.7 }));
  const s2 = useAnimatedStyle(() => ({ opacity: 0.3 + dot2.value * 0.7 }));
  const s3 = useAnimatedStyle(() => ({ opacity: 0.3 + dot3.value * 0.7 }));
  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarPulse.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      style={[styles.typingRow]}
    >
      <Animated.View style={avatarStyle}>
        <Avatar uri={avatarUri} name={avatarName} size={28} />
      </Animated.View>
      <View
        style={[
          styles.messageBubble,
          styles.receivedBubble,
          styles.typingBubble,
          { backgroundColor: colors.surface },
        ]}
      >
        <View style={styles.typingDots}>
          {[s1, s2, s3].map((st, i) => (
            <Animated.View
              key={i}
              style={[styles.typingDot, { backgroundColor: colors.textSecondary }, st]}
            />
          ))}
        </View>
      </View>
      <Text style={[styles.typingLabel, { color: colors.textTertiary }]}>typing</Text>
    </Animated.View>
  );
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const conversations = useStore((s) => s.conversations);
  const fetchConversations = useStore((s) => s.fetchConversations);
  const currentUserId = useStore((s) => s.user?.id) ?? '';
  const haptics = useHaptics();
  const isOffline = useIsOffline();

  // Counterparty ID is whichever participant isn't us
  const counterpartyId = useMemo(() => {
    const conv = conversations.find((c) => c.id === id);
    return conv?.participant_ids.find((p) => p !== currentUserId) ?? null;
  }, [conversations, id, currentUserId]);

  const conversation = useMemo(
    () => conversations.find((c) => c.id === id),
    [conversations, id]
  );

  const [inputText, setInputText] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [counterpartyLastRead, setCounterpartyLastRead] = useState<string | null>(null);
  const [counterpartyTyping, setCounterpartyTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [deliveredIds, setDeliveredIds] = useState<Set<string>>(new Set());
  // Server-sourced reactions: messageId -> iconName -> userIds[]
  const [reactionsByMessage, setReactionsByMessage] = useState<
    Record<string, Record<ReactionIconName, string[]>>
  >({});
  const [showScrollFab, setShowScrollFab] = useState(false);
  const distanceFromBottom = useRef(0);
  const fabOpacity = useSharedValue(0);
  const fabScale = useSharedValue(0.7);

  const fabStyle = useAnimatedStyle(() => ({
    opacity: fabOpacity.value,
    transform: [{ scale: fabScale.value }],
  }));

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchPage, setSearchPage] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeResultIdx, setActiveResultIdx] = useState(0);

  const searchInputRef = useRef<TextInput>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flatListRef = useRef<FlatList<ListRow>>(null);
  const typingClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastTypingRef = useRef<() => void>(() => {});
  const lastTypingBroadcast = useRef<number>(0);

  const sendScale = useSharedValue(1);
  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  // Initial load + message subscription
  useEffect(() => {
    if (!id || !currentUserId) return;
    let cancelled = false;

    api.getMessages(id).then((msgs) => {
      if (!cancelled) setLocalMessages(msgs);
    });
    api.getCounterpartyLastRead(id, currentUserId).then((ts) => {
      if (!cancelled) setCounterpartyLastRead(ts);
    });
    useStore.getState().markConversationRead(id);

    const unsubMsgs = api.subscribeToConversationMessages(id, (msg) => {
      setLocalMessages((prev) => {
        const withoutOptimistic = prev.filter(
          (m) =>
            !(
              m.id.startsWith('msg-local-') &&
              m.sender_id === msg.sender_id &&
              m.text === msg.text
            )
        );
        if (withoutOptimistic.some((m) => m.id === msg.id)) return withoutOptimistic;
        return [...withoutOptimistic, msg];
      });
      if (msg.sender_id === currentUserId) {
        // Realtime confirmed the server stored our message -> delivered.
        setDeliveredIds((prev) => {
          const next = new Set(prev);
          next.add(msg.id);
          return next;
        });
      } else {
        useStore.getState().markConversationRead(id);
      }
    });

    // Load reactions + subscribe
    const loadReactions = () => {
      api.getConversationReactions(id).then((rows) => {
        if (cancelled) return;
        const map: Record<string, Record<ReactionIconName, string[]>> = {};
        for (const r of rows) {
          const icon = r.icon_name as ReactionIconName;
          if (!REACTION_ICON_MAP[icon]) continue;
          if (!map[r.message_id]) {
            map[r.message_id] = {} as Record<ReactionIconName, string[]>;
          }
          const perMsg = map[r.message_id];
          if (!perMsg[icon]) perMsg[icon] = [];
          perMsg[icon].push(r.user_id);
        }
        setReactionsByMessage(map);
      });
    };
    loadReactions();
    const unsubReactions = api.subscribeToMessageReactions(id, loadReactions);

    const unsubReads = api.subscribeToReadReceipts(id, currentUserId, (ts) => {
      setCounterpartyLastRead((prev) => (!prev || ts > prev ? ts : prev));
    });

    const typing = api.subscribeToTyping(id, currentUserId, () => {
      setCounterpartyTyping(true);
      if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
      typingClearTimer.current = setTimeout(() => setCounterpartyTyping(false), 3000);
    });
    broadcastTypingRef.current = typing.broadcastTyping;

    return () => {
      cancelled = true;
      unsubMsgs();
      unsubReads();
      unsubReactions();
      typing.unsubscribe();
      if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
    };
  }, [id, currentUserId]);

  const handleInputChange = useCallback((t: string) => {
    setInputText(t);
    const now = Date.now();
    // Throttle typing broadcast to ~every 1.5s while the user is actively typing
    if (t.length > 0 && now - lastTypingBroadcast.current > 1500) {
      lastTypingBroadcast.current = now;
      broadcastTypingRef.current();
    }
  }, []);

  const sendNow = useCallback(
    (body: string) => {
      if (!id || !currentUserId) return;
      haptics.confirm();
      sendScale.value = withSpring(0.85, Springs.snappy, () => {
        sendScale.value = withSpring(1, Springs.gentle);
      });

      const textWithReply = replyTo
        ? `↪ "${replyTo.text.slice(0, 80)}"\n${body}`
        : body;

      const optimistic: Message = {
        id: `msg-local-${Date.now()}`,
        conversation_id: id,
        sender_id: currentUserId,
        text: textWithReply,
        read: false,
        reactions: {},
        moderation_flags: [],
        created_at: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, optimistic]);
      setInputText('');
      setReplyTo(null);

      api.sendMessage(id, currentUserId, textWithReply);
    },
    [id, currentUserId, replyTo, sendScale, haptics]
  );

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || !id || !currentUserId) return;

    const flags = moderateText(trimmed);
    if (flags.length > 0) {
      const soft = flags.every((f) => f.kind === 'profanity');
      Alert.alert(
        soft ? 'Re-read your message?' : "Don't take it off-platform",
        friendlyFlagReason(flags),
        soft
          ? [
              { text: 'Edit', style: 'cancel' },
              { text: 'Send anyway', onPress: () => sendNow(trimmed) },
            ]
          : [{ text: "OK, I'll rewrite", style: 'cancel' }]
      );
      return;
    }
    sendNow(trimmed);
  }, [inputText, id, currentUserId, sendNow]);

  const openCounterpartyMenu = useCallback(() => {
    if (!counterpartyId) return;
    haptics.confirm();

    const runReport = () => {
      const reasons = [
        'Harassment or hate',
        'Spam or scam',
        'Impersonation',
        'Inappropriate content',
        'Something else',
        'Cancel',
      ];
      const submit = async (reason: string) => {
        const ok = await api.reportUser(currentUserId, counterpartyId, reason);
        if (ok) {
          haptics.success();
          toast.success("Report sent: Thanks — our team will take a look within 24 hours.");
        } else {
          haptics.error();
          toast.error('Could not report: Please try again.');
        }
      };
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: reasons, cancelButtonIndex: 5, title: 'Report user' },
          (i) => {
            if (i < 5) submit(reasons[i]);
          }
        );
      } else {
        Alert.alert(
          'Report user',
          'Why are you reporting this user?',
          reasons.slice(0, 5).map((r) => ({
            text: r,
            onPress: () => submit(r),
          })).concat([{ text: 'Cancel', onPress: async () => {} }])
        );
      }
    };

    const runBlock = () => {
      Alert.alert(
        'Block user?',
        "You won't see messages from them and they can't book your listings. You can unblock later.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              const ok = await api.blockUser(currentUserId, counterpartyId);
              if (ok) {
                haptics.success();
                router.back();
              } else {
                haptics.error();
                toast.error('Could not block: Please try again.');
              }
            },
          },
        ]
      );
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Report', 'Block', 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) runReport();
          else if (i === 1) runBlock();
        }
      );
    } else {
      Alert.alert('Options', undefined, [
        { text: 'Report', onPress: runReport },
        { text: 'Block', style: 'destructive', onPress: runBlock },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [counterpartyId, currentUserId, haptics, router]);

  const handleLongPress = useCallback(
    (msg: Message) => {
      haptics.heavy();
      const options = ['Reply', 'Copy', 'Cancel'];
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: 2 },
          async (idx) => {
            if (idx === 0) {
              setReplyTo(msg);
            } else if (idx === 1) {
              await Clipboard.setStringAsync(msg.text);
              haptics.success();
            }
          }
        );
      } else {
        Alert.alert('Message', undefined, [
          { text: 'Reply', onPress: () => setReplyTo(msg) },
          {
            text: 'Copy',
            onPress: async () => {
              await Clipboard.setStringAsync(msg.text);
              haptics.success();
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    },
    [haptics]
  );

  const handleReaction = useCallback(
    (msg: Message, icon: ReactionIconName) => {
      haptics.tap();
      // Optimistic update on the per-message reaction map.
      setReactionsByMessage((prev) => {
        const nextForMsg: Record<ReactionIconName, string[]> = {
          ...(prev[msg.id] ?? ({} as Record<ReactionIconName, string[]>)),
        };
        const users = nextForMsg[icon] ?? [];
        if (users.includes(currentUserId)) {
          const filtered = users.filter((u) => u !== currentUserId);
          if (filtered.length === 0) {
            delete nextForMsg[icon];
          } else {
            nextForMsg[icon] = filtered;
          }
        } else {
          nextForMsg[icon] = [...users, currentUserId];
        }
        return { ...prev, [msg.id]: nextForMsg };
      });
      if (!msg.id.startsWith('msg-local-')) {
        api.toggleMessageReaction(msg.id, currentUserId, icon);
      }
    },
    [currentUserId, haptics]
  );

  const executeSearch = useCallback(
    async (query: string, page: number) => {
      if (!id || query.trim().length === 0) {
        setSearchResults([]);
        setSearchHasMore(false);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      const result = await api.searchMessages(id, query.trim(), page);
      if (page === 0) {
        setSearchResults(result.messages);
      } else {
        setSearchResults((prev) => [...prev, ...result.messages]);
      }
      setSearchHasMore(result.hasMore);
      setSearchLoading(false);
      if (page === 0) setActiveResultIdx(0);
    },
    [id]
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      setSearchPage(0);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (text.trim().length === 0) {
        setSearchResults([]);
        setSearchHasMore(false);
        return;
      }
      searchTimerRef.current = setTimeout(() => executeSearch(text, 0), 300);
    },
    [executeSearch]
  );

  const toggleSearch = useCallback(() => {
    haptics.tap();
    setSearchOpen((prev) => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchQuery('');
        setSearchResults([]);
        setSearchPage(0);
        setActiveResultIdx(0);
      }
      return !prev;
    });
  }, [haptics]);

  const navigateResult = useCallback(
    (direction: 'prev' | 'next') => {
      haptics.tap();
      setActiveResultIdx((prev) => {
        if (direction === 'next') {
          const next = prev + 1;
          if (next >= searchResults.length && searchHasMore) {
            const nextPage = searchPage + 1;
            setSearchPage(nextPage);
            executeSearch(searchQuery, nextPage);
          }
          return Math.min(next, searchResults.length - 1);
        }
        return Math.max(prev - 1, 0);
      });
    },
    [haptics, searchResults.length, searchHasMore, searchPage, searchQuery, executeSearch]
  );

  const rows = useMemo(() => buildRows(localMessages), [localMessages]);
  const canSend = inputText.trim().length > 0 && !isOffline;

  useEffect(() => {
    if (searchResults.length === 0 || activeResultIdx >= searchResults.length) return;
    const targetMsg = searchResults[activeResultIdx];
    const rowIdx = rows.findIndex(
      (r) => r.kind === 'msg' && r.id === targetMsg.id
    );
    if (rowIdx >= 0) {
      flatListRef.current?.scrollToIndex({ index: rowIdx, animated: true, viewPosition: 0.5 });
    }
  }, [activeResultIdx, searchResults, rows]);

  const activeResultId = searchResults[activeResultIdx]?.id ?? null;

  const renderItem = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.kind === 'day') {
        return (
          <View style={styles.dateSeparator}>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              {item.label}
            </Text>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
          </View>
        );
      }
      const m = item.message;
      const isMatch = searchQuery.length > 0 && searchResults.some((r) => r.id === m.id);
      return (
        <MessageBubble
          message={m}
          isSent={m.sender_id === currentUserId}
          status={statusFor(m, currentUserId, counterpartyLastRead, deliveredIds)}
          currentUserId={currentUserId}
          colors={colors}
          onLongPress={() => handleLongPress(m)}
          onReaction={(icon) => handleReaction(m, icon)}
          reactions={reactionsByMessage[m.id] ?? ({} as Record<ReactionIconName, string[]>)}
          highlightQuery={isMatch ? searchQuery : undefined}
          isActiveResult={m.id === activeResultId}
        />
      );
    },
    [colors, counterpartyLastRead, deliveredIds, currentUserId, handleLongPress, handleReaction, reactionsByMessage, searchQuery, searchResults, activeResultId]
  );

  if (!conversation) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: colors.background, paddingTop: insets.top + Spacing.lg },
        ]}
      >
        <ErrorState
          title="Conversation not found"
          message="We couldn't load this conversation. It may have been removed or there was a connection issue."
          onRetry={fetchConversations}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={conversation.participant_name}
        right={
          <View style={styles.headerRight}>
            <PressableScale
              onPress={toggleSearch}
              scaleValue={0.9}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Search messages"
              style={styles.headerIconBtn}
            >
              <Search size={20} color={searchOpen ? colors.primary : colors.text} strokeWidth={2} />
            </PressableScale>
            <PressableScale onPress={openCounterpartyMenu} scaleValue={0.9} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${conversation.participant_name} options`} accessibilityHint="Double tap to report or block this user">
              <Avatar
                uri={conversation.participant_avatar}
                name={conversation.participant_name}
                size={32}
              />
            </PressableScale>
          </View>
        }
      />

      {searchOpen && (
        <Animated.View
          entering={FadeIn.duration(150)}
          style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
        >
          <View style={[styles.searchInputWrap, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Search size={16} color={colors.textTertiary} strokeWidth={2} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search messages…"
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <PressableScale
                onPress={() => handleSearchChange('')}
                scaleValue={0.9}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <X size={16} color={colors.textTertiary} strokeWidth={2} />
              </PressableScale>
            )}
          </View>
          {searchResults.length > 0 && (
            <View style={styles.searchNav}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                {activeResultIdx + 1}/{searchResults.length}{searchHasMore ? '+' : ''}
              </Text>
              <PressableScale
                onPress={() => navigateResult('prev')}
                disabled={activeResultIdx === 0}
                scaleValue={0.9}
                hitSlop={8}
                style={styles.searchNavBtn}
                accessibilityRole="button"
                accessibilityLabel="Previous result"
              >
                <ChevronUp
                  size={20}
                  color={activeResultIdx === 0 ? colors.textTertiary : colors.text}
                  strokeWidth={2}
                />
              </PressableScale>
              <PressableScale
                onPress={() => navigateResult('next')}
                disabled={activeResultIdx >= searchResults.length - 1 && !searchHasMore}
                scaleValue={0.9}
                hitSlop={8}
                style={styles.searchNavBtn}
                accessibilityRole="button"
                accessibilityLabel="Next result"
              >
                <ChevronDown
                  size={20}
                  color={activeResultIdx >= searchResults.length - 1 && !searchHasMore ? colors.textTertiary : colors.text}
                  strokeWidth={2}
                />
              </PressableScale>
            </View>
          )}
          {searchQuery.length > 0 && searchResults.length === 0 && !searchLoading && (
            <Text style={[Typography.caption1, { color: colors.textTertiary, marginLeft: Spacing.sm }]}>
              No results
            </Text>
          )}
        </Animated.View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={rows}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messagesList, { paddingBottom: Spacing.sm }]}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            const distance = contentSize.height - (contentOffset.y + layoutMeasurement.height);
            distanceFromBottom.current = distance;
            const shouldShow = distance > 300;
            if (shouldShow !== showScrollFab) {
              setShowScrollFab(shouldShow);
              if (shouldShow) {
                fabOpacity.value = withTiming(1, { duration: 180 });
                fabScale.value = withSpring(1, Springs.bouncy);
              } else {
                fabOpacity.value = withTiming(0, { duration: 150 });
                fabScale.value = withSpring(0.7, Springs.quick);
              }
            }
          }}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (distanceFromBottom.current < 120) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListFooterComponent={counterpartyTyping ? (
            <TypingIndicator
              colors={colors}
              avatarUri={conversation.participant_avatar}
              avatarName={conversation.participant_name}
            />
          ) : null}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            }, 200);
          }}
        />

        <AnimatedPressable
          onPress={() => {
            haptics.tap();
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          pointerEvents={showScrollFab ? 'auto' : 'none'}
          accessibilityRole="button"
          accessibilityLabel="Scroll to latest message"
          accessibilityElementsHidden={!showScrollFab}
          importantForAccessibility={showScrollFab ? 'yes' : 'no-hide-descendants'}
          style={[
            styles.scrollFab,
            {
              backgroundColor: colors.primary,
              bottom: 96 + Math.max(insets.bottom, Spacing.sm),
            },
            fabStyle,
          ]}
        >
          <ChevronDown size={20} color={colors.onPrimary} strokeWidth={2.5} />
        </AnimatedPressable>

        {replyTo && (
          <View
            style={[
              styles.replyBanner,
              { backgroundColor: colors.surfaceSecondary, borderLeftColor: colors.primary },
            ]}
          >
            <Reply size={16} color={colors.primary} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.replyKicker, { color: colors.primary }]}>
                Replying to {replyTo.sender_id === currentUserId ? 'yourself' : conversation.participant_name}
              </Text>
              <Text
                style={[styles.replyPreview, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {replyTo.text}
              </Text>
            </View>
            <PressableScale onPress={() => setReplyTo(null)} scaleValue={0.9} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel reply">
              <X size={18} color={colors.textTertiary} strokeWidth={2} />
            </PressableScale>
          </View>
        )}

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
          <View style={styles.inputColumn}>
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
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Type a message…"
                placeholderTextColor={colors.textTertiary}
                value={inputText}
                onChangeText={handleInputChange}
                multiline
                maxLength={1000}
                returnKeyType="default"
              />
            </View>
            {inputText.length > 0 && (
              <Text
                style={[
                  styles.chatCharCount,
                  {
                    color:
                      inputText.length >= 1000
                        ? colors.error
                        : inputText.length >= 900
                          ? colors.warning
                          : colors.textTertiary,
                  },
                ]}
              >
                {inputText.length}/1000
              </Text>
            )}
          </View>

          <AnimatedPressable
            onPress={handleSend}
            disabled={!canSend}
            style={[
              styles.sendButton,
              sendAnimatedStyle,
              { backgroundColor: canSend ? colors.primary : colors.surfaceSecondary },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
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
  container: { flex: 1 },
  flex: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  messageBubbleWrapper: {
    marginBottom: Spacing.sm,
    maxWidth: '80%',
  },
  sentWrapper: { alignSelf: 'flex-end' },
  receivedWrapper: { alignSelf: 'flex-start' },
  messageBubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  sentBubble: { borderBottomRightRadius: BorderRadius.xs },
  receivedBubble: { borderBottomLeftRadius: BorderRadius.xs },
  messageText: { ...Typography.body },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  messageTime: { ...Typography.caption2 },
  typingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  typingBubble: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 6,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typingLabel: {
    ...Typography.caption2,
    fontStyle: 'italic' as const,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    gap: Spacing.md,
  },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dateText: { ...Typography.caption1, fontWeight: '600' },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
  },
  replyKicker: { ...Typography.caption2, fontWeight: '700' },
  replyPreview: { ...Typography.footnote, marginTop: 2 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputColumn: {
    flex: 1,
  },
  inputWrapper: {
    minHeight: 40,
    maxHeight: 120,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  textInput: {
    ...Typography.body,
    maxHeight: 100,
  },
  chatCharCount: {
    ...Typography.caption2,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionPillsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  pillsSent: { justifyContent: 'flex-end' as const },
  pillsReceived: { justifyContent: 'flex-start' as const },
  reactionPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xxs,
    minHeight: 28,
  },
  reactionPillEmoji: {
    fontSize: 14,
  },
  reactionPillCount: {
    ...Typography.caption2,
    fontWeight: '600' as const,
  },
  reactionPicker: {
    flexDirection: 'row' as const,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xs,
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  pickerSent: { alignSelf: 'flex-end' as const },
  pickerReceived: { alignSelf: 'flex-start' as const },
  reactionPickerItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  reactionPickerEmoji: {
    fontSize: 22,
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.md,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  searchInput: {
    ...Typography.footnote,
    flex: 1,
    paddingVertical: 0,
  },
  searchNav: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.xs,
  },
  searchNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scrollFab: {
    position: 'absolute' as const,
    right: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...Shadows.md,
  },
});
