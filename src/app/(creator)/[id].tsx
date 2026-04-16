import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Share,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Star,
  MapPin,
  CheckCircle,
  Send,
  MoreVertical,
  Flag,
  AlertTriangle,
  X,
  Check,
  UserPlus,
  UserCheck,
  Globe,
  Clock,
  Languages,
  Handshake,
  TrendingUp,
  Eye,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PressableScale } from '../../components/ui/PressableScale';
import { AnimatedLikeButton } from '../../components/ui/AnimatedLikeButton';
import { CreatorProfileSkeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';
import * as api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import type { Creator, Review, CreatorSocialAccount, SocialPlatform, Listing } from '../../types';

import { formatDateShort } from '../../lib/dateFormat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 300;
const AVATAR_SIZE = 96;
const AVATAR_OVERLAP = 44;

// ─── Report constants ────────────────────────────────────────────────────────

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam or misleading' },
  { key: 'inappropriate', label: 'Inappropriate content' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'impersonation', label: 'Impersonation' },
  { key: 'fraud', label: 'Fraud or scam' },
  { key: 'other', label: 'Other' },
] as const;

const MAX_DESCRIPTION_LENGTH = 500;

// ─── Niche chip colors ────────────────────────────────────────────────────────

const NICHE_PALETTE: Record<string, { bgLight: string; textLight: string; bgDark: string; textDark: string }> = {
  hotel:      { bgLight: '#EEF0F8', textLight: '#2c428f', bgDark: '#151830', textDark: '#97ABFF' },
  restaurant: { bgLight: '#FEF3C7', textLight: '#B45309', bgDark: '#1F1D15', textDark: '#F59E0B' },
  bar:        { bgLight: '#F3E8FF', textLight: '#7C3AED', bgDark: '#1F1530', textDark: '#C084FC' },
  cafe:       { bgLight: '#ECFDF5', textLight: '#047857', bgDark: '#15201D', textDark: '#6EE7B7' },
  resort:     { bgLight: '#FEE2E2', textLight: '#B91C1C', bgDark: '#1F1515', textDark: '#EF4444' },
  spa:        { bgLight: '#FCE7F3', textLight: '#BE185D', bgDark: '#1F1520', textDark: '#F472B6' },
};

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<SocialPlatform, { label: string; shortLabel: string; bg: string; color: string }> = {
  instagram: { label: 'Instagram', shortLabel: 'IG', bg: '#E4405F', color: '#FFFFFF' },
  tiktok:    { label: 'TikTok',    shortLabel: 'TT', bg: '#010101', color: '#FFFFFF' },
  youtube:   { label: 'YouTube',   shortLabel: 'YT', bg: '#FF0000', color: '#FFFFFF' },
  twitter:   { label: 'Twitter',   shortLabel: 'X',  bg: '#1DA1F2', color: '#FFFFFF' },
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlatformIconBadge({ platform, size = 32 }: { platform: SocialPlatform; size?: number }) {
  const config = PLATFORM_CONFIG[platform] ?? { shortLabel: '?', bg: '#666', color: '#FFF' };
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 5,
        backgroundColor: config.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{ color: config.color, fontSize: size * 0.33, fontWeight: '800' }}
        allowFontScaling={false}
      >
        {config.shortLabel}
      </Text>
    </View>
  );
}

function NicheChip({ niche, isDark }: { niche: string; isDark: boolean }) {
  const palette = NICHE_PALETTE[niche] ?? {
    bgLight: '#F4F3F4', textLight: '#595F6A',
    bgDark: '#252525', textDark: '#9CA3AF',
  };
  const bg = isDark ? palette.bgDark : palette.bgLight;
  const textColor = isDark ? palette.textDark : palette.textLight;
  const label = niche.charAt(0).toUpperCase() + niche.slice(1);

  return (
    <View
      accessible
      accessibilityLabel={`Niche: ${label}`}
      style={[styles.nicheChip, { backgroundColor: bg }]}
    >
      <Text style={[styles.nicheChipText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function SocialCard({
  platform,
  handle,
  followers,
  engagementRate,
  avgViews,
  verified,
  verifiedAt,
  colors,
  isOwner,
  accountId,
  onDisconnect,
  onRefresh,
}: {
  platform: SocialPlatform;
  handle: string;
  followers: number;
  engagementRate?: number | null;
  avgViews?: number | null;
  verified?: boolean;
  verifiedAt?: string | null;
  colors: ReturnType<typeof useTheme>['colors'];
  isOwner?: boolean;
  accountId?: string | null;
  onDisconnect?: (id: string) => void;
  onRefresh?: (id: string) => void;
}) {
  const haptics = useHaptics();
  const config = PLATFORM_CONFIG[platform];
  const badgePlatform = (platform === 'twitter' ? undefined : platform) as 'tiktok' | 'instagram' | 'youtube' | undefined;
  return (
    <View
      accessible
      accessibilityLabel={`${config.label} account: ${handle}, ${formatCount(followers)} followers`}
      style={[styles.socialCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
    >
      <View style={styles.socialCardHeader}>
        <PlatformIconBadge platform={platform} size={36} />
        <View style={styles.socialCardInfo}>
          <View style={styles.socialHandleRow}>
            <Text style={[styles.socialHandle, { color: colors.text }]} numberOfLines={1}>
              {handle}
            </Text>
            {verified && (
              <VerifiedBadge
                platform={badgePlatform}
                verifiedAt={verifiedAt ?? undefined}
                size="sm"
              />
            )}
          </View>
          <Text style={[styles.socialPlatformLabel, { color: colors.textTertiary }]}>
            {config.label}
          </Text>
        </View>
        <View style={styles.socialFollowers}>
          <Text style={[styles.socialFollowerCount, { color: colors.text }]}>
            {formatCount(followers)}
          </Text>
          <Text style={[styles.socialFollowerLabel, { color: colors.textTertiary }]}>followers</Text>
        </View>
      </View>
      {(engagementRate != null || avgViews != null) && (
        <View style={[styles.socialStats, { borderTopColor: colors.borderLight }]}>
          {engagementRate != null && (
            <View style={styles.socialStatItem}>
              <TrendingUp size={12} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.socialStatText, { color: colors.textSecondary }]}>
                {engagementRate.toFixed(1)}% engagement
              </Text>
            </View>
          )}
          {avgViews != null && (
            <View style={styles.socialStatItem}>
              <Eye size={12} color={colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.socialStatText, { color: colors.textSecondary }]}>
                {formatCount(avgViews)} avg views
              </Text>
            </View>
          )}
        </View>
      )}
      {isOwner && accountId && (
        <View style={[styles.socialOwnerActions, { borderTopColor: colors.borderLight }]}>
          <PressableScale
            scaleValue={0.95}
            onPress={() => { haptics.tap(); onRefresh?.(accountId); }}
            style={[styles.socialOwnerBtn, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Refresh stats"
          >
            <TrendingUp size={13} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.socialOwnerBtnText, { color: colors.primary }]}>Refresh stats</Text>
          </PressableScale>
          <PressableScale
            scaleValue={0.95}
            onPress={() => { haptics.tap(); onDisconnect?.(accountId); }}
            style={[styles.socialOwnerBtn, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Disconnect account"
          >
            <X size={13} color={colors.error} strokeWidth={2} />
            <Text style={[styles.socialOwnerBtnText, { color: colors.error }]}>Disconnect</Text>
          </PressableScale>
        </View>
      )}
    </View>
  );
}

function RatingSummary({
  rating,
  totalReviews,
  colors,
}: {
  rating: number;
  totalReviews: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.ratingSummary}>
      <Text style={[styles.ratingLarge, { color: colors.text }]}>{rating.toFixed(1)}</Text>
      <View style={styles.ratingRight}>
        <View style={styles.ratingStarsRow}>
          {Array.from({ length: 5 }).map((_, i) => {
            const fill = i < Math.round(rating);
            return (
              <Star
                key={i}
                size={18}
                color={colors.rating}
                fill={fill ? colors.rating : 'transparent'}
                strokeWidth={2}
              />
            );
          })}
        </View>
        <Text style={[styles.ratingCount, { color: colors.textTertiary }]}>
          {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
        </Text>
      </View>
    </View>
  );
}

function ReviewCard({
  review,
  colors,
  revieweeName,
  canRespond,
  onRespond,
}: {
  review: Review;
  colors: ReturnType<typeof useTheme>['colors'];
  revieweeName?: string;
  canRespond?: boolean;
  onRespond?: (reviewId: string) => void;
}) {
  const haptics = useHaptics();
  return (
    <View
      style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
    >
      <View style={styles.reviewHeader}>
        <Avatar uri={review.reviewer_avatar} name={review.reviewer_name} size={40} />
        <View style={styles.reviewMeta}>
          <View style={styles.reviewMetaTop}>
            <Text style={[styles.reviewerName, { color: colors.text }]} numberOfLines={1}>
              {review.reviewer_name}
            </Text>
            {review.reviewer_role === 'business' && (
              <View style={[styles.verifiedBizBadge, { backgroundColor: colors.activeLight }]}>
                <Text style={[styles.verifiedBizLabel, { color: colors.active }]}>Business</Text>
              </View>
            )}
          </View>
          <View style={styles.reviewStarsRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={12}
                color={colors.rating}
                fill={i < review.rating ? colors.rating : 'transparent'}
                strokeWidth={2}
              />
            ))}
            <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>
              · {formatDateShort(review.created_at)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
        {review.comment}
      </Text>
      {review.reply_text ? (
        <View
          style={[styles.replyBox, { backgroundColor: colors.surfaceSecondary, borderLeftColor: colors.primary }]}
        >
          <Text style={[styles.replyLabel, { color: colors.primary }]}>
            {revieweeName ? `Response from ${revieweeName}` : 'RESPONSE'}
          </Text>
          <Text style={[styles.replyText, { color: colors.text }]}>{review.reply_text}</Text>
          {review.replied_at && (
            <Text style={[styles.replyDate, { color: colors.textTertiary }]}>
              {formatDateShort(review.replied_at)}
            </Text>
          )}
          {canRespond && (
            <PressableScale
              onPress={() => { haptics.tap(); onRespond?.(review.id); }}
              scaleValue={0.96}
              accessibilityRole="button"
              accessibilityLabel="Edit your response"
              style={[styles.respondBtn, { borderColor: colors.primary }]}
            >
              <Text style={[styles.respondBtnText, { color: colors.primary }]}>Edit response</Text>
            </PressableScale>
          )}
        </View>
      ) : canRespond ? (
        <PressableScale
          onPress={() => { haptics.tap(); onRespond?.(review.id); }}
          scaleValue={0.96}
          accessibilityRole="button"
          accessibilityLabel="Respond to this review"
          style={[styles.respondBtn, { borderColor: colors.primary }]}
        >
          <Text style={[styles.respondBtnText, { color: colors.primary }]}>Respond to review</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

const MAX_INVITE_LENGTH = 400;

function InviteModal({
  visible,
  onClose,
  creatorId,
  businessUserId,
}: {
  visible: boolean;
  onClose: () => void;
  creatorId: string;
  businessUserId: string;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoadingListings(true);
    setSelectedListingId(null);
    setMessage('');
    setSubmitted(false);
    api.getBusinessProfile(businessUserId).then((biz) => {
      if (!biz) { setLoadingListings(false); return; }
      setBusinessId(biz.id);
      api.getListingsByBusiness(biz.id).then((ls) => {
        setListings(ls);
        setLoadingListings(false);
      });
    });
  }, [visible, businessUserId]);

  const resetAndClose = useCallback(() => {
    setSelectedListingId(null);
    setMessage('');
    setSubmitted(false);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!selectedListingId || !businessId) return;
    haptics.confirm();
    setSubmitting(true);
    const ok = await api.sendInvite(selectedListingId, creatorId, businessId, message.trim());
    setSubmitting(false);
    if (ok) { haptics.success(); setSubmitted(true); } else { haptics.error(); }
  }, [selectedListingId, businessId, creatorId, message, haptics]);

  const selectedListing = listings.find((l) => l.id === selectedListingId);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View
          style={[styles.modalHeader, { borderBottomColor: colors.borderLight, paddingTop: insets.top > 0 ? insets.top : Spacing.lg }]}
        >
          <PressableScale
            scaleValue={0.9} onPress={() => { haptics.tap(); resetAndClose(); }}
            hitSlop={12} accessibilityRole="button" accessibilityLabel="Close"
            style={styles.modalCloseBtn}
          >
            <X size={22} color={colors.text} strokeWidth={2.2} />
          </PressableScale>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Invite to Collab</Text>
          <View style={styles.modalCloseBtn} />
        </View>

        {submitted ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: colors.successLight }]}>
              <Check size={32} color={colors.success} strokeWidth={2.5} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Invite Sent!</Text>
            <Text style={[styles.successBody, { color: colors.textSecondary }]}>
              {selectedListing
                ? `Your invite for "${selectedListing.title}" has been sent. The creator will be notified.`
                : 'Your invite has been sent. The creator will be notified.'}
            </Text>
            <Button title="Done" onPress={resetAndClose} size="lg" style={styles.successBtn} />
          </Animated.View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.modalBody, { paddingBottom: insets.bottom + Spacing.xl }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Choose a listing
            </Text>

            {loadingListings ? (
              <View style={styles.inviteLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : listings.length === 0 ? (
              <View style={[styles.inviteEmpty, { backgroundColor: colors.surfaceSecondary, borderRadius: BorderRadius.lg }]}>
                <Text style={[styles.inviteEmptyText, { color: colors.textSecondary }]}>
                  No active listings found. Create a listing first.
                </Text>
              </View>
            ) : (
              listings.map((listing) => {
                const isSelected = selectedListingId === listing.id;
                return (
                  <PressableScale
                    key={listing.id}
                    onPress={() => { haptics.select(); setSelectedListingId(listing.id); }}
                    accessibilityRole="radio"
                    accessibilityLabel={listing.title}
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.listingRow,
                      {
                        backgroundColor: isSelected ? colors.primaryLight + '12' : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                      },
                    ]}
                  >
                    <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : colors.border }]}>
                      {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                    </View>
                    <View style={styles.listingRowInfo}>
                      <Text style={[styles.listingRowTitle, { color: isSelected ? colors.primary : colors.text }]} numberOfLines={1}>
                        {listing.title}
                      </Text>
                      <Text style={[styles.listingRowMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                        ${listing.pay_min}–${listing.pay_max} · {listing.location}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })
            )}

            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: Spacing.xl }]}>
              Personal message (optional)
            </Text>
            <View style={[styles.textAreaWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={message}
                onChangeText={(t) => t.length <= MAX_INVITE_LENGTH && setMessage(t)}
                placeholder="Tell them why you'd love to collab…"
                placeholderTextColor={colors.textTertiary}
                multiline
                style={[styles.textArea, { color: colors.text }]}
                maxLength={MAX_INVITE_LENGTH}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {message.length}/{MAX_INVITE_LENGTH}
              </Text>
            </View>

            <Button
              title={submitting ? 'Sending…' : 'Send Invite'}
              onPress={handleSubmit}
              size="lg"
              disabled={!selectedListingId || submitting || loadingListings}
              variant="primary"
              style={{ marginTop: Spacing.xl }}
              icon={
                <Handshake
                  size={18}
                  color={!selectedListingId || submitting ? colors.textTertiary : colors.onPrimary}
                  strokeWidth={2}
                />
              }
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

function ReportModal({
  visible,
  onClose,
  creatorName,
  targetUserId,
}: {
  visible: boolean;
  onClose: () => void;
  creatorName: string;
  targetUserId: string;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const currentUser = useStore((s) => s.user);

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resetAndClose = useCallback(() => {
    setSelectedReason(null);
    setDescription('');
    setSubmitted(false);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason || !currentUser) return;
    haptics.confirm();
    setSubmitting(true);
    const ok = await api.reportUser(currentUser.id, targetUserId, selectedReason, description.trim() || undefined);
    setSubmitting(false);
    if (ok) { haptics.success(); setSubmitted(true); } else { haptics.error(); }
  }, [selectedReason, currentUser, targetUserId, description, haptics]);

  const handleSelectReason = useCallback((key: string) => { haptics.select(); setSelectedReason(key); }, [haptics]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View
          style={[styles.modalHeader, { borderBottomColor: colors.borderLight, paddingTop: insets.top > 0 ? insets.top : Spacing.lg }]}
        >
          <PressableScale
            scaleValue={0.9} onPress={() => { haptics.tap(); resetAndClose(); }}
            hitSlop={12} accessibilityRole="button" accessibilityLabel="Close"
            style={styles.modalCloseBtn}
          >
            <X size={22} color={colors.text} strokeWidth={2.2} />
          </PressableScale>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Report Profile</Text>
          <View style={styles.modalCloseBtn} />
        </View>

        {submitted ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: colors.successLight }]}>
              <Check size={32} color={colors.success} strokeWidth={2.5} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Report Submitted</Text>
            <Text style={[styles.successBody, { color: colors.textSecondary }]}>
              Thanks for helping keep Surve safe. We'll review your report and take action if needed.
            </Text>
            <Button title="Done" onPress={resetAndClose} size="lg" style={styles.successBtn} />
          </Animated.View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.modalBody, { paddingBottom: insets.bottom + Spacing.xl }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.warningBanner, { backgroundColor: colors.warningLight }]}>
              <AlertTriangle size={18} color={colors.warning} strokeWidth={2} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Reports are reviewed by our team. False reports may result in account restrictions.
              </Text>
            </View>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Why are you reporting {creatorName}?
            </Text>
            {REPORT_REASONS.map((reason) => {
              const isSelected = selectedReason === reason.key;
              return (
                <PressableScale
                  key={reason.key} onPress={() => handleSelectReason(reason.key)}
                  accessibilityRole="radio" accessibilityLabel={reason.label}
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.reasonRow,
                    {
                      backgroundColor: isSelected ? colors.primaryLight + '12' : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : colors.border }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.reasonLabel, { color: isSelected ? colors.primary : colors.text }]}>
                    {reason.label}
                  </Text>
                </PressableScale>
              );
            })}
            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: Spacing.xl }]}>
              Additional details (optional)
            </Text>
            <View style={[styles.textAreaWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={description}
                onChangeText={(t) => t.length <= MAX_DESCRIPTION_LENGTH && setDescription(t)}
                placeholder="Tell us more about what happened…"
                placeholderTextColor={colors.textTertiary}
                multiline
                style={[styles.textArea, { color: colors.text }]}
                maxLength={MAX_DESCRIPTION_LENGTH}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </Text>
            </View>
            <Button
              title={submitting ? 'Submitting…' : 'Submit Report'}
              onPress={handleSubmit}
              size="lg"
              disabled={!selectedReason || submitting}
              variant="primary"
              style={{ marginTop: Spacing.xl }}
              icon={
                <Flag
                  size={18}
                  color={!selectedReason || submitting ? colors.textTertiary : colors.onPrimary}
                  strokeWidth={2}
                />
              }
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollY.value = event.contentOffset.y; },
  });

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [0, 1], Extrapolation.CLAMP),
  }));
  const headerBorderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [70, 80], [0, 1], Extrapolation.CLAMP),
  }));

  const { followedCreators, toggleFollowedCreator, user: currentUser } = useStore();
  const [creator, setCreator] = React.useState<Creator | null>(null);
  const [creatorReviews, setCreatorReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reportVisible, setReportVisible] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [bioExpanded, setBioExpanded] = useState(false);

  const isFollowed = creator ? followedCreators.includes(creator.id) : false;
  const isBusiness = currentUser?.role === 'business';
  const isOwner = currentUser?.id === creator?.user_id;
  const reviewsVisible = isOwner || (creator?.user.show_reviews_publicly !== false);
  const isOwnProfile = !!(currentUser && creator && currentUser.id === creator.user_id && currentUser.role === 'creator');

  const handleRespond = useCallback((reviewId: string) => {
    router.push(`/(review)/respond?reviewId=${reviewId}`);
  }, [router]);

  const handleRefreshSocialStats = useCallback(async (accountId: string) => {
    haptics.tap();
    await supabase.functions.invoke('social-sync-stats', { body: { account_id: accountId } });
    // Refetch creator to show updated stats
    setRetryCount((c) => c + 1);
  }, [haptics]);

  const handleDisconnectSocial = useCallback((accountId: string) => {
    haptics.confirm();
    Alert.alert('Disconnect account?', 'Your social stats will be removed from your profile.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => {
        await supabase.from('creator_social_accounts').delete().eq('id', accountId);
        setRetryCount((c) => c + 1);
      }},
    ]);
  }, [haptics]);

  const refetchCreator = useCallback(() => { setRetryCount((c) => c + 1); }, []);

  React.useEffect(() => {
    if (!id) return;
    api.trackProfileView(id, currentUser?.id ?? null);
  }, [id, currentUser?.id]);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getCreators().then((creators) => {
      const found = creators.find((c) => c.id === id) ?? null;
      setCreator(found);
      setLoading(false);
      if (found) { api.getReviews(found.user_id).then(setCreatorReviews); }
    }).catch(() => { setLoading(false); });
  }, [id, retryCount]);

  const handleInvite = useCallback(() => { haptics.confirm(); setInviteVisible(true); }, [haptics]);
  const handleMessage = useCallback(() => { haptics.confirm(); }, [haptics]);
  const handleOpenReport = useCallback(() => { haptics.confirm(); setReportVisible(true); }, [haptics]);

  const handleMoreOptions = useCallback(() => {
    haptics.confirm();
    const profileUrl = `https://surve.app/creator/${id}`;
    const creatorName = creator?.user.full_name ?? 'this creator';
    const doBlock = async () => {
      if (!currentUser?.id || !creator) return;
      Alert.alert(`Block ${creatorName}?`, 'They won\'t be able to contact you and their profile won\'t appear in searches.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: async () => {
          await api.blockUser(currentUser.id, creator.user_id);
          router.back();
        }},
      ]);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Share profile', 'Report', 'Block'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (idx) => {
          if (idx === 1) Share.share({ message: `Check out ${creatorName} on Surve: ${profileUrl}` });
          else if (idx === 2) setReportVisible(true);
          else if (idx === 3) doBlock();
        },
      );
    } else {
      Alert.alert('Options', undefined, [
        { text: 'Share profile', onPress: () => Share.share({ message: `Check out ${creatorName} on Surve: ${profileUrl}` }) },
        { text: 'Report', style: 'destructive', onPress: () => setReportVisible(true) },
        { text: 'Block', style: 'destructive', onPress: doBlock },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [haptics, id, creator, currentUser, router]);

  // Build social accounts list from either social_accounts or legacy fields
  const socialAccounts = useMemo((): Array<{
    id: string | null;
    platform: SocialPlatform;
    handle: string;
    followers: number;
    engagementRate: number | null;
    avgViews: number | null;
    verified: boolean;
    verifiedAt: string | null;
  }> => {
    if (!creator) return [];
    if (creator.social_accounts && creator.social_accounts.length > 0) {
      return creator.social_accounts.map((sa) => ({
        id: (sa as any).id ?? null,
        platform: sa.platform,
        handle: sa.handle,
        followers: sa.followers ?? 0,
        engagementRate: sa.engagement_rate,
        avgViews: sa.avg_views,
        verified: sa.verified,
        verifiedAt: sa.verified_at,
      }));
    }
    const accounts: Array<{ id: null; platform: SocialPlatform; handle: string; followers: number; engagementRate: number | null; avgViews: number | null; verified: boolean; verifiedAt: string | null }> = [];
    if (creator.instagram_handle) {
      accounts.push({ id: null, platform: 'instagram', handle: creator.instagram_handle, followers: creator.instagram_followers, engagementRate: creator.engagement_rate, avgViews: creator.avg_views, verified: creator.verified, verifiedAt: null });
    }
    if (creator.tiktok_handle) {
      accounts.push({ id: null, platform: 'tiktok', handle: creator.tiktok_handle, followers: creator.tiktok_followers, engagementRate: creator.engagement_rate, avgViews: creator.avg_views, verified: creator.verified, verifiedAt: null });
    }
    return accounts;
  }, [creator]);

  const totalFollowers = useMemo(
    () => socialAccounts.reduce((sum, a) => sum + a.followers, 0),
    [socialAccounts],
  );

  const niches = useMemo(() => {
    if (!creator) return [];
    return creator.niches && creator.niches.length > 0 ? creator.niches : creator.categories;
  }, [creator]);

  const heroUri = useMemo(() => {
    if (!creator) return undefined;
    return creator.cover_photo_url ?? (creator.portfolio_urls[0] ?? creator.user.avatar_url ?? undefined);
  }, [creator]);

  const bioTrimmed = creator && !bioExpanded && creator.bio.length > 160;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader />
        <View style={{ paddingTop: Spacing.lg }}>
          <CreatorProfileSkeleton />
        </View>
      </View>
    );
  }

  if (!creator) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader />
        <ErrorState
          title="Creator not found"
          message="We couldn't load this profile. It may have been removed or there was a connection issue."
          onRetry={refetchCreator}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {/* Floating header */}
      <View style={styles.floatingHeader} pointerEvents="box-none">
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }, headerBgStyle]}
        />
        <Animated.View
          style={[styles.floatingHeaderBorder, { backgroundColor: colors.border }, headerBorderStyle]}
        />
        <ScreenHeader
          transparent
          right={
            <View style={styles.headerRightRow}>
              <AnimatedLikeButton
                active={isFollowed}
                onToggle={() => creator && toggleFollowedCreator(creator.id)}
                activeColor={colors.primary}
                inactiveColor={colors.text}
                size={44}
                style={[styles.headerIconBtn, { backgroundColor: colors.surface }]}
                accessibilityLabel={isFollowed ? 'Unfollow creator' : 'Follow creator'}
              >
                {({ color }) =>
                  isFollowed ? (
                    <UserCheck size={20} color={color} strokeWidth={2.2} />
                  ) : (
                    <UserPlus size={20} color={color} strokeWidth={2.2} />
                  )
                }
              </AnimatedLikeButton>
              <PressableScale
                scaleValue={0.85}
                onPress={handleMoreOptions}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="More options"
                style={[styles.headerIconBtn, { backgroundColor: colors.surface }]}
              >
                <MoreVertical size={20} color={colors.text} strokeWidth={2.2} />
              </PressableScale>
            </View>
          }
        />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Hero + Avatar overlap ─────────────────────────────────────── */}
        <View style={styles.heroContainer}>
          <AdaptiveImage
            source={{ uri: heroUri }}
            style={styles.heroImage}
            contentFit="cover"
            accessibilityLabel={`${creator.user.full_name} cover photo`}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.6)']}
            locations={[0.3, 0.65, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Avatar overlapping bottom of hero */}
          <View style={styles.avatarOverlapWrap}>
            <View style={[styles.avatarBorder, { borderColor: colors.background }]}>
              <Avatar uri={creator.user.avatar_url} name={creator.user.full_name} size={AVATAR_SIZE} />
            </View>
            {creator.verified && (
              <View style={[styles.verifiedDot, { backgroundColor: colors.background }]}>
                <CheckCircle size={18} color={colors.primary} fill={colors.primary} strokeWidth={2} />
              </View>
            )}
          </View>
        </View>

        {/* ── Identity Section ──────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(80)}
          style={[styles.identitySection, { paddingTop: AVATAR_OVERLAP + Spacing.sm }]}
        >
          {/* Name + verified */}
          <View style={styles.nameRow} accessibilityRole="header">
            <Text style={[styles.name, { color: colors.text }]}>{creator.user.full_name}</Text>
            {creator.verified && (
              <VerifiedBadge
                platform={socialAccounts[0]?.platform !== 'twitter' ? (socialAccounts[0]?.platform as 'tiktok' | 'instagram' | 'youtube' | undefined) : undefined}
                verifiedAt={socialAccounts[0]?.verifiedAt ?? undefined}
                size="md"
              />
            )}
          </View>

          {/* Handle */}
          {creator.user.username && (
            <View style={styles.usernameRow}>
              <Text style={[styles.username, { color: colors.textTertiary }]}>
                @{creator.user.username}
              </Text>
              {creator.verified && (
                <VerifiedBadge
                  platform={socialAccounts[0]?.platform !== 'twitter' ? (socialAccounts[0]?.platform as 'tiktok' | 'instagram' | 'youtube' | undefined) : undefined}
                  verifiedAt={socialAccounts[0]?.verifiedAt ?? undefined}
                  size="sm"
                />
              )}
            </View>
          )}

          {/* Location */}
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {creator.location}
            </Text>
          </View>

          {/* Niches */}
          {niches.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.nichesScroll}
              contentContainerStyle={styles.nichesContent}
            >
              {niches.map((niche) => (
                <NicheChip key={niche} niche={niche} isDark={isDark} />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ── Stats banner ───────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(500).delay(160)} style={styles.pagePad}>
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statBlock} accessible accessibilityLabel={`Total followers: ${formatCount(totalFollowers)}`}>
                <Globe size={16} color={colors.primary} strokeWidth={2} style={{ marginBottom: Spacing.xs }} />
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCount(totalFollowers)}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Followers</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statBlock} accessible accessibilityLabel={`Engagement rate: ${creator.engagement_rate}%`}>
                <TrendingUp size={16} color={colors.primary} strokeWidth={2} style={{ marginBottom: Spacing.xs }} />
                <Text style={[styles.statValue, { color: colors.text }]}>{creator.engagement_rate}%</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Engagement</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statBlock} accessible accessibilityLabel={`Average views: ${formatCount(creator.avg_views)}`}>
                <Eye size={16} color={colors.primary} strokeWidth={2} style={{ marginBottom: Spacing.xs }} />
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCount(creator.avg_views)}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Avg Views</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* ── Connected Socials ──────────────────────────────────────────── */}
        {socialAccounts.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(220)} style={styles.pagePad}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Social Channels
            </Text>
            <View style={styles.socialCardsWrap}>
              {socialAccounts.map((acct) => (
                <SocialCard
                  key={`${acct.platform}-${acct.handle}`}
                  platform={acct.platform}
                  handle={acct.handle}
                  followers={acct.followers}
                  engagementRate={acct.engagementRate}
                  avgViews={acct.avgViews}
                  verified={acct.verified}
                  verifiedAt={acct.verifiedAt}
                  colors={colors}
                  isOwner={isOwner}
                  accountId={acct.id}
                  onRefresh={handleRefreshSocialStats}
                  onDisconnect={handleDisconnectSocial}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Portfolio Carousel ─────────────────────────────────────────── */}
        {creator.portfolio_urls.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(280)}>
            <View style={styles.pagePad}>
              <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
                Portfolio
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.portfolioScroll}
            >
              {creator.portfolio_urls.map((url, idx) => (
                <PressableScale
                  key={idx}
                  scaleValue={0.97}
                  onPress={() => haptics.tap()}
                  accessibilityLabel={`Portfolio image ${idx + 1}`}
                  style={styles.portfolioItemWrap}
                >
                  <AdaptiveImage
                    source={{ uri: url }}
                    contentFit="cover"
                    style={styles.portfolioImage}
                    accessibilityLabel={`Portfolio image ${idx + 1}`}
                  />
                  {idx === 0 && (
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.3)']}
                      style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.lg }]}
                      pointerEvents="none"
                    />
                  )}
                </PressableScale>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── About ─────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(500).delay(340)} style={styles.pagePad}>
          <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
            About
          </Text>
          <Card style={styles.aboutCard}>
            {/* Bio */}
            <Text
              style={[styles.bioText, { color: colors.textSecondary }]}
              numberOfLines={bioTrimmed ? 4 : undefined}
            >
              {creator.bio}
            </Text>
            {creator.bio.length > 160 && (
              <PressableScale
                scaleValue={0.96}
                onPress={() => { haptics.tap(); setBioExpanded((e) => !e); }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={bioExpanded ? 'Show less' : 'Show more'}
                style={styles.bioToggle}
              >
                <Text style={[styles.bioToggleText, { color: colors.primary }]}>
                  {bioExpanded ? 'Show less' : 'Show more'}
                </Text>
              </PressableScale>
            )}

            {/* Divider */}
            <View style={[styles.aboutDivider, { backgroundColor: colors.borderLight }]} />

            {/* Meta rows */}
            {creator.languages && creator.languages.length > 0 && (
              <View style={styles.aboutRow}>
                <Languages size={16} color={colors.textTertiary} strokeWidth={2} />
                <Text style={[styles.aboutRowLabel, { color: colors.textTertiary }]}>Languages</Text>
                <Text style={[styles.aboutRowValue, { color: colors.text }]}>
                  {creator.languages.join(', ')}
                </Text>
              </View>
            )}
            {creator.response_time_hours != null && (
              <View style={styles.aboutRow}>
                <Clock size={16} color={colors.textTertiary} strokeWidth={2} />
                <Text style={[styles.aboutRowLabel, { color: colors.textTertiary }]}>Response time</Text>
                <Text style={[styles.aboutRowValue, { color: colors.text }]}>
                  {creator.response_time_hours < 24
                    ? `~${creator.response_time_hours}h`
                    : `~${Math.round(creator.response_time_hours / 24)}d`}
                </Text>
              </View>
            )}
            {creator.completion_rate != null && (
              <View style={styles.aboutRow}>
                <CheckCircle size={16} color={colors.textTertiary} strokeWidth={2} />
                <Text style={[styles.aboutRowLabel, { color: colors.textTertiary }]}>Completion rate</Text>
                <Text style={[styles.aboutRowValue, { color: colors.success }]}>
                  {(creator.completion_rate * 100).toFixed(0)}%
                </Text>
              </View>
            )}
            <View style={styles.aboutRow}>
              <Handshake size={16} color={colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.aboutRowLabel, { color: colors.textTertiary }]}>Collaborations</Text>
              <Text style={[styles.aboutRowValue, { color: colors.text }]}>
                {creator.total_bookings} completed
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* ── Audience Demographics ────────────────────────────────────── */}
        {(() => {
          const demo: { age_range?: Record<string, number>; gender?: Record<string, number>; top_countries?: string[] } =
            (creator as any).audience_demographics ?? {};
          const hasDemo = demo.age_range || demo.gender || demo.top_countries;
          if (!isOwner && !hasDemo) return null;
          const ageRanges = demo.age_range ?? {};
          const gender = demo.gender ?? {};
          const countries = demo.top_countries ?? [];
          return (
            <Animated.View entering={FadeInDown.duration(500).delay(375)} style={styles.pagePad}>
              <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
                Audience Demographics
              </Text>
              <Card style={{ padding: Spacing.md }}>
                {Object.keys(ageRanges).length > 0 && (
                  <View style={{ marginBottom: Spacing.md }}>
                    <Text style={{ ...Typography.caption1, fontWeight: '600', color: colors.textSecondary, marginBottom: Spacing.sm }}>Age Range</Text>
                    {Object.entries(ageRanges).map(([range, pct]) => (
                      <View key={range} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 }}>
                        <Text style={{ ...Typography.caption2, color: colors.textTertiary, width: 48 }}>{range}</Text>
                        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceSecondary }}>
                          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.primary, width: `${Math.min(100, Number(pct))}%` }} />
                        </View>
                        <Text style={{ ...Typography.caption2, color: colors.textSecondary, width: 36, textAlign: 'right' }}>{pct}%</Text>
                      </View>
                    ))}
                  </View>
                )}
                {Object.keys(gender).length > 0 && (
                  <View style={{ marginBottom: Spacing.md }}>
                    <Text style={{ ...Typography.caption1, fontWeight: '600', color: colors.textSecondary, marginBottom: Spacing.sm }}>Gender Split</Text>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      {Object.entries(gender).map(([g, pct]) => (
                        <View key={g} style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={{ ...Typography.footnote, fontWeight: '600', color: colors.text }}>{pct}%</Text>
                          <Text style={{ ...Typography.caption2, color: colors.textTertiary, textTransform: 'capitalize' }}>{g}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {countries.length > 0 && (
                  <View>
                    <Text style={{ ...Typography.caption1, fontWeight: '600', color: colors.textSecondary, marginBottom: Spacing.sm }}>Top Countries</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {countries.slice(0, 5).map((c) => (
                        <View key={c} style={{ paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full, backgroundColor: colors.primary + '18' }}>
                          <Text style={{ ...Typography.caption2, color: colors.primary }}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {!hasDemo && isOwner && (
                  <Text style={{ ...Typography.footnote, color: colors.textSecondary, textAlign: 'center' }}>
                    No audience data yet. Connect social accounts to populate this.
                  </Text>
                )}
              </Card>
            </Animated.View>
          );
        })()}

        {/* ── Past Brand Collabs ────────────────────────────────────────── */}
        {(() => {
          const collabs: Array<{ brand_name: string; description?: string; year?: number }> =
            (creator as any).past_brand_collabs ?? [];
          if (!isOwner && collabs.length === 0) return null;
          return (
            <Animated.View entering={FadeInDown.duration(500).delay(380)} style={styles.pagePad}>
              <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
                Past Brand Collabs
              </Text>
              {collabs.length === 0 && isOwner ? (
                <Card style={{ padding: Spacing.md }}>
                  <Text style={[{ color: colors.textSecondary, ...Typography.footnote, textAlign: 'center' }]}>
                    Add brands you've worked with to boost your profile
                  </Text>
                </Card>
              ) : (
                collabs.map((c, idx) => (
                  <Card key={idx} style={{ padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                    <View style={{ width: 40, height: 40, borderRadius: BorderRadius.sm, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
                      <Handshake size={20} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...Typography.subheadline, fontWeight: '600', color: colors.text }}>{c.brand_name}</Text>
                      {c.description ? <Text style={{ ...Typography.caption1, color: colors.textSecondary, marginTop: 2 }}>{c.description}</Text> : null}
                    </View>
                    {c.year ? <Text style={{ ...Typography.caption1, color: colors.textTertiary }}>{c.year}</Text> : null}
                  </Card>
                ))
              )}
            </Animated.View>
          );
        })()}

        {/* ── Reviews ───────────────────────────────────────────────────── */}
        {reviewsVisible && (creatorReviews.length > 0 || creator.total_reviews > 0) && (
          <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.pagePad}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Reviews
            </Text>
            <Card style={styles.ratingCard}>
              <RatingSummary rating={creator.rating} totalReviews={creator.total_reviews} colors={colors} />
            </Card>
            {creatorReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                colors={colors}
                revieweeName={creator.user?.full_name ?? currentUser?.full_name}
                canRespond={isOwnProfile}
                onRespond={handleRespond}
              />
            ))}
          </Animated.View>
        )}
      </Animated.ScrollView>

      {/* ── Bottom CTA ─────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(300)}
        style={[
          styles.bottomCta,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.borderLight,
            paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg,
          },
        ]}
      >
        <Button
          title="Message"
          onPress={handleMessage}
          variant="outline"
          size="lg"
          style={isBusiness ? styles.ctaHalf : styles.ctaFull}
          icon={<Send size={18} color={colors.primary} strokeWidth={2} />}
        />
        {isBusiness && (
          <Button
            title="Invite to Collab"
            onPress={handleInvite}
            size="lg"
            style={styles.ctaHalf}
            icon={<Handshake size={18} color={colors.onPrimary} strokeWidth={2} />}
          />
        )}
      </Animated.View>

      {creator && (
        <ReportModal
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          creatorName={creator.user.full_name}
          targetUserId={creator.user_id}
        />
      )}
      {creator && isBusiness && currentUser && (
        <InviteModal
          visible={inviteVisible}
          onClose={() => setInviteVisible(false)}
          creatorId={creator.id}
          businessUserId={currentUser.id}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  pagePad: { paddingHorizontal: Spacing.lg },

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroContainer: {
    height: HERO_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: HERO_HEIGHT,
  },
  avatarOverlapWrap: {
    position: 'absolute',
    bottom: -AVATAR_OVERLAP,
    left: Spacing.lg,
  },
  avatarBorder: {
    borderRadius: (AVATAR_SIZE + 6) / 2,
    borderWidth: 3,
    ...Shadows.md,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 2,
    right: -2,
    borderRadius: 12,
    padding: 2,
  },

  // ── Floating header ─────────────────────────────────────────────────────────
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  floatingHeaderBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  headerRightRow: { flexDirection: 'row', gap: Spacing.sm },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Identity ────────────────────────────────────────────────────────────────
  identitySection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  name: {
    ...Typography.title2,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  username: {
    ...Typography.subheadline,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  locationText: {
    ...Typography.subheadline,
  },
  nichesScroll: {
    marginLeft: -Spacing.lg,
    marginRight: -Spacing.lg,
  },
  nichesContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  nicheChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  nicheChipText: {
    ...Typography.caption1,
    fontWeight: '700',
  },

  // ── Stats ───────────────────────────────────────────────────────────────────
  statsCard: { marginBottom: Spacing.xxl },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
  statValue: { ...Typography.headline, fontWeight: '700' },
  statLabel: { ...Typography.caption2, marginTop: Spacing.xxs },
  statDivider: { width: 1, height: 40 },

  // ── Social Cards ────────────────────────────────────────────────────────────
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
    marginTop: Spacing.xxl,
  },
  socialCardsWrap: { gap: Spacing.sm, marginBottom: Spacing.xs },
  socialCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  socialCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  socialCardInfo: { flex: 1 },
  socialHandleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  socialHandle: { ...Typography.subheadline, fontWeight: '600' },
  socialPlatformLabel: { ...Typography.caption1, marginTop: 2 },
  socialFollowers: { alignItems: 'flex-end' },
  socialFollowerCount: { ...Typography.headline, fontWeight: '700' },
  socialFollowerLabel: { ...Typography.caption2 },
  socialStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
  },
  socialStatItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  socialStatText: { ...Typography.caption1 },

  // ── Portfolio ───────────────────────────────────────────────────────────────
  portfolioScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  portfolioItemWrap: { position: 'relative' },
  portfolioImage: {
    width: 160,
    height: 213,
    borderRadius: BorderRadius.lg,
  },

  // ── About ───────────────────────────────────────────────────────────────────
  aboutCard: { gap: 0, marginBottom: Spacing.xs },
  bioText: {
    ...Typography.body,
    lineHeight: 26,
  },
  bioToggle: { marginTop: Spacing.sm, alignSelf: 'flex-start' },
  bioToggleText: { ...Typography.subheadline, fontWeight: '600' },
  aboutDivider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.lg },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  aboutRowLabel: { ...Typography.subheadline, flex: 1 },
  aboutRowValue: { ...Typography.subheadline, fontWeight: '600' },

  // ── Rating ──────────────────────────────────────────────────────────────────
  ratingCard: { marginBottom: Spacing.md },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  ratingLarge: { ...Typography.title1, fontWeight: '800' },
  ratingRight: { gap: Spacing.xs },
  ratingStarsRow: { flexDirection: 'row', gap: 3 },
  ratingCount: { ...Typography.footnote },

  // ── Reviews ─────────────────────────────────────────────────────────────────
  reviewCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  reviewMeta: { flex: 1 },
  reviewMetaTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  reviewerName: { ...Typography.subheadline, fontWeight: '600', flex: 1 },
  verifiedBizBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  verifiedBizLabel: { ...Typography.caption2, fontWeight: '700' },
  reviewStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewDate: { ...Typography.caption2, marginLeft: Spacing.xs },
  reviewComment: { ...Typography.subheadline, lineHeight: 22 },
  replyBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    gap: 4,
  },
  replyLabel: { ...Typography.caption2, fontWeight: '700', letterSpacing: 0.8 },
  replyText: { ...Typography.footnote, lineHeight: 20 },
  replyDate: { ...Typography.caption2, marginTop: 2 },
  respondBtn: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  respondBtnText: { ...Typography.caption1, fontWeight: '600' },

  // ── Bottom CTA ───────────────────────────────────────────────────────────────
  bottomCta: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadows.lg,
  },
  ctaHalf: { flex: 1 },
  ctaFull: { flex: 1 },

  // ── Report Modal ────────────────────────────────────────────────────────────
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  socialOwnerActions: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.sm, marginTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  socialOwnerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: BorderRadius.sm, borderWidth: 1, minHeight: 32 },
  socialOwnerBtnText: { ...Typography.caption1, fontWeight: '600' },
  modalCloseBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { ...Typography.headline, textAlign: 'center', flex: 1 },
  modalBody: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  warningText: { ...Typography.caption1, flex: 1, lineHeight: 20 },
  sectionLabel: { ...Typography.subheadline, fontWeight: '600', marginBottom: Spacing.md },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
    minHeight: 52,
  },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  reasonLabel: { ...Typography.body, flex: 1 },
  textAreaWrap: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, minHeight: 120 },
  textArea: { ...Typography.body, minHeight: 80 },
  charCount: { ...Typography.caption2, textAlign: 'right', marginTop: Spacing.xs },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  successTitle: { ...Typography.title2, marginBottom: Spacing.sm },
  successBody: { ...Typography.body, textAlign: 'center', lineHeight: 24 },
  successBtn: { marginTop: Spacing.xxl, alignSelf: 'stretch' },

  // ── Invite Modal ────────────────────────────────────────────────────────────
  inviteLoading: { paddingVertical: Spacing.xl, alignItems: 'center' },
  inviteEmpty: { padding: Spacing.lg, marginBottom: Spacing.sm },
  inviteEmptyText: { ...Typography.footnote, textAlign: 'center' },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
    minHeight: 52,
  },
  listingRowInfo: { flex: 1 },
  listingRowTitle: { ...Typography.subheadline, fontWeight: '600', marginBottom: 2 },
  listingRowMeta: { ...Typography.caption1 },
});
