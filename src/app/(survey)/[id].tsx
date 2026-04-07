import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  ChevronLeft,
  Share2,
  Link,
  Copy,
  MessagesSquare,
  HelpCircle,
  UserCircle,
  List,
  Star,
  Type,
  Gauge,
  CheckCircle2,
  Pencil,
  XCircle,
  Eye,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';

interface Survey {
  id: string;
  title: string;
  description: string;
  status: string;
  allow_anonymous: boolean;
  created_at: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  sort_order: number;
}

interface ResponseRow {
  id: string;
  respondent_id: string | null;
  answers: Record<string, unknown>[] | null;
  completed_at: string | null;
  created_at: string;
}

const QUESTION_TYPE_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
  multiple_choice: { label: 'Multiple Choice', icon: List },
  rating: { label: 'Rating', icon: Star },
  text: { label: 'Text', icon: Type },
  nps: { label: 'NPS Score', icon: Gauge },
  yes_no: { label: 'Yes / No', icon: CheckCircle2 },
};

export default function SurveyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const toast = useToast();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [showResponses, setShowResponses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  const shareLink = `https://surve.app/s/${id}`;

  const fetchSurveyData = useCallback(async () => {
    setError(null);
    try {
      const [surveyRes, questionsRes, responsesRes] = await Promise.all([
        supabase.from('surveys').select('*').eq('id', id).single(),
        supabase.from('questions').select('*').eq('survey_id', id).order('sort_order'),
        supabase.from('responses').select('id, respondent_id, answers, completed_at, created_at').eq('survey_id', id).order('created_at', { ascending: false }).limit(50),
      ]);

      if (surveyRes.error) throw surveyRes.error;
      if (questionsRes.error) throw questionsRes.error;

      setSurvey(surveyRes.data);
      setQuestions(questionsRes.data || []);
      setResponses((responsesRes.data as ResponseRow[] | null) ?? []);
      setResponseCount((responsesRes.data ?? []).length);
    } catch (err: any) {
      console.error('Error fetching survey:', err);
      setError(err?.message || 'Failed to load survey details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSurveyData();
  }, [fetchSurveyData]);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Check out my survey: ${survey?.title}\n${shareLink}`,
        url: shareLink,
      });
    } catch {
      // User cancelled
    }
  };

  const handleCopyLink = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await Clipboard.setStringAsync(shareLink);
      toast.success('Copied!', 'Survey link copied to clipboard.');
    } catch {
      // Fallback to Share
      try {
        await Share.share({ message: shareLink, url: shareLink });
      } catch {
        // User cancelled
      }
    }
  };

  const handleCloseSurvey = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Close Survey',
      'This will stop accepting new responses. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Survey',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setClosing(true);
            try {
              const { error } = await supabase
                .from('surveys')
                .update({ status: 'closed' })
                .eq('id', id);
              if (error) throw error;
              setSurvey((prev) => (prev ? { ...prev, status: 'closed' } : prev));
              toast.success('Survey Closed', 'No more responses will be accepted.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to close survey.');
            } finally {
              setClosing(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleResponses = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowResponses(!showResponses);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F9FAFB' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#475569" />
          <Text style={[Typography.footnote, { color: colors.textSecondary, marginTop: Spacing.md }]}>Loading survey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !survey) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F9FAFB' }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={isDark ? colors.text : '#374151'} strokeWidth={2} />
          </Pressable>
          <View style={styles.topBarActions} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: isDark ? colors.text : '#111827' }]}>
            {error || 'Survey not found'}
          </Text>
          <Pressable
            onPress={() => { setLoading(true); fetchSurveyData(); }}
            style={[styles.retryBtn, { backgroundColor: colors.primary + '15' }]}
          >
            <Text style={[Typography.footnote, { color: colors.primary, fontWeight: '600' }]}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = survey.status === 'active';
  const createdDate = new Date(survey.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F9FAFB' }]}>
      {/* Top bar */}
      <Animated.View entering={FadeInUp.duration(400)} style={styles.topBar}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={isDark ? colors.text : '#374151'} strokeWidth={2} />
        </Pressable>
        <View style={styles.topBarActions}>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.topBarBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Share2 size={22} color="#475569" strokeWidth={2} />
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title & Status */}
        <Animated.View entering={FadeInDown.duration(500).springify()}>
          <Text style={[styles.title, { color: isDark ? colors.text : '#111827' }]}>{survey.title}</Text>
          <View style={styles.metaRow}>
            <View
              style={[styles.statusBadge, { backgroundColor: isActive ? colors.successLight : colors.errorLight }]}
            >
              <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.error }]} />
              <Text style={[styles.statusText, { color: isActive ? colors.success : colors.error }]}>
                {isActive ? 'Active' : 'Closed'}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: isDark ? colors.textSecondary : '#9CA3AF' }]}>
              {createdDate}
            </Text>
          </View>
          {survey.description ? (
            <Text style={[styles.description, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
              {survey.description}
            </Text>
          ) : null}
        </Animated.View>

        {/* Share Link */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100).springify()}
          style={[styles.shareLinkCard, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
        >
          <View style={styles.shareLinkHeader}>
            <Link size={18} color="#475569" strokeWidth={2} />
            <Text style={[styles.shareLinkLabel, { color: '#475569' }]}>Share Link</Text>
          </View>
          <Text style={[styles.shareLinkUrl, { color: isDark ? '#94A3B8' : '#334155' }]} numberOfLines={1}>
            {shareLink}
          </Text>
          <Pressable
            onPress={handleCopyLink}
            style={({ pressed }) => [styles.copyButton, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Copy size={16} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.copyButtonText}>Copy Link</Text>
          </Pressable>
        </Animated.View>

        {/* Analytics Summary */}
        <Animated.View entering={FadeInDown.duration(500).delay(200).springify()} style={styles.analyticsRow}>
          <View style={[styles.analyticsCard, { backgroundColor: cardBg, borderColor }]}>
            <MessagesSquare size={24} color="#475569" strokeWidth={2} />
            <Text style={[styles.analyticsNumber, { color: isDark ? colors.text : '#111827' }]}>
              {responseCount}
            </Text>
            <Text style={[styles.analyticsLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
              Responses
            </Text>
          </View>
          <View style={[styles.analyticsCard, { backgroundColor: cardBg, borderColor }]}>
            <HelpCircle size={24} color="#475569" strokeWidth={2} />
            <Text style={[styles.analyticsNumber, { color: isDark ? colors.text : '#111827' }]}>
              {questions.length}
            </Text>
            <Text style={[styles.analyticsLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
              Questions
            </Text>
          </View>
          <View style={[styles.analyticsCard, { backgroundColor: cardBg, borderColor }]}>
            <UserCircle size={24} color="#475569" strokeWidth={2} />
            <Text style={[styles.analyticsNumber, { color: isDark ? colors.text : '#111827' }]}>
              {survey.allow_anonymous ? 'Yes' : 'No'}
            </Text>
            <Text style={[styles.analyticsLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
              Anonymous
            </Text>
          </View>
        </Animated.View>

        {/* Questions */}
        <Animated.View entering={FadeInDown.duration(500).delay(300).springify()}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#111827' }]}>
            Questions ({questions.length})
          </Text>
        </Animated.View>

        {questions.map((question, index) => {
          const typeInfo = QUESTION_TYPE_LABELS[question.type] || {
            label: question.type,
            icon: HelpCircle,
          };
          const TypeIcon = typeInfo.icon;
          return (
            <Animated.View
              key={question.id}
              entering={FadeInDown.duration(400).delay(350 + index * 60).springify()}
              style={[styles.questionCard, { backgroundColor: cardBg, borderColor }]}
            >
              <View style={styles.questionTop}>
                <View style={styles.questionNumberBadge}>
                  <Text style={styles.questionNumberText}>{index + 1}</Text>
                </View>
                <View style={[styles.questionTypeBadge, { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9' }]}>
                  <TypeIcon size={14} color={isDark ? colors.textSecondary : '#475569'} strokeWidth={2} />
                  <Text style={[styles.questionTypeText, { color: isDark ? colors.textSecondary : '#475569' }]}>{typeInfo.label}</Text>
                </View>
              </View>
              <Text style={[styles.questionText, { color: isDark ? colors.text : '#111827' }]}>
                {question.text}
              </Text>
            </Animated.View>
          );
        })}

        {/* Responses Section */}
        {responseCount > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(450).springify()}>
            <Pressable
              onPress={handleToggleResponses}
              style={({ pressed }) => [
                styles.actionButton,
                { borderWidth: 1.5, borderColor, opacity: pressed ? 0.8 : 1, marginTop: Spacing.xl },
              ]}
            >
              <Eye size={20} color="#475569" strokeWidth={2} />
              <Text style={styles.editButtonText}>
                {showResponses ? 'Hide Responses' : `View ${responseCount} Responses`}
              </Text>
            </Pressable>

            {showResponses && responses.map((resp, idx) => (
              <Animated.View
                key={resp.id}
                entering={FadeInDown.duration(300).delay(idx * 40)}
                style={[styles.responseCard, { backgroundColor: cardBg, borderColor }]}
              >
                <View style={styles.responseHeader}>
                  <Text style={[Typography.caption1, { color: isDark ? colors.textSecondary : '#6B7280', fontWeight: '600' }]}>
                    Response #{idx + 1}
                  </Text>
                  <Text style={[Typography.caption2, { color: isDark ? colors.textTertiary : '#9CA3AF' }]}>
                    {resp.completed_at
                      ? new Date(resp.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'In progress'}
                  </Text>
                </View>
                {Array.isArray(resp.answers) && resp.answers.length > 0 ? (
                  resp.answers.map((answer: any, aIdx: number) => {
                    const q = questions.find(qq => qq.id === answer?.question_id);
                    return (
                      <View key={aIdx} style={styles.answerRow}>
                        <Text style={[Typography.caption1, { color: isDark ? colors.textSecondary : '#6B7280' }]} numberOfLines={1}>
                          {q?.text ?? `Q${aIdx + 1}`}
                        </Text>
                        <Text style={[Typography.footnote, { color: isDark ? colors.text : '#111827', fontWeight: '500' }]}>
                          {typeof answer?.value === 'object' ? JSON.stringify(answer.value) : String(answer?.value ?? '--')}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={[Typography.caption1, { color: isDark ? colors.textTertiary : '#9CA3AF', marginTop: Spacing.xs }]}>
                    No answers recorded
                  </Text>
                )}
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {/* Action buttons */}
        <Animated.View entering={FadeInDown.duration(500).delay(500).springify()} style={styles.actionsSection}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toast.info('Coming Soon', 'Survey editing is not yet available.');
            }}
            style={({ pressed }) => [
              styles.actionButton,
              styles.editButton,
              { borderColor, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Pencil size={20} color="#475569" strokeWidth={2} />
            <Text style={styles.editButtonText}>Edit Survey</Text>
          </Pressable>

          {isActive && (
            <Pressable
              onPress={handleCloseSurvey}
              disabled={closing}
              style={({ pressed }) => [
                styles.actionButton,
                styles.closeButton,
                { opacity: pressed || closing ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              {closing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <XCircle size={20} color="#FFFFFF" strokeWidth={2} />
              )}
              <Text style={styles.closeButtonText}>{closing ? 'Closing...' : 'Close Survey'}</Text>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: Typography.body.fontSize, fontWeight: '600' },
  retryBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, marginTop: Spacing.lg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topBarActions: { flexDirection: 'row', gap: Spacing.sm },
  topBarBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: Typography.caption1.fontSize },
  description: { fontSize: Typography.footnote.fontSize, lineHeight: 22, marginTop: Spacing.md },
  shareLinkCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginTop: Spacing.xl, gap: Spacing.sm },
  shareLinkHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareLinkLabel: { fontSize: Typography.footnote.fontSize, fontWeight: '700' },
  shareLinkUrl: { fontSize: Typography.footnote.fontSize, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#475569', paddingVertical: 10, borderRadius: BorderRadius.md, gap: 6 },
  copyButtonText: { color: '#FFFFFF', fontSize: Typography.footnote.fontSize, fontWeight: '600' },
  analyticsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  analyticsCard: { flex: 1, alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, gap: 4 },
  analyticsNumber: { fontSize: 22, fontWeight: '800' },
  analyticsLabel: { fontSize: 11, fontWeight: '600' },
  sectionTitle: { fontSize: Typography.title3.fontSize, fontWeight: '700', marginTop: Spacing.xl, marginBottom: Spacing.md },
  questionCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
  questionTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  questionNumberBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#475569', justifyContent: 'center', alignItems: 'center' },
  questionNumberText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  questionTypeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  questionTypeText: { fontSize: 12, fontWeight: '600' },
  questionText: { fontSize: Typography.body.fontSize, fontWeight: '500', lineHeight: 22 },
  responseCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginTop: Spacing.sm },
  responseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  answerRow: { paddingVertical: Spacing.xs, gap: 2 },
  actionsSection: { marginTop: Spacing.xl, gap: Spacing.md },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  editButton: { borderWidth: 1.5, borderColor: '#475569' },
  editButtonText: { color: '#475569', fontSize: Typography.body.fontSize, fontWeight: '700' },
  closeButton: { backgroundColor: '#EF4444', ...Shadows.sm },
  closeButtonText: { color: '#FFFFFF', fontSize: Typography.body.fontSize, fontWeight: '700' },
});
