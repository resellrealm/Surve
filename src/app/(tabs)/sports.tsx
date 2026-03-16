import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  ActivityIndicator,
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
import { ArrowLeft, RotateCcw, Plus, Minus, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Springs } from '../../constants/theme';
import { SPORTS, type Sport } from '../../constants/sports';
import FieldBackground from '../../components/sport/FieldBackground';
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

function ScoringScreen({ sport, onBack }: { sport: Sport; onBack: () => void }) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const { session, activeScore, setActiveScore, updateSportScore } = useStore();
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local score state for immediate UI feedback
  const [score, setScore] = useState({ home: 0, away: 0 });
  const homeScale = useSharedValue(1);
  const awayScale = useSharedValue(1);

  // Create or resume a score record on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Try to resume an existing active score first
        let record = await fetchActiveScore(session.user.id, sport.id as SportType);
        if (cancelled) return;

        // Only create a new score if none exists
        if (!record) {
          record = await createScore({
            userId: session.user.id,
            sportType: sport.id as SportType,
          });
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

  // Debounced sync to Supabase
  const syncScore = useCallback((home: number, away: number) => {
    if (!activeScore) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const updated = await updateScore(activeScore.id, {
          home_score: home,
          away_score: away,
        });
        updateSportScore(updated.id, updated);
      } catch (err) {
        console.error('Failed to sync score:', err);
      }
    }, 500);
  }, [activeScore?.id]);

  const homeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: homeScale.value }],
  }));

  const awayAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: awayScale.value }],
  }));

  const incrementHome = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    homeScale.value = withSequence(
      withTiming(1.15, { duration: 100 }),
      withSpring(1, Springs.bouncy),
    );
    setScore(s => {
      const next = { ...s, home: s.home + 1 };
      syncScore(next.home, next.away);
      return next;
    });
  }, [syncScore]);

  const incrementAway = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    awayScale.value = withSequence(
      withTiming(1.15, { duration: 100 }),
      withSpring(1, Springs.bouncy),
    );
    setScore(s => {
      const next = { ...s, away: s.away + 1 };
      syncScore(next.home, next.away);
      return next;
    });
  }, [syncScore]);

  const decrementHome = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScore(s => {
      const next = { ...s, home: Math.max(0, s.home - 1) };
      syncScore(next.home, next.away);
      return next;
    });
  }, [syncScore]);

  const decrementAway = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScore(s => {
      const next = { ...s, away: Math.max(0, s.away - 1) };
      syncScore(next.home, next.away);
      return next;
    });
  }, [syncScore]);

  const resetScore = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setScore({ home: 0, away: 0 });
    syncScore(0, 0);
  }, [syncScore]);

  const finishGame = useCallback(async () => {
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
  }, [activeScore?.id, score, onBack]);

  const handleBack = useCallback(() => {
    // Flush any pending sync
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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
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

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[styles.scoringContainer, { backgroundColor: colors.background }]}
    >
      <FieldBackground
        sportId={sport.id}
        fieldColor={sport.fieldColor}
        lineColor={sport.fieldLineColor}
      />

      {/* Header */}
      <View style={styles.scoringHeader}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <View style={styles.sportTitleRow}>
          <Icon size={20} color={sport.accentColor} strokeWidth={2} />
          <Text style={[Typography.title3, { color: colors.text, marginLeft: Spacing.sm }]}>
            {sport.name}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={resetScore} style={styles.resetButton} hitSlop={12}>
            <RotateCcw size={20} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={finishGame} style={[styles.finishButton, { backgroundColor: sport.accentColor + '20' }]} hitSlop={8}>
            <Check size={20} color={sport.accentColor} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {/* Score Display */}
      <View style={styles.scoreArea}>
        {/* Home Side */}
        <Pressable style={styles.scoreSide} onPress={incrementHome}>
          <Animated.View style={[styles.scoreContent, homeAnimStyle]}>
            <Text style={[Typography.caption1, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' }]}>
              {sport.scoreLabel.home}
            </Text>
            <Text style={[styles.scoreNumber, { color: colors.text }]}>
              {score.home}
            </Text>
            <Text style={[Typography.caption2, { color: colors.textTertiary, marginBottom: Spacing.sm }]}>
              {sport.pointName}
            </Text>
            <View style={styles.scoreButtons}>
              <Pressable onPress={incrementHome} style={[styles.scoreBtn, { backgroundColor: sport.accentColor + '25' }]} hitSlop={8}>
                <Plus size={18} color={sport.accentColor} strokeWidth={2.5} />
              </Pressable>
              <Pressable onPress={decrementHome} style={[styles.scoreBtn, { backgroundColor: colors.textTertiary + '20' }]} hitSlop={8}>
                <Minus size={18} color={colors.textSecondary} strokeWidth={2.5} />
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>

        {/* Divider */}
        <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />

        {/* Away Side */}
        <Pressable style={styles.scoreSide} onPress={incrementAway}>
          <Animated.View style={[styles.scoreContent, awayAnimStyle]}>
            <Text style={[Typography.caption1, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' }]}>
              {sport.scoreLabel.away}
            </Text>
            <Text style={[styles.scoreNumber, { color: colors.text }]}>
              {score.away}
            </Text>
            <Text style={[Typography.caption2, { color: colors.textTertiary, marginBottom: Spacing.sm }]}>
              {sport.pointName}
            </Text>
            <View style={styles.scoreButtons}>
              <Pressable onPress={incrementAway} style={[styles.scoreBtn, { backgroundColor: sport.accentColor + '25' }]} hitSlop={8}>
                <Plus size={18} color={sport.accentColor} strokeWidth={2.5} />
              </Pressable>
              <Pressable onPress={decrementAway} style={[styles.scoreBtn, { backgroundColor: colors.textTertiary + '20' }]} hitSlop={8}>
                <Minus size={18} color={colors.textSecondary} strokeWidth={2.5} />
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </View>

      {/* Tap hint */}
      <Text style={[Typography.caption1, { color: colors.textTertiary, textAlign: 'center', marginBottom: Spacing.xxxl }]}>
        Tap either side to increment score
      </Text>
    </Animated.View>
  );
}

export default function SportsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const { session, sportScores, setSportScores, addSportScore, updateSportScore, removeSportScore } = useStore();

  // Subscribe to real-time score updates
  useEffect(() => {
    if (!session?.user?.id) return;

    const unsubscribe = subscribeToScores(
      session.user.id,
      (score) => updateSportScore(score.id, score),
      (score) => {
        // Deduplicate: only add if not already in store
        const exists = useStore.getState().sportScores.some((s) => s.id === score.id);
        if (!exists) {
          addSportScore(score);
        }
      },
      (id) => removeSportScore(id),
    );

    return unsubscribe;
  }, [session?.user?.id]);

  if (selectedSport) {
    return (
      <ScoringScreen
        sport={selectedSport}
        onBack={() => setSelectedSport(null)}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <Text style={[Typography.title2, { color: colors.text }]}>
          Score Tracker
        </Text>
        <Text style={[Typography.subheadline, { color: colors.textSecondary, marginTop: 2 }]}>
          Select a sport to start tracking
        </Text>
      </Animated.View>

      <View style={styles.grid}>
        {SPORTS.map((sport, index) => (
          <SportCard
            key={sport.id}
            sport={sport}
            index={index}
            onSelect={setSelectedSport}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  scoringContainer: {
    flex: 1,
  },
  scoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resetButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreArea: {
    flex: 1,
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
  scoreContent: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 96,
    fontWeight: '200',
    lineHeight: 110,
    marginVertical: Spacing.lg,
  },
  scoreButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  scoreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDivider: {
    width: 1,
    height: '50%',
  },
});
