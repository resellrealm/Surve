import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CheckCircle, XCircle, MessageCircle, User } from 'lucide-react-native';
import { useTheme } from '../../../../hooks/useTheme';
import { useHaptics } from '../../../../hooks/useHaptics';
import { Avatar } from '../../../../components/ui/Avatar';
import { Card } from '../../../../components/ui/Card';
import { ScreenHeader } from '../../../../components/ui/ScreenHeader';
import { PressableScale } from '../../../../components/ui/PressableScale';
import * as api from '../../../../lib/api';
import { useStore } from '../../../../lib/store';
import { Typography, Spacing, BorderRadius, Shadows } from '../../../../constants/theme';
import type { Application, ApplicationStatus } from '../../../../types';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bg: string; text: string }> = {
  pending:   { label: 'Pending',   bg: '#FEF3C7', text: '#B45309' },
  accepted:  { label: 'Accepted',  bg: '#D1FAE5', text: '#065F46' },
  rejected:  { label: 'Rejected',  bg: '#FEE2E2', text: '#991B1B' },
  withdrawn: { label: 'Withdrawn', bg: '#F3F4F6', text: '#6B7280' },
};

function FitScoreBar({ score, colors }: { score: number; colors: any }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ ...Typography.caption2, color: colors.textSecondary }}>Fit score</Text>
        <Text style={{ ...Typography.caption2, fontWeight: '600', color }}>{pct}/100</Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.surfaceSecondary }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: color, width: `${pct}%` }} />
      </View>
    </View>
  );
}

export default function ApplicationsScreen() {
  const { id: listingId } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useStore();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');

  useEffect(() => {
    if (!user?.id) return;
    api.getBusinessApplications(user.id).then((apps) => {
      setApplications(apps.filter((a) => a.listing_id === listingId));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id, listingId]);

  const handleUpdateStatus = useCallback(async (appId: string, newStatus: 'accepted' | 'rejected') => {
    haptics.confirm();
    const label = newStatus === 'accepted' ? 'Accept' : 'Reject';
    Alert.alert(`${label} application?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: newStatus === 'rejected' ? 'destructive' : 'default',
        onPress: async () => {
          setUpdating(appId);
          const { error } = await (api as any).supabase
            .from('applications')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', appId);
          if (!error) {
            setApplications((prev) =>
              prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a)
            );
          }
          setUpdating(null);
        },
      },
    ]);
  }, [haptics]);

  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter);
  const counts = applications.reduce((acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  const renderItem = ({ item, index }: { item: Application; index: number }) => {
    const statusCfg = STATUS_CONFIG[item.status];
    const isUpdating = updating === item.id;
    const creator = item.creator;
    return (
      <Animated.View entering={FadeInDown.duration(350).delay(index * 50)}>
        <Card style={StyleSheet.flatten([styles.card, { backgroundColor: colors.surface, borderColor: colors.border }])}>
          {/* Creator row */}
          <View style={styles.creatorRow}>
            <PressableScale
              scaleValue={0.97}
              onPress={() => { haptics.tap(); if (creator) router.push(`/(creator)/${creator.id}`); }}
              style={styles.creatorInfo}
              accessibilityRole="button"
              accessibilityLabel={`View ${creator?.user.full_name ?? 'creator'} profile`}
            >
              <Avatar uri={creator?.user.avatar_url ?? null} name={creator?.user.full_name ?? 'Creator'} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.creatorName, { color: colors.text }]}>
                  {creator?.user.full_name ?? 'Creator'}
                </Text>
                <Text style={[styles.creatorMeta, { color: colors.textSecondary }]}>
                  {creator?.location ?? 'Unknown location'}
                  {creator?.instagram_followers ? ` · ${(creator.instagram_followers / 1000).toFixed(0)}K IG` : ''}
                </Text>
              </View>
            </PressableScale>
            <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>
          </View>

          {/* Fit score */}
          {item.fit_score != null && <FitScoreBar score={item.fit_score} colors={colors} />}

          {/* Message */}
          {item.message ? (
            <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
              {item.message}
            </Text>
          ) : null}

          {/* Actions */}
          {item.status === 'pending' && (
            <View style={styles.actions}>
              <PressableScale
                scaleValue={0.97}
                onPress={() => handleUpdateStatus(item.id, 'rejected')}
                disabled={isUpdating}
                style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.surface, opacity: isUpdating ? 0.5 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Reject application"
              >
                {isUpdating ? <ActivityIndicator size="small" color={colors.error} /> : (
                  <>
                    <XCircle size={15} color={colors.error} strokeWidth={2} />
                    <Text style={{ ...Typography.subheadline, color: colors.error }}>Reject</Text>
                  </>
                )}
              </PressableScale>
              <PressableScale
                scaleValue={0.97}
                onPress={() => handleUpdateStatus(item.id, 'accepted')}
                disabled={isUpdating}
                style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary, opacity: isUpdating ? 0.5 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Accept application"
              >
                {isUpdating ? <ActivityIndicator size="small" color={colors.onPrimary} /> : (
                  <>
                    <CheckCircle size={15} color={colors.onPrimary} strokeWidth={2} />
                    <Text style={{ ...Typography.subheadline, color: colors.onPrimary }}>Accept</Text>
                  </>
                )}
              </PressableScale>
            </View>
          )}
          {item.status === 'accepted' && (
            <PressableScale
              scaleValue={0.97}
              onPress={async () => {
                haptics.tap();
                if (!user?.id || !item.creator?.user_id) return;
                const convo = await api.startConversation(user.id, item.creator.user_id);
                if (convo) router.push(`/(chat)/${convo.id}`);
              }}
              style={[styles.messageBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
              accessibilityRole="button"
              accessibilityLabel="Message creator"
            >
              <MessageCircle size={15} color={colors.primary} strokeWidth={2} />
              <Text style={{ ...Typography.subheadline, color: colors.primary }}>Message</Text>
            </PressableScale>
          )}
        </Card>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Applicants" />

      {/* Filter chips */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {(['all', 'pending', 'accepted', 'rejected'] as const).map((f) => {
          const count = f === 'all' ? applications.length : (counts[f] ?? 0);
          return (
            <PressableScale
              key={f}
              scaleValue={0.95}
              onPress={() => { haptics.tap(); setFilter(f); }}
              style={[
                styles.filterChip,
                { backgroundColor: filter === f ? colors.primary : colors.surface, borderColor: filter === f ? colors.primary : colors.border },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === f }}
            >
              <Text style={{ ...Typography.caption1, fontWeight: '600', color: filter === f ? colors.onPrimary : colors.text, textTransform: 'capitalize' }}>
                {f} {count > 0 ? `(${count})` : ''}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <User size={36} color={colors.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No applicants yet</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            {filter === 'all' ? 'Applications will appear here' : `No ${filter} applications`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
  card: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, minHeight: 44 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  creatorInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  creatorName: { ...Typography.subheadline, fontWeight: '600' },
  creatorMeta: { ...Typography.caption1, marginTop: 2 },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusText: { ...Typography.caption2, fontWeight: '600' },
  message: { ...Typography.footnote, marginTop: Spacing.sm, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...Typography.title3, textAlign: 'center' },
  emptyBody: { ...Typography.body, textAlign: 'center' },
});
