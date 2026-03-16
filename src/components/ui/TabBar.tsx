import React, { useCallback, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Home,
  PlusCircle,
  Compass,
  MessageSquare,
  User,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { TabColors, Springs, Layout } from '../../constants/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TAB_ICON_SIZE = 28;
const INACTIVE_STROKE = 1.8;
const ACTIVE_STROKE = 2.5;
const DOT_SIZE = 5;

const tabKeys = ['home', 'create', 'discover', 'responses', 'profile'] as const;

const tabIcons = {
  home: Home,
  create: PlusCircle,
  discover: Compass,
  responses: MessageSquare,
  profile: User,
};

function TabButton({
  routeKey,
  isFocused,
  onPress,
  onLongPress,
}: {
  routeKey: (typeof tabKeys)[number];
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { isDark } = useTheme();
  const scale = useSharedValue(1);
  const focused = useSharedValue(isFocused ? 1 : 0);
  const accentColor = TabColors[routeKey][isDark ? 'dark' : 'light'];
  const inactiveColor = isDark ? '#6B7280' : '#9CA3AF';

  useEffect(() => {
    focused.value = withSpring(isFocused ? 1 : 0, Springs.tab);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: focused.value,
    transform: [{ scale: focused.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(1.1, Springs.tab);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, Springs.tab);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const Icon = tabIcons[routeKey];

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
    >
      <Animated.View style={[styles.tabIconWrapper, animatedStyle]}>
        <Icon
          size={TAB_ICON_SIZE}
          color={isFocused ? accentColor : inactiveColor}
          strokeWidth={isFocused ? ACTIVE_STROKE : INACTIVE_STROKE}
        />
        <Animated.View style={[styles.dot, { backgroundColor: accentColor }, dotStyle]} />
      </Animated.View>
    </Pressable>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : colors.background,
          borderTopColor: isDark ? colors.border : colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          height: Layout.tabBarHeight + (insets.bottom > 0 ? insets.bottom : 12),
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

        return (
          <TabButton
            key={route.key}
            routeKey={routeKey}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
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
});
