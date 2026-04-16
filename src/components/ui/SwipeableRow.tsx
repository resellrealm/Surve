import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useHaptics } from '../../hooks/useHaptics';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

export interface SwipeAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  enabled?: boolean;
}

const ACTION_WIDTH = 80;

function ActionButton({
  action,
  progress,
  index,
  side,
  total,
}: {
  action: SwipeAction;
  progress: SharedValue<number>;
  index: number;
  side: 'left' | 'right';
  total: number;
}) {
  const reducedMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { transform: [{ scale: 1 }], opacity: progress.value > 0.3 ? 1 : 0 };
    }
    const scale = interpolate(
      progress.value,
      [0, 0.5, 1],
      [0.6, 0.9, 1],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      progress.value,
      [0, 0.3, 1],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }], opacity };
  });

  return (
    <Animated.View
      style={[
        styles.actionButton,
        { backgroundColor: action.color, width: ACTION_WIDTH },
        side === 'left' && index === 0 && styles.actionFirstLeft,
        side === 'right' && index === total - 1 && styles.actionLastRight,
        animatedStyle,
      ]}
    >
      {action.icon}
      <Text style={styles.actionLabel}>{action.label}</Text>
    </Animated.View>
  );
}

export function SwipeableRow({
  children,
  leftActions,
  rightActions,
  enabled = true,
}: SwipeableRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const haptics = useHaptics();

  const handleSwipeOpen = useCallback(
    (direction: 'left' | 'right') => {
      const actions = direction === 'right' ? leftActions : rightActions;
      if (actions && actions.length > 0) {
        actions[0].onPress();
      }
      swipeableRef.current?.close();
    },
    [leftActions, rightActions],
  );

  const renderLeftActions = useCallback(
    (progress: SharedValue<number>, translation: SharedValue<number>) => {
      if (!leftActions || leftActions.length === 0) return null;
      return (
        <View style={styles.actionsContainer}>
          {leftActions.map((action, i) => (
            <ActionButton
              key={action.key}
              action={action}
              progress={progress}
              index={i}
              side="left"
              total={leftActions.length}
            />
          ))}
        </View>
      );
    },
    [leftActions],
  );

  const renderRightActions = useCallback(
    (progress: SharedValue<number>, translation: SharedValue<number>) => {
      if (!rightActions || rightActions.length === 0) return null;
      return (
        <View style={styles.actionsContainer}>
          {rightActions.map((action, i) => (
            <ActionButton
              key={action.key}
              action={action}
              progress={progress}
              index={i}
              side="right"
              total={rightActions.length}
            />
          ))}
        </View>
      );
    },
    [rightActions],
  );

  const handleWillOpen = useCallback(
    (direction: 'left' | 'right') => {
      haptics.confirm();
    },
    [haptics],
  );

  const hintParts: string[] = [];
  if (leftActions?.length) hintParts.push(`Swipe right to ${leftActions.map(a => a.label.toLowerCase()).join(' or ')}`);
  if (rightActions?.length) hintParts.push(`Swipe left to ${rightActions.map(a => a.label.toLowerCase()).join(' or ')}`);
  const swipeHint = hintParts.join('. ');

  if (!enabled || (!leftActions?.length && !rightActions?.length)) {
    return <>{children}</>;
  }

  return (
    <View accessible={false} accessibilityHint={swipeHint}>
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderLeftActions={leftActions?.length ? renderLeftActions : undefined}
      renderRightActions={rightActions?.length ? renderRightActions : undefined}
      leftThreshold={ACTION_WIDTH * 0.6}
      rightThreshold={ACTION_WIDTH * 0.6}
      overshootLeft={false}
      overshootRight={false}
      overshootFriction={8}
      onSwipeableWillOpen={handleWillOpen}
      onSwipeableOpen={handleSwipeOpen}
    >
      {children}
    </ReanimatedSwipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  actionFirstLeft: {
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  actionLastRight: {
    borderTopRightRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  actionLabel: {
    ...Typography.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
