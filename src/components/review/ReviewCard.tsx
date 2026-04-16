import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Modal,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Star, X, MessageSquare, ShieldCheck, Reply } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { PressableScale } from '../ui/PressableScale';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import {
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
} from '../../constants/theme';
import { formatRelative, formatDateShort } from '../../lib/dateFormat';
import type { Review } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewCardProps {
  review: Review;
  style?: ViewStyle;
  onRespond?: () => void;
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.starRow} accessibilityLabel={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          color={colors.rating}
          fill={i <= rating ? colors.rating : 'transparent'}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );
}

// ─── Photo Lightbox ───────────────────────────────────────────────────────────

function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const { colors } = useTheme();
  const haptics = useHaptics();

  const goNext = useCallback(() => {
    haptics.tap();
    setIndex((i) => Math.min(i + 1, photos.length - 1));
  }, [haptics, photos.length]);

  const goPrev = useCallback(() => {
    haptics.tap();
    setIndex((i) => Math.max(i - 1, 0));
  }, [haptics]);

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(150)}
        style={[styles.lightboxOverlay, { backgroundColor: 'rgba(0,0,0,0.92)' }]}
      >
        {/* Close */}
        <PressableScale
          onPress={() => { haptics.tap(); onClose(); }}
          style={styles.lightboxClose}
          hitSlop={12}
          accessibilityLabel="Close photo"
          accessibilityRole="button"
        >
          <X size={24} color="#FFF" strokeWidth={2} />
        </PressableScale>

        {/* Image */}
        <Image
          source={{ uri: photos[index] }}
          style={styles.lightboxImage}
          resizeMode="contain"
          accessibilityLabel={`Review photo ${index + 1} of ${photos.length}`}
        />

        {/* Nav strip */}
        {photos.length > 1 && (
          <View style={styles.lightboxNav}>
            <PressableScale
              onPress={goPrev}
              style={[styles.lightboxNavBtn, { opacity: index === 0 ? 0.3 : 1 }]}
              disabled={index === 0}
              accessibilityLabel="Previous photo"
            >
              <Text style={styles.lightboxNavText}>‹</Text>
            </PressableScale>
            <Text style={styles.lightboxCounter}>
              {index + 1} / {photos.length}
            </Text>
            <PressableScale
              onPress={goNext}
              style={[styles.lightboxNavBtn, { opacity: index === photos.length - 1 ? 0.3 : 1 }]}
              disabled={index === photos.length - 1}
              accessibilityLabel="Next photo"
            >
              <Text style={styles.lightboxNavText}>›</Text>
            </PressableScale>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReviewCard({ review, style, onRespond }: ReviewCardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isPrivate = review.is_public === false;
  const displayName = isPrivate
    ? review.reviewer_role === 'business'
      ? 'Verified Business'
      : 'Verified Creator'
    : review.reviewer_name;

  const hasPhotos = Array.isArray(review.photos) && review.photos.length > 0;
  const hasTags = Array.isArray(review.tags) && review.tags.length > 0;
  const hasResponse = !!(review.reply_text && review.reply_text.trim().length > 0);

  const openPhoto = useCallback(
    (i: number) => {
      haptics.tap();
      setLightboxIndex(i);
    },
    [haptics],
  );

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...Shadows.sm,
          },
          style,
        ]}
        accessibilityRole="none"
      >
        {/* ── Header row ── */}
        <View style={styles.header}>
          {/* Avatar */}
          {!isPrivate && review.reviewer_avatar ? (
            <Image
              source={{ uri: review.reviewer_avatar }}
              style={[styles.avatar, { borderColor: colors.border }]}
              accessibilityLabel={`${displayName}'s avatar`}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                { backgroundColor: colors.activeLight, borderColor: colors.border },
              ]}
              accessibilityLabel={displayName}
            >
              <ShieldCheck size={18} color={colors.primary} strokeWidth={2} />
            </View>
          )}

          {/* Name + date */}
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.reviewerName, { color: colors.text }]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {review.reviewer_verified && (
                <VerifiedBadge
                  verifiedAt={review.reviewer_verified_at ?? undefined}
                  size="sm"
                />
              )}
              {(isPrivate || review.verified_booking_id) && (
                <View
                  style={[
                    styles.verifiedChip,
                    { backgroundColor: colors.activeLight },
                  ]}
                >
                  <ShieldCheck size={10} color={colors.primary} strokeWidth={2} />
                  <Text style={[styles.verifiedChipText, { color: colors.primary }]}>
                    Verified
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              {formatRelative(review.created_at)}
            </Text>
          </View>

          {/* Stars */}
          <StarRating rating={review.rating} />
        </View>

        {/* ── Tags ── */}
        {hasTags && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsRow}
            accessibilityRole="none"
          >
            {review.tags!.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tagChip,
                  { backgroundColor: colors.activeLight, borderColor: colors.active },
                ]}
              >
                <Text style={[styles.tagText, { color: colors.active }]}>{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ── Comment ── */}
        <Text style={[styles.comment, { color: colors.text }]}>{review.comment}</Text>

        {/* ── Photos ── */}
        {hasPhotos && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosRow}
            accessibilityRole="none"
          >
            {review.photos!.map((uri, i) => (
              <PressableScale
                key={uri}
                scaleValue={0.95}
                onPress={() => openPhoto(i)}
                style={styles.photoThumbWrap}
                accessibilityLabel={`View photo ${i + 1}`}
                accessibilityRole="button"
              >
                <Image
                  source={{ uri }}
                  style={[styles.photoThumb, { borderColor: colors.border }]}
                  resizeMode="cover"
                />
              </PressableScale>
            ))}
          </ScrollView>
        )}

        {/* ── Response ── */}
        {hasResponse && (
          <View
            style={[
              styles.responseBox,
              {
                backgroundColor: colors.surfaceSecondary,
                borderLeftColor: colors.primary,
              },
            ]}
          >
            <View style={styles.responseHeader}>
              <MessageSquare size={13} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.responseLabel, { color: colors.primary }]}>
                {`Response from ${review.reply_name ?? 'Owner'}`}
                {review.replied_at
                  ? ` · ${formatDateShort(review.replied_at)}`
                  : ''}
              </Text>
            </View>
            <Text style={[styles.responseText, { color: colors.textSecondary }]}>
              {review.reply_text}
            </Text>
          </View>
        )}

        {/* ── Respond CTA (owner only) ── */}
        {onRespond && (
          <PressableScale
            scaleValue={0.97}
            onPress={onRespond}
            style={[
              styles.respondBtn,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            accessibilityRole="button"
            accessibilityLabel={hasResponse ? 'Edit your response' : 'Respond to this review'}
            hitSlop={6}
          >
            <Reply size={14} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.respondBtnText, { color: colors.primary }]}>
              {hasResponse ? 'Edit Response' : 'Respond'}
            </Text>
          </PressableScale>
        )}
      </View>

      {/* ── Photo lightbox ── */}
      {lightboxIndex !== null && hasPhotos && (
        <PhotoLightbox
          photos={review.photos!}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 40;
const THUMB_SIZE = 80;

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: Spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  reviewerName: {
    ...Typography.subheadline,
    fontWeight: '600',
    flexShrink: 1,
  },
  dateText: {
    ...Typography.caption1,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    paddingTop: 2,
  },

  // Verified chip
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  verifiedChipText: {
    ...Typography.caption2,
    fontWeight: '600',
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingBottom: Spacing.xxs,
  },
  tagChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tagText: {
    ...Typography.caption1,
    fontWeight: '500',
  },

  // Comment
  comment: {
    ...Typography.callout,
    lineHeight: 22,
  },

  // Photos
  photosRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.xxs,
  },
  photoThumbWrap: {
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  photoThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },

  // Response
  responseBox: {
    borderLeftWidth: 3,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  responseLabel: {
    ...Typography.caption1,
    fontWeight: '600',
  },
  responseText: {
    ...Typography.footnote,
    lineHeight: 19,
  },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 44,
  },
  respondBtnText: {
    ...Typography.footnote,
    fontWeight: '600',
  },

  // Lightbox
  lightboxOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 52,
    right: Spacing.lg,
    zIndex: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '75%',
  },
  lightboxNav: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  lightboxNavBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxNavText: {
    color: '#FFF',
    fontSize: 36,
    lineHeight: 40,
  },
  lightboxCounter: {
    color: '#FFF',
    ...Typography.subheadline,
  },
});
