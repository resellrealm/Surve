import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Springs } from '../../../constants/theme';
import type { Sport } from '../../../constants/sports';
import {
  TennisState,
  createTennisState,
  tennisScorePoint,
  tennisPointDisplay,
} from '../../../lib/scoringEngine';

interface Props {
  sport: Sport;
  onStateChange?: (state: TennisState) => void;
  initialState?: TennisState;
}

export default function TennisScoring({ sport, onStateChange, initialState }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const [state, setState] = useState<TennisState>(initialState ?? createTennisState());
  const homeScale = useSharedValue(1);
  const awayScale = useSharedValue(1);

  const homeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: homeScale.value }] }));
  const awayAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: awayScale.value }] }));

  const scorePoint = useCallback((team: 'home' | 'away') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const scale = team === 'home' ? homeScale : awayScale;
    scale.value = withSequence(withTiming(1.1, { duration: 100 }), withSpring(1, Springs.bouncy));

    setState(prev => {
      const next = tennisScorePoint(prev, team);
      onStateChange?.(next);
      return next;
    });
  }, [onStateChange]);

  const setsWon = { home: 0, away: 0 };
  for (let i = 0; i < state.sets.length; i++) {
    const set = state.sets[i];
    if (i < state.currentSet || (i === state.currentSet && state.winner)) {
      if (set.home > set.away) setsWon.home++;
      else if (set.away > set.home) setsWon.away++;
    }
  }

  return (
    <View style={styles.container}>
      {/* Sets Grid */}
      <View style={[styles.setsGrid, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.setsRow}>
          <Text style={[Typography.caption1, { color: colors.textSecondary, width: 60 }]}>Sets</Text>
          {state.sets.map((_, i) => (
            <Text key={i} style={[Typography.caption1, { color: colors.textTertiary, width: 28, textAlign: 'center' }]}>
              {i + 1}
            </Text>
          ))}
        </View>
        {(['home', 'away'] as const).map(team => (
          <View key={team} style={styles.setsRow}>
            <Text style={[Typography.footnote, { color: colors.text, width: 60, fontWeight: '600' }]} numberOfLines={1}>
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
                {i <= state.currentSet ? (i === state.currentSet ? state.games[team] : state.sets[i][team]) : '-'}
              </Text>
            ))}
          </View>
        ))}
      </View>

      {/* Current Game Score */}
      <View style={styles.pointsArea}>
        {(['home', 'away'] as const).map(team => {
          const scale = team === 'home' ? homeAnimStyle : awayAnimStyle;
          return (
            <Pressable key={team} style={styles.pointSide} onPress={() => scorePoint(team)}>
              <Animated.View style={[styles.pointContent, scale]}>
                <Text style={[Typography.caption1, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5 }]}>
                  {team === 'home' ? sport.scoreLabel.home : sport.scoreLabel.away}
                </Text>
                <Text style={[styles.pointNumber, { color: colors.text }]}>
                  {tennisPointDisplay(state, team)}
                </Text>
                <View style={styles.setsWonRow}>
                  <Text style={[Typography.caption2, { color: sport.accentColor }]}>
                    Sets: {setsWon[team]}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textTertiary, marginLeft: Spacing.xs }]}>
                    Games: {state.games[team]}
                  </Text>
                </View>
                {state.isTiebreak && (
                  <Text style={[Typography.caption2, { color: '#EAB308', marginTop: Spacing.xs }]}>TIEBREAK</Text>
                )}
                {state.isDeuce && state.advantage === team && (
                  <Text style={[Typography.caption2, { color: sport.accentColor, marginTop: Spacing.xs }]}>ADVANTAGE</Text>
                )}
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
    marginBottom: Spacing.xxl,
  },
  setsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs },
  pointsArea: { flexDirection: 'row', alignItems: 'center' },
  pointSide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxxl },
  pointContent: { alignItems: 'center' },
  pointNumber: { fontSize: 72, fontWeight: '200', lineHeight: 84, marginVertical: Spacing.md },
  setsWonRow: { flexDirection: 'row', alignItems: 'center' },
  winnerBanner: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
});
