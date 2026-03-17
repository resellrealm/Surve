import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import { Undo2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Springs } from '../../../constants/theme';
import type { Sport, ScoreAction } from '../../../constants/sports';
import { GameEvent, createGameEvent } from '../../../lib/scoringEngine';

interface Props {
  sport: Sport;
  score: { home: number; away: number };
  onScoreChange: (home: number, away: number) => void;
}

export default function MultiPointScoring({ sport, score, onScoreChange }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [activeSide, setActiveSide] = useState<'home' | 'away' | null>(null);
  const [period, setPeriod] = useState(1);
  const homeScale = useSharedValue(1);
  const awayScale = useSharedValue(1);

  const homeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: homeScale.value }] }));
  const awayAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: awayScale.value }] }));

  const addScore = useCallback((team: 'home' | 'away', action: ScoreAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const scale = team === 'home' ? homeScale : awayScale;
    scale.value = withSequence(withTiming(1.1, { duration: 80 }), withSpring(1, Springs.bouncy));

    const event = createGameEvent('score', team, action.points, action.label);
    setEvents(prev => [...prev, event]);

    const newHome = team === 'home' ? score.home + action.points : score.home;
    const newAway = team === 'away' ? score.away + action.points : score.away;
    onScoreChange(newHome, newAway);
  }, [score, onScoreChange]);

  const undo = useCallback(() => {
    if (events.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const lastEvent = events[events.length - 1];
    setEvents(prev => prev.slice(0, -1));

    const newHome = lastEvent.team === 'home' ? score.home - lastEvent.points : score.home;
    const newAway = lastEvent.team === 'away' ? score.away - lastEvent.points : score.away;
    onScoreChange(Math.max(0, newHome), Math.max(0, newAway));
  }, [events, score, onScoreChange]);

  const scoreActions = sport.scoreActions?.filter(a => a.type === 'score') ?? [];
  const gameActions = sport.scoreActions?.filter(a => a.type === 'action') ?? [];

  return (
    <View style={styles.container}>
      {/* Period Indicator */}
      {sport.periods && (
        <View style={styles.periodRow}>
          <Pressable
            onPress={() => { setPeriod(p => Math.max(1, p - 1)); Haptics.selectionAsync(); }}
            style={[styles.periodBtn, { backgroundColor: colors.surface }]}
          >
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>−</Text>
          </Pressable>
          <Text style={[Typography.headline, { color: colors.text }]}>
            {sport.periods.name} {period}
          </Text>
          <Pressable
            onPress={() => { setPeriod(p => Math.min(sport.periods!.count + 1, p + 1)); Haptics.selectionAsync(); }}
            style={[styles.periodBtn, { backgroundColor: colors.surface }]}
          >
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>+</Text>
          </Pressable>
        </View>
      )}

      {/* Score Display */}
      <View style={styles.scoreArea}>
        {(['home', 'away'] as const).map(team => {
          const animStyle = team === 'home' ? homeAnimStyle : awayAnimStyle;
          const isActive = activeSide === team;
          return (
            <Pressable
              key={team}
              style={[styles.scoreSide, isActive && { backgroundColor: sport.accentColor + '10' }]}
              onPress={() => setActiveSide(team)}
            >
              <Animated.View style={[styles.scoreContent, animStyle]}>
                <Text style={[Typography.caption1, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5 }]}>
                  {team === 'home' ? sport.scoreLabel.home : sport.scoreLabel.away}
                </Text>
                <Text style={[styles.scoreNumber, { color: isActive ? sport.accentColor : colors.text }]}>
                  {score[team]}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textTertiary }]}>{sport.pointName}</Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>

      {/* Score Action Buttons */}
      {activeSide && (
        <View style={styles.actionRow}>
          {scoreActions.map(action => (
            <Pressable
              key={action.label}
              style={[styles.scoreActionBtn, { backgroundColor: (action.color ?? sport.accentColor) + '20' }]}
              onPress={() => addScore(activeSide, action)}
            >
              <Text style={[Typography.headline, { color: action.color ?? sport.accentColor }]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {!activeSide && (
        <Text style={[Typography.footnote, { color: colors.textTertiary, textAlign: 'center' }]}>
          Tap a team to score
        </Text>
      )}

      {/* Game Action Buttons */}
      {gameActions.length > 0 && activeSide && (
        <View style={styles.gameActionRow}>
          {gameActions.map(action => (
            <Pressable
              key={action.label}
              style={[styles.gameActionBtn, { backgroundColor: (action.color ?? colors.textTertiary) + '15' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const event = createGameEvent('action', activeSide, 0, action.label);
                setEvents(prev => [...prev, event]);
              }}
            >
              <Text style={[Typography.caption1, { color: action.color ?? colors.textSecondary, fontWeight: '600' }]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Undo Button */}
      {events.length > 0 && (
        <Pressable style={[styles.undoBtn, { backgroundColor: colors.surface }]} onPress={undo}>
          <Undo2 size={16} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[Typography.caption1, { color: colors.textSecondary, marginLeft: Spacing.xs }]}>
            Undo {events[events.length - 1].label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  periodBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreArea: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  scoreSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    borderRadius: BorderRadius.lg,
  },
  scoreContent: { alignItems: 'center' },
  scoreNumber: { fontSize: 80, fontWeight: '200', lineHeight: 92, marginVertical: Spacing.md },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  scoreActionBtn: {
    minWidth: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  gameActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  gameActionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
});
