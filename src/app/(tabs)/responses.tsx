import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  SectionList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MessageSquare, ChevronRight, MessagesSquare } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Skeleton } from '../../components/ui/Skeleton';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { fetchScores } from '../../lib/sportScores';
import { SPORTS } from '../../constants/sports';
import type { SportScore, SportType } from '../../types';

interface SurveyWithResponses {
  id: string;
  title: string;
  status: string;
  created_at: string;
  response_count: number;
}

function getSportName(sportType: SportType): string {
  return SPORTS.find((s) => s.id === sportType)?.name ?? sportType;
}

function getSportAccentColor(sportType: SportType): string {
  return SPORTS.find((s) => s.id === sportType)?.accentColor ?? '#475569';
}

function getSportIcon(sportType: SportType): LucideIcon | null {
  return SPORTS.find((s) => s.id === sportType)?.icon ?? null;
}

export default function ResponsesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { session, setSportScores } = useStore();

  const [surveys, setSurveys] = useState<SurveyWithResponses[]>([]);
  const [scores, setScores] = useState<SportScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const [surveyResult, scoreResult] = await Promise.all([
        supabase
          .from('surveys')
          .select('id, title, status, created_at, responses(count)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        fetchScores(session.user.id),
      ]);

      if (surveyResult.error) throw surveyResult.error;

      const mapped = (surveyResult.data || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        created_at: s.created_at,
        response_count: s.responses?.[0]?.count || 0,
      }));

      setSurveys(mapped);
      setScores(scoreResult);
      setSportScores(scoreResult);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchData();
  };

  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const accentColor = '#475569';

  type SectionItem = { type: 'survey'; data: SurveyWithResponses } | { type: 'score'; data: SportScore };

  const sections: { title: string; data: SectionItem[] }[] = [];

  if (surveys.length > 0) {
    sections.push({
      title: 'Surveys',
      data: surveys.map((s) => ({ type: 'survey' as const, data: s })),
    });
  }

  const completedScores = scores.filter((s) => s.status === 'completed');
  if (completedScores.length > 0) {
    sections.push({
      title: 'Score History',
      data: completedScores.map((s) => ({ type: 'score' as const, data: s })),
    });
  }

  const renderSurveyCard = (item: SurveyWithResponses, index: number) => {
    const date = new Date(item.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <Animated.View entering={FadeInDown.duration(400).delay(index * 80).springify()}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/(survey)/${item.id}`);
          }}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor,
              opacity: pressed ? 0.95 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: isDark ? colors.text : '#111827' }]} numberOfLines={1}>
                {item.title}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === 'active' ? '#ECFDF5' : '#FEF3F2' },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: item.status === 'active' ? '#10B981' : '#EF4444' },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: item.status === 'active' ? '#059669' : '#DC2626' },
                  ]}
                >
                  {item.status === 'active' ? 'Active' : 'Closed'}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardDate, { color: isDark ? colors.textSecondary : '#9CA3AF' }]}>{date}</Text>
          </View>

          <View style={[styles.cardBottom, { borderTopColor: borderColor }]}>
            <View style={styles.responseCount}>
              <MessagesSquare size={18} color={accentColor} strokeWidth={2} />
              <Text style={[styles.responseCountText, { color: isDark ? colors.text : '#374151' }]}>
                {item.response_count} {item.response_count === 1 ? 'response' : 'responses'}
              </Text>
            </View>
            <ChevronRight size={18} color={isDark ? colors.textSecondary : '#9CA3AF'} strokeWidth={2} />
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderScoreCard = (item: SportScore, index: number) => {
    const date = new Date(item.completed_at ?? item.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const sportAccent = getSportAccentColor(item.sport_type);
    const sportName = getSportName(item.sport_type);
    const SportIcon = getSportIcon(item.sport_type);
    const winner = item.home_score > item.away_score ? 'Home' : item.away_score > item.home_score ? 'Away' : 'Draw';

    return (
      <Animated.View entering={FadeInDown.duration(400).delay(index * 80).springify()}>
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                {SportIcon && <SportIcon size={18} color={sportAccent} strokeWidth={2} />}
                <Text style={[styles.cardTitle, { color: isDark ? colors.text : '#111827' }]} numberOfLines={1}>
                  {sportName}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: sportAccent + '15' }]}>
                <Text style={[styles.statusText, { color: sportAccent }]}>
                  {winner}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardDate, { color: isDark ? colors.textSecondary : '#9CA3AF' }]}>{date}</Text>
          </View>

          <View style={[styles.cardBottom, { borderTopColor: borderColor }]}>
            <View style={styles.scoreRow}>
              <Text style={[styles.teamLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
                {item.home_team}
              </Text>
              <Text style={[styles.scoreText, { color: isDark ? colors.text : '#111827' }]}>
                {item.home_score}
              </Text>
              <Text style={[styles.scoreSeparator, { color: isDark ? colors.textTertiary : '#D1D5DB' }]}>–</Text>
              <Text style={[styles.scoreText, { color: isDark ? colors.text : '#111827' }]}>
                {item.away_score}
              </Text>
              <Text style={[styles.teamLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
                {item.away_team}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }: { item: SectionItem; index: number }) => {
    if (item.type === 'survey') {
      return renderSurveyCard(item.data, index);
    }
    return renderScoreCard(item.data, index);
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <Text style={[styles.sectionTitle, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
      {section.title}
    </Text>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.emptyContent}>
        <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <MessagesSquare size={48} color={accentColor} strokeWidth={1.5} />
        </View>
        <Text style={[styles.emptyTitle, { color: isDark ? colors.text : '#111827' }]}>No responses yet</Text>
        <Text style={[styles.emptySubtitle, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
          Create and share a survey to start{'\n'}collecting responses
        </Text>
      </Animated.View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F9FAFB' }]} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? colors.text : '#111827' }]}>Responses</Text>
        </View>
        <View style={styles.listContent}>
          {[0, 1, 2, 3].map((i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(i * 100).duration(400)}
              style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardTitleRow}>
                  <Skeleton width="60%" height={18} />
                  <Skeleton width={60} height={22} borderRadius={12} />
                </View>
                <Skeleton width={80} height={12} style={{ marginTop: 4 }} />
              </View>
              <View style={[styles.cardBottom, { borderTopColor: borderColor }]}>
                <Skeleton width={120} height={16} />
                <Skeleton width={16} height={16} />
              </View>
            </Animated.View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F9FAFB' }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark ? colors.text : '#111827' }]}>Responses</Text>
      </View>

      {sections.length === 0 ? (
        renderEmpty()
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.data.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={accentColor}
              colors={[accentColor]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  cardTop: {
    padding: Spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: Typography.caption2.fontSize,
    marginTop: 4,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  responseCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  responseCountText: {
    fontSize: Typography.footnote.fontSize,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  teamLabel: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: '500',
    flex: 1,
  },
  scoreText: {
    fontSize: Typography.headline.fontSize,
    fontWeight: '700',
  },
  scoreSeparator: {
    fontSize: Typography.headline.fontSize,
    fontWeight: '300',
    marginHorizontal: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.title3.fontSize,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: Typography.footnote.fontSize,
    textAlign: 'center',
    lineHeight: 22,
  },
});
