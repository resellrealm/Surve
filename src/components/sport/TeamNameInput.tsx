import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, useColorScheme } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Play, User } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Springs, Shadows } from '../../constants/theme';
import type { Sport } from '../../constants/sports';
import { createMMKV, type MMKV } from 'react-native-mmkv';

let storage: MMKV | null = null;

function getStorage(): MMKV {
  if (!storage) {
    storage = createMMKV({ id: 'surve-team-names' });
  }
  return storage;
}

const RECENT_NAMES_KEY = 'surve_recent_team_names';

function getRecentNames(): string[] {
  try {
    const json = getStorage().getString(RECENT_NAMES_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch { return []; }
}

function saveRecentName(name: string) {
  try {
    const names = getRecentNames();
    const filtered = names.filter(n => n.toLowerCase() !== name.toLowerCase());
    const updated = [name, ...filtered].slice(0, 10);
    getStorage().set(RECENT_NAMES_KEY, JSON.stringify(updated));
  } catch { /* storage may not be available */ }
}

interface Props {
  sport: Sport;
  onStart: (homeName: string, awayName: string) => void;
  onBack: () => void;
}

export default function TeamNameInput({ sport, onStart, onBack }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const [homeName, setHomeName] = useState(sport.scoreLabel.home);
  const [awayName, setAwayName] = useState(sport.scoreLabel.away);
  const [recentNames, setRecentNames] = useState<string[]>([]);

  useEffect(() => {
    setRecentNames(getRecentNames());
  }, []);

  const handleStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const home = homeName.trim() || sport.scoreLabel.home;
    const away = awayName.trim() || sport.scoreLabel.away;
    if (home !== sport.scoreLabel.home) saveRecentName(home);
    if (away !== sport.scoreLabel.away) saveRecentName(away);
    onStart(home, away);
  }, [homeName, awayName, sport, onStart]);

  const applySuggestion = (name: string, field: 'home' | 'away') => {
    Haptics.selectionAsync();
    if (field === 'home') setHomeName(name);
    else setAwayName(name);
  };

  const Icon = sport.icon;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.content}>
        <View style={[styles.sportBadge, { backgroundColor: sport.fieldColor + '20' }]}>
          <Icon size={24} color={sport.accentColor} strokeWidth={2} />
        </View>
        <Text style={[Typography.title2, { color: colors.text, textAlign: 'center', marginTop: Spacing.lg }]}>
          {sport.name}
        </Text>
        <Text style={[Typography.footnote, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs }]}>
          Enter team names to get started
        </Text>

        {/* Team Name Inputs */}
        <View style={styles.inputSection}>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <User size={18} color={sport.accentColor} strokeWidth={2} />
            <TextInput
              style={[Typography.body, { flex: 1, color: colors.text, marginLeft: Spacing.sm }]}
              value={homeName}
              onChangeText={setHomeName}
              placeholder={sport.scoreLabel.home}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              autoCapitalize="words"
              selectTextOnFocus
            />
          </View>

          <Text style={[Typography.caption1, { color: colors.textTertiary, textAlign: 'center', marginVertical: Spacing.sm }]}>vs</Text>

          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <User size={18} color={colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={[Typography.body, { flex: 1, color: colors.text, marginLeft: Spacing.sm }]}
              value={awayName}
              onChangeText={setAwayName}
              placeholder={sport.scoreLabel.away}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
              autoCapitalize="words"
              selectTextOnFocus
              onSubmitEditing={handleStart}
            />
          </View>
        </View>

        {/* Recent Name Suggestions */}
        {recentNames.length > 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={[Typography.caption1, { color: colors.textTertiary, marginBottom: Spacing.sm }]}>
              Recent names
            </Text>
            <View style={styles.suggestionsRow}>
              {recentNames.slice(0, 6).map(name => (
                <Pressable
                  key={name}
                  style={[styles.suggestion, { backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => {
                    if (homeName === sport.scoreLabel.home || homeName === '') applySuggestion(name, 'home');
                    else applySuggestion(name, 'away');
                  }}
                >
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>{name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Start Button */}
        <Pressable style={[styles.startBtn, { backgroundColor: sport.accentColor }]} onPress={handleStart}>
          <Play size={20} color="#fff" strokeWidth={2.5} fill="#fff" />
          <Text style={[Typography.headline, { color: '#fff', marginLeft: Spacing.sm }]}>Start Game</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.xxl, alignItems: 'center' },
  sportBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSection: { width: '100%', marginTop: Spacing.xxl },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  suggestionsSection: { width: '100%', marginTop: Spacing.xl },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  suggestion: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xxxl,
    width: '100%',
    ...Shadows.md,
  },
});
