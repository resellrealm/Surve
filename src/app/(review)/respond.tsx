import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { MessageSquare, Star } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import * as api from '../../lib/api';
import { toast } from '../../lib/toast';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { Review } from '../../types';

const MAX_RESPONSE = 200;

export default function RespondToReviewScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const user = useStore((s) => s.user);

  const [review, setReview] = useState<Review | null>(null);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reviewId) return;
    api.getReviewById(reviewId).then((r) => {
      setReview(r);
      if (r?.reply_text) setText(r.reply_text);
      setLoading(false);
    });
  }, [reviewId]);

  const isEdit = !!(review?.reply_text);

  const handleSubmit = useCallback(async () => {
    if (!user || !reviewId) return;
    const trimmed = text.trim();
    if (!trimmed) {
      toast.warning('Response cannot be empty');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.upsertReviewReply(reviewId, user.id, trimmed);
      if (!result.ok) throw new Error(result.message);
      haptics.success();
      toast.success(isEdit ? 'Response updated' : 'Response posted');
      router.back();
    } catch {
      toast.error('Failed to save response');
    } finally {
      setSubmitting(false);
    }
  }, [user, reviewId, text, haptics, isEdit, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title={isEdit ? 'Edit Response' : 'Respond to Review'} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.huge },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Review context card */}
        {!loading && review && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(500).delay(80)}
          >
            <View
              style={[
                styles.reviewContext,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...Shadows.sm,
                },
              ]}
            >
              <View style={styles.reviewContextHeader}>
                <Text
                  style={[styles.reviewerName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {review.reviewer_name}
                </Text>
                <View style={styles.starsRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      color={colors.rating}
                      fill={i < review.rating ? colors.rating : 'transparent'}
                      strokeWidth={2}
                    />
                  ))}
                </View>
              </View>
              <Text
                style={[styles.reviewComment, { color: colors.textSecondary }]}
                numberOfLines={4}
              >
                {review.comment}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Response input */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(500).delay(180)}
        >
          <View style={styles.inputLabel}>
            <MessageSquare size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.inputLabelText, { color: colors.text }]}>
              Your response
            </Text>
          </View>
          <Input
            placeholder="Write a professional, helpful response…"
            value={text}
            onChangeText={(t) => setText(t.slice(0, MAX_RESPONSE))}
            multiline
            numberOfLines={5}
            maxLength={MAX_RESPONSE}
            showCharCount
            accessibilityLabel="Response text"
          />
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Responses are visible to everyone who views the review.
            {isEdit ? ' Saving will replace your previous response.' : ''}
          </Text>
        </Animated.View>

        {/* Submit */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(500).delay(280)}
        >
          <Button
            title={isEdit ? 'Update Response' : 'Post Response'}
            onPress={handleSubmit}
            size="lg"
            fullWidth
            loading={submitting}
            disabled={submitting || text.trim().length === 0}
            accessibilityLabel={isEdit ? 'Update response' : 'Post response'}
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    gap: Spacing.xl,
  },
  reviewContext: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  reviewContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  reviewerName: {
    ...Typography.subheadline,
    fontWeight: '600',
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    ...Typography.callout,
    lineHeight: 21,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  inputLabelText: {
    ...Typography.headline,
  },
  hint: {
    ...Typography.caption1,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
});
