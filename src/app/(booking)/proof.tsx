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
import { Camera, X, CheckCircle, Link, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { usePermissionPrime } from '../../hooks/usePermissionPrime';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { updateBooking } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PermissionPrime } from '../../components/ui/PermissionPrime';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

const MAX_SCREENSHOTS = 3;
const MAX_NOTE_LENGTH = 300;
const ALLOWED_DOMAINS = ['tiktok.com', 'instagram.com', 'youtube.com'];
const AUTO_APPROVE_HOURS = 72;

function isValidContentUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(
      (domain) =>
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

function formatCountdown(hours: number): string {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

export default function SubmitProofScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings, user } = useStore();

  const [contentUrl, setContentUrl] = useState('');
  const [note, setNote] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>(undefined);
  const photoPrime = usePermissionPrime('photo-library');

  const booking = useMemo(
    () => bookings.find((b) => b.id === bookingId),
    [bookings, bookingId]
  );

  const isCreator = user?.role === 'creator';
  const canAccess = isCreator && booking?.status === 'in_progress';

  const handleUrlChange = useCallback((text: string) => {
    setContentUrl(text);
    if (text.length > 0 && !isValidContentUrl(text)) {
      setUrlError('URL must be from tiktok.com, instagram.com, or youtube.com');
    } else {
      setUrlError(undefined);
    }
  }, []);

  const launchScreenshotPicker = useCallback(async () => {
    if (screenshots.length >= MAX_SCREENSHOTS) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      haptics.tap();
      setScreenshots((prev) => [...prev, result.assets[0].uri]);
    }
  }, [screenshots.length, haptics]);

  const handlePickScreenshot = useCallback(async () => {
    await photoPrime.prime(launchScreenshotPicker);
  }, [photoPrime, launchScreenshotPicker]);

  const handleRemoveScreenshot = useCallback(
    (index: number) => {
      haptics.tap();
      setScreenshots((prev) => prev.filter((_, i) => i !== index));
    },
    [haptics]
  );

  const canSubmit =
    contentUrl.length > 0 &&
    isValidContentUrl(contentUrl) &&
    !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !bookingId) return;

    haptics.confirm();
    setSubmitting(true);

    try {
      const now = new Date();
      const autoApproveAt = new Date(
        now.getTime() + AUTO_APPROVE_HOURS * 60 * 60 * 1000
      );

      const success = await updateBooking(bookingId, {
        status: 'proof_submitted',
        proof_url: contentUrl,
        proof_screenshots: screenshots.length > 0 ? screenshots : undefined,
        proof_note: note.trim() || null,
        proof_submitted_at: now.toISOString(),
        auto_approve_at: autoApproveAt.toISOString(),
      });

      if (success) {
        haptics.success();
        setSubmitted(true);
      } else {
        haptics.error();
        toast.error('Submission Failed: Something went wrong. Please try again.');
      }
    } catch {
      haptics.error();
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, bookingId, contentUrl, screenshots, note, haptics]);

  const handleGoBack = useCallback(() => {
    haptics.tap();
    router.back();
  }, [haptics, router]);

  // ─── Guard: not found ─────────────────────────────────────────────────────
  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Submit Proof" />
        <View style={styles.centerState}>
          <Text style={[styles.centerText, { color: colors.text }]}>
            Booking not found
          </Text>
        </View>
      </View>
    );
  }

  // ─── Guard: access denied ─────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Submit Proof" />
        <View style={styles.centerState}>
          <Text style={[styles.centerText, { color: colors.text }]}>
            Proof submission is not available
          </Text>
          <Text
            style={[styles.centerSubtext, { color: colors.textSecondary }]}
          >
            Only the creator can submit proof while the booking is in progress.
          </Text>
        </View>
      </View>
    );
  }

  // ─── Success state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Submit Proof" />
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
            Proof Submitted
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.duration(500).delay(300)}
            style={[styles.successBody, { color: colors.textSecondary }]}
          >
            The business has {formatCountdown(AUTO_APPROVE_HOURS)} to review
            your proof. If they don't respond, the booking will be
            auto-approved.
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
      <ScreenHeader title="Submit Proof" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.huge },
        ]}
      >
        {/* Content URL */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Input
            label="Content URL"
            placeholder="https://tiktok.com/..."
            value={contentUrl}
            onChangeText={handleUrlChange}
            error={urlError}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            icon={<Link size={18} color={colors.textTertiary} strokeWidth={2} />}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Text style={[styles.domainHint, { color: colors.textTertiary }]}>
            Accepted: TikTok, Instagram, or YouTube links
          </Text>
        </Animated.View>

        {/* Note */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Card style={styles.noteCard}>
            <View style={styles.noteLabelRow}>
              <FileText
                size={16}
                color={colors.textSecondary}
                strokeWidth={2}
              />
              <Text style={[styles.noteLabel, { color: colors.text }]}>
                Note (optional)
              </Text>
            </View>
            <TextInput
              style={[
                styles.noteInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel="Note for the business"
              accessibilityHint="Add optional context about your proof submission"
              placeholder="Add any context for the business..."
              placeholderTextColor={colors.textTertiary}
              value={note}
              onChangeText={(text) =>
                text.length <= MAX_NOTE_LENGTH && setNote(text)
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={MAX_NOTE_LENGTH}
            />
            <Text
              style={[
                styles.charCounter,
                {
                  color:
                    note.length >= MAX_NOTE_LENGTH
                      ? colors.error
                      : colors.textTertiary,
                },
              ]}
            >
              {note.length}/{MAX_NOTE_LENGTH}
            </Text>
          </Card>
        </Animated.View>

        {/* Screenshots */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Card style={styles.screenshotsCard}>
            <Text style={[styles.screenshotsLabel, { color: colors.text }]} accessibilityRole="header">
              Screenshots (optional)
            </Text>
            <Text
              style={[
                styles.screenshotsHint,
                { color: colors.textTertiary },
              ]}
            >
              Upload up to {MAX_SCREENSHOTS} screenshots as additional proof
            </Text>

            <View style={styles.screenshotsGrid}>
              {screenshots.map((uri, index) => (
                <View key={uri} style={styles.screenshotItem}>
                  <AdaptiveImage
                    source={{ uri }}
                    contentFit="cover"
                    style={[
                      styles.screenshotImage,
                      { borderColor: colors.border },
                    ]}
                    accessibilityLabel={`Screenshot ${index + 1}`}
                    accessibilityRole="image"
                  />
                  <PressableScale
                    onPress={() => handleRemoveScreenshot(index)}
                    scaleValue={0.9}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove screenshot ${index + 1}`}
                    style={[
                      styles.removeButton,
                      { backgroundColor: colors.error },
                    ]}
                  >
                    <X size={12} color={colors.onPrimary} strokeWidth={2.5} />
                  </PressableScale>
                </View>
              ))}

              {screenshots.length < MAX_SCREENSHOTS && (
                <PressableScale
                  onPress={handlePickScreenshot}
                  scaleValue={0.95}
                  accessibilityRole="button"
                  accessibilityLabel="Add screenshot"
                  accessibilityHint="Opens photo library to select a screenshot"
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
                    style={[styles.addScreenshotText, { color: colors.textTertiary }]}
                  >
                    Add
                  </Text>
                </PressableScale>
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Submit */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)}>
          <Button
            title={submitting ? 'Submitting...' : 'Submit Proof'}
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
  centerSubtext: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  domainHint: {
    ...Typography.caption1,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  noteCard: {
    gap: Spacing.sm,
  },
  noteLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  noteLabel: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  noteInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
  },
  charCounter: {
    ...Typography.caption1,
    textAlign: 'right',
  },
  screenshotsCard: {
    gap: Spacing.sm,
  },
  screenshotsLabel: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  screenshotsHint: {
    ...Typography.caption1,
  },
  screenshotsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
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
