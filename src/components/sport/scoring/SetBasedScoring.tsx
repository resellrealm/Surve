import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Springs } from '../../../constants/theme';
import type { Sport } from '../../../constants/sports';
import { SetBasedState, createSetBasedState, setBasedScorePoint } from '../../../lib/scoringEngine';

interface Props {
  sport: Sport;
  onScoreChange?: (homeScore: number, awayScore: number) => void;
  initialState?: SetBasedState;
}

export default function SetBasedScoring({ sport, onScoreChange, initialState }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const [state, setState] = useState<SetBasedState>(initialState ?? createSetBasedState(sport.id));
  const homeScale = useSharedValue(1);
  const awayScale = useSharedValue(1);

  const homeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: homeScale.value }] }));
  const awayAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: awayScale.value }] }));

  const scorePoint = useCallback((team: 'home' | 'away') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const scale = team === 'home' ? homeScale : awayScale;
    scale.value = withSequence(withTiming(1.1, { duration: 100 }), withSpring(1, Springs.bouncy));

    setState(prev => {
      const next = setBasedScorePoint(prev, team);
      onScoreChange?.(next.setsWon.home, next.setsWon.away);
      return next;
    });
  }, [onScoreChange]);

  const periodName = sport.periods?.name ?? 'Set';

  return (
    <View style={styles.container}>
      {/* Sets Summary */}
      <View style={[styles.setsGrid, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.setsRow}>
          <Text style={[Typography.caption1, { color: colors.textSecondary, width: 70 }]}>{periodName}s</Text>
          {state.sets.map((_, i) => (
            <Text key={i} style={[Typography.caption1, { color: colors.textTertiary, width: 28, textAlign: 'center' }]}>
              {i + 1}
            </Text>
          ))}
        </View>
        {(['home', 'away'] as const).map(team => (
          <View key={team} style={styles.setsRow}>
            <Text style={[Typography.footnote, { color: colors.text, width: 70, fontWeight: '600' }]} numberOfLines={1}>
              {team === 'home' ? sport.scoreLabel.home : sport.scoreLabel.away}
            </Text>
            {state.sets.map((set, i) => (
              <Text
                key={i}
                style={[
                  Typography.footnote,
                  {
                    color: i === state.currentSet ? colors.text : colors.textSecondary,
                    width: 28,
                    textAlign: 'center',
                    fontWeight: i === state.currentSet ? '700' : '400',
                  },
                ]}
              >
                {i <= state.currentSet ? (i === state.currentSet ? state.points[team] : state.sets[i][team]) : '-'}
              </Text>
            ))}
          </View>
        ))}
      </View>

      {/* Serve Indicator */}
      <View style={styles.serveRow}>
        <View style={[styles.serveDot, { backgroundColor: state.serving === 'home' ? sport.accentColor : 'transparent' }]} />
        <Text style={[Typography.caption1, { color: colors.textTertiary }]}>
          {periodName} {state.currentSet + 1} · {state.serving === 'home' ? sport.scoreLabel.home : sport.scoreLabel.away} serving
        </Text>
        <View style={[styles.serveDot, { backgroundColor: state.serving === 'away' ? sport.accentColor : 'transparent' }]} />
      </View>

      {/* Current Score */}
      <View style={styles.scoreArea}>
        {(['home', 'away'] as const).map(team => {
          const animStyle = team === 'home' ? homeAnimStyle : awayAnimStyle;
          return (
            <Pressable key={team} style={styles.scoreSide} onPress={() => scorePoint(team)}>
              <Animated.View style={[styles.scoreContent, animStyle]}>
                <Text style={[Typography.caption1, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5 }]}>
                  {team === 'home' ? sport.scoreLabel.home : sport.scoreLabel.away}
                </Text>
                <Text style={[styles.scoreNumber, { color: colors.text }]}>{state.points[team]}</Text>
                <Text style={[Typography.caption2, { color: sport.accentColor }]}>
                  {periodName}s: {state.setsWon[team]}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>

      {state.winner && (
        <View style={[styles.winnerBanner, { backgroundColor: sport.accentColor + '20' }]}>
          <Text style={[Typography.headline, { color: sport.accentColor }]}>
            {state.winner === 'home' ? sport.scoreLabel.home : sport.scoreLabel.away} Wins!
          </Text>
        </View>
      )}

      <Text style={[Typography.caption1, { color: colors.textTertiary, textAlign: 'center', marginTop: Spacing.md }]}>
        Tap a side to score a point
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  setsGrid: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  setsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs },
  serveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  serveDot: { width: 8, height: 8, borderRadius: 4 },
  scoreArea: { flexDirection: 'row', alignItems: 'center' },
  scoreSide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl },
  scoreContent: { alignItems: 'center' },
  scoreNumber: { fontSize: 80, fontWeight: '200', lineHeight: 92, marginVertical: Spacing.md },
  winnerBanner: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
});
