import React, { useCallback, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHaptics } from '../../hooks/useHaptics';
import { PulsingDot } from './PulsingDot';
import {
  Home,
  Search,
  MessageCircle,
  CalendarCheck,
  User,
  LayoutDashboard,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { TabColors, Springs, Layout } from '../../constants/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TAB_ICON_SIZE = 28;
const INACTIVE_STROKE = 1.8;
const ACTIVE_STROKE = 2.5;
const DOT_SIZE = 5;
const BADGE_SIZE = 10;

const tabKeys = ['home', 'search', 'messages', 'bookings', 'profile'] as const;

const tabIcons = {
  home: Home,
  dashboard: LayoutDashboard,
  search: Search,
  messages: MessageCircle,
  bookings: CalendarCheck,
  profile: User,
};

function TabButton({
  routeKey,
  iconKey,
  isFocused,
  onPress,
  onLongPress,
  showBadge = false,
}: {
  routeKey: (typeof tabKeys)[number];
  iconKey: keyof typeof tabIcons;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  showBadge?: boolean;
}) {
  const { isDark, colors } = useTheme();
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const focused = useSharedValue(isFocused ? 1 : 0);
  const accentColor = TabColors[routeKey][isDark ? 'dark' : 'light'];
  const inactiveColor = colors.textTertiary;

  useEffect(() => {
    focused.value = reducedMotion
      ? withTiming(isFocused ? 1 : 0, { duration: 150 })
      : withSpring(isFocused ? 1 : 0, Springs.bouncy);
  }, [isFocused, focused, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const focusScale = 1 + focused.value * 0.15;
    const opacity = 0.5 + focused.value * 0.5;
    return {
      transform: [{ scale: scale.value * focusScale }],
      opacity,
    };
  });

  const dotStyle = useAnimatedStyle(() => ({
    opacity: focused.value,
    transform: [{ scale: focused.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = reducedMotion
      ? withTiming(1.1, { duration: 150 })
      : withSpring(1.1, Springs.tab);
  }, [scale, reducedMotion]);

  const handlePressOut = useCallback(() => {
    scale.value = reducedMotion
      ? withTiming(1, { duration: 150 })
      : withSpring(1, Springs.tab);
  }, [scale, reducedMotion]);

  const handlePress = useCallback(() => {
    haptics.select();
    onPress();
  }, [onPress]);

  const Icon = tabIcons[iconKey];

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityLabel={iconKey === 'dashboard' ? 'Dashboard' : routeKey}
      accessibilityState={isFocused ? { selected: true } : {}}
    >
      <Animated.View style={[styles.tabIconWrapper, animatedStyle]}>
        <View>
          <Icon
            size={TAB_ICON_SIZE}
            color={isFocused ? accentColor : inactiveColor}
            strokeWidth={isFocused ? ACTIVE_STROKE : INACTIVE_STROKE}
          />
          {showBadge && <PulsingDot size={BADGE_SIZE} style={styles.badgePosition} />}
        </View>
        <Animated.View
          style={[styles.dot, { backgroundColor: accentColor }, dotStyle]}
        />
      </Animated.View>
    </Pressable>
  );
}

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isBusiness = useStore((s) => s.user?.role === 'business');
  const unreadMessages = useStore((s) => s.getUnreadCount());
  const unreadNotifications = useStore((s) => s.unreadNotificationsCount);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
          height: Layout.tabBarHeight + Math.max(insets.bottom, 12),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const routeKey = tabKeys[index] || 'home';
        const iconKey: keyof typeof tabIcons =
          routeKey === 'home' && isBusiness ? 'dashboard' : routeKey;

        const showBadge =
          (routeKey === 'messages' && unreadMessages > 0) ||
          (routeKey === 'profile' && unreadNotifications > 0);

        return (
          <TabButton
            key={route.key}
            routeKey={routeKey}
            iconKey={iconKey}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            showBadge={showBadge}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  badgePosition: {
    position: 'absolute',
    top: -2,
    right: -4,
  },
});
