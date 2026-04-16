import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import { Camera, X, CheckCircle, AlertTriangle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { usePermissionPrime } from '../../hooks/usePermissionPrime';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { updateBooking } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PermissionPrime } from '../../components/ui/PermissionPrime';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

const MAX_DESCRIPTION_LENGTH = 1000;

const DISPUTE_REASONS = [
  'Content not delivered',
  "Content doesn't meet requirements",
  'Creator unresponsive',
  'Quality issues',
  'Other',
] as const;

type DisputeReason = (typeof DISPUTE_REASONS)[number];

export default function DisputeScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings, user } = useStore();

  const [selectedReason, setSelectedReason] = useState<DisputeReason | null>(
    null
  );
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const photoPrime = usePermissionPrime('photo-library');

  const booking = useMemo(
    () => bookings.find((b) => b.id === bookingId),
    [bookings, bookingId]
  );

  const handleSelectReason = useCallback(
    (reason: DisputeReason) => {
      haptics.tap();
      setSelectedReason(reason);
    },
    [haptics]
  );

  const launchDisputeScreenshotPicker = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      haptics.tap();
      setScreenshot(result.assets[0].uri);
    }
  }, [haptics]);

  const handlePickScreenshot = useCallback(async () => {
    await photoPrime.prime(launchDisputeScreenshotPicker);
  }, [photoPrime, launchDisputeScreenshotPicker]);

  const handleRemoveScreenshot = useCallback(() => {
    haptics.tap();
    setScreenshot(null);
  }, [haptics]);

  const canSubmit =
    selectedReason !== null &&
    description.trim().length > 0 &&
    !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !bookingId || !user) return;

    haptics.warning();
    setSubmitting(true);

    try {
      const { error: insertError } = await supabase.from('disputes').insert({
        booking_id: bookingId,
        user_id: user.id,
        reason: selectedReason,
        description: description.trim(),
        screenshot_url: screenshot,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        haptics.error();
        toast.error('Submission Failed: Could not submit your dispute. Please try again.');
        setSubmitting(false);
        return;
      }

      const success = await updateBooking(bookingId, {
        status: 'disputed',
      });

      if (success) {
        haptics.success();
        setSubmitted(true);
      } else {
        haptics.error();
        toast.error('Submission Failed: Dispute was recorded but the booking status could not be updated. Please contact support.');
      }
    } catch {
      haptics.error();
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, bookingId, user, selectedReason, description, screenshot, haptics]);

  const handleGoBack = useCallback(() => {
    haptics.tap();
    router.back();
  }, [haptics, router]);

  // ─── Guard: not found ─────────────────────────────────────────────────────
  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Raise a Dispute" />
        <View style={styles.centerState}>
          <Text style={[styles.centerText, { color: colors.text }]}>
            Booking not found
          </Text>
        </View>
      </View>
    );
  }

  // ─── Success state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Raise a Dispute" />
        <View style={styles.centerState}>
          <Animated.View
            entering={FadeInDown.duration(500).delay(100)}
            style={styles.successIcon}
          >
            <CheckCircle size={64} color={colors.success} strokeWidth={1.5} />
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.duration(500).delay(200)}
            style={[styles.successTitle, { color: colors.text }]}
            accessibilityRole="header"
          >
            Dispute Submitted
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.duration(500).delay(300)}
            style={[styles.successBody, { color: colors.textSecondary }]}
          >
            Your dispute has been received. Our team will review it within 24
            hours and reach out with next steps. You will be notified once a
            decision has been made.
          </Animated.Text>
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <Button
              title="Back to Booking"
              onPress={handleGoBack}
              variant="primary"
              size="lg"
              fullWidth
            />
          </Animated.View>
        </View>
      </View>
    );
  }

  // ─── Main form ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PermissionPrime
        kind="photo-library"
        visible={photoPrime.visible}
        onConfirm={photoPrime.confirm}
        onDismiss={photoPrime.dismiss}
      />
      <ScreenHeader title="Raise a Dispute" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.huge },
        ]}
      >
        {/* Warning banner */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Card style={styles.warningCard}>
            <View
              style={[
                styles.warningBanner,
                { backgroundColor: colors.warningLight },
              ]}
            >
              <AlertTriangle
                size={20}
                color={colors.warning}
                strokeWidth={2}
              />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Disputes are reviewed by our admin team. Please provide as much
                detail as possible.
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* Reason picker */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Text style={[styles.sectionLabel, { color: colors.text }]} accessibilityRole="header">
            Reason for dispute
          </Text>
          <View style={styles.reasonList}>
            {DISPUTE_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <PressableScale
                  key={reason}
                  onPress={() => handleSelectReason(reason)}
                  scaleValue={0.93}
                  accessibilityRole="button"
                  accessibilityLabel={reason}
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.reasonChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.surfaceSecondary,
                      borderColor: isSelected
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      {
                        color: isSelected ? colors.onPrimary : colors.text,
                      },
                    ]}
                  >
                    {reason}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Card style={styles.descriptionCard}>
            <Text style={[styles.sectionLabel, { color: colors.text }]} accessibilityRole="header">
              Description
            </Text>
            <TextInput
              style={[
                styles.descriptionInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel="Dispute description"
              accessibilityHint="Describe the issue in detail to support your dispute"
              placeholder="Describe the issue in detail..."
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={(text) =>
                text.length <= MAX_DESCRIPTION_LENGTH && setDescription(text)
              }
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <Text
              style={[
                styles.charCounter,
                {
                  color:
                    description.length >= MAX_DESCRIPTION_LENGTH
                      ? colors.error
                      : colors.textTertiary,
                },
              ]}
            >
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </Text>
          </Card>
        </Animated.View>

        {/* Screenshot */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)}>
          <Card style={styles.screenshotCard}>
            <Text style={[styles.sectionLabel, { color: colors.text }]} accessibilityRole="header">
              Screenshot (optional)
            </Text>
            <Text
              style={[styles.screenshotHint, { color: colors.textTertiary }]}
            >
              Upload a screenshot as supporting evidence
            </Text>

            <View style={styles.screenshotRow}>
              {screenshot ? (
                <View style={styles.screenshotItem}>
                  <AdaptiveImage
                    source={{ uri: screenshot }}
                    contentFit="cover"
                    style={[
                      styles.screenshotImage,
                      { borderColor: colors.border },
                    ]}
                    accessibilityLabel="Dispute evidence screenshot"
                    accessibilityRole="image"
                  />
                  <PressableScale
                    onPress={handleRemoveScreenshot}
                    scaleValue={0.9}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Remove screenshot"
                    style={[
                      styles.removeButton,
                      { backgroundColor: colors.error },
                    ]}
                  >
                    <X size={12} color={colors.onPrimary} strokeWidth={2.5} />
                  </PressableScale>
                </View>
              ) : (
                <PressableScale
                  onPress={handlePickScreenshot}
                  scaleValue={0.95}
                  accessibilityRole="button"
                  accessibilityLabel="Add screenshot"
                  accessibilityHint="Opens image picker to attach evidence"
                  style={[
                    styles.addScreenshot,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Camera
                    size={24}
                    color={colors.textTertiary}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={[
                      styles.addScreenshotText,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Add
                  </Text>
                </PressableScale>
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Submit */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)}>
          <Button
            title={submitting ? 'Submitting...' : 'Submit Dispute'}
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={!canSubmit}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  centerText: {
    ...Typography.title3,
    textAlign: 'center',
  },
  warningCard: {
    padding: 0,
    overflow: 'hidden',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  warningText: {
    ...Typography.footnote,
    flex: 1,
    lineHeight: 18,
  },
  sectionLabel: {
    ...Typography.subheadline,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  reasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  reasonChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  reasonChipText: {
    ...Typography.footnote,
    fontWeight: '500',
  },
  descriptionCard: {
    gap: Spacing.sm,
  },
  descriptionInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 140,
  },
  charCounter: {
    ...Typography.caption1,
    textAlign: 'right',
  },
  screenshotCard: {
    gap: Spacing.sm,
  },
  screenshotHint: {
    ...Typography.caption1,
  },
  screenshotRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  screenshotItem: {
    position: 'relative',
  },
  screenshotImage: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  removeButton: {
    position: 'absolute',
    top: -Spacing.xs,
    right: -Spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addScreenshot: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  addScreenshotText: {
    ...Typography.caption1,
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    ...Typography.title2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  successBody: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
});
