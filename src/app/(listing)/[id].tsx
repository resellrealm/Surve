import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { Share, Dimensions, Linking } from 'react-native';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsOffline } from '../../hooks/useIsOffline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import { ImageGallery } from '../../components/ui/ImageGallery';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Share2,
  Heart,
  MapPin,
  DollarSign,
  CheckCircle,
  Calendar,
  Camera,
  BarChart3,
  Eye,
  MousePointerClick,
  FileText,
  MoreVertical,
  Flag,
  AlertTriangle,
  X,
  Check,
  ChevronRight,
  Hash,
  Gift,
  ExternalLink,
  Star,
  ChevronDown,
  ChevronUp,
  Send,
  Users,
  TrendingUp,
  Play,
  Package,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { AnimatedLikeButton } from '../../components/ui/AnimatedLikeButton';
import * as api from '../../lib/api';
import { fetchListingAnalytics } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { Avatar } from '../../components/ui/Avatar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ThemedText } from '../../components/ui/ThemedText';
import { PlatformBadge } from '../../components/creator/PlatformBadge';
import { formatFollowers } from '../../components/listing/RequirementTag';
import {
  AnalyticsChart,
  AnalyticsSkeletonCard,
} from '../../components/listing/AnalyticsChart';
import { ListingDetailSkeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { formatCurrencyRange } from '../../lib/currency';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import type { Listing, ListingAnalyticsSummary, Creator, CompType } from '../../types';
import { formatDateCompact, formatDateLong } from '../../lib/dateFormat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 340;
const PARALLAX_OFFSET = 80;
const CAROUSEL_CARD_WIDTH = 220;
const MAX_APPLY_MESSAGE = 600;

// ─── Status Pill ────────────────────────────────────────────────────────────

function StatusPill({ listing }: { listing: Listing }) {
  const { colors } = useTheme();

  const isFilled =
    !!listing.max_applicants && listing.applicants_count >= listing.max_applicants;

  let label: string;
  let bg: string;
  let textColor: string;

  if (isFilled) {
    label = 'Filled';
    bg = colors.cancelledLight;
    textColor = colors.cancelled;
  } else if (listing.status === 'active') {
    label = 'Open';
    bg = colors.completedLight;
    textColor = colors.completed;
  } else if (listing.status === 'paused') {
    label = 'Paused';
    bg = colors.pendingLight;
    textColor = colors.pending;
  } else if (listing.status === 'closed') {
    label = 'Closed';
    bg = colors.cancelledLight;
    textColor = colors.cancelled;
  } else {
    label = 'Draft';
    bg = colors.surfaceSecondary;
    textColor = colors.textTertiary;
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
      style={[statusPillStyles.pill, { backgroundColor: bg }]}
    >
      <View style={[statusPillStyles.dot, { backgroundColor: textColor }]} />
      <ThemedText variant="caption1" style={[statusPillStyles.label, { color: textColor }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const statusPillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...Typography.caption1,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

// ─── Comp Summary Card ───────────────────────────────────────────────────────

const COMP_TYPE_LABELS: Record<CompType, string> = {
  paid: 'Cash Payment',
  comped_stay: 'Complimentary Stay',
  comped_meal: 'Complimentary Meal',
  product: 'Product Gift',
  mixed: 'Cash + Perks',
};

const COMP_TYPE_ICONS: Record<CompType, React.ComponentType<any>> = {
  paid: DollarSign,
  comped_stay: Gift,
  comped_meal: Gift,
  product: Package,
  mixed: Gift,
};

function CompSummaryCard({ listing }: { listing: Listing }) {
  const { colors } = useTheme();
  const compType = listing.comp_type ?? 'paid';
  const label = COMP_TYPE_LABELS[compType] ?? 'Compensation';
  const PerksIcon = COMP_TYPE_ICONS[compType] ?? Gift;
  const hasPay = listing.pay_min > 0 || listing.pay_max > 0;
  const hasPerks = compType !== 'paid';

  return (
    <Card style={compStyles.card} accessibilityRole="none">
      {/* Pay section */}
      {hasPay && (
        <View style={compStyles.payRow}>
          <View style={[compStyles.iconWrap, { backgroundColor: colors.primaryLight + '18' }]}>
            <DollarSign size={20} color={colors.primary} strokeWidth={2.5} />
          </View>
          <View style={compStyles.payTexts}>
            <ThemedText variant="title2" style={[compStyles.payAmount, { color: colors.primary }]}>
              {formatCurrencyRange(listing.pay_min, listing.pay_max)}
            </ThemedText>
            <ThemedText variant="caption1" style={{ color: colors.textSecondary }}>
              Cash payment
            </ThemedText>
          </View>
        </View>
      )}

      {/* Perks section */}
      {hasPerks && (
        <>
          {hasPay && (
            <View style={[compStyles.divider, { backgroundColor: colors.borderLight }]} />
          )}
          <View style={compStyles.payRow}>
            <View style={[compStyles.iconWrap, { backgroundColor: colors.successLight }]}>
              <PerksIcon size={20} color={colors.success} strokeWidth={2.5} />
            </View>
            <View style={compStyles.payTexts}>
              <ThemedText variant="headline" style={[compStyles.perksLabel, { color: colors.text }]}>
                {label}
              </ThemedText>
              <ThemedText variant="caption1" style={{ color: colors.textSecondary }}>
                Included with booking
              </ThemedText>
            </View>
          </View>
        </>
      )}

      {/* Applicant count pill */}
      <View style={[compStyles.applicantsBadge, { backgroundColor: colors.surfaceSecondary }]}>
        <Users size={12} color={colors.textSecondary} strokeWidth={2} />
        <ThemedText variant="caption2" style={{ color: colors.textSecondary }}>
          {listing.applicants_count} applicant{listing.applicants_count !== 1 ? 's' : ''}
          {listing.max_applicants ? ` · ${listing.max_applicants} max` : ''}
        </ThemedText>
      </View>
    </Card>
  );
}

const compStyles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTexts: {
    flex: 1,
    gap: Spacing.xxs,
  },
  payAmount: {
    ...Typography.title2,
    fontWeight: '800',
  },
  perksLabel: {
    ...Typography.headline,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xs,
  },
  applicantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
});

// ─── Deliverables Checklist ──────────────────────────────────────────────────

function DeliverableRow({
  type,
  count,
  platform,
  notes,
}: {
  type: string;
  count: number;
  platform?: string;
  notes?: string;
}) {
  const { colors } = useTheme();

  const platformLabel =
    platform === 'instagram'
      ? 'Instagram'
      : platform === 'tiktok'
        ? 'TikTok'
        : platform === 'both'
          ? 'IG + TT'
          : null;

  return (
    <View style={deliverableStyles.row} accessible accessibilityRole="text" accessibilityLabel={`${count} ${platformLabel ?? ''} ${type}${notes ? ': ' + notes : ''}`}>
      <View style={[deliverableStyles.checkWrap, { backgroundColor: colors.completedLight }]}>
        <Check size={13} color={colors.completed} strokeWidth={3} />
      </View>
      <View style={deliverableStyles.textCol}>
        <View style={deliverableStyles.titleRow}>
          <ThemedText variant="subheadline" style={[deliverableStyles.count, { color: colors.text }]}>
            {count}×
          </ThemedText>
          {platformLabel && (
            <View style={[deliverableStyles.platformChip, { backgroundColor: colors.primaryLight + '18' }]}>
              <ThemedText variant="caption2" style={[deliverableStyles.platformText, { color: colors.primary }]}>
                {platformLabel}
              </ThemedText>
            </View>
          )}
          <ThemedText variant="subheadline" style={[deliverableStyles.typeName, { color: colors.text }]}>
            {type}
          </ThemedText>
        </View>
        {notes ? (
          <ThemedText variant="caption1" style={[deliverableStyles.notes, { color: colors.textSecondary }]}>
            {notes}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const deliverableStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkWrap: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  textCol: {
    flex: 1,
    gap: Spacing.xxs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  count: {
    ...Typography.subheadline,
    fontWeight: '700',
  },
  platformChip: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  platformText: {
    ...Typography.caption2,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  typeName: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  notes: {
    ...Typography.caption1,
    lineHeight: 18,
  },
});

// ─── Requirements Card ───────────────────────────────────────────────────────

function RequirementsCard({ listing }: { listing: Listing }) {
  const { colors } = useTheme();

  const rows: Array<{ icon: React.ComponentType<any>; label: string; value: string }> = [
    {
      icon: Users,
      label: 'Min Followers',
      value: `${formatFollowers(listing.min_followers)}+`,
    },
    {
      icon: TrendingUp,
      label: 'Engagement Rate',
      value: `${listing.min_engagement_rate}%+`,
    },
    {
      icon: Camera,
      label: 'Content Type',
      value: listing.content_type,
    },
  ];

  return (
    <Card style={reqStyles.card}>
      {rows.map(({ icon: Icon, label, value }, i) => (
        <React.Fragment key={label}>
          <View style={reqStyles.row}>
            <View style={[reqStyles.iconWrap, { backgroundColor: colors.surfaceSecondary }]}>
              <Icon size={16} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={reqStyles.texts}>
              <ThemedText variant="caption1" style={{ color: colors.textSecondary }}>
                {label}
              </ThemedText>
              <ThemedText variant="subheadline" style={[reqStyles.value, { color: colors.text }]}>
                {value}
              </ThemedText>
            </View>
          </View>
          {i < rows.length - 1 && (
            <View style={[reqStyles.divider, { backgroundColor: colors.borderLight }]} />
          )}
        </React.Fragment>
      ))}
    </Card>
  );
}

const reqStyles = StyleSheet.create({
  card: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  value: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
});

// ─── Date Window ────────────────────────────────────────────────────────────

function DateWindowRow({ start, end }: { start: string; end: string }) {
  const { colors } = useTheme();
  const startLabel = formatDateCompact(start);
  const endLabel = formatDateCompact(end);

  return (
    <View
      style={[dateStyles.container, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
      accessible
      accessibilityLabel={`Visit window: ${startLabel} to ${endLabel}`}
    >
      <View style={[dateStyles.iconWrap, { backgroundColor: colors.activeLight }]}>
        <Calendar size={18} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={dateStyles.texts}>
        <ThemedText variant="caption1" style={{ color: colors.textSecondary }}>
          Visit Window
        </ThemedText>
        <ThemedText variant="subheadline" style={[dateStyles.range, { color: colors.text }]}>
          {startLabel} — {endLabel}
        </ThemedText>
      </View>
    </View>
  );
}

const dateStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  range: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
});

// ─── Hashtags Row ────────────────────────────────────────────────────────────

function HashtagChip({ tag }: { tag: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[hashStyles.chip, { backgroundColor: colors.primaryLight + '18', borderColor: colors.primaryLight + '30' }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={tag}
    >
      <Hash size={11} color={colors.primary} strokeWidth={2.5} />
      <ThemedText variant="caption1" style={[hashStyles.tag, { color: colors.primary }]}>
        {tag.replace(/^#/, '')}
      </ThemedText>
    </View>
  );
}

const hashStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tag: {
    ...Typography.caption1,
    fontWeight: '600',
  },
});

// ─── Brand Guidelines Card ──────────────────────────────────────────────────

function BrandGuidelinesCard({ text }: { text: string }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_LINES = 3;

  return (
    <View style={[brandStyles.container, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <View style={brandStyles.header}>
        <View style={[brandStyles.iconWrap, { backgroundColor: colors.warningLight }]}>
          <FileText size={16} color={colors.warning} strokeWidth={2} />
        </View>
        <ThemedText variant="headline" style={[brandStyles.title, { color: colors.text }]}>
          Brand Guidelines
        </ThemedText>
      </View>
      <ThemedText
        variant="body"
        style={[brandStyles.body, { color: colors.textSecondary }]}
        numberOfLines={expanded ? undefined : PREVIEW_LINES}
      >
        {text}
      </ThemedText>
      <PressableScale
        onPress={() => { haptics.tap(); setExpanded(v => !v); }}
        style={brandStyles.expandBtn}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse brand guidelines' : 'Expand brand guidelines'}
      >
        <ThemedText variant="subheadline" style={[brandStyles.expandText, { color: colors.primary }]}>
          {expanded ? 'Show less' : 'Read more'}
        </ThemedText>
        {expanded
          ? <ChevronUp size={14} color={colors.primary} strokeWidth={2.5} />
          : <ChevronDown size={14} color={colors.primary} strokeWidth={2.5} />}
      </PressableScale>
    </View>
  );
}

const brandStyles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.headline,
    fontWeight: '700',
  },
  body: {
    ...Typography.body,
    lineHeight: 24,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingRight: Spacing.sm,
  },
  expandText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
});

// ─── Business Mini-Card ──────────────────────────────────────────────────────

function BusinessMiniCard({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const biz = listing.business;

  return (
    <PressableScale
      onPress={() => { haptics.tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={`${biz.business_name} — View business profile`}
      style={[bizStyles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
    >
      <Avatar
        uri={biz.logo_url ?? biz.image_url}
        name={biz.business_name}
        size={52}
      />
      <View style={bizStyles.info}>
        <View style={bizStyles.nameRow}>
          <ThemedText
            variant="headline"
            style={[bizStyles.name, { color: colors.text }]}
            numberOfLines={1}
          >
            {biz.business_name}
          </ThemedText>
          {biz.verified && (
            <CheckCircle size={16} color={colors.primary} fill={colors.primary} strokeWidth={2} />
          )}
        </View>
        <View style={bizStyles.metaRow}>
          <MapPin size={12} color={colors.textSecondary} strokeWidth={2} />
          <ThemedText variant="caption1" style={[bizStyles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {biz.location}
          </ThemedText>
        </View>
        {biz.total_reviews > 0 && (
          <View style={bizStyles.ratingRow}>
            <Star size={12} color={'#F59E0B'} fill={'#F59E0B'} strokeWidth={2} />
            <ThemedText variant="caption1" style={[bizStyles.rating, { color: colors.text }]}>
              {biz.rating.toFixed(1)}
            </ThemedText>
            <ThemedText variant="caption1" style={{ color: colors.textSecondary }}>
              · {biz.total_reviews} review{biz.total_reviews !== 1 ? 's' : ''}
            </ThemedText>
          </View>
        )}
      </View>
      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
    </PressableScale>
  );
}

const bizStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  info: {
    flex: 1,
    gap: Spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    ...Typography.headline,
    fontWeight: '700',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  meta: {
    ...Typography.caption1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  rating: {
    ...Typography.caption1,
    fontWeight: '700',
  },
});

// ─── Creator Stats Chip ──────────────────────────────────────────────────────

function CreatorStatChip({
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
    <View style={[statChipStyles.chip, { backgroundColor: colors.surfaceSecondary }]}>
      <Icon size={13} color={colors.primary} strokeWidth={2} />
      <View>
        <ThemedText variant="caption2" style={{ color: colors.textSecondary }}>
          {label}
        </ThemedText>
        <ThemedText variant="caption1" style={[statChipStyles.value, { color: colors.text }]}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

const statChipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.md,
  },
  value: {
    ...Typography.caption1,
    fontWeight: '700',
  },
});

// ─── Application Modal ───────────────────────────────────────────────────────

function ApplicationModal({
  visible,
  onClose,
  listing,
  creator,
}: {
  visible: boolean;
  onClose: () => void;
  listing: Listing;
  creator: Creator | null;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resetAndClose = useCallback(() => {
    setMessage('');
    setSubmitted(false);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!message.trim() || !creator) return;
    haptics.confirm();
    setSubmitting(true);
    const ok = await api.applyToListing(listing.id, creator.id, message.trim());
    setSubmitting(false);
    if (ok) {
      haptics.success();
      setSubmitted(true);
    } else {
      haptics.error();
      toast.error('Failed to submit application. Please try again.');
    }
  }, [message, creator, listing.id, haptics]);

  const igFollowers = creator?.instagram_followers ?? 0;
  const ttFollowers = creator?.tiktok_followers ?? 0;
  const bestFollowers = Math.max(igFollowers, ttFollowers);

  const creatorStats = useMemo(() => {
    const chips: Array<{ icon: React.ComponentType<any>; label: string; value: string }> = [];
    if (igFollowers > 0) chips.push({ icon: Users, label: 'Instagram', value: formatFollowers(igFollowers) });
    if (ttFollowers > 0) chips.push({ icon: Play, label: 'TikTok', value: formatFollowers(ttFollowers) });
    if (creator?.engagement_rate) chips.push({ icon: TrendingUp, label: 'Engagement', value: `${creator.engagement_rate}%` });
    if (creator?.avg_views) chips.push({ icon: Eye, label: 'Avg Views', value: formatFollowers(creator.avg_views) });
    if (creator?.rating) chips.push({ icon: Star, label: 'Rating', value: creator.rating.toFixed(1) });
    return chips;
  }, [creator, igFollowers, ttFollowers]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[applyStyles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View
          style={[
            applyStyles.header,
            {
              borderBottomColor: colors.borderLight,
              paddingTop: insets.top > 0 ? insets.top : Spacing.lg,
            },
          ]}
        >
          <PressableScale
            scaleValue={0.9}
            onPress={() => { haptics.tap(); resetAndClose(); }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={applyStyles.closeBtn}
          >
            <X size={22} color={colors.text} strokeWidth={2.2} />
          </PressableScale>
          <ThemedText variant="headline" style={[applyStyles.headerTitle, { color: colors.text }]}>
            Apply to Listing
          </ThemedText>
          <View style={applyStyles.closeBtn} />
        </View>

        {submitted ? (
          <Animated.View entering={FadeInDown.duration(400)} style={applyStyles.successContainer}>
            <View style={[applyStyles.successIcon, { backgroundColor: colors.completedLight }]}>
              <Check size={32} color={colors.completed} strokeWidth={2.5} />
            </View>
            <ThemedText variant="title2" style={[applyStyles.successTitle, { color: colors.text }]}>
              Application Sent!
            </ThemedText>
            <ThemedText variant="body" style={[applyStyles.successBody, { color: colors.textSecondary }]}>
              The business will review your profile and get in touch if you're a great fit.
            </ThemedText>
            <Button title="Done" onPress={resetAndClose} size="lg" style={{ alignSelf: 'stretch', marginTop: Spacing.xxl }} />
          </Animated.View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              applyStyles.body,
              { paddingBottom: insets.bottom + Spacing.xl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Listing summary */}
            <View style={[applyStyles.listingSnippet, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <AdaptiveImage
                source={{ uri: listing.image_url }}
                style={applyStyles.snippetImage}
                contentFit="cover"
              />
              <View style={applyStyles.snippetTexts}>
                <ThemedText variant="headline" numberOfLines={1} style={[{ color: colors.text }]}>
                  {listing.title}
                </ThemedText>
                <ThemedText variant="caption1" style={{ color: colors.textSecondary }}>
                  {listing.business.business_name}
                </ThemedText>
              </View>
            </View>

            {/* Creator stats (auto-attached) */}
            {creator && creatorStats.length > 0 && (
              <View style={applyStyles.statsSection}>
                <ThemedText variant="subheadline" style={[applyStyles.statsLabel, { color: colors.textSecondary }]}>
                  Your stats — auto-attached
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={applyStyles.statsScroll}
                >
                  {creatorStats.map((s) => (
                    <CreatorStatChip key={s.label} {...s} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Message textarea */}
            <View style={applyStyles.textareaSection}>
              <ThemedText variant="subheadline" style={[applyStyles.textareaLabel, { color: colors.text }]}>
                Why are you a fit?
              </ThemedText>
              <ThemedText variant="caption1" style={[applyStyles.textareaHint, { color: colors.textSecondary }]}>
                Tell the business what makes you the perfect creator for this collab.
              </ThemedText>
              <View
                style={[
                  applyStyles.textareaWrap,
                  { backgroundColor: colors.surface, borderColor: message.length > 0 ? colors.primary : colors.border },
                ]}
              >
                <TextInput
                  value={message}
                  onChangeText={(t) => t.length <= MAX_APPLY_MESSAGE && setMessage(t)}
                  placeholder="Share your experience, niche, and why this listing is a great fit for your audience…"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  allowFontScaling
                  maxFontSizeMultiplier={1.4}
                  style={[applyStyles.textarea, { color: colors.text }]}
                  maxLength={MAX_APPLY_MESSAGE}
                  textAlignVertical="top"
                />
                <ThemedText variant="caption2" style={[applyStyles.charCount, { color: colors.textTertiary }]}>
                  {message.length}/{MAX_APPLY_MESSAGE}
                </ThemedText>
              </View>
            </View>

            <Button
              title={submitting ? 'Submitting…' : 'Submit Application'}
              onPress={handleSubmit}
              size="lg"
              disabled={!message.trim() || submitting || !creator}
              variant="primary"
              style={{ marginTop: Spacing.lg }}
              icon={
                <Send
                  size={18}
                  color={!message.trim() || submitting || !creator ? colors.textTertiary : colors.onPrimary}
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

const applyStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
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
  headerTitle: {
    ...Typography.headline,
    textAlign: 'center',
    flex: 1,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.xl,
  },
  listingSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  snippetImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
  },
  snippetTexts: {
    flex: 1,
    gap: Spacing.xxs,
  },
  statsSection: {
    gap: Spacing.sm,
  },
  statsLabel: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  statsScroll: {
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  textareaSection: {
    gap: Spacing.xs,
  },
  textareaLabel: {
    ...Typography.subheadline,
    fontWeight: '700',
  },
  textareaHint: {
    ...Typography.caption1,
    lineHeight: 18,
  },
  textareaWrap: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 140,
    marginTop: Spacing.sm,
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
  successTitle: {
    ...Typography.title2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successBody: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
});

// ─── Report Modal ────────────────────────────────────────────────────────────

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam or misleading' },
  { key: 'inappropriate', label: 'Inappropriate content' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'impersonation', label: 'Impersonation' },
  { key: 'fraud', label: 'Fraud or scam' },
  { key: 'other', label: 'Other' },
] as const;

const MAX_REPORT_LENGTH = 500;

function ReportModal({
  visible,
  onClose,
  listingTitle,
  targetUserId,
}: {
  visible: boolean;
  onClose: () => void;
  listingTitle: string;
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
    if (ok) { haptics.success(); setSubmitted(true); }
    else haptics.error();
  }, [selectedReason, currentUser, targetUserId, description, haptics]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[reportStyles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[reportStyles.header, { borderBottomColor: colors.borderLight, paddingTop: insets.top > 0 ? insets.top : Spacing.lg }]}
        >
          <PressableScale
            scaleValue={0.9}
            onPress={() => { haptics.tap(); resetAndClose(); }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={reportStyles.closeBtn}
          >
            <X size={22} color={colors.text} strokeWidth={2.2} />
          </PressableScale>
          <ThemedText variant="headline" style={[reportStyles.title, { color: colors.text }]}>
            Report Listing
          </ThemedText>
          <View style={reportStyles.closeBtn} />
        </View>

        {submitted ? (
          <Animated.View entering={FadeInDown.duration(400)} style={reportStyles.successContainer}>
            <View style={[reportStyles.successIcon, { backgroundColor: colors.successLight }]}>
              <Check size={32} color={colors.success} strokeWidth={2.5} />
            </View>
            <ThemedText variant="title2" style={[reportStyles.successTitle, { color: colors.text }]}>Report Submitted</ThemedText>
            <ThemedText variant="body" style={[reportStyles.successBody, { color: colors.textSecondary }]}>
              Thanks for helping keep Surve safe. We'll review your report and take action if needed.
            </ThemedText>
            <Button title="Done" onPress={resetAndClose} size="lg" style={reportStyles.successBtn} />
          </Animated.View>
        ) : (
          <ScrollView
            contentContainerStyle={[reportStyles.body, { paddingBottom: insets.bottom + Spacing.xl }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[reportStyles.warningBanner, { backgroundColor: colors.warningLight }]}>
              <AlertTriangle size={18} color={colors.warning} strokeWidth={2} />
              <ThemedText variant="caption1" style={[reportStyles.warningText, { color: colors.warning }]}>
                Reports are reviewed by our team. False reports may result in account restrictions.
              </ThemedText>
            </View>
            <ThemedText variant="subheadline" style={[reportStyles.sectionLabel, { color: colors.text }]}>
              Why are you reporting "{listingTitle}"?
            </ThemedText>
            {REPORT_REASONS.map((reason) => {
              const isSelected = selectedReason === reason.key;
              return (
                <PressableScale
                  key={reason.key}
                  onPress={() => { haptics.select(); setSelectedReason(reason.key); }}
                  accessibilityRole="radio"
                  accessibilityLabel={reason.label}
                  accessibilityState={{ selected: isSelected }}
                  style={[reportStyles.reasonRow, {
                    backgroundColor: isSelected ? colors.primaryLight + '12' : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                  }]}
                >
                  <View style={[reportStyles.radioOuter, { borderColor: isSelected ? colors.primary : colors.border }]}>
                    {isSelected && <View style={[reportStyles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <ThemedText variant="body" style={[reportStyles.reasonLabel, { color: isSelected ? colors.primary : colors.text }]}>
                    {reason.label}
                  </ThemedText>
                </PressableScale>
              );
            })}
            <ThemedText variant="subheadline" style={[reportStyles.sectionLabel, { color: colors.text, marginTop: Spacing.xl }]}>
              Additional details (optional)
            </ThemedText>
            <View style={[reportStyles.textAreaWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={description}
                onChangeText={(t) => t.length <= MAX_REPORT_LENGTH && setDescription(t)}
                placeholder="Tell us more about what happened…"
                placeholderTextColor={colors.textTertiary}
                multiline
                allowFontScaling
                maxFontSizeMultiplier={1.5}
                style={[reportStyles.textArea, { color: colors.text }]}
                maxLength={MAX_REPORT_LENGTH}
                textAlignVertical="top"
              />
              <ThemedText variant="caption2" style={[reportStyles.charCount, { color: colors.textTertiary }]}>
                {description.length}/{MAX_REPORT_LENGTH}
              </ThemedText>
            </View>
            <Button
              title={submitting ? 'Submitting…' : 'Submit Report'}
              onPress={handleSubmit}
              size="lg"
              disabled={!selectedReason || submitting}
              variant="primary"
              style={{ marginTop: Spacing.xl }}
              icon={<Flag size={18} color={!selectedReason || submitting ? colors.textTertiary : colors.onPrimary} strokeWidth={2} />}
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const reportStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.headline, textAlign: 'center', flex: 1 },
  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
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
});

// ─── Related Listing Mini-Card ────────────────────────────────────────────────

function RelatedListingMiniCard({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress: (l: Listing) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <PressableScale
      onPress={() => { haptics.tap(); onPress(listing); }}
      accessibilityRole="button"
      accessibilityLabel={`Related listing: ${listing.title} by ${listing.business.business_name}`}
      style={[miniCardStyles.card, { backgroundColor: colors.card, borderColor: colors.borderLight, width: CAROUSEL_CARD_WIDTH }]}
    >
      <View style={miniCardStyles.imageWrap}>
        <AdaptiveImage
          source={{ uri: listing.image_url }}
          style={miniCardStyles.image}
          contentFit="cover"
          gradient
          overlayOpacity={0.15}
        />
        <View style={miniCardStyles.badgeWrap}>
          <PlatformBadge platform={listing.platform} />
        </View>
      </View>
      <View style={miniCardStyles.body}>
        <ThemedText variant="headline" numberOfLines={2} style={[miniCardStyles.title, { color: colors.text }]}>
          {listing.title}
        </ThemedText>
        <ThemedText variant="caption1" numberOfLines={1} style={[miniCardStyles.biz, { color: colors.textSecondary }]}>
          {listing.business.business_name}
        </ThemedText>
        <ThemedText variant="caption1" style={[miniCardStyles.pay, { color: colors.primary }]}>
          {formatCurrencyRange(listing.pay_min, listing.pay_max)}
        </ThemedText>
      </View>
    </PressableScale>
  );
}

const miniCardStyles = StyleSheet.create({
  card: { borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', ...Shadows.sm },
  imageWrap: { width: CAROUSEL_CARD_WIDTH, height: 130, position: 'relative' },
  image: { width: CAROUSEL_CARD_WIDTH, height: 130 },
  badgeWrap: { position: 'absolute', bottom: Spacing.sm, left: Spacing.sm },
  body: { padding: Spacing.md, gap: Spacing.xs },
  title: { ...Typography.headline, lineHeight: 20 },
  biz: { ...Typography.caption1, marginTop: Spacing.xxs },
  pay: { ...Typography.caption1, fontWeight: '700', marginTop: Spacing.xxs },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOffline = useIsOffline();
  const { listings, user, listingsLoading, savedListings, toggleSavedListing, fetchListings } = useStore();

  const listing = useMemo(() => listings.find((l) => l.id === id), [listings, id]);

  const similarListings = useMemo(() => {
    if (!listing) return [];
    return listings
      .filter((l) => l.id !== listing.id && (l.category === listing.category || l.platform === listing.platform))
      .slice(0, 6);
  }, [listings, listing]);

  const isCreator = user?.role === 'creator';
  const isBusiness = user?.role === 'business';
  const isOwner = isBusiness && listing?.business_id === user?.id;
  const haptics = useHaptics();

  // Parallax scroll
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const heroAnimStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, HERO_HEIGHT], [0, -PARALLAX_OFFSET], Extrapolation.CLAMP);
    const scale = interpolate(scrollY.value, [-120, 0], [1.18, 1], Extrapolation.CLAMP);
    return { transform: [{ translateY }, { scale }] };
  });

  // Carousel
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  const galleryImages = useMemo(() => {
    if (listing?.gallery_images && listing.gallery_images.length > 0) return listing.gallery_images;
    return listing?.image_url ? [listing.image_url] : [];
  }, [listing]);

  const handleCarouselMomentumEnd = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCarouselIndex(Math.max(0, Math.min(idx, galleryImages.length - 1)));
  }, [galleryImages.length]);

  // Analytics
  const [analytics, setAnalytics] = useState<ListingAnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);

  // Modals
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [reportVisible, setReportVisible] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Creator profile (for apply modal)
  const [myCreator, setMyCreator] = useState<Creator | null>(null);

  useEffect(() => {
    if (!isBusiness || !id) return;
    setAnalyticsLoading(true);
    fetchListingAnalytics(id).then(setAnalytics).catch(() => {}).finally(() => setAnalyticsLoading(false));
  }, [isBusiness, id]);

  useEffect(() => {
    if (!isCreator || !user) return;
    api.getCreatorProfile(user.id, user.id).then(setMyCreator).catch(() => {});
  }, [isCreator, user]);

  const openGallery = useCallback((index = 0) => {
    haptics.tap();
    setGalleryInitialIndex(index);
    setGalleryOpen(true);
  }, [haptics]);

  const handleApply = useCallback(() => {
    haptics.success();
    if (isCreator) {
      setApplyVisible(true);
    } else {
      router.push('/(listing)/create');
    }
  }, [isCreator, router, haptics]);

  const handleSimilarPress = useCallback((l: Listing) => {
    router.push(`/(listing)/${l.id}`);
  }, [router]);

  const handleShare = useCallback(async () => {
    if (!listing) return;
    haptics.tap();
    try {
      await Share.share({
        title: listing.title,
        message: `${listing.title} — on Surve\nhttps://surve.app/listing/${listing.id}`,
        url: `https://surve.app/listing/${listing.id}`,
      });
    } catch { /* user cancelled */ }
  }, [listing, haptics]);

  const handleBusinessPress = useCallback(() => {
    if (!listing) return;
    // Navigate to business/creator profile — for now goes to creator profile screen
    // which handles both roles via shared routing
    router.push(`/(creator)/${listing.business_id}`);
  }, [listing, router]);

  const handleOpenLink = useCallback(async (url: string) => {
    haptics.tap();
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) Linking.openURL(url);
    else toast.error('Cannot open this link');
  }, [haptics]);

  if (!listing && listingsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader transparent />
        <ListingDetailSkeleton />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader />
        <ErrorState
          title="Listing not found"
          message="We couldn't load this listing. It may have been removed or there was a connection issue."
          onRetry={fetchListings}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {/* ── Main scroll ── */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* ── Hero carousel with parallax ── */}
        <View style={styles.heroWrapper}>
          <Animated.View style={[styles.heroInner, heroAnimStyle]}>
            {/* Paginated carousel */}
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleCarouselMomentumEnd}
              scrollEventThrottle={16}
              style={styles.carouselScroll}
            >
              {galleryImages.map((uri, i) => (
                <Pressable
                  key={i}
                  style={styles.carouselSlide}
                  onPress={() => openGallery(i)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`Image ${i + 1} of ${galleryImages.length}, tap to open gallery`}
                >
                  <AdaptiveImage
                    source={{ uri }}
                    style={styles.heroImage}
                    contentFit="cover"
                    blurhash={i === 0 ? listing.image_blurhash : undefined}
                    accessibilityLabel={`${listing.title} — image ${i + 1}`}
                  />
                </Pressable>
              ))}
            </ScrollView>

            {/* Gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
            />
          </Animated.View>

          {/* Dot indicators */}
          {galleryImages.length > 1 && (
            <View style={styles.dotsRow}>
              {galleryImages.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    haptics.tap();
                    carouselRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
                    setCarouselIndex(i);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to image ${i + 1}`}
                  hitSlop={8}
                >
                  <View
                    style={[
                      styles.dot,
                      i === carouselIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                </Pressable>
              ))}
            </View>
          )}

          {/* Photo count badge */}
          {galleryImages.length > 1 && (
            <View style={styles.photoCountBadge}>
              <Camera size={13} color="#fff" strokeWidth={2.2} />
              <ThemedText variant="caption1" style={styles.photoCountText}>
                {carouselIndex + 1}/{galleryImages.length}
              </ThemedText>
            </View>
          )}
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>

          {/* Badges + Status + Title */}
          <Animated.View entering={FadeInDown.duration(500).delay(80)} style={styles.section}>
            <View style={styles.badgesRow}>
              <PlatformBadge platform={listing.platform} />
              <Badge text={capitalizeFirst(listing.category)} />
              <StatusPill listing={listing} />
            </View>

            <ThemedText variant="title1" style={[styles.title, { color: colors.text }]} accessibilityRole="header">
              {listing.title}
            </ThemedText>

            {/* Location */}
            <View style={styles.locationRow}>
              <MapPin size={14} color={colors.textSecondary} strokeWidth={2} />
              <ThemedText variant="subheadline" style={{ color: colors.textSecondary }}>
                {listing.location}
              </ThemedText>
            </View>
          </Animated.View>

          {/* Business mini-card */}
          <Animated.View entering={FadeInDown.duration(500).delay(150)} style={styles.section}>
            <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Listed by
            </ThemedText>
            <BusinessMiniCard listing={listing} onPress={handleBusinessPress} />
          </Animated.View>

          {/* Comp summary card */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.section}>
            <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Compensation
            </ThemedText>
            <CompSummaryCard listing={listing} />
          </Animated.View>

          {/* Deliverables */}
          {listing.deliverables && listing.deliverables.length > 0 && (
            <Animated.View entering={FadeInDown.duration(500).delay(250)} style={styles.section}>
              <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
                Deliverables
              </ThemedText>
              <View style={[styles.deliverablesList, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                {listing.deliverables.map((d, i) => (
                  <React.Fragment key={i}>
                    <DeliverableRow
                      type={d.type}
                      count={d.count}
                      platform={d.platform}
                      notes={d.notes}
                    />
                    {i < listing.deliverables!.length - 1 && (
                      <View style={[styles.deliverableDivider, { backgroundColor: colors.borderLight }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Requirements */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.section}>
            <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              Requirements
            </ThemedText>
            <RequirementsCard listing={listing} />
          </Animated.View>

          {/* Date window */}
          {listing.date_window_start && listing.date_window_end && (
            <Animated.View entering={FadeInDown.duration(500).delay(340)} style={styles.section}>
              <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
                Visit Window
              </ThemedText>
              <DateWindowRow
                start={listing.date_window_start}
                end={listing.date_window_end}
              />
            </Animated.View>
          )}

          {/* Deadline row */}
          <Animated.View entering={FadeInDown.duration(500).delay(360)} style={styles.section}>
            <View style={styles.deadlineRow}>
              <Calendar size={15} color={colors.textSecondary} strokeWidth={2} />
              <ThemedText variant="subheadline" style={{ color: colors.textSecondary }}>
                Application deadline: {formatDateLong(listing.deadline)}
              </ThemedText>
            </View>
          </Animated.View>

          {/* Hashtags */}
          {listing.required_hashtags && listing.required_hashtags.length > 0 && (
            <Animated.View entering={FadeInDown.duration(500).delay(380)} style={styles.section}>
              <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
                Hashtags to Tag
              </ThemedText>
              <View style={styles.hashtagsWrap}>
                {listing.required_hashtags.map((tag) => (
                  <HashtagChip key={tag} tag={tag} />
                ))}
              </View>
            </Animated.View>
          )}

          {/* Brand guidelines */}
          {listing.brand_guidelines ? (
            <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.section}>
              <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
                Brand Guidelines
              </ThemedText>
              <BrandGuidelinesCard text={listing.brand_guidelines} />
            </Animated.View>
          ) : null}

          {/* Description */}
          <Animated.View entering={FadeInDown.duration(500).delay(420)} style={styles.section}>
            <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
              About this Collab
            </ThemedText>
            <ThemedText variant="body" style={[styles.description, { color: colors.textSecondary }]}>
              {listing.description}
            </ThemedText>
          </Animated.View>

          {/* Inspiration links */}
          {listing.inspiration_links && listing.inspiration_links.length > 0 && (
            <Animated.View entering={FadeInDown.duration(500).delay(440)} style={styles.section}>
              <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
                Inspiration
              </ThemedText>
              <View style={[styles.linksCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                {listing.inspiration_links.map((url, i) => (
                  <React.Fragment key={url}>
                    <PressableScale
                      onPress={() => handleOpenLink(url)}
                      accessibilityRole="link"
                      accessibilityLabel={`Inspiration link ${i + 1}`}
                      style={styles.linkRow}
                    >
                      <ExternalLink size={16} color={colors.primary} strokeWidth={2} />
                      <ThemedText
                        variant="subheadline"
                        numberOfLines={1}
                        style={[styles.linkText, { color: colors.primary }]}
                      >
                        {url.replace(/^https?:\/\//, '')}
                      </ThemedText>
                      <ChevronRight size={14} color={colors.textTertiary} strokeWidth={2} />
                    </PressableScale>
                    {i < listing.inspiration_links!.length - 1 && (
                      <View style={[styles.linkDivider, { backgroundColor: colors.borderLight }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Analytics (Business only) */}
          {isBusiness && (
            <Animated.View entering={FadeInDown.duration(500).delay(460)} style={styles.section}>
              <PressableScale
                onPress={() => { haptics.tap(); setAnalyticsExpanded(v => !v); }}
                style={styles.analyticsSectionHeader}
                accessibilityRole="button"
                accessibilityLabel={`Performance analytics, ${analyticsExpanded ? 'collapse' : 'expand'}`}
                accessibilityState={{ expanded: analyticsExpanded }}
              >
                <View style={styles.analyticsTitleRow}>
                  <BarChart3 size={20} color={colors.primary} strokeWidth={2} />
                  <ThemedText variant="title3" accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                    Performance
                  </ThemedText>
                </View>
                <ThemedText variant="subheadline" style={[styles.expandToggle, { color: colors.primary }]}>
                  {analyticsExpanded ? 'Hide' : 'Show'}
                </ThemedText>
              </PressableScale>

              {analyticsLoading ? (
                <View style={styles.analyticsSummaryRow}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                      <View style={[styles.skeletonBlock, { backgroundColor: colors.skeleton }]} />
                    </View>
                  ))}
                </View>
              ) : analytics ? (
                <View style={styles.analyticsSummaryRow}>
                  <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                    <Eye size={18} color={colors.primary} strokeWidth={2} />
                    <ThemedText variant="headline" style={[styles.summaryValue, { color: colors.text }]}>{analytics.total_views.toLocaleString()}</ThemedText>
                    <ThemedText variant="caption2" style={[styles.summaryLabel, { color: colors.textSecondary }]}>Views</ThemedText>
                  </View>
                  <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                    <MousePointerClick size={18} color={colors.secondary} strokeWidth={2} />
                    <ThemedText variant="headline" style={[styles.summaryValue, { color: colors.text }]}>{analytics.total_clicks.toLocaleString()}</ThemedText>
                    <ThemedText variant="caption2" style={[styles.summaryLabel, { color: colors.textSecondary }]}>Clicks</ThemedText>
                  </View>
                  <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                    <FileText size={18} color={colors.warning} strokeWidth={2} />
                    <ThemedText variant="headline" style={[styles.summaryValue, { color: colors.text }]}>{analytics.total_applications.toLocaleString()}</ThemedText>
                    <ThemedText variant="caption2" style={[styles.summaryLabel, { color: colors.textSecondary }]}>Applications</ThemedText>
                  </View>
                </View>
              ) : null}

              {analyticsExpanded && analytics && analytics.daily.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartsScroll}>
                  <AnalyticsChart data={analytics.daily} metric="views" color={colors.primary} label="Views" total={analytics.total_views} delta={analytics.views_delta} />
                  <AnalyticsChart data={analytics.daily} metric="clicks" color={colors.secondary} label="Clicks" total={analytics.total_clicks} delta={analytics.clicks_delta} />
                  <AnalyticsChart data={analytics.daily} metric="applications" color={colors.warning} label="Applications" total={analytics.total_applications} delta={analytics.applications_delta} />
                </ScrollView>
              )}

              {analyticsExpanded && analyticsLoading && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartsScroll}>
                  {[0, 1, 2].map((i) => <AnalyticsSkeletonCard key={i} colors={colors} />)}
                </ScrollView>
              )}
            </Animated.View>
          )}

          {/* Related listings carousel */}
          {similarListings.length > 0 && (
            <Animated.View entering={FadeInDown.duration(500).delay(500)}>
              <View style={styles.carouselHeader}>
                <ThemedText variant="title3" style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]} accessibilityRole="header">
                  Related Listings
                </ThemedText>
                <PressableScale
                  onPress={() => { haptics.tap(); router.push('/(tabs)/search'); }}
                  hitSlop={8}
                  style={styles.seeAllBtn}
                  accessibilityRole="button"
                  accessibilityLabel="See all listings"
                >
                  <ThemedText variant="subheadline" style={[styles.seeAllText, { color: colors.primary }]}>See All</ThemedText>
                  <ChevronRight size={14} color={colors.primary} strokeWidth={2.5} />
                </PressableScale>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedScroll}
                snapToInterval={CAROUSEL_CARD_WIDTH + Spacing.md}
                decelerationRate="fast"
                snapToAlignment="start"
              >
                {similarListings.map((l) => (
                  <RelatedListingMiniCard key={l.id} listing={l} onPress={handleSimilarPress} />
                ))}
                <View style={{ width: Spacing.lg }} />
              </ScrollView>
            </Animated.View>
          )}

        </View>
      </Animated.ScrollView>

      {/* ── Floating header over hero ── */}
      <View style={styles.floatingHeader} pointerEvents="box-none">
        <ScreenHeader
          transparent
          right={
            <View style={styles.topRight}>
              <AnimatedLikeButton
                active={!!id && savedListings.includes(id)}
                onToggle={() => id && toggleSavedListing(id)}
                activeColor="#FF3B6F"
                inactiveColor={colors.onPrimary}
                size={44}
                style={{ backgroundColor: colors.overlay }}
                accessibilityLabel={savedListings.includes(id ?? '') ? 'Unsave listing' : 'Save listing'}
              >
                {({ color, fill }) => <Heart size={20} color={color} fill={fill} strokeWidth={2} />}
              </AnimatedLikeButton>

              <PressableScale
                scaleValue={0.9}
                hitSlop={8}
                onPress={handleShare}
                style={[styles.topButton, { backgroundColor: colors.overlay }]}
                accessibilityRole="button"
                accessibilityLabel="Share listing"
              >
                <Share2 size={20} color={colors.onPrimary} strokeWidth={2} />
              </PressableScale>

              <View>
                <PressableScale
                  scaleValue={0.9}
                  hitSlop={8}
                  onPress={() => { haptics.tap(); setMenuOpen(v => !v); }}
                  style={[styles.topButton, { backgroundColor: colors.overlay }]}
                  accessibilityRole="button"
                  accessibilityLabel="More options"
                >
                  <MoreVertical size={20} color={colors.onPrimary} strokeWidth={2} />
                </PressableScale>
                {menuOpen && (
                  <>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
                    <View style={[styles.overflowMenu, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...Shadows.md }]}>
                      <PressableScale
                        onPress={() => { haptics.confirm(); setMenuOpen(false); setReportVisible(true); }}
                        style={styles.overflowMenuItem}
                        accessibilityRole="button"
                        accessibilityLabel="Report listing"
                      >
                        <Flag size={18} color={colors.error} strokeWidth={2} />
                        <ThemedText variant="subheadline" style={[styles.overflowMenuText, { color: colors.error }]}>Report</ThemedText>
                      </PressableScale>
                    </View>
                  </>
                )}
              </View>
            </View>
          }
        />
      </View>

      {/* ── Sticky Apply / Edit CTA ── */}
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
        <View style={styles.ctaPayInfo}>
          <ThemedText variant="caption1" style={{ color: colors.textSecondary }}>
            {listing.comp_type === 'comped_stay' ? 'Comp stay' : listing.comp_type === 'comped_meal' ? 'Comp meal' : 'Pay range'}
          </ThemedText>
          <ThemedText variant="title3" style={[styles.ctaPayAmount, { color: colors.text }]}>
            {formatCurrencyRange(listing.pay_min, listing.pay_max)}
          </ThemedText>
        </View>
        <Button
          title={
            isOffline && isCreator
              ? 'Offline'
              : isOwner
                ? 'Edit Listing'
                : isCreator
                  ? 'Apply Now'
                  : 'Edit Listing'
          }
          onPress={handleApply}
          disabled={isOffline && isCreator}
          size="lg"
          style={styles.ctaButton}
        />
      </Animated.View>

      {/* ── Modals ── */}
      <ImageGallery
        visible={galleryOpen}
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        onClose={() => setGalleryOpen(false)}
      />

      <ApplicationModal
        visible={applyVisible}
        onClose={() => setApplyVisible(false)}
        listing={listing}
        creator={myCreator}
      />

      {listing && (
        <ReportModal
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          listingTitle={listing.title}
          targetUserId={listing.business.user_id}
        />
      )}

      {menuOpen && <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Hero carousel
  heroWrapper: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  heroInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT + PARALLAX_OFFSET,
  },
  carouselScroll: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT + PARALLAX_OFFSET,
  },
  carouselSlide: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT + PARALLAX_OFFSET,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT + PARALLAX_OFFSET,
    resizeMode: 'cover',
  },
  dotsRow: {
    position: 'absolute',
    bottom: Spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: '#fff',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    minHeight: 28,
  },
  photoCountText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Floating header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  // Content
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  title: {
    ...Typography.title1,
    marginBottom: Spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // Deliverables list card
  deliverablesList: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    ...Shadows.sm,
  },
  deliverableDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 38,
  },

  // Hashtags
  hashtagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  // Inspiration links
  linksCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    ...Shadows.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  linkText: {
    ...Typography.subheadline,
    flex: 1,
  },
  linkDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 30,
  },

  // Description
  description: {
    ...Typography.body,
    lineHeight: 26,
  },

  // Analytics
  analyticsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    minHeight: 44,
  },
  analyticsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expandToggle: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  analyticsSummaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  summaryValue: {
    ...Typography.headline,
    fontWeight: '700',
  },
  summaryLabel: {
    ...Typography.caption2,
  },
  chartsScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  skeletonBlock: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
  },

  // Related listings
  carouselHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
  },
  seeAllText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  relatedScroll: {
    gap: Spacing.md,
    paddingLeft: Spacing.xxs,
    paddingRight: Spacing.lg,
    paddingBottom: Spacing.sm,
  },

  // Bottom CTA
  bottomCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadows.lg,
  },
  ctaPayInfo: {
    flex: 1,
    marginRight: Spacing.md,
    gap: Spacing.xxs,
  },
  ctaPayAmount: {
    ...Typography.title3,
    fontWeight: '700',
  },
  ctaButton: {
    minWidth: 150,
  },

  // Overflow menu
  overflowMenu: {
    position: 'absolute',
    top: 48,
    right: 0,
    minWidth: 160,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.xs,
    zIndex: 20,
  },
  overflowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  overflowMenuText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
});
