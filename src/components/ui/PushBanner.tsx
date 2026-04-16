import React, { useEffect, useCallback, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Avatar } from './Avatar';
import { PressableScale } from './PressableScale';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Springs,
} from '../../constants/theme';

interface BannerItem {
  id: string;
  title: string;
  body: string;
  avatarUri: string | null;
  avatarName: string;
  path?: string;
}

const DURATION = 4000;
const DISMISS_THRESHOLD = -40;

/**
 * Foreground push banner. Renders a top-anchored Toast-like pill whenever a
 * push notification is received while the app is active. Tap the banner to
 * navigate using the `data.path` or `data.conversation_id` / `data.booking_id`
 * payload. Swipe up to dismiss early.
 */
export function PushBanner() {
  const [current, setCurrent] = useState<BannerItem | null>(null);
  const queueRef = useRef<BannerItem[]>([]);

  const next = useCallback(() => {
    const q = queueRef.current;
    if (q.length > 0) {
      const [head, ...rest] = q;
      queueRef.current = rest;
      setCurrent(head);
    } else {
      setCurrent(null);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setCurrent(null);
    // Slight delay so exit animation finishes before a queued one enters.
    setTimeout(next, 160);
  }, [next]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const req = notification.request;
      const content = req.content;
      const data = (content.data ?? {}) as {
        path?: string;
        conversation_id?: string;
        booking_id?: string;
        sender_name?: string;
        sender_avatar?: string | null;
      };

      const path =
        data.path ??
        (data.conversation_id
          ? `/(chat)/${data.conversation_id}`
          : data.booking_id
            ? `/(booking)/${data.booking_id}`
            : undefined);

      const item: BannerItem = {
        id: req.identifier,
        title: content.title ?? 'New notification',
        body: content.body ?? '',
        avatarUri: data.sender_avatar ?? null,
        avatarName: data.sender_name ?? content.title ?? 'Surve',
        path,
      };

      if (current) {
        queueRef.current = [...queueRef.current, item];
      } else {
        setCurrent(item);
      }
    });
    return () => sub.remove();
  }, [current]);

  if (!current) return null;
  return (
    <BannerView
      key={current.id}
      item={current}
      onDismiss={handleDismiss}
    />
  );
}

function BannerView({
  item,
  onDismiss,
}: {
  item: BannerItem;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();
  const translateY = useSharedValue(-140);
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dismissedRef = useRef(false);

  const finalize = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    clearTimeout(timerRef.current);
    onDismiss();
  }, [onDismiss]);

  const slideOut = useCallback(() => {
    translateY.value = reducedMotion
      ? withTiming(-140, { duration: 150 })
      : withSpring(-140, Springs.quick);
    opacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(finalize)();
    });
  }, [translateY, opacity, reducedMotion, finalize]);

  useEffect(() => {
    haptics.tap();
    translateY.value = reducedMotion
      ? withTiming(0, { duration: 150 })
      : withSpring(0, Springs.bouncy);
    opacity.value = withTiming(1, { duration: reducedMotion ? 150 : 220 });
    timerRef.current = setTimeout(slideOut, DURATION);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpen = useCallback(() => {
    haptics.confirm();
    clearTimeout(timerRef.current);
    if (item.path) {
      router.push(item.path as never);
    }
    slideOut();
  }, [item.path, router, haptics, slideOut]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY < DISMISS_THRESHOLD) {
        translateY.value = reducedMotion
          ? withTiming(-140, { duration: 150 })
          : withSpring(-140, Springs.quick);
        opacity.value = withTiming(0, { duration: 150 }, () => {
          runOnJS(finalize)();
        });
      } else {
        translateY.value = reducedMotion
          ? withTiming(0, { duration: 150 })
          : withSpring(0, Springs.bouncy);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${item.title}. ${item.body}`}
        style={[
          styles.container,
          {
            top: insets.top + Spacing.sm,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          animatedStyle,
        ]}
      >
        <PressableScale
          onPress={handleOpen}
          scaleValue={0.98}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
          style={styles.row}
        >
          <Avatar uri={item.avatarUri} name={item.avatarName} size={36} />
          <View style={styles.textCol}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {item.body.length > 0 && (
              <Text
                style={[styles.body, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.body}
              </Text>
            )}
          </View>
        </PressableScale>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    zIndex: 9998,
    ...Shadows.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 44,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.subheadline,
    fontWeight: '700',
  },
  body: {
    ...Typography.footnote,
  },
});
