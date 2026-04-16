import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Switch,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Star, Camera, X, Lock, Globe } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
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
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

const MAX_COMMENT = 140;
const MAX_PHOTOS = 3;
const DRAFT_KEY_PREFIX = 'surve:review-draft:';

const CREATOR_TAGS = [
  'Great host',
  'Welcoming staff',
  'Beautiful venue',
  'Exceeded expectations',
  'Easy communication',
  'Would return',
];

const BUSINESS_TAGS = [
  'Professional',
  'Creative content',
  'High engagement',
  'On time',
  'Follows brief',
  'Great personality',
];

export default function ReviewScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const user = useStore((s) => s.user);
  const reducedMotion = useReducedMotion();
  const { tryUnlock } = useMilestones();

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  const restoredRef = useRef(false);

  useEffect(() => {
    if (bookingId) {
      api.getBookingById(bookingId).then(setBooking);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY_PREFIX + bookingId);
        if (raw) {
          const draft = JSON.parse(raw);
          if (typeof draft.rating === 'number') setRating(draft.rating);
          if (typeof draft.comment === 'string') setComment(draft.comment);
          if (Array.isArray(draft.tags)) setSelectedTags(draft.tags);
          if (typeof draft.isPublic === 'boolean') setIsPublic(draft.isPublic);
        }
      } catch {
        // ignore corrupt draft
      } finally {
        restoredRef.current = true;
      }
    })();
  }, [bookingId]);

  useEffect(() => {
    if (!restoredRef.current || !bookingId) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(
        DRAFT_KEY_PREFIX + bookingId,
        JSON.stringify({ rating, comment, tags: selectedTags, isPublic }),
      ).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [rating, comment, selectedTags, isPublic, bookingId]);

  const tags = user?.role === 'creator' ? CREATOR_TAGS : BUSINESS_TAGS;

  const toggleTag = useCallback((tag: string) => {
    haptics.tap();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, [haptics]);

  const pickPhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) {
      toast.warning(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    haptics.tap();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }, [photos.length, haptics]);

  const removePhoto = useCallback((uri: string) => {
    haptics.tap();
    setPhotos((prev) => prev.filter((p) => p !== uri));
  }, [haptics]);

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
        tags: selectedTags,
        is_public: isPublic,
        photos,
        verified_booking_id: bookingId,
        reviewer_role: user.role,
      });

      if (!success) throw new Error('Failed');
      await AsyncStorage.removeItem(DRAFT_KEY_PREFIX + bookingId).catch(() => {});
      haptics.success();
      await tryUnlock('first_review_left');
      router.back();
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }, [user, booking, rating, comment, selectedTags, isPublic, photos, bookingId, haptics, tryUnlock, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Leave a Review" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.huge },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            How was it?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Rate your experience with this booking
          </Text>
        </Animated.View>

        {/* Stars */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(600).delay(200)}
          style={styles.stars}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <PressableScale
              key={n}
              onPress={() => {
                haptics.confirm();
                setRating(n);
              }}
              hitSlop={8}
              scaleValue={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${n} star${n > 1 ? 's' : ''}`}
              accessibilityState={{ selected: n <= rating }}
            >
              <Star
                size={52}
                color={n <= rating ? colors.rating : colors.border}
                fill={n <= rating ? colors.rating : 'transparent'}
                strokeWidth={1.5}
              />
            </PressableScale>
          ))}
        </Animated.View>

        {/* Tag chips */}
        <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(600).delay(300)}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>What stood out?</Text>
          <View style={styles.tagsRow}>
            {tags.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <PressableScale
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  scaleValue={0.93}
                  accessibilityRole="button"
                  accessibilityLabel={tag}
                  accessibilityState={{ selected }}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: selected ? colors.onPrimary : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {tag}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>

        {/* Comment */}
        <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(600).delay(400)}>
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

        {/* Photos */}
        <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(600).delay(500)}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Photos{' '}
            <Text style={{ color: colors.textSecondary }}>(optional, up to {MAX_PHOTOS})</Text>
          </Text>
          <View style={styles.photosRow}>
            {photos.map((uri) => (
              <View key={uri} style={[styles.photoThumb, { borderColor: colors.border }]}>
                <Image source={{ uri }} style={styles.photoImage} />
                <Pressable
                  onPress={() => removePhoto(uri)}
                  style={[styles.photoRemove, { backgroundColor: colors.error }]}
                  accessibilityLabel="Remove photo"
                  hitSlop={8}
                >
                  <X size={12} color="#FFF" strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <PressableScale
                onPress={pickPhoto}
                scaleValue={0.93}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
                style={[
                  styles.photoAdd,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    ...Shadows.sm,
                  },
                ]}
              >
                <Camera size={24} color={colors.textSecondary} strokeWidth={1.5} />
                <Text style={[styles.photoAddText, { color: colors.textSecondary }]}>
                  Add photo
                </Text>
              </PressableScale>
            )}
          </View>
        </Animated.View>

        {/* Public/Private toggle */}
        <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(600).delay(600)}>
          <View
            style={[
              styles.toggleRow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...Shadows.sm,
              },
            ]}
          >
            <View style={styles.toggleLeft}>
              {isPublic ? (
                <Globe size={20} color={colors.primary} strokeWidth={1.5} />
              ) : (
                <Lock size={20} color={colors.textSecondary} strokeWidth={1.5} />
              )}
              <View style={styles.toggleTextGroup}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>
                  {isPublic ? 'Public review' : 'Private review'}
                </Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                  {isPublic
                    ? 'Visible on the platform'
                    : 'Only shared with the recipient'}
                </Text>
              </View>
            </View>
            <Switch
              value={isPublic}
              onValueChange={(v) => {
                haptics.tap();
                setIsPublic(v);
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.onPrimary}
              accessibilityLabel={isPublic ? 'Make review private' : 'Make review public'}
            />
          </View>
        </Animated.View>

        {/* Submit */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(600).delay(700)}
          style={styles.footer}
        >
          <Button
            title="Submit Review"
            onPress={handleSubmit}
            size="lg"
            fullWidth
            loading={submitting}
            disabled={submitting || rating === 0}
            accessibilityLabel="Submit review"
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
    gap: Spacing.xxl,
  },
  title: { ...Typography.title1, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  sectionLabel: {
    ...Typography.headline,
    marginBottom: Spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  tagText: {
    ...Typography.subheadline,
    fontWeight: '600' as const,
  },
  photosRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  photoAddText: {
    ...Typography.caption1,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  toggleTextGroup: {
    flex: 1,
  },
  toggleTitle: {
    ...Typography.callout,
    fontWeight: '600' as const,
  },
  toggleSub: {
    ...Typography.caption1,
    marginTop: 2,
  },
  footer: {
    paddingBottom: Spacing.md,
  },
});
