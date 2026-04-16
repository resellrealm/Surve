import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Star, CheckCircle } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { toast } from '../../lib/toast';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import * as api from '../../lib/api';
import { useMilestones } from '../../hooks/useMilestones';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

const MAX_COMMENT = 140;

export default function ReviewScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const user = useStore((s) => s.user);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const { tryUnlock } = useMilestones();
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (bookingId) {
      api.getBookingById(bookingId).then(setBooking);
    }
  }, [bookingId]);

  const handleSubmit = useCallback(async () => {
    if (!user || !booking || rating === 0) {
      toast.warning('Please select a star rating');
      return;
    }
    setSubmitting(true);
    try {
      const targetId =
        user.role === 'creator' ? booking.business_id : booking.creator_id;

      const success = await api.createReview({
        reviewer_id: user.id,
        target_id: targetId,
        rating,
        comment,
      });

      if (!success) throw new Error('Failed');
      haptics.success();
      tryUnlock('first_review_left');
      setDone(true);
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }, [user, booking, rating, comment]);

  if (done) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Review" />
        <View style={styles.centered}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.doneContent}>
            <CheckCircle size={64} color={colors.success} strokeWidth={1.5} />
            <Text style={[styles.doneTitle, { color: colors.text }]} accessibilityRole="header">Thanks!</Text>
            <Text style={[styles.doneSubtitle, { color: colors.textSecondary }]}>
              Your review helps the community
            </Text>
            <Button title="Done" onPress={() => router.back()} size="lg" fullWidth />
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Leave a Review" />

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.huge }]}>
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">How was it?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Rate your experience with this booking
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <PressableScale
              key={n}
              onPress={() => {
                haptics.tap();
                setRating(n);
              }}
              hitSlop={8}
              scaleValue={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${n} star${n > 1 ? 's' : ''}`}
              accessibilityHint="Sets your rating"
              accessibilityState={{ selected: n <= rating }}
            >
              <Star
                size={40}
                color={n <= rating ? colors.rating : colors.border}
                fill={n <= rating ? colors.rating : 'transparent'}
                strokeWidth={2}
              />
            </PressableScale>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <Input
            label="Comment"
            placeholder="Share your experience..."
            value={comment}
            onChangeText={(t) => setComment(t.slice(0, MAX_COMMENT))}
            multiline
            numberOfLines={4}
            maxLength={MAX_COMMENT}
            showCharCount
          />
        </Animated.View>

        <View style={styles.footer}>
          <Button
            title="Submit Review"
            onPress={handleSubmit}
            size="lg"
            fullWidth
            loading={submitting}
            disabled={submitting || rating === 0}
            accessibilityLabel="Submit review"
            accessibilityHint="Submits your star rating and comment"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  title: { ...Typography.title1, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, marginBottom: Spacing.xxl },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  footer: { marginTop: 'auto', paddingTop: Spacing.lg },
  doneContent: { alignItems: 'center', gap: Spacing.lg, width: '100%' },
  doneTitle: { ...Typography.title1 },
  doneSubtitle: { ...Typography.body, textAlign: 'center' },
});
