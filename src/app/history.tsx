import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Trophy,
  Clock,
  Repeat,
  Share2,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { getSportById } from '../constants/sports';
import { useStore } from '../lib/store';
import { fetchScores } from '../lib/sportScores';
import { getGameHistory, getHeadToHead, type Game } from '../lib/friends';
import type { SportScore } from '../types';

export default function HistoryScreen() {
  const router = useRouter();
  const { friendId } = useLocalSearchParams<{ friendId?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const { session } = useStore();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completedScores, setCompletedScores] = useState<SportScore[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [h2h, setH2h] = useState<{ wins: number; losses: number; draws: number } | null>(null);

  useEffect(() => {
    if (!userId) return;
    loadHistory();
  }, [userId, friendId]);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    if (!refreshing) setLoading(true);
    try {
      if (friendId) {
        const result = await getHeadToHead(userId, friendId);
        setGames(result.games);
        setH2h({ wins: result.wins, losses: result.losses, draws: result.draws });
      } else {
        const [scores, gameHistory] = await Promise.all([
          fetchScores(userId),
          getGameHistory(userId).catch(() => [] as Game[]),
        ]);
        setCompletedScores(scores.filter(s => s.status === 'completed'));
        setGames(gameHistory);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, friendId, refreshing]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadHistory();
  }, [loadHistory]);

  const handleShare = useCallback(async (item: SportScore | Game) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sportId = 'sport_type' in item ? item.sport_type : item.sport;
    const sport = getSportById(sportId);
    const name = sport?.name ?? 'Game';
    let scoreText: string;
    if ('home_score' in item) {
      scoreText = `${item.home_team} ${item.home_score} - ${item.away_score} ${item.away_team}`;
    } else {
      scoreText = `${item.team_a_name} ${item.team_a_score} - ${item.team_b_score} ${item.team_b_name}`;
    }
    try {
      await Share.share({ message: `${name}: ${scoreText} -- tracked with Point!` });
    } catch {
      // User cancelled
    }
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const allItems: Array<{ type: 'score'; data: SportScore } | { type: 'game'; data: Game }> = [
    ...completedScores.map(s => ({ type: 'score' as const, data: s })),
    ...games.map(g => ({ type: 'game' as const, data: g })),
  ].sort((a, b) => {
    const dateA = a.type === 'score' ? a.data.completed_at ?? a.data.created_at : a.data.ended_at ?? a.data.started_at;
    const dateB = b.type === 'score' ? b.data.completed_at ?? b.data.created_at : b.data.ended_at ?? b.data.started_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={[Typography.title3, { color: colors.text }]}>
          {friendId ? 'Head to Head' : 'Game History'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {h2h && (
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.h2hCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.h2hRow}>
            <View style={styles.h2hStat}>
              <Text style={[styles.h2hValue, { color: '#059669' }]}>{h2h.wins}</Text>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Wins</Text>
            </View>
            <View style={styles.h2hStat}>
              <Text style={[styles.h2hValue, { color: colors.textTertiary }]}>{h2h.draws}</Text>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Draws</Text>
            </View>
            <View style={styles.h2hStat}>
              <Text style={[styles.h2hValue, { color: '#DC2626' }]}>{h2h.losses}</Text>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Losses</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.xxxl }} />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => `${item.type}-${item.data.id}`}
          contentContainerStyle={[styles.listContent, allItems.length === 0 && { flex: 1 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          renderItem={({ item, index }) => {
            const isScore = item.type === 'score';
            const sportId = isScore ? item.data.sport_type : item.data.sport;
            const sport = getSportById(sportId);
            const Icon = sport?.icon;
            const homeTeam = isScore ? item.data.home_team : item.data.team_a_name;
            const awayTeam = isScore ? item.data.away_team : item.data.team_b_name;
            const homeScore = isScore ? item.data.home_score : item.data.team_a_score;
            const awayScore = isScore ? item.data.away_score : item.data.team_b_score;
            const date = isScore
              ? item.data.completed_at ?? item.data.created_at
              : item.data.ended_at ?? item.data.started_at;
            const winner = !isScore
              ? item.data.winner
              : homeScore > awayScore ? 'team_a' : awayScore > homeScore ? 'team_b' : 'draw';

            return (
              <Animated.View entering={FadeInDown.delay(index * 30)}>
                <View style={[styles.gameCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                  <View style={styles.gameHeader}>
                    <View style={styles.sportBadge}>
                      {Icon && <Icon size={14} color={sport?.accentColor ?? colors.textSecondary} strokeWidth={2} />}
                      <Text style={[Typography.caption1, { color: sport?.accentColor ?? colors.textSecondary, fontWeight: '600', marginLeft: Spacing.xs }]}>
                        {sport?.name ?? sportId}
                      </Text>
                    </View>
                    <View style={styles.dateRow}>
                      <Clock size={12} color={colors.textTertiary} strokeWidth={2} />
                      <Text style={[Typography.caption2, { color: colors.textTertiary, marginLeft: 2 }]}>
                        {formatDate(date)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scoreRow}>
                    <View style={styles.teamSide}>
                      <Text style={[Typography.footnote, { color: colors.textSecondary }]} numberOfLines={1}>{homeTeam}</Text>
                      <Text style={[styles.gameScore, { color: winner === 'team_a' ? '#059669' : colors.text }]}>{homeScore}</Text>
                    </View>
                    <Text style={[Typography.caption1, { color: colors.textTertiary }]}>vs</Text>
                    <View style={styles.teamSide}>
                      <Text style={[Typography.footnote, { color: colors.textSecondary }]} numberOfLines={1}>{awayTeam}</Text>
                      <Text style={[styles.gameScore, { color: winner === 'team_b' ? '#059669' : colors.text }]}>{awayScore}</Text>
                    </View>
                  </View>

                  <View style={styles.gameActions}>
                    <Pressable
                      style={[styles.gameActionBtn, { backgroundColor: colors.surfaceSecondary }]}
                      onPress={() => handleShare(item.data)}
                    >
                      <Share2 size={14} color={colors.textSecondary} strokeWidth={2} />
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: Spacing.xs }]}>Share</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.gameActionBtn, { backgroundColor: (sport?.accentColor ?? colors.textSecondary) + '15' }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.back();
                      }}
                    >
                      <Repeat size={14} color={sport?.accentColor ?? colors.textSecondary} strokeWidth={2} />
                      <Text style={[Typography.caption2, { color: sport?.accentColor ?? colors.textSecondary, marginLeft: Spacing.xs }]}>Rematch</Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Trophy size={48} color={colors.textTertiary} strokeWidth={1.5} />
              <Text style={[Typography.headline, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
                No completed games yet
              </Text>
              <Text style={[Typography.footnote, { color: colors.textTertiary, textAlign: 'center', marginTop: Spacing.xs }]}>
                Play some games and they will show up here
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  h2hCard: { marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md },
  h2hRow: { flexDirection: 'row', justifyContent: 'space-around' },
  h2hStat: { alignItems: 'center' },
  h2hValue: { fontSize: 28, fontWeight: '700' },
  listContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.massive },
  gameCard: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.sm },
  gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sportBadge: { flexDirection: 'row', alignItems: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, marginBottom: Spacing.md },
  teamSide: { alignItems: 'center', flex: 1 },
  gameScore: { fontSize: 36, fontWeight: '200', marginTop: Spacing.xs },
  gameActions: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  gameActionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  emptyState: { alignItems: 'center', justifyContent: 'center', flex: 1 },
});
