import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  X,
  Check,
  Send,
  Users,
  TrendingUp,
  Eye,
  Star,
  Play,
  Hash,
  Minus,
  Plus,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import * as api from '../../lib/api';
import { toast } from '../../lib/toast';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Avatar } from '../../components/ui/Avatar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ThemedText } from '../../components/ui/ThemedText';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';
import { formatFollowers } from '../../components/listing/RequirementTag';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import type { Creator, Deliverable } from '../../types';

const MAX_WHY_FIT = 300;

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[pillStyles.pill, { backgroundColor: colors.surfaceSecondary }]}>
      <Icon size={13} color={colors.primary} strokeWidth={2} />
      <View style={pillStyles.texts}>
        <ThemedText variant="caption2" style={{ color: colors.textSecondary }}>
          {label}
        </ThemedText>
        <ThemedText variant="caption1" style={[pillStyles.value, { color: colors.text }]}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.md,
  },
  texts: { gap: 1 },
  value: { ...Typography.caption1, fontWeight: '700' },
});

// ─── Deliverable Stepper Row ──────────────────────────────────────────────────

function DeliverableRow({
  deliverable,
  count,
  onDecrement,
  onIncrement,
}: {
  deliverable: Deliverable;
  count: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const platformLabel =
    deliverable.platform === 'instagram'
      ? 'Instagram'
      : deliverable.platform === 'tiktok'
        ? 'TikTok'
        : deliverable.platform === 'both'
          ? 'IG + TT'
          : null;

  return (
    <View style={[dStyles.row, { borderBottomColor: colors.borderLight }]}>
      <View style={dStyles.left}>
        <View style={dStyles.labelRow}>
          {platformLabel && (
            <View style={[dStyles.platformChip, { backgroundColor: colors.primaryLight + '18' }]}>
              <ThemedText variant="caption2" style={[dStyles.platformText, { color: colors.primary }]}>
                {platformLabel}
              </ThemedText>
            </View>
          )}
          <ThemedText variant="subheadline" style={[dStyles.type, { color: colors.text }]}>
            {deliverable.type}
          </ThemedText>
        </View>
        {deliverable.notes ? (
          <ThemedText variant="caption1" style={[dStyles.notes, { color: colors.textSecondary }]}>
            {deliverable.notes}
          </ThemedText>
        ) : null}
      </View>
      <View style={dStyles.stepper}>
        <PressableScale
          onPress={() => { haptics.tap(); onDecrement(); }}
          style={[dStyles.stepBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}
          accessibilityRole="button"
          accessibilityLabel="Decrease count"
          hitSlop={8}
        >
          <Minus size={14} color={count <= 1 ? colors.textTertiary : colors.text} strokeWidth={2.5} />
        </PressableScale>
        <ThemedText variant="headline" style={[dStyles.count, { color: colors.text }]}>
          {count}
        </ThemedText>
        <PressableScale
          onPress={() => { haptics.tap(); onIncrement(); }}
          style={[dStyles.stepBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}
          accessibilityRole="button"
          accessibilityLabel="Increase count"
          hitSlop={8}
        >
          <Plus size={14} color={colors.text} strokeWidth={2.5} />
        </PressableScale>
      </View>
    </View>
  );
}

const dStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  left: { flex: 1, gap: Spacing.xxs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  platformChip: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  platformText: { ...Typography.caption2, fontWeight: '700', letterSpacing: 0.3 },
  type: { ...Typography.subheadline, fontWeight: '600' },
  notes: { ...Typography.caption1, lineHeight: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { ...Typography.headline, fontWeight: '700', minWidth: 24, textAlign: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ApplyScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listings, user } = useStore();

  const listing = useMemo(() => listings.find((l) => l.id === listingId), [listings, listingId]);

  const [creator, setCreator] = useState<Creator | null>(null);
  const [whyFit, setWhyFit] = useState('');
  const [deliverableCounts, setDeliverableCounts] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Initialise deliverable counts from listing
  useEffect(() => {
    if (listing?.deliverables) {
      setDeliverableCounts(listing.deliverables.map((d) => d.count));
    }
  }, [listing]);

  // Fetch creator profile
  useEffect(() => {
    if (!user || user.role !== 'creator') return;
    api.getCreatorProfile(user.id, user.id).then(setCreator).catch(() => {});
  }, [user]);

  const igFollowers = creator?.instagram_followers ?? 0;
  const ttFollowers = creator?.tiktok_followers ?? 0;

  const creatorStats = useMemo(() => {
    const chips: Array<{ icon: React.ComponentType<any>; label: string; value: string }> = [];
    // Top platform
    if (igFollowers >= ttFollowers && igFollowers > 0) {
      chips.push({ icon: Users, label: 'Instagram', value: formatFollowers(igFollowers) });
    } else if (ttFollowers > igFollowers) {
      chips.push({ icon: Play, label: 'TikTok', value: formatFollowers(ttFollowers) });
    }
    // Both if significant
    if (igFollowers > 0 && ttFollowers > 0) {
      const other = igFollowers >= ttFollowers
        ? { icon: Play, label: 'TikTok', value: formatFollowers(ttFollowers) }
        : { icon: Users, label: 'Instagram', value: formatFollowers(igFollowers) };
      chips.push(other);
    }
    if (creator?.engagement_rate) {
      chips.push({ icon: TrendingUp, label: 'Engagement', value: `${creator.engagement_rate}%` });
    }
    if (creator?.avg_views) {
      chips.push({ icon: Eye, label: 'Avg Views', value: formatFollowers(creator.avg_views) });
    }
    if (creator?.rating) {
      chips.push({ icon: Star, label: 'Rating', value: creator.rating.toFixed(1) });
    }
    return chips;
  }, [creator, igFollowers, ttFollowers]);

  const niches = useMemo(() => {
    if (!creator) return [];
    const n: string[] = [];
    if (creator.niches?.length) return creator.niches;
    if (creator.categories?.length) return creator.categories.map((c) => c.charAt(0).toUpperCase() + c.slice(1));
    return n;
  }, [creator]);

  const handleDecrement = useCallback((i: number) => {
    setDeliverableCounts((prev) => prev.map((c, idx) => idx === i ? Math.max(1, c - 1) : c));
  }, []);

  const handleIncrement = useCallback((i: number) => {
    setDeliverableCounts((prev) => prev.map((c, idx) => idx === i ? c + 1 : c));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!whyFit.trim() || !creator || !listing) return;
    haptics.confirm();
    setSubmitting(true);

    const proposedDeliverables = listing.deliverables?.map((d, i) => ({
      ...d,
      count: deliverableCounts[i] ?? d.count,
    })) ?? [];

    const ok = await api.applyToListing(
      listing.id,
      creator.id,
      whyFit.trim(),
      { deliverables: proposedDeliverables }
    );

    setSubmitting(false);
    if (ok) {
      haptics.success();
      setSubmitted(true);
    } else {
      haptics.error();
      toast.error('Failed to submit application. Please try again.');
    }
  }, [whyFit, creator, listing, deliverableCounts, haptics]);

  const handleClose = useCallback(() => {
    haptics.tap();
    router.back();
  }, [router, haptics]);

  if (!listing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Apply" />
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { borderBottomColor: colors.borderLight, paddingTop: insets.top > 0 ? insets.top : Spacing.lg }]}>
          <View style={styles.headerSpacer} />
          <ThemedText variant="headline" style={[styles.headerTitle, { color: colors.text }]}>Apply</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: colors.completedLight }]}>
            <Check size={32} color={colors.completed} strokeWidth={2.5} />
          </View>
          <ThemedText variant="title2" style={[styles.successTitle, { color: colors.text }]}>
            Application Sent!
          </ThemedText>
          <ThemedText variant="body" style={[styles.successBody, { color: colors.textSecondary }]}>
            The business will review your profile and application and get in touch if you're a great fit.
          </ThemedText>
          <Button
            title="Done"
            onPress={handleClose}
            size="lg"
            style={styles.successBtn}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.headerRow,
          {
            borderBottomColor: colors.borderLight,
            paddingTop: insets.top > 0 ? insets.top : Spacing.lg,
          },
        ]}
      >
        <PressableScale
          scaleValue={0.9}
          onPress={handleClose}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={22} color={colors.text} strokeWidth={2.2} />
        </PressableScale>
        <ThemedText variant="headline" style={[styles.headerTitle, { color: colors.text }]}>
          Apply
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Listing snippet */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(60)}
          style={[styles.snippetCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        >
          <AdaptiveImage
            source={{ uri: listing.image_url }}
            style={styles.snippetImage}
            contentFit="cover"
          />
          <View style={styles.snippetTexts}>
            <ThemedText variant="headline" numberOfLines={1} style={{ color: colors.text }}>
              {listing.title}
            </ThemedText>
            <ThemedText variant="caption1" style={{ color: colors.textSecondary }}>
              {listing.business.business_name}
            </ThemedText>
          </View>
        </Animated.View>

        {/* Creator stats — auto-attached */}
        {creator && (creatorStats.length > 0 || niches.length > 0) && (
          <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.statsCard}>
            <View
              style={[styles.statsCardInner, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            >
              {/* Header row */}
              <View style={styles.statsHeader}>
                <Avatar
                  uri={creator.user?.avatar_url ?? null}
                  name={creator.user?.full_name ?? ''}
                  size={44}
                />
                <View style={styles.statsHeaderTexts}>
                  <View style={styles.statsNameRow}>
                    <ThemedText variant="headline" style={[styles.statsName, { color: colors.text }]}>
                      {creator.user?.full_name ?? 'You'}
                    </ThemedText>
                    {creator.verified && <VerifiedBadge size="sm" />}
                  </View>
                  <View style={[styles.autoBadge, { backgroundColor: colors.completedLight }]}>
                    <Check size={10} color={colors.completed} strokeWidth={3} />
                    <ThemedText variant="caption2" style={[styles.autoBadgeText, { color: colors.completed }]}>
                      Auto-attached to application
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Stats row */}
              {creatorStats.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.statsPillsRow}
                >
                  {creatorStats.map((s) => (
                    <StatPill key={s.label} {...s} />
                  ))}
                </ScrollView>
              )}

              {/* Niches */}
              {niches.length > 0 && (
                <View style={styles.nichesRow}>
                  <Hash size={12} color={colors.textSecondary} strokeWidth={2} />
                  <View style={styles.nichesChips}>
                    {niches.map((n) => (
                      <View
                        key={n}
                        style={[styles.nicheChip, { backgroundColor: colors.primaryLight + '18', borderColor: colors.primaryLight + '30' }]}
                      >
                        <ThemedText variant="caption2" style={[styles.nicheChipText, { color: colors.primary }]}>
                          {n}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Why you're a fit */}
        <Animated.View entering={FadeInDown.duration(400).delay(180)} style={styles.section}>
          <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text }]}>
            Why you're a fit
          </ThemedText>
          <ThemedText variant="caption1" style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Tell the business what makes you the perfect creator for this collab.
          </ThemedText>
          <View
            style={[
              styles.textareaWrap,
              {
                backgroundColor: colors.surface,
                borderColor: whyFit.length > 0 ? colors.primary : colors.border,
              },
            ]}
          >
            <TextInput
              value={whyFit}
              onChangeText={(t) => t.length <= MAX_WHY_FIT && setWhyFit(t)}
              placeholder="Share your experience, niche, and why this listing is a great match for your audience…"
              placeholderTextColor={colors.textTertiary}
              multiline
              allowFontScaling
              maxFontSizeMultiplier={1.4}
              style={[styles.textarea, { color: colors.text }]}
              maxLength={MAX_WHY_FIT}
              textAlignVertical="top"
            />
            <ThemedText variant="caption2" style={[styles.charCount, { color: whyFit.length >= MAX_WHY_FIT ? colors.error : colors.textTertiary }]}>
              {whyFit.length}/{MAX_WHY_FIT}
            </ThemedText>
          </View>
        </Animated.View>

        {/* Proposed deliverables */}
        {listing.deliverables && listing.deliverables.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(240)} style={styles.section}>
            <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text }]}>
              Proposed deliverables
            </ThemedText>
            <ThemedText variant="caption1" style={[styles.sectionHint, { color: colors.textSecondary }]}>
              Pre-filled from the listing — adjust counts if needed.
            </ThemedText>
            <View
              style={[styles.deliverablesCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            >
              {listing.deliverables.map((d, i) => (
                <DeliverableRow
                  key={i}
                  deliverable={d}
                  count={deliverableCounts[i] ?? d.count}
                  onDecrement={() => handleDecrement(i)}
                  onIncrement={() => handleIncrement(i)}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* Submit */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Button
            title={submitting ? 'Submitting…' : 'Submit Application'}
            onPress={handleSubmit}
            size="lg"
            disabled={!whyFit.trim() || submitting || !creator}
            variant="primary"
            icon={
              <Send
                size={18}
                color={
                  !whyFit.trim() || submitting || !creator
                    ? colors.textTertiary
                    : colors.onPrimary
                }
                strokeWidth={2}
              />
            }
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 44, height: 44 },
  headerTitle: { ...Typography.headline, textAlign: 'center', flex: 1 },

  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.xl,
  },

  // Listing snippet
  snippetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  snippetImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
  },
  snippetTexts: { flex: 1, gap: Spacing.xxs },

  // Creator stats card
  statsCard: { gap: Spacing.sm },
  statsCardInner: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  statsHeaderTexts: { flex: 1, gap: Spacing.xs },
  statsNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  statsName: { ...Typography.headline, fontWeight: '700', flex: 1 },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  autoBadgeText: { ...Typography.caption2, fontWeight: '600', letterSpacing: 0.2 },

  statsPillsRow: { gap: Spacing.sm, flexDirection: 'row' },

  nichesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginTop: Spacing.xs },
  nichesChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  nicheChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  nicheChipText: { ...Typography.caption2, fontWeight: '700', letterSpacing: 0.2 },

  // Sections
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.title3, fontWeight: '700' },
  sectionHint: { ...Typography.caption1, lineHeight: 18 },

  // Textarea
  textareaWrap: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 140,
    marginTop: Spacing.xs,
  },
  textarea: {
    ...Typography.body,
    minHeight: 100,
    lineHeight: 24,
  },
  charCount: {
    ...Typography.caption2,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  // Deliverables
  deliverablesCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    ...Shadows.sm,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: { ...Typography.title2, textAlign: 'center', marginBottom: Spacing.sm },
  successBody: { ...Typography.body, textAlign: 'center', lineHeight: 24 },
  successBtn: { marginTop: Spacing.xxl, alignSelf: 'stretch' },
});
