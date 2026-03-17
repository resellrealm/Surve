import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Springs } from '../../../constants/theme';
import type { Sport } from '../../../constants/sports';
import {
  CricketState,
  createCricketState,
  cricketAddRuns,
  cricketWicket,
  cricketWide,
  cricketNoBall,
  formatOvers,
} from '../../../lib/scoringEngine';

interface Props {
  sport: Sport;
  onScoreChange?: (homeScore: number, awayScore: number) => void;
  initialState?: CricketState;
}

export default function CricketScoring({ sport, onScoreChange, initialState }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const [state, setState] = useState<CricketState>(initialState ?? createCricketState());
  const scoreScale = useSharedValue(1);

  const scoreAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.value }] }));

  const animateBump = () => {
    scoreScale.value = withSequence(withTiming(1.1, { duration: 80 }), withSpring(1, Springs.bouncy));
  };

  const addRuns = useCallback((runs: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateBump();
    setState(prev => {
      const next = cricketAddRuns(prev, runs);
      onScoreChange?.(next.runs, 0);
      return next;
    });
  }, [onScoreChange]);

  const handleWicket = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setState(prev => {
      const next = cricketWicket(prev);
      return next;
    });
  }, []);

  const handleWide = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState(prev => {
      const next = cricketWide(prev);
      onScoreChange?.(next.runs, 0);
      return next;
    });
  }, [onScoreChange]);

  const handleNoBall = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState(prev => {
      const next = cricketNoBall(prev);
      onScoreChange?.(next.runs, 0);
      return next;
    });
  }, [onScoreChange]);

  const runActions = [
    { label: '1', runs: 1 },
    { label: '2', runs: 2 },
    { label: '3', runs: 3 },
    { label: '4', runs: 4, color: '#3B82F6' },
    { label: '6', runs: 6, color: '#8B5CF6' },
  ];

  return (
    <View style={styles.container}>
      {/* Score Display */}
      <Animated.View style={[styles.scoreDisplay, scoreAnimStyle]}>
        <Text style={[styles.runsText, { color: colors.text }]}>{state.runs}/{state.wickets}</Text>
        <Text style={[Typography.title3, { color: colors.textSecondary }]}>
          ({formatOvers(state)} ov)
        </Text>
      </Animated.View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.statItem}>
          <Text style={[Typography.caption2, { color: colors.textTertiary }]}>RUN RATE</Text>
          <Text style={[Typography.headline, { color: colors.text }]}>{state.runRate.toFixed(2)}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[Typography.caption2, { color: colors.textTertiary }]}>WICKETS</Text>
          <Text style={[Typography.headline, { color: colors.text }]}>{state.wickets}/10</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[Typography.caption2, { color: colors.textTertiary }]}>EXTRAS</Text>
          <Text style={[Typography.headline, { color: colors.text }]}>
            {state.extras.wides + state.extras.noBalls}
          </Text>
        </View>
        {state.target !== null && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[Typography.caption2, { color: colors.textTertiary }]}>TARGET</Text>
              <Text style={[Typography.headline, { color: sport.accentColor }]}>{state.target}</Text>
            </View>
          </>
        )}
      </View>

      {/* Run Buttons */}
      <View style={styles.runButtons}>
        {runActions.map(action => (
          <Pressable
            key={action.label}
            style={[styles.runBtn, { backgroundColor: (action.color ?? sport.accentColor) + '20' }]}
            onPress={() => addRuns(action.runs)}
          >
            <Text style={[Typography.title3, { color: action.color ?? sport.accentColor }]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#EAB308' + '20' }]} onPress={handleWide}>
          <Text style={[Typography.footnote, { color: '#EAB308', fontWeight: '600' }]}>Wide</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#EF4444' + '20' }]} onPress={handleNoBall}>
          <Text style={[Typography.footnote, { color: '#EF4444', fontWeight: '600' }]}>No Ball</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#DC2626' + '20' }]} onPress={handleWicket}>
          <Text style={[Typography.footnote, { color: '#DC2626', fontWeight: '600' }]}>Wicket</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  scoreDisplay: { alignItems: 'center', marginBottom: Spacing.xxl },
  runsText: { fontSize: 72, fontWeight: '200', lineHeight: 84 },
  statsRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.xxl,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, alignSelf: 'stretch' },
  runButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  runBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  actionBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
});
