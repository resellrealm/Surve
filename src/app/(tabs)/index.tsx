import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle, ChevronRight, ClipboardList, Plus, Trash2 } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  SlideOutRight,
  Layout as LayoutAnim,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Springs } from '../../constants/theme';
import { Skeleton } from '../../components/ui/Skeleton';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import type { Survey } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SurveyCardSkeleton({ index }: { index: number }) {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];

  return (
    <Animated.View
      entering={FadeIn.delay(index * 100)}
      style={[styles.surveyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
    >
      <View style={styles.surveyCardHeader}>
        <Skeleton width={8} height={8} borderRadius={4} />
        <Skeleton width={60} height={12} style={{ marginLeft: 6 }} />
      </View>
      <Skeleton width="80%" height={20} style={{ marginTop: Spacing.sm }} />
      <Skeleton width="60%" height={16} style={{ marginTop: Spacing.xs }} />
      <View style={[styles.surveyCardFooter, { borderTopColor: colors.borderLight }]}>
        <Skeleton width={100} height={14} />
        <Skeleton width={16} height={16} />
      </View>
    </Animated.View>
  );
}

function SwipeDeleteAction({ onDelete }: { onDelete: () => void }) {
  return (
    <Pressable
      onPress={onDelete}
      style={styles.swipeDeleteAction}
    >
      <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </Pressable>
  );
}

function SurveyCard({
  survey,
  index,
  onDelete,
}: {
  survey: Survey;
  index: number;
  onDelete: (id: string) => void;
}) {
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

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(survey)/${survey.id}`);
  }, [survey.id]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(survey.title, 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(survey.id),
      },
    ]);
  }, [survey.id, survey.title, onDelete]);

  const renderRightActions = () => (
    <SwipeDeleteAction onDelete={() => onDelete(survey.id)} />
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      exiting={SlideOutRight.duration(300)}
      layout={LayoutAnim.springify()}
    >
      <Swipeable
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
        rightThreshold={40}
      >
        <AnimatedPressable
          style={[styles.surveyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }, animatedStyle]}
          onPressIn={() => { scale.value = withSpring(0.97, Springs.snappy); }}
          onPressOut={() => { scale.value = withSpring(1, Springs.snappy); }}
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={500}
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
              <MessageCircle size={14} color={colors.textTertiary} strokeWidth={2} />
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginLeft: 4 }]}>
                {survey.response_count} responses
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
          </View>
        </AnimatedPressable>
      </Swipeable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as 'light' | 'dark'];
  const router = useRouter();
  const { surveys, setSurveys, removeSurvey, user } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchSurveys();
    setRefreshing(false);
  }, [fetchSurveys]);

  const handleDeleteSurvey = useCallback(async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Delete Survey', 'This will permanently delete this survey and all its responses.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          removeSurvey(id);
          await supabase.from('surveys').delete().eq('id', id);
        },
      },
    ]);
  }, [removeSurvey]);

  const activeSurveys = surveys.filter(s => s.status === 'active');
  const draftSurveys = surveys.filter(s => s.status === 'draft');

  const createButtonScale = useSharedValue(1);
  const createButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createButtonScale.value }],
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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

        {loading ? (
          <>
            {[0, 1, 2].map(i => (
              <SurveyCardSkeleton key={i} index={i} />
            ))}
          </>
        ) : surveys.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(300)} style={[styles.emptyState, { backgroundColor: colors.surfaceSecondary }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + '12' }]}>
              <ClipboardList size={40} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={[Typography.headline, { color: colors.text, marginTop: Spacing.lg }]}>
              No surveys yet
            </Text>
            <Text style={[Typography.subheadline, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs }]}>
              Create your first survey and start{'\n'}collecting responses
            </Text>
            <AnimatedPressable
              style={[styles.createButton, { backgroundColor: colors.primary }, createButtonStyle]}
              onPressIn={() => { createButtonScale.value = withSpring(0.95, Springs.snappy); }}
              onPressOut={() => { createButtonScale.value = withSpring(1, Springs.bouncy); }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(tabs)/create');
              }}
            >
              <Plus size={18} color="#FFF" strokeWidth={2.5} />
              <Text style={[Typography.headline, { color: '#FFF' }]}>Create Survey</Text>
            </AnimatedPressable>
          </Animated.View>
        ) : (
          surveys.map((survey, index) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              index={index}
              onDelete={handleDeleteSurvey}
            />
          ))
        )}
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
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
  },
  swipeDeleteAction: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    marginLeft: Spacing.sm,
    gap: 4,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
