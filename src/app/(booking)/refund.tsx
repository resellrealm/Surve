import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CheckCircle, ShieldCheck, DollarSign } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { requestRefund } from '../../lib/api';
import { requireBiometric } from '../../lib/biometric';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';
import { formatCurrency } from '../../lib/currency';

const MAX_DESCRIPTION_LENGTH = 500;

const REFUND_REASONS = [
  'Creator did not deliver',
  'Deliverable did not match brief',
  'Business cancelled collaboration',
  'Booking created in error',
  'Other',
] as const;

type RefundReason = (typeof REFUND_REASONS)[number];

export default function RefundScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { bookings } = useStore();

  const booking = useMemo(
    () => bookings.find((b) => b.id === bookingId),
    [bookings, bookingId]
  );

  const [selectedReason, setSelectedReason] = useState<RefundReason | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit =
    selectedReason !== null && notes.trim().length > 0 && !submitting;

  const handleSelect = useCallback(
    (reason: RefundReason) => {
      haptics.tap();
      setSelectedReason(reason);
    },
    [haptics]
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !bookingId || !booking || !selectedReason) return;
    const bio = await requireBiometric('Confirm refund');
    if (!bio.ok) {
      haptics.error();
      return;
    }
    haptics.warning();
    setSubmitting(true);
    const fullReason = `${selectedReason} — ${notes.trim()}`;
    const result = await requestRefund(bookingId, fullReason);
    setSubmitting(false);
    if (result.ok) {
      haptics.success();
      setSubmitted(true);
    } else {
      haptics.error();
      toast.error(`Refund failed: ${result.message}`);
    }
  }, [booking, bookingId, canSubmit, haptics, notes, selectedReason]);

  const back = useCallback(() => {
    haptics.tap();
    router.back();
  }, [haptics, router]);

  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Request Refund" />
        <View style={styles.center}>
          <Text style={[styles.centerText, { color: colors.text }]}>
            Booking not found
          </Text>
        </View>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Request Refund" />
        <View style={styles.center}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <CheckCircle size={72} color={colors.success} strokeWidth={1.5} accessibilityElementsHidden />
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.duration(500).delay(100)}
            style={[styles.successTitle, { color: colors.text }]}
            accessibilityRole="header"
          >
            Refund on the way
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.duration(500).delay(200)}
            style={[styles.successBody, { color: colors.textSecondary }]}
          >
            We've sent the refund request to Stripe. Funds usually land in
            5–10 business days. You'll get a notification once it settles.
          </Animated.Text>
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <Button title="Back to Booking" onPress={back} size="lg" fullWidth />
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Request Refund" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.huge },
        ]}
      >
        <Animated.View entering={FadeInDown.duration(500).delay(80)}>
          <Card style={styles.infoCard}>
            <View style={[styles.infoBanner, { backgroundColor: colors.activeLight }]}>
              <ShieldCheck size={20} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Refunds are processed via Stripe within seconds, and land back
                on your card in 5–10 business days.
              </Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(150)}>
          <Card style={styles.amountCard}>
            <View style={styles.amountRow}>
              <View style={[styles.amountIcon, { backgroundColor: colors.activeLight }]}>
                <DollarSign size={22} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>
                  Refund amount
                </Text>
                <Text style={[styles.amountValue, { color: colors.text }]}>
                  {formatCurrency(booking.pay_agreed)}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(220)}>
          <Text style={[styles.sectionLabel, { color: colors.text }]} accessibilityRole="header">
            Reason
          </Text>
          <View style={styles.chipRow}>
            {REFUND_REASONS.map((r) => {
              const active = selectedReason === r;
              return (
                <PressableScale
                  key={r}
                  onPress={() => handleSelect(r)}
                  scaleValue={0.93}
                  accessibilityRole="button"
                  accessibilityLabel={r}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : colors.surfaceSecondary,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.onPrimary : colors.text },
                    ]}
                  >
                    {r}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Card style={styles.notesCard}>
            <Text style={[styles.sectionLabel, { color: colors.text }]} accessibilityRole="header">
              Notes
            </Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel="Refund notes"
              accessibilityHint="Describe what happened to support your refund request"
              placeholder="Tell us what happened…"
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={(t) =>
                t.length <= MAX_DESCRIPTION_LENGTH && setNotes(t)
              }
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <Text
              style={[
                styles.charCounter,
                {
                  color:
                    notes.length >= MAX_DESCRIPTION_LENGTH
                      ? colors.error
                      : colors.textTertiary,
                },
              ]}
            >
              {notes.length}/{MAX_DESCRIPTION_LENGTH}
            </Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(380)}>
          <Button
            title={submitting ? 'Processing…' : `Refund ${formatCurrency(booking.pay_agreed)}`}
            onPress={handleSubmit}
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
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  centerText: { ...Typography.title3, textAlign: 'center' },
  successTitle: { ...Typography.title1, textAlign: 'center' },
  successBody: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  infoCard: { padding: 0, overflow: 'hidden' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  infoText: { ...Typography.footnote, flex: 1, lineHeight: 18 },
  amountCard: { padding: Spacing.md },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  amountIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountLabel: { ...Typography.caption1 },
  amountValue: { ...Typography.title2, marginTop: 2 },
  sectionLabel: {
    ...Typography.subheadline,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: { ...Typography.footnote, fontWeight: '500' },
  notesCard: { gap: Spacing.sm },
  notesInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 120,
  },
  charCounter: { ...Typography.caption1, textAlign: 'right' },
});
