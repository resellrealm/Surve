import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Springs } from '../../constants/theme';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import type { Survey } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SurveyCard({ survey, index }: { survey: Survey; index: number }) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const statusColors: Record<string, string> = {
    active: colors.success,
    draft: colors.textTertiary,
    paused: colors.warning,
    closed: colors.error,
  };

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 80).springify()}
      style={[styles.surveyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }, animatedStyle]}
      onPressIn={() => { scale.value = withSpring(0.97, Springs.snappy); }}
      onPressOut={() => { scale.value = withSpring(1, Springs.snappy); }}
      onPress={() => router.push(`/(survey)/${survey.id}`)}
    >
      <View style={styles.surveyCardHeader}>
        <View style={[styles.statusDot, { backgroundColor: statusColors[survey.status] || colors.textTertiary }]} />
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
        </Text>
      </View>
      <Text style={[Typography.headline, { color: colors.text, marginTop: Spacing.sm }]} numberOfLines={2}>
        {survey.title}
      </Text>
      {survey.description && (
        <Text style={[Typography.subheadline, { color: colors.textSecondary, marginTop: Spacing.xs }]} numberOfLines={2}>
          {survey.description}
        </Text>
      )}
      <View style={[styles.surveyCardFooter, { borderTopColor: colors.borderLight }]}>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textTertiary} />
          <Text style={[Typography.caption1, { color: colors.textSecondary, marginLeft: 4 }]}>
            {survey.response_count} responses
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const router = useRouter();
  const { surveys, setSurveys, user } = useStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const session = useStore((s) => s.session);

  const fetchSurveys = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setSurveys(data.map((s: any) => ({ ...s, response_count: s.total_responses ?? 0 })));
    }
  }, [session]);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSurveys();
    setRefreshing(false);
  }, []);

  const activeSurveys = surveys.filter(s => s.status === 'active');
  const draftSurveys = surveys.filter(s => s.status === 'draft');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <View>
          <Text style={[Typography.title2, { color: colors.text }]}>
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </Text>
          <Text style={[Typography.subheadline, { color: colors.textSecondary, marginTop: 2 }]}>
            {surveys.length} surveys · {surveys.reduce((acc, s) => acc + (s.response_count || 0), 0)} total responses
          </Text>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Quick Stats */}
        <Animated.View entering={FadeInRight.delay(200)} style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primaryDark + '15' }]}>
            <Text style={[Typography.title1, { color: colors.primary }]}>{activeSurveys.length}</Text>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[Typography.title1, { color: colors.warning }]}>{draftSurveys.length}</Text>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Drafts</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success + '15' }]}>
            <Text style={[Typography.title1, { color: colors.success }]}>
              {surveys.reduce((acc, s) => acc + (s.response_count || 0), 0)}
            </Text>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Responses</Text>
          </View>
        </Animated.View>

        {/* Survey List */}
        <View style={styles.sectionHeader}>
          <Text style={[Typography.title3, { color: colors.text }]}>My Surveys</Text>
        </View>

        {surveys.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(300)} style={[styles.emptyState, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="clipboard-outline" size={48} color={colors.textTertiary} />
            <Text style={[Typography.headline, { color: colors.text, marginTop: Spacing.lg }]}>
              No surveys yet
            </Text>
            <Text style={[Typography.subheadline, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs }]}>
              Create your first survey and start collecting responses
            </Text>
            <Pressable
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/create')}
            >
              <Text style={[Typography.headline, { color: '#FFF' }]}>Create Survey</Text>
            </Pressable>
          </Animated.View>
        ) : (
          surveys.map((survey, index) => (
            <SurveyCard key={survey.id} survey={survey} index={index} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  surveyCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    ...Shadows.sm,
  },
  surveyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.caption1,
    marginLeft: 6,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  surveyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    borderRadius: BorderRadius.xl,
  },
  createButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
  },
});
