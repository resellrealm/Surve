import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Springs } from '../../../constants/theme';
import type { Sport } from '../../../constants/sports';
import { BaseballState, createBaseballState, baseballAddRun, baseballAddOut } from '../../../lib/scoringEngine';

interface Props {
  sport: Sport;
  onScoreChange?: (homeScore: number, awayScore: number) => void;
  initialState?: BaseballState;
}

export default function BaseballScoring({ sport, onScoreChange, initialState }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const [state, setState] = useState<BaseballState>(initialState ?? createBaseballState());
  const scoreScale = useSharedValue(1);

  const scoreAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.value }] }));

  const addRun = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scoreScale.value = withSequence(withTiming(1.1, { duration: 80 }), withSpring(1, Springs.bouncy));
    setState(prev => {
      const next = baseballAddRun(prev);
      onScoreChange?.(next.totalScore.home, next.totalScore.away);
      return next;
    });
  }, [onScoreChange]);

  const addOut = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState(prev => {
      const next = baseballAddOut(prev);
      onScoreChange?.(next.totalScore.home, next.totalScore.away);
      return next;
    });
  }, [onScoreChange]);

  return (
    <View style={styles.container}>
      {/* Inning Indicator */}
      <View style={styles.inningRow}>
        <Text style={[Typography.headline, { color: colors.text }]}>
          {state.isTopOfInning ? '▲' : '▼'} Inning {state.currentInning + 1}
        </Text>
      </View>

      {/* Innings Grid */}
      <View style={[styles.inningsGrid, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.inningsHeader}>
          <Text style={[Typography.caption2, { color: colors.textTertiary, width: 50 }]}>Team</Text>
          {state.innings.map((_, i) => (
            <Text key={i} style={[Typography.caption2, { color: i === state.currentInning ? colors.text : colors.textTertiary, width: 24, textAlign: 'center', fontWeight: i === state.currentInning ? '700' : '400' }]}>
              {i + 1}
            </Text>
          ))}
          <Text style={[Typography.caption2, { color: colors.textSecondary, width: 30, textAlign: 'center', fontWeight: '700' }]}>R</Text>
        </View>
        {(['away', 'home'] as const).map(team => (
          <View key={team} style={styles.inningsRow}>
            <Text style={[Typography.caption1, { color: colors.text, width: 50, fontWeight: '600' }]}>
              {team === 'home' ? sport.scoreLabel.home : sport.scoreLabel.away}
            </Text>
            {state.innings.map((inning, i) => (
              <Text key={i} style={[Typography.caption1, { color: i === state.currentInning ? colors.text : colors.textSecondary, width: 24, textAlign: 'center' }]}>
                {inning[team]}
              </Text>
            ))}
            <Text style={[Typography.caption1, { color: sport.accentColor, width: 30, textAlign: 'center', fontWeight: '700' }]}>
              {state.totalScore[team]}
            </Text>
          </View>
        ))}
      </View>

      {/* Outs Display */}
      <View style={styles.outsRow}>
        <Text style={[Typography.footnote, { color: colors.textSecondary }]}>Outs: </Text>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={[styles.outDot, { backgroundColor: i < state.outs ? sport.accentColor : colors.border }]}
          />
        ))}
      </View>

      {/* Bases Display */}
      <View style={styles.basesContainer}>
        <View style={styles.basesRow}>
          <View style={[styles.base, styles.baseRotated, { backgroundColor: state.bases[1] ? sport.accentColor : colors.border + '40' }]} />
        </View>
        <View style={styles.basesRow}>
          <View style={[styles.base, styles.baseRotated, { backgroundColor: state.bases[2] ? sport.accentColor : colors.border + '40' }]} />
          <View style={{ width: 32 }} />
          <View style={[styles.base, styles.baseRotated, { backgroundColor: state.bases[0] ? sport.accentColor : colors.border + '40' }]} />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <Pressable style={[styles.actionBtn, { backgroundColor: sport.accentColor + '20' }]} onPress={addRun}>
          <Text style={[Typography.headline, { color: sport.accentColor }]}>Run</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#DC2626' + '20' }]} onPress={addOut}>
          <Text style={[Typography.headline, { color: '#DC2626' }]}>Out</Text>
        </Pressable>
      </View>

      {state.winner && (
        <View style={[styles.winnerBanner, { backgroundColor: sport.accentColor + '20' }]}>
          <Text style={[Typography.headline, { color: sport.accentColor }]}>
            {state.winner === 'home' ? sport.scoreLabel.home : sport.scoreLabel.away} Wins!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  inningRow: { alignItems: 'center', marginBottom: Spacing.lg },
  inningsGrid: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  inningsHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs },
  inningsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs },
  outsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  outDot: { width: 12, height: 12, borderRadius: 6 },
  basesContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  basesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  base: { width: 24, height: 24, margin: 2 },
  baseRotated: { transform: [{ rotate: '45deg' }] },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  actionBtn: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  winnerBanner: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
});
