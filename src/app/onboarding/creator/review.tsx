import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Edit3, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../hooks/useTheme';
import { useStore } from '../../../lib/store';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import * as api from '../../../lib/api';
import { Typography, Spacing, BorderRadius } from '../../../constants/theme';

const TOTAL_STEPS = 7;

export default function CreatorReviewScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { creatorDraft, user, clearCreatorDraft, setUser } = useStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!user || submitting) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    try {
      await api.updateCreatorProfile(user.id, {
        bio: creatorDraft.bio,
        instagram_handle: creatorDraft.instagram_handle || null,
        tiktok_handle: creatorDraft.tiktok_handle || null,
        instagram_followers: Number(creatorDraft.instagram_followers) || 0,
        tiktok_followers: Number(creatorDraft.tiktok_followers) || 0,
        engagement_rate: Number(creatorDraft.engagement_rate) || 0,
        avg_views: Number(creatorDraft.avg_views) || 0,
        categories: creatorDraft.categories,
        portfolio_urls: creatorDraft.portfolio_uris,
        location: creatorDraft.location,
      } as any);
      await api.completeOnboarding(user.id);
      setUser({ ...user, onboarding_completed_at: new Date().toISOString() });
      clearCreatorDraft();
      router.replace('/(tabs)' as any);
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [user, submitting, creatorDraft, clearCreatorDraft, router]);

  const editStep = useCallback(
    (path: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(path as any);
    },
    [router],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Review" />
      <ProgressBar currentStep={7} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.title, { color: colors.text }]}>Looking good!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Review your info and tap Submit when ready
          </Text>
        </Animated.View>

        <ReviewRow
          label="Name"
          value={creatorDraft.full_name}
          onEdit={() => editStep('/onboarding/creator')}
        />
        <ReviewRow
          label="Bio"
          value={creatorDraft.bio || '—'}
          onEdit={() => editStep('/onboarding/creator')}
        />
        <ReviewRow
          label="Location"
          value={creatorDraft.location}
          onEdit={() => editStep('/onboarding/creator')}
        />
        <ReviewRow
          label="Instagram"
          value={creatorDraft.instagram_handle ? `@${creatorDraft.instagram_handle}` : '—'}
          onEdit={() => editStep('/onboarding/creator/socials')}
        />
        <ReviewRow
          label="TikTok"
          value={creatorDraft.tiktok_handle ? `@${creatorDraft.tiktok_handle}` : '—'}
          onEdit={() => editStep('/onboarding/creator/socials')}
        />
        <ReviewRow
          label="Categories"
          value={creatorDraft.categories.join(', ') || '—'}
          onEdit={() => editStep('/onboarding/creator/categories')}
        />

        {creatorDraft.portfolio_uris.length > 0 && (
          <View style={styles.portfolioSection}>
            <View style={styles.rowHeader}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Portfolio</Text>
              <Pressable onPress={() => editStep('/onboarding/creator/portfolio')}>
                <Edit3 size={16} color={colors.primary} strokeWidth={2} />
              </Pressable>
            </View>
            <View style={styles.thumbs}>
              {creatorDraft.portfolio_uris.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={[styles.thumb, { borderColor: colors.border }]}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          title="Submit"
          onPress={handleSubmit}
          size="lg"
          fullWidth
          loading={submitting}
          disabled={submitting}
          icon={<CheckCircle size={20} color={colors.onPrimary} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
      <View style={styles.rowContent}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.text }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={8}>
        <Edit3 size={16} color={colors.primary} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  title: { ...Typography.title1, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, marginBottom: Spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowContent: { flex: 1 },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  label: { ...Typography.caption1, textTransform: 'uppercase', letterSpacing: 1 },
  value: { ...Typography.body, marginTop: Spacing.xxs },
  portfolioSection: { marginTop: Spacing.lg },
  thumbs: { flexDirection: 'row', gap: Spacing.sm },
  thumb: { width: 64, height: 64, borderRadius: BorderRadius.sm, borderWidth: 1 },
  footer: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
});
