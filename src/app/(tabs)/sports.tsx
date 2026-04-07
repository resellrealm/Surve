import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ArrowLeft, RotateCcw, Plus, Minus, Check, Undo2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Springs } from '../../constants/theme';
import { SPORTS, type Sport } from '../../constants/sports';
import FieldBackground from '../../components/sport/FieldBackground';
import { TennisScoring, CricketScoring, SetBasedScoring, MultiPointScoring, BaseballScoring } from '../../components/sport/scoring';
import TeamNameInput from '../../components/sport/TeamNameInput';
import { useStore } from '../../lib/store';
import {
  createScore,
  updateScore,
  fetchActiveScore,
  subscribeToScores,
} from '../../lib/sportScores';
import type { SportType } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SportCard({ sport, index, onSelect }: { sport: Sport; index: number; onSelect: (s: Sport) => void }) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const Icon = sport.icon;

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 60).springify()}
      style={[styles.sportCard, { backgroundColor: colors.card, borderColor: colors.borderLight }, animatedStyle]}
      onPressIn={() => { scale.value = withSpring(0.95, Springs.snappy); }}
      onPressOut={() => { scale.value = withSpring(1, Springs.snappy); }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSelect(sport);
      }}
    >
      <View style={[styles.sportIconContainer, { backgroundColor: sport.fieldColor + '20' }]}>
        <Icon size={28} color={sport.accentColor} strokeWidth={2} />
      </View>
      <Text style={[Typography.headline, { color: colors.text, marginTop: Spacing.sm }]}>
        {sport.name}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Simple Scoring (Football, General) ─────────────────────────────────────

function SimpleScoringContent({ sport, score, onScoreChange }: {
  sport: Sport;
  score: { home: number; away: number };
  onScoreChange: (home: number, away: number) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const [period, setPeriod] = useState(1);
  const [events, setEvents] = useState<Array<{ team: 'home' | 'away'; points: number; label: string }>>([]);
  const homeScale = useSharedValue(1);
  const awayScale = useSharedValue(1);

  const homeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: homeScale.value }] }));
  const awayAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: awayScale.value }] }));

  const increment = useCallback((team: 'home' | 'away') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const s = team === 'home' ? homeScale : awayScale;
    s.value = withSequence(withTiming(1.15, { duration: 100 }), withSpring(1, Springs.bouncy));
    const newHome = team === 'home' ? score.home + 1 : score.home;
    const newAway = team === 'away' ? score.away + 1 : score.away;
    setEvents(prev => [...prev, { team, points: 1, label: sport.scoreActions?.[0]?.label ?? '+1' }]);
    onScoreChange(newHome, newAway);
  }, [score, onScoreChange, sport]);

  const decrement = useCallback((team: 'home' | 'away') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newHome = team === 'home' ? Math.max(0, score.home - 1) : score.home;
    const newAway = team === 'away' ? Math.max(0, score.away - 1) : score.away;
    onScoreChange(newHome, newAway);
  }, [score, onScoreChange]);

  const undo = useCallback(() => {
    if (events.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const last = events[events.length - 1];
    setEvents(prev => prev.slice(0, -1));
    const newHome = last.team === 'home' ? Math.max(0, score.home - last.points) : score.home;
    const newAway = last.team === 'away' ? Math.max(0, score.away - last.points) : score.away;
    onScoreChange(newHome, newAway);
  }, [events, score, onScoreChange]);

  const gameActions = sport.scoreActions?.filter(a => a.type === 'action') ?? [];

  return (
    <View style={styles.simpleScoringContainer}>
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
        {/* Home Side */}
        <Pressable style={styles.scoreSide} onPress={() => increment('home')}>
          <Animated.View style={[styles.scoreContent, homeAnimStyle]}>
            <Text style={[Typography.caption1, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' }]}>
              {sport.scoreLabel.home}
            </Text>
            <Text style={[styles.scoreNumber, { color: colors.text }]}>{score.home}</Text>
            <Text style={[Typography.caption2, { color: colors.textTertiary, marginBottom: Spacing.sm }]}>
              {sport.pointName}
            </Text>
            <View style={styles.scoreButtons}>
              <Pressable onPress={() => increment('home')} style={[styles.scoreBtn, { backgroundColor: sport.accentColor + '25' }]} hitSlop={8}>
                <Plus size={18} color={sport.accentColor} strokeWidth={2.5} />
              </Pressable>
              <Pressable onPress={() => decrement('home')} style={[styles.scoreBtn, { backgroundColor: colors.textTertiary + '20' }]} hitSlop={8}>
                <Minus size={18} color={colors.textSecondary} strokeWidth={2.5} />
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>

        <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />

        {/* Away Side */}
        <Pressable style={styles.scoreSide} onPress={() => increment('away')}>
          <Animated.View style={[styles.scoreContent, awayAnimStyle]}>
            <Text style={[Typography.caption1, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' }]}>
              {sport.scoreLabel.away}
            </Text>
            <Text style={[styles.scoreNumber, { color: colors.text }]}>{score.away}</Text>
            <Text style={[Typography.caption2, { color: colors.textTertiary, marginBottom: Spacing.sm }]}>
              {sport.pointName}
            </Text>
            <View style={styles.scoreButtons}>
              <Pressable onPress={() => increment('away')} style={[styles.scoreBtn, { backgroundColor: sport.accentColor + '25' }]} hitSlop={8}>
                <Plus size={18} color={sport.accentColor} strokeWidth={2.5} />
              </Pressable>
              <Pressable onPress={() => decrement('away')} style={[styles.scoreBtn, { backgroundColor: colors.textTertiary + '20' }]} hitSlop={8}>
                <Minus size={18} color={colors.textSecondary} strokeWidth={2.5} />
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </View>

      {/* Game Actions (Yellow/Red Cards etc.) */}
      {gameActions.length > 0 && (
        <View style={styles.gameActionsRow}>
          {gameActions.map(action => (
            <Pressable
              key={action.label}
              style={[styles.gameActionBtn, { backgroundColor: (action.color ?? colors.textTertiary) + '15' }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Text style={[Typography.caption1, { color: action.color ?? colors.textSecondary, fontWeight: '600' }]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Undo */}
      {events.length > 0 && (
        <Pressable style={[styles.undoBtn, { backgroundColor: colors.surface }]} onPress={undo}>
          <Undo2 size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[Typography.caption1, { color: colors.textSecondary, marginLeft: Spacing.xs }]}>Undo</Text>
        </Pressable>
      )}

      <Text style={[Typography.caption1, { color: colors.textTertiary, textAlign: 'center', marginTop: Spacing.md }]}>
        Tap either side to increment score
      </Text>
    </View>
  );
}

// ─── Main Scoring Screen ────────────────────────────────────────────────────

function ScoringScreen({ sport, onBack }: { sport: Sport; onBack: () => void }) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const { session, activeScore, setActiveScore, updateSportScore } = useStore();
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [score, setScore] = useState({ home: 0, away: 0 });
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holdingFinish, setHoldingFinish] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!session?.user?.id) { setLoading(false); return; }
      try {
        let record = await fetchActiveScore(session.user.id, sport.id as SportType);
        if (cancelled) return;
        if (!record) {
          record = await createScore({ userId: session.user.id, sportType: sport.id as SportType });
          if (cancelled) return;
        }
        setActiveScore(record);
        setScore({ home: record.home_score, away: record.away_score });
      } catch (err) {
        console.error('Failed to create score record:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [session?.user?.id, sport.id]);

  const syncScore = useCallback((home: number, away: number) => {
    if (!activeScore) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const updated = await updateScore(activeScore.id, { home_score: home, away_score: away });
        updateSportScore(updated.id, updated);
      } catch (err) {
        console.error('Failed to sync score:', err);
      }
    }, 500);
  }, [activeScore?.id]);

  const handleScoreChange = useCallback((home: number, away: number) => {
    setScore({ home, away });
    syncScore(home, away);
  }, [syncScore]);

  const resetScore = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setScore({ home: 0, away: 0 });
    syncScore(0, 0);
  }, [syncScore]);

  const startFinishHold = useCallback(() => {
    setHoldingFinish(true);
    holdTimerRef.current = setTimeout(async () => {
      if (!activeScore) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        const updated = await updateScore(activeScore.id, {
          home_score: score.home,
          away_score: score.away,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
        updateSportScore(updated.id, updated);
        setActiveScore(null);
        onBack();
      } catch (err) {
        console.error('Failed to finish game:', err);
      }
    }, 2000);
  }, [activeScore?.id, score, onBack]);

  const cancelFinishHold = useCallback(() => {
    setHoldingFinish(false);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
  }, []);

  const handleBack = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (activeScore) {
      updateScore(activeScore.id, {
        home_score: score.home,
        away_score: score.away,
        status: 'paused',
      }).catch((err) => console.error('Failed to pause score:', err));
    }
    setActiveScore(null);
    onBack();
  }, [activeScore?.id, score, onBack]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const Icon = sport.icon;

  if (loading) {
    return (
      <View style={[styles.scoringContainer, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={sport.accentColor} />
      </View>
    );
  }

  const renderScoringContent = () => {
    switch (sport.scoringMode) {
      case 'tennis':
        return <TennisScoring sport={sport} />;
      case 'cricket':
        return <CricketScoring sport={sport} onScoreChange={(home, away) => handleScoreChange(home, away)} />;
      case 'sets':
        return <SetBasedScoring sport={sport} onScoreChange={(home, away) => handleScoreChange(home, away)} />;
      case 'innings':
        return <BaseballScoring sport={sport} onScoreChange={(home, away) => handleScoreChange(home, away)} />;
      case 'multi_point':
        return <MultiPointScoring sport={sport} score={score} onScoreChange={handleScoreChange} />;
      case 'simple':
      default:
        return <SimpleScoringContent sport={sport} score={score} onScoreChange={handleScoreChange} />;
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[styles.scoringContainer, { backgroundColor: colors.background }]}
    >
      <FieldBackground sportId={sport.id} fieldColor={sport.fieldColor} lineColor={sport.fieldLineColor} />

      {/* Header */}
      <View style={styles.scoringHeader}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleBack(); }} style={styles.backButton} hitSlop={12}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <View style={styles.sportTitleRow}>
          <Icon size={20} color={sport.accentColor} strokeWidth={2} />
          <Text style={[Typography.title3, { color: colors.text, marginLeft: Spacing.sm }]}>{sport.name}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={resetScore} style={styles.resetButton} hitSlop={12}>
            <RotateCcw size={20} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPressIn={startFinishHold}
            onPressOut={cancelFinishHold}
            style={[
              styles.finishButton,
              { backgroundColor: holdingFinish ? sport.accentColor + '50' : sport.accentColor + '20' },
            ]}
            hitSlop={8}
          >
            <Check size={20} color={sport.accentColor} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {holdingFinish && (
        <Text style={[Typography.caption1, { color: sport.accentColor, textAlign: 'center' }]}>
          Hold to finish game...
        </Text>
      )}

      {/* Sport-Specific Scoring Content */}
      {renderScoringContent()}
    </Animated.View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function SportsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [teamNames, setTeamNames] = useState<{ home: string; away: string } | null>(null);
  const { session, addSportScore, updateSportScore, removeSportScore } = useStore();

  useEffect(() => {
    if (!session?.user?.id) return;
    const unsubscribe = subscribeToScores(
      session.user.id,
      (score) => updateSportScore(score.id, score),
      (score) => {
        const exists = useStore.getState().sportScores.some((s) => s.id === score.id);
        if (!exists) addSportScore(score);
      },
      (id) => removeSportScore(id),
    );
    return unsubscribe;
  }, [session?.user?.id]);

  if (selectedSport && !teamNames) {
    return (
      <TeamNameInput
        sport={selectedSport}
        onStart={(home, away) => setTeamNames({ home, away })}
        onBack={() => setSelectedSport(null)}
      />
    );
  }

  if (selectedSport && teamNames) {
    return (
      <ScoringScreen
        sport={selectedSport}
        onBack={() => { setSelectedSport(null); setTeamNames(null); }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <Text style={[Typography.title2, { color: colors.text }]}>Score Tracker</Text>
        <Text style={[Typography.subheadline, { color: colors.textSecondary, marginTop: 2 }]}>
          Select a sport to start tracking
        </Text>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {SPORTS.map((sport, index) => (
          <SportCard key={sport.id} sport={sport} index={index} onSelect={setSelectedSport} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    paddingBottom: Spacing.massive,
  },
  sportCard: {
    width: '47%',
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    ...Shadows.sm,
  },
  sportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Scoring screen
  scoringContainer: { flex: 1 },
  scoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sportTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  resetButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  finishButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Simple scoring styles
  simpleScoringContainer: { flex: 1, justifyContent: 'center' },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  periodBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scoreArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  scoreSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  scoreContent: { alignItems: 'center' },
  scoreNumber: { fontSize: 96, fontWeight: '200', lineHeight: 110, marginVertical: Spacing.lg },
  scoreButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  scoreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDivider: { width: 1, height: '50%' },
  gameActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
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
    marginTop: Spacing.md,
  },
});
