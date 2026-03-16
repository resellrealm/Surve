import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  useColorScheme,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  List,
  Star,
  Type,
  Gauge,
  CheckCircle2,
  Trash2,
  PlusCircle,
  ArrowRight,
  Rocket,
  UserCircle,
  Users,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';

type QuestionType = 'multiple_choice' | 'rating' | 'text' | 'nps' | 'yes_no';

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
}

import type { LucideIcon } from 'lucide-react-native';

const QUESTION_TYPES: { value: QuestionType; label: string; icon: LucideIcon }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: List },
  { value: 'rating', label: 'Rating', icon: Star },
  { value: 'text', label: 'Text', icon: Type },
  { value: 'nps', label: 'NPS Score', icon: Gauge },
  { value: 'yes_no', label: 'Yes / No', icon: CheckCircle2 },
];

export default function CreateSurveyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { session } = useStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState('');
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});

  // Step 2
  const [questions, setQuestions] = useState<Question[]>([]);

  // Step 3
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [maxResponses, setMaxResponses] = useState(false);

  const inputBg = isDark ? '#1F2937' : '#F9FAFB';
  const inputBorder = isDark ? '#374151' : '#E5E7EB';
  const inputText = isDark ? colors.text : '#111827';
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';

  const addQuestion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'multiple_choice',
      text: '',
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const validateTitle = useCallback((value: string) => {
    if (!value.trim()) {
      setTitleError('Please enter a survey title');
      return false;
    }
    if (value.trim().length < 3) {
      setTitleError('Title must be at least 3 characters');
      return false;
    }
    setTitleError('');
    return true;
  }, []);

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    if (titleError) validateTitle(value);
  }, [titleError, validateTitle]);

  const nextStep = () => {
    if (step === 1) {
      if (!validateTitle(title)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }
    if (step === 2 && questions.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('No Questions', 'Please add at least one question.');
      return;
    }
    if (step === 2) {
      const errors: Record<string, string> = {};
      questions.forEach((q) => {
        if (!q.text.trim()) errors[q.id] = 'Question text is required';
      });
      if (Object.keys(errors).length > 0) {
        setQuestionErrors(errors);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      setQuestionErrors({});
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(step + 1);
  };

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(step - 1);
  };

  const publishSurvey = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (!session?.user?.id) {
      Alert.alert('Error', 'You must be signed in to publish a survey.');
      return;
    }

    setLoading(true);

    try {
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          title: title.trim(),
          description: description.trim(),
          user_id: session.user.id,
          status: 'active',
          allow_anonymous: allowAnonymous,
          max_responses: maxResponses ? 100 : null,
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      const questionsToInsert = questions.map((q, index) => ({
        survey_id: survey.id,
        type: q.type,
        text: q.text.trim(),
        sort_order: index,
        options: q.options || null,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Published!', 'Your survey is now live.', [
        { text: 'View Survey', onPress: () => router.push(`/(survey)/${survey.id}`) },
        { text: 'OK', onPress: () => router.back() },
      ]);

      // Reset form
      setTitle('');
      setDescription('');
      setQuestions([]);
      setAllowAnonymous(true);
      setMaxResponses(false);
      setStep(1);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to publish survey.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={[
            styles.stepDot,
            {
              backgroundColor: s === step ? '#475569' : s < step ? '#A78BFA' : isDark ? '#374151' : '#E5E7EB',
              width: s === step ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <Animated.View entering={SlideInRight.duration(300)} exiting={SlideOutLeft.duration(300)} style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: isDark ? colors.text : '#111827' }]}>Survey Details</Text>
      <Text style={[styles.stepSubtitle, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
        Give your survey a name and description
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: isDark ? colors.textSecondary : '#374151' }]}>Title</Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: inputBg,
              borderColor: titleError ? '#EF4444' : inputBorder,
              color: inputText,
            },
          ]}
          placeholder="e.g. Customer Satisfaction Survey"
          placeholderTextColor={placeholderColor}
          value={title}
          onChangeText={handleTitleChange}
          onBlur={() => title.length > 0 && validateTitle(title)}
        />
        {titleError ? (
          <Animated.Text
            entering={FadeInDown.duration(200)}
            style={styles.errorText}
          >
            {titleError}
          </Animated.Text>
        ) : null}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: isDark ? colors.textSecondary : '#374151' }]}>Description (optional)</Text>
        <TextInput
          style={[
            styles.textInput,
            styles.textArea,
            { backgroundColor: inputBg, borderColor: inputBorder, color: inputText },
          ]}
          placeholder="What is this survey about?"
          placeholderTextColor={placeholderColor}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={SlideInRight.duration(300)} exiting={SlideOutLeft.duration(300)} style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: isDark ? colors.text : '#111827' }]}>Questions</Text>
      <Text style={[styles.stepSubtitle, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
        Add questions to your survey ({questions.length} added)
      </Text>

      {questions.map((question, index) => (
        <Animated.View
          key={question.id}
          entering={FadeInDown.duration(400).delay(index * 50)}
          style={[styles.questionCard, { backgroundColor: cardBg, borderColor: inputBorder }]}
        >
          <View style={styles.questionHeader}>
            <Text style={[styles.questionNumber, { color: '#475569' }]}>Q{index + 1}</Text>
            <Pressable onPress={() => removeQuestion(question.id)} hitSlop={8}>
              <Trash2 size={20} color="#EF4444" strokeWidth={2} />
            </Pressable>
          </View>

          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: inputBg,
                borderColor: questionErrors[question.id] ? '#EF4444' : inputBorder,
                color: inputText,
              },
            ]}
            placeholder="Enter your question"
            placeholderTextColor={placeholderColor}
            value={question.text}
            onChangeText={(text) => {
              updateQuestion(question.id, { text });
              if (questionErrors[question.id] && text.trim()) {
                setQuestionErrors((prev) => { const next = { ...prev }; delete next[question.id]; return next; });
              }
            }}
          />
          {questionErrors[question.id] ? (
            <Animated.Text entering={FadeInDown.duration(200)} style={styles.errorText}>
              {questionErrors[question.id]}
            </Animated.Text>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {QUESTION_TYPES.map((type) => (
              <Pressable
                key={type.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  updateQuestion(question.id, { type: type.value });
                }}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: question.type === type.value ? '#475569' : isDark ? '#374151' : '#F3F4F6',
                    borderColor: question.type === type.value ? '#475569' : inputBorder,
                  },
                ]}
              >
                {React.createElement(type.icon, {
                  size: 14,
                  color: question.type === type.value ? '#FFFFFF' : isDark ? colors.textSecondary : '#6B7280',
                  strokeWidth: 2,
                })}
                <Text
                  style={[
                    styles.typeChipText,
                    { color: question.type === type.value ? '#FFFFFF' : isDark ? colors.textSecondary : '#6B7280' },
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      ))}

      <Pressable
        onPress={addQuestion}
        style={({ pressed }) => [
          styles.addQuestionButton,
          { borderColor: '#475569', opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <PlusCircle size={22} color="#475569" strokeWidth={2} />
        <Text style={styles.addQuestionText}>Add Question</Text>
      </Pressable>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={SlideInRight.duration(300)} exiting={SlideOutLeft.duration(300)} style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: isDark ? colors.text : '#111827' }]}>Settings</Text>
      <Text style={[styles.stepSubtitle, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
        Configure your survey preferences
      </Text>

      <View style={[styles.settingRow, { backgroundColor: cardBg, borderColor: inputBorder }]}>
        <View style={styles.settingInfo}>
          <UserCircle size={22} color="#475569" strokeWidth={2} />
          <View style={styles.settingTextGroup}>
            <Text style={[styles.settingLabel, { color: isDark ? colors.text : '#111827' }]}>
              Allow Anonymous Responses
            </Text>
            <Text style={[styles.settingDesc, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
              Respondents won't need to identify themselves
            </Text>
          </View>
        </View>
        <Switch
          value={allowAnonymous}
          onValueChange={(v) => {
            Haptics.selectionAsync();
            setAllowAnonymous(v);
          }}
          trackColor={{ false: '#D1D5DB', true: '#94A3B8' }}
          thumbColor={allowAnonymous ? '#475569' : '#F9FAFB'}
        />
      </View>

      <View style={[styles.settingRow, { backgroundColor: cardBg, borderColor: inputBorder }]}>
        <View style={styles.settingInfo}>
          <Users size={22} color="#475569" strokeWidth={2} />
          <View style={styles.settingTextGroup}>
            <Text style={[styles.settingLabel, { color: isDark ? colors.text : '#111827' }]}>
              Limit Responses
            </Text>
            <Text style={[styles.settingDesc, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
              Cap at 100 maximum responses
            </Text>
          </View>
        </View>
        <Switch
          value={maxResponses}
          onValueChange={(v) => {
            Haptics.selectionAsync();
            setMaxResponses(v);
          }}
          trackColor={{ false: '#D1D5DB', true: '#94A3B8' }}
          thumbColor={maxResponses ? '#475569' : '#F9FAFB'}
        />
      </View>

      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <Text style={[styles.summaryTitle, { color: '#475569' }]}>Survey Summary</Text>
        <Text style={[styles.summaryItem, { color: isDark ? colors.textSecondary : '#4B5563' }]}>
          Title: {title}
        </Text>
        <Text style={[styles.summaryItem, { color: isDark ? colors.textSecondary : '#4B5563' }]}>
          Questions: {questions.length}
        </Text>
        <Text style={[styles.summaryItem, { color: isDark ? colors.textSecondary : '#4B5563' }]}>
          Anonymous: {allowAnonymous ? 'Yes' : 'No'}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F9FAFB' }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? colors.text : '#111827' }]}>Create Survey</Text>
          {renderStepIndicator()}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        {/* Bottom buttons */}
        <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : '#FFFFFF', borderTopColor: inputBorder }]}>
          {step > 1 && (
            <Pressable
              onPress={prevStep}
              style={({ pressed }) => [
                styles.backStepButton,
                { borderColor: inputBorder, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.backStepText, { color: isDark ? colors.text : '#374151' }]}>Back</Text>
            </Pressable>
          )}

          {step < 3 ? (
            <Pressable
              onPress={nextStep}
              style={({ pressed }) => [
                styles.nextButton,
                { flex: step === 1 ? 1 : undefined, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          ) : (
            <Pressable
              onPress={publishSurvey}
              disabled={loading}
              style={({ pressed }) => [
                styles.publishButton,
                { opacity: loading ? 0.7 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Rocket size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.publishButtonText}>Publish Survey</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
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
    marginBottom: Spacing.sm,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  stepSubtitle: {
    fontSize: Typography.footnote.fontSize,
    fontWeight: '500',
    marginTop: -Spacing.sm,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: Typography.footnote.fontSize,
    fontWeight: '600',
    marginLeft: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: Typography.body.fontSize,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  questionCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: Typography.footnote.fontSize,
    fontWeight: '800',
  },
  typeScroll: {
    marginTop: Spacing.xs,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    gap: 4,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  addQuestionText: {
    color: '#475569',
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTextGroup: {
    flex: 1,
  },
  settingLabel: {
    fontSize: Typography.footnote.fontSize,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: Typography.caption1.fontSize,
    marginTop: 2,
  },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  summaryTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  summaryItem: {
    fontSize: Typography.footnote.fontSize,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  backStepButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backStepText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#475569',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    flex: 1,
    ...Shadows.sm,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#475569',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    flex: 1,
    ...Shadows.sm,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    marginTop: 4,
  },
});
