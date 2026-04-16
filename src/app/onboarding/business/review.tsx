import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Edit3, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { toast } from '../../../lib/toast';
import { useHaptics } from '../../../hooks/useHaptics';
import { useStore } from '../../../lib/store';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { PressableScale } from '../../../components/ui/PressableScale';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import { AdaptiveImage } from '../../../components/ui/AdaptiveImage';
import * as api from '../../../lib/api';
import { Typography, Spacing, BorderRadius } from '../../../constants/theme';

const TOTAL_STEPS = 5;

export default function BusinessReviewScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { businessDraft, user, clearBusinessDraft } = useStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!user || submitting) return;
    haptics.success();
    setSubmitting(true);
    try {
      await api.updateBusinessProfile(user.id, {
        business_name: businessDraft.business_name,
        category: businessDraft.category as any,
        description: businessDraft.description,
        location: businessDraft.location,
        website: businessDraft.website || null,
      } as any);
      clearBusinessDraft();
      router.replace('/(tabs)' as any);
    } catch {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [user, submitting, businessDraft, clearBusinessDraft, router]);

  const editStep = useCallback(
    (path: string) => {
      haptics.tap();
      router.push(path as any);
    },
    [router],
  );

  const openHours = Object.entries(businessDraft.hours)
    .filter(([, v]) => !v.closed)
    .map(([day, v]) => `${day}: ${v.open}–${v.close}`)
    .join(', ');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Review" />
      <ProgressBar currentStep={5} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Almost there!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Review your business details and submit
          </Text>
        </Animated.View>

        <ReviewRow
          label="Business Name"
          value={businessDraft.business_name}
          onEdit={() => editStep('/onboarding/business')}
        />
        <ReviewRow
          label="Category"
          value={businessDraft.category || '—'}
          onEdit={() => editStep('/onboarding/business')}
        />
        <ReviewRow
          label="Address"
          value={businessDraft.location}
          onEdit={() => editStep('/onboarding/business')}
        />
        <ReviewRow
          label="Hours"
          value={openHours || 'Not set'}
          onEdit={() => editStep('/onboarding/business/hours')}
        />
        <ReviewRow
          label="Description"
          value={businessDraft.description || '—'}
          onEdit={() => editStep('/onboarding/business/details')}
        />
        <ReviewRow
          label="Website"
          value={businessDraft.website || '—'}
          onEdit={() => editStep('/onboarding/business/details')}
        />

        {(businessDraft.coverPhotoUri || businessDraft.galleryUris.length > 0) && (
          <View style={styles.photosSection}>
            <View style={styles.rowHeader}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Photos</Text>
              <PressableScale onPress={() => editStep('/onboarding/business/photos')} scaleValue={0.88} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit photos">
                <Edit3 size={16} color={colors.primary} strokeWidth={2} />
              </PressableScale>
            </View>
            <View style={styles.thumbs}>
              {businessDraft.coverPhotoUri ? (
                <AdaptiveImage
                  source={{ uri: businessDraft.coverPhotoUri }}
                  style={[styles.thumb, { borderColor: colors.border }]}
                  contentFit="cover"
                  accessibilityLabel="Cover photo"
                />
              ) : null}
              {businessDraft.galleryUris.map((uri, i) => (
                <AdaptiveImage
                  key={uri}
                  source={{ uri }}
                  style={[styles.thumb, { borderColor: colors.border }]}
                  contentFit="cover"
                  accessibilityLabel={`Gallery photo ${i + 1}`}
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
      <PressableScale onPress={onEdit} hitSlop={8} scaleValue={0.88} accessibilityRole="button" accessibilityLabel={`Edit ${label}`}>
        <Edit3 size={16} color={colors.primary} strokeWidth={2} />
      </PressableScale>
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
  photosSection: { marginTop: Spacing.lg },
  thumbs: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  thumb: { width: 64, height: 64, borderRadius: BorderRadius.sm, borderWidth: 1 },
  footer: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
});
