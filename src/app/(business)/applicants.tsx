import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Users,
  TrendingUp,
  Eye,
  Star,
  Play,
  Hash,
  Check,
  X,
  ChevronRight,
  Inbox,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import * as api from '../../lib/api';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Avatar } from '../../components/ui/Avatar';
import { ThemedText } from '../../components/ui/ThemedText';
import { PressableScale } from '../../components/ui/PressableScale';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatFollowers } from '../../components/listing/RequirementTag';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import type { Application, ApplicationStatus } from '../../types';

// ─── Status Chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: ApplicationStatus }) {
  const { colors } = useTheme();
  const config: Record<ApplicationStatus, { label: string; bg: string; text: string }> = {
    pending: { label: 'Pending', bg: colors.pendingLight, text: colors.pending },
    accepted: { label: 'Accepted', bg: colors.completedLight, text: colors.completed },
    rejected: { label: 'Rejected', bg: colors.cancelledLight, text: colors.cancelled },
    withdrawn: { label: 'Withdrawn', bg: colors.surfaceSecondary, text: colors.textTertiary },
  };
  const c = config[status] ?? config.pending;
  return (
    <View style={[chipStyles.chip, { backgroundColor: c.bg }]}>
      <ThemedText variant="caption2" style={[chipStyles.label, { color: c.text }]}>
        {c.label}
      </ThemedText>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  label: { ...Typography.caption2, fontWeight: '700', letterSpacing: 0.3 },
});

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
      <Icon size={12} color={colors.primary} strokeWidth={2} />
      <View>
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
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  value: { ...Typography.caption1, fontWeight: '700' },
});

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({
  application,
  onViewCreator,
  index,
}: {
  application: Application;
  onViewCreator: (creatorId: string) => void;
  index: number;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [expanded, setExpanded] = useState(false);

  const creator = application.creator;
  const creatorName = creator?.user?.full_name ?? 'Creator';
  const igFollowers = creator?.instagram_followers ?? 0;
  const ttFollowers = creator?.tiktok_followers ?? 0;

  const stats = useMemo(() => {
    const chips: Array<{ icon: React.ComponentType<any>; label: string; value: string }> = [];
    if (igFollowers >= ttFollowers && igFollowers > 0) {
      chips.push({ icon: Users, label: 'Instagram', value: formatFollowers(igFollowers) });
    } else if (ttFollowers > igFollowers) {
      chips.push({ icon: Play, label: 'TikTok', value: formatFollowers(ttFollowers) });
    }
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
    if (creator.niches?.length) return creator.niches;
    return creator.categories?.map((c) => c.charAt(0).toUpperCase() + c.slice(1)) ?? [];
  }, [creator]);

  const proposedDeliverables = useMemo(() => {
    const d = (application.proposed_deliverables as any)?.deliverables;
    return Array.isArray(d) ? d : [];
  }, [application.proposed_deliverables]);

  const daysAgo = Math.max(
    0,
    Math.floor((Date.now() - new Date(application.created_at).getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
      <View
        style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
      >
        {/* Header row */}
        <View style={cardStyles.cardHeader}>
          <PressableScale
            onPress={() => { haptics.tap(); onViewCreator(application.creator_id); }}
            style={cardStyles.creatorRow}
            accessibilityRole="button"
            accessibilityLabel={`View ${creatorName}'s profile`}
          >
            <Avatar
              uri={creator?.user?.avatar_url ?? null}
              name={creatorName}
              size={48}
            />
            <View style={cardStyles.creatorInfo}>
              <View style={cardStyles.nameRow}>
                <ThemedText variant="headline" numberOfLines={1} style={[cardStyles.name, { color: colors.text }]}>
                  {creatorName}
                </ThemedText>
                {creator?.verified && <VerifiedBadge size="sm" />}
              </View>
              <ThemedText variant="caption1" style={{ color: colors.textSecondary }}>
                {application.listing?.title ?? ''} · {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
              </ThemedText>
            </View>
          </PressableScale>
          <View style={cardStyles.cardHeaderRight}>
            <StatusChip status={application.status} />
            <PressableScale
              onPress={() => { haptics.tap(); setExpanded((v) => !v); }}
              style={cardStyles.expandBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Collapse application' : 'Expand application'}
            >
              <ChevronRight
                size={18}
                color={colors.textSecondary}
                strokeWidth={2}
                style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
              />
            </PressableScale>
          </View>
        </View>

        {/* Stats (always visible) */}
        {stats.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={cardStyles.statsScroll}
          >
            {stats.map((s) => (
              <StatPill key={s.label} {...s} />
            ))}
          </ScrollView>
        )}

        {/* Niches */}
        {niches.length > 0 && (
          <View style={cardStyles.nichesRow}>
            <Hash size={11} color={colors.textSecondary} strokeWidth={2} />
            <View style={cardStyles.nichesChips}>
              {niches.map((n) => (
                <View
                  key={n}
                  style={[cardStyles.nicheChip, { backgroundColor: colors.primaryLight + '18', borderColor: colors.primaryLight + '30' }]}
                >
                  <ThemedText variant="caption2" style={[cardStyles.nicheChipText, { color: colors.primary }]}>
                    {n}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Expanded detail */}
        {expanded && (
          <>
            {/* Message */}
            {!!application.message && (
              <View style={[cardStyles.messageBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}>
                <ThemedText variant="caption1" style={[cardStyles.messageLabel, { color: colors.textSecondary }]}>
                  Why they're a fit
                </ThemedText>
                <ThemedText variant="body" style={[cardStyles.messageText, { color: colors.text }]}>
                  {application.message}
                </ThemedText>
              </View>
            )}

            {/* Proposed deliverables */}
            {proposedDeliverables.length > 0 && (
              <View style={cardStyles.deliverablesSection}>
                <ThemedText variant="caption1" style={[cardStyles.messageLabel, { color: colors.textSecondary }]}>
                  Proposed deliverables
                </ThemedText>
                {proposedDeliverables.map((d: any, i: number) => {
                  const platformLabel =
                    d.platform === 'instagram'
                      ? 'Instagram'
                      : d.platform === 'tiktok'
                        ? 'TikTok'
                        : d.platform === 'both'
                          ? 'IG + TT'
                          : null;
                  return (
                    <View key={i} style={[cardStyles.delivRow, { borderBottomColor: colors.borderLight }]}>
                      <View style={[cardStyles.delivCheck, { backgroundColor: colors.completedLight }]}>
                        <Check size={11} color={colors.completed} strokeWidth={3} />
                      </View>
                      <ThemedText variant="subheadline" style={[cardStyles.delivCount, { color: colors.text }]}>
                        {d.count}×
                      </ThemedText>
                      {platformLabel && (
                        <View style={[cardStyles.platformChip, { backgroundColor: colors.primaryLight + '18' }]}>
                          <ThemedText variant="caption2" style={[cardStyles.platformText, { color: colors.primary }]}>
                            {platformLabel}
                          </ThemedText>
                        </View>
                      )}
                      <ThemedText variant="subheadline" style={[cardStyles.delivType, { color: colors.text }]}>
                        {d.type}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            )}

            {/* View full profile link */}
            <PressableScale
              onPress={() => { haptics.tap(); onViewCreator(application.creator_id); }}
              style={[cardStyles.viewProfileBtn, { borderTopColor: colors.borderLight }]}
              accessibilityRole="button"
              accessibilityLabel={`View ${creatorName}'s full profile`}
            >
              <ThemedText variant="subheadline" style={[cardStyles.viewProfileText, { color: colors.primary }]}>
                View full profile
              </ThemedText>
              <ChevronRight size={14} color={colors.primary} strokeWidth={2.5} />
            </PressableScale>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  creatorInfo: { flex: 1, gap: Spacing.xxs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  name: { ...Typography.headline, fontWeight: '700', flex: 1 },
  cardHeaderRight: { alignItems: 'flex-end', gap: Spacing.xs },
  expandBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsScroll: { gap: Spacing.sm, flexDirection: 'row' },
  nichesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  nichesChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  nicheChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  nicheChipText: { ...Typography.caption2, fontWeight: '700', letterSpacing: 0.2 },
  messageBox: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  messageLabel: { ...Typography.caption1, fontWeight: '600', letterSpacing: 0.2 },
  messageText: { ...Typography.body, lineHeight: 22 },
  deliverablesSection: { gap: Spacing.sm },
  delivRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  delivCheck: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delivCount: { ...Typography.subheadline, fontWeight: '700' },
  platformChip: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  platformText: { ...Typography.caption2, fontWeight: '700', letterSpacing: 0.3 },
  delivType: { ...Typography.subheadline, fontWeight: '600', flex: 1 },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  viewProfileText: { ...Typography.subheadline, fontWeight: '600' },
});

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ApplicantSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={{ gap: Spacing.xs, flex: 1 }}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="75%" height={12} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Skeleton width={80} height={32} borderRadius={BorderRadius.sm} />
        <Skeleton width={80} height={32} borderRadius={BorderRadius.sm} />
        <Skeleton width={80} height={32} borderRadius={BorderRadius.sm} />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ApplicantsScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useStore();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');

  const loadApplications = useCallback(async () => {
    if (!user?.id) return;
    const data = await api.getBusinessApplications(user.id);
    setApplications(data);
  }, [user?.id]);

  useEffect(() => {
    loadApplications().finally(() => setLoading(false));
  }, [loadApplications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  }, [loadApplications]);

  const filtered = useMemo(
    () => (filter === 'all' ? applications : applications.filter((a) => a.status === filter)),
    [applications, filter]
  );

  const counts = useMemo(
    () => ({
      all: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      accepted: applications.filter((a) => a.status === 'accepted').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
    }),
    [applications]
  );

  const handleViewCreator = useCallback((creatorId: string) => {
    router.push(`/(creator)/${creatorId}`);
  }, [router]);

  const FILTERS: Array<{ key: ApplicationStatus | 'all'; label: string }> = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'pending', label: `Pending (${counts.pending})` },
    { key: 'accepted', label: `Accepted (${counts.accepted})` },
    { key: 'rejected', label: `Rejected (${counts.rejected})` },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Applicants" />

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRow, { borderBottomColor: colors.borderLight }]}
      >
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <PressableScale
              key={key}
              onPress={() => { haptics.select(); setFilter(key); }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.borderLight,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
            >
              <ThemedText
                variant="subheadline"
                style={[styles.filterChipText, { color: active ? colors.onPrimary : colors.text }]}
              >
                {label}
              </ThemedText>
            </PressableScale>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <>
            <ApplicantSkeleton />
            <ApplicantSkeleton />
            <ApplicantSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <Inbox size={32} color={colors.textTertiary} strokeWidth={1.5} />
            </View>
            <ThemedText variant="title3" style={[styles.emptyTitle, { color: colors.text }]}>
              No applicants yet
            </ThemedText>
            <ThemedText variant="body" style={[styles.emptyBody, { color: colors.textSecondary }]}>
              {filter === 'all'
                ? 'Applications to your listings will appear here.'
                : `No ${filter} applications to show.`}
            </ThemedText>
          </View>
        ) : (
          filtered.map((app, i) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onViewCreator={handleViewCreator}
              index={i}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterChipText: { ...Typography.subheadline, fontWeight: '600' },

  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { ...Typography.title3, textAlign: 'center' },
  emptyBody: { ...Typography.body, textAlign: 'center', lineHeight: 24 },
});
