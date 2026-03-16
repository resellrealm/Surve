import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from 'react-native';
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
import { ArrowLeft, RotateCcw, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Springs } from '../../constants/theme';
import { SPORTS, type Sport } from '../../constants/sports';
import FieldBackground from '../../components/sport/FieldBackground';

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

interface ScoreState {
  home: number;
  away: number;
}

function ScoringScreen({ sport, onBack }: { sport: Sport; onBack: () => void }) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const [score, setScore] = useState<ScoreState>({ home: 0, away: 0 });
  const homeScale = useSharedValue(1);
  const awayScale = useSharedValue(1);

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
    setScore(s => ({ ...s, home: s.home + 1 }));
  }, []);

  const incrementAway = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    awayScale.value = withSequence(
      withTiming(1.15, { duration: 100 }),
      withSpring(1, Springs.bouncy),
    );
    setScore(s => ({ ...s, away: s.away + 1 }));
  }, []);

  const decrementHome = useCallback(() => {
    setScore(s => ({ ...s, home: Math.max(0, s.home - 1) }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const decrementAway = useCallback(() => {
    setScore(s => ({ ...s, away: Math.max(0, s.away - 1) }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const resetScore = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setScore({ home: 0, away: 0 });
  }, []);

  const Icon = sport.icon;

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
        <Pressable onPress={onBack} style={styles.backButton} hitSlop={12}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <View style={styles.sportTitleRow}>
          <Icon size={20} color={sport.accentColor} strokeWidth={2} />
          <Text style={[Typography.title3, { color: colors.text, marginLeft: Spacing.sm }]}>
            {sport.name}
          </Text>
        </View>
        <Pressable onPress={resetScore} style={styles.resetButton} hitSlop={12}>
          <RotateCcw size={20} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Score Display */}
      <View style={styles.scoreArea}>
        {/* Home Side */}
        <Pressable style={styles.scoreSide} onPress={incrementHome}>
          <Animated.View style={[styles.scoreContent, homeAnimStyle]}>
            <Text style={[Typography.caption1, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' }]}>
              Home
            </Text>
            <Text style={[styles.scoreNumber, { color: colors.text }]}>
              {score.home}
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
              Away
            </Text>
            <Text style={[styles.scoreNumber, { color: colors.text }]}>
              {score.away}
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

  if (selectedSport) {
    return (
      <ScoringScreen
        sport={selectedSport}
        onBack={() => setSelectedSport(null)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
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
  resetButton: {
    width: 40,
    height: 40,
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
