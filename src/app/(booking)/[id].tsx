import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useIsOffline } from '../../hooks/useIsOffline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import {
  DollarSign,
  Calendar,
  MapPin,
  MessageCircle,
  FileText,
  Clock,
  Lock,
  ExternalLink,
  AlertTriangle,
  Star,
  CheckCircle,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { updateBooking } from '../../lib/api';
import { useMilestones } from '../../hooks/useMilestones';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { StatusBadge } from '../../components/booking/StatusBadge';
import { BookingDetailSkeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { formatCurrency } from '../../lib/currency';

import { formatDateLong, formatDateShort } from '../../lib/dateFormat';

const formatDate = formatDateLong;
const formatShortDate = formatDateShort;

function formatCountdownFromDate(target: string): string {
  const now = Date.now();
  const end = new Date(target).getTime();
  const diff = end - now;
  if (diff <= 0) return 'Auto-approving soon';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h ${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOffline = useIsOffline();
  const { bookings, user, bookingsLoading, fetchBookings } = useStore();
  const { tryUnlock } = useMilestones();

  const booking = useMemo(
    () => bookings.find((b) => b.id === id),
    [bookings, id]
  );

  const isCreator = user?.role === 'creator';
  const isBusiness = user?.role === 'business';

  // Countdown timer for auto-approve
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (booking?.status !== 'proof_submitted' || !booking.auto_approve_at) return;
    const update = () => setCountdown(formatCountdownFromDate(booking.auto_approve_at!));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [booking?.status, booking?.auto_approve_at]);

  const handleViewListing = useCallback(() => {
    if (!booking) return;
    haptics.tap();
    router.push(`/(listing)/${booking.listing_id}`);
  }, [booking, router, haptics]);

  const handleMessage = useCallback(() => {
    haptics.confirm();
    toast.info('Opening conversation...');
  }, [haptics]);

  const handleCancel = useCallback(() => {
    haptics.warning();
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive' },
      ]
    );
  }, [haptics]);

  const handleComplete = useCallback(() => {
    haptics.success();
    toast.success('Booking marked as complete!');
    tryUnlock('first_booking_confirmed');
  }, [haptics, tryUnlock]);

  const handleSubmitProof = useCallback(() => {
    if (!booking) return;
    haptics.confirm();
    router.push({
      pathname: '/(booking)/proof',
      params: { bookingId: booking.id },
    });
  }, [booking, router, haptics]);

  const handleApproveAndPay = useCallback(async () => {
    if (!booking) return;
    haptics.success();
    Alert.alert(
      'Approve & Pay',
      `Approve the proof and release ${formatCurrency(booking.pay_agreed)} to the creator?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Pay',
          onPress: async () => {
            await updateBooking(booking.id, {
              status: 'completed',
              completed_at: new Date().toISOString(),
            });
            tryUnlock('first_booking_confirmed');
          },
        },
      ]
    );
  }, [booking, haptics]);

  const handleDispute = useCallback(() => {
    if (!booking) return;
    haptics.warning();
    router.push({
      pathname: '/(booking)/dispute',
      params: { bookingId: booking.id },
    });
  }, [booking, router, haptics]);

  const handleRefund = useCallback(() => {
    if (!booking) return;
    haptics.warning();
    router.push({
      pathname: '/(booking)/refund',
      params: { bookingId: booking.id },
    });
  }, [booking, router, haptics]);

  const handleLeaveReview = useCallback(() => {
    if (!booking) return;
    haptics.confirm();
    router.push({
      pathname: '/(booking)/review',
      params: { bookingId: booking.id },
    });
  }, [booking, router, haptics]);

  const handleOpenProofUrl = useCallback(() => {
    if (!booking?.proof_url) return;
    haptics.tap();
    Linking.openURL(booking.proof_url);
  }, [booking?.proof_url, haptics]);

  if (!booking && bookingsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Booking Details" />
        <BookingDetailSkeleton />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader />
        <ErrorState
          title="Booking not found"
          message="We couldn't load this booking. It may have been removed or there was a connection issue."
          onRetry={fetchBookings}
        />
      </View>
    );
  }

  const counterpartyName = isCreator
    ? booking.business.business_name
    : booking.creator.user.full_name;
  const counterpartyAvatar = isCreator
    ? booking.business.image_url
    : booking.creator.user.avatar_url;
  const counterpartyRole = isCreator ? 'Business' : 'Creator';

  const canCancel =
    booking.status === 'pending' || booking.status === 'accepted';
  const canComplete = booking.status === 'active';
  // Business pays on pending/accepted before work begins; creator never pays.
  const canPay = !isCreator && (booking.status === 'pending' || booking.status === 'accepted');
  const canSubmitProof = isCreator && booking.status === 'in_progress';
  const canApproveOrDispute = isBusiness && booking.status === 'proof_submitted';
  const canLeaveReview = booking.status === 'completed';
  const isDisputed = booking.status === 'disputed';

  // Refund eligibility: business user, has a captured payment, in a pre-completion state,
  // and not already refunded/processing.
  const hasRefund = Boolean(booking.refund_status);
  const canRefund =
    isBusiness &&
    !hasRefund &&
    ['accepted', 'in_progress', 'proof_submitted', 'disputed'].includes(booking.status);

  const handlePay = () => {
    haptics.confirm();
    router.push({
      pathname: '/(payment)/checkout',
      params: {
        bookingId: booking.id,
        listingId: booking.listing_id,
        amount: String(booking.pay_agreed),
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Booking Details" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Spacing.lg, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Status */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          style={styles.statusSection}
        >
          <StatusBadge status={booking.status} />
        </Animated.View>

        {/* Disputed Banner */}
        {isDisputed && (
          <Animated.View entering={FadeInDown.duration(500).delay(120)}>
            <View
              style={[
                styles.disputedBanner,
                { backgroundColor: colors.warningLight, borderColor: colors.warning },
              ]}
            >
              <ShieldAlert size={20} color={colors.warning} strokeWidth={2} />
              <Text style={[styles.disputedBannerText, { color: colors.warning }]}>
                Under review by admin
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Refund Banner */}
        {hasRefund && (
          <Animated.View entering={FadeInDown.duration(500).delay(130)}>
            <View
              style={[
                styles.disputedBanner,
                {
                  backgroundColor:
                    booking.refund_status === 'refunded'
                      ? colors.completedLight
                      : booking.refund_status === 'failed'
                        ? colors.errorLight
                        : colors.activeLight,
                  borderColor:
                    booking.refund_status === 'refunded'
                      ? colors.completed
                      : booking.refund_status === 'failed'
                        ? colors.error
                        : colors.primary,
                },
              ]}
            >
              <RotateCcw
                size={20}
                color={
                  booking.refund_status === 'refunded'
                    ? colors.completed
                    : booking.refund_status === 'failed'
                      ? colors.error
                      : colors.primary
                }
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.disputedBannerText,
                  {
                    color:
                      booking.refund_status === 'refunded'
                        ? colors.completed
                        : booking.refund_status === 'failed'
                          ? colors.error
                          : colors.primary,
                  },
                ]}
              >
                {booking.refund_status === 'refunded'
                  ? `Refunded ${formatCurrency(booking.refund_amount ?? booking.pay_agreed)}`
                  : booking.refund_status === 'processing'
                    ? 'Refund processing — funds land in 5–10 days'
                    : booking.refund_status === 'failed'
                      ? 'Refund failed — contact support'
                      : 'Refund requested'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Listing Info */}
        <Animated.View entering={FadeInDown.duration(500).delay(150)}>
          <PressableScale onPress={handleViewListing} accessibilityRole="button" accessibilityLabel={`View listing: ${booking.listing.title}`}>
            <Card style={styles.listingCard}>
              <Text style={[styles.listingLabel, { color: colors.textTertiary }]}>
                Listing
              </Text>
              <Text style={[styles.listingTitle, { color: colors.text }]} accessibilityRole="header">
                {booking.listing.title}
              </Text>
              <View style={styles.listingMeta}>
                <Badge text={booking.listing.platform} variant="primary" />
                <Text style={[styles.listingCategory, { color: colors.textSecondary }]}>
                  {booking.listing.category}
                </Text>
              </View>
            </Card>
          </PressableScale>
        </Animated.View>

        {/* Counterparty */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Card style={styles.counterpartyCard}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              {counterpartyRole}
            </Text>
            <View style={styles.counterpartyRow}>
              <Avatar
                uri={counterpartyAvatar}
                name={counterpartyName}
                size={48}
              />
              <View style={styles.counterpartyInfo}>
                <Text style={[styles.counterpartyName, { color: colors.text }]}>
                  {counterpartyName}
                </Text>
                {isCreator && (
                  <View style={styles.locationRow}>
                    <MapPin size={12} color={colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                      {booking.business.location}
                    </Text>
                  </View>
                )}
                {!isCreator && (
                  <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                    {booking.creator.location}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Payment & Deadline */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Card style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: colors.activeLight }]}>
                <DollarSign size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                  Agreed Pay
                </Text>
                <Text style={[styles.detailValue, { color: colors.primary }]}>
                  {formatCurrency(booking.pay_agreed)}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: colors.pendingLight }]}>
                <Calendar size={18} color={colors.pending} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                  Deadline
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatDate(booking.deadline)}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Clock size={18} color={colors.textSecondary} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                  Booked On
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatShortDate(booking.created_at)}
                </Text>
              </View>
            </View>

            {booking.completed_at && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: colors.completedLight }]}>
                    <FileText size={18} color={colors.completed} strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                      Completed
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.completed }]}>
                      {formatShortDate(booking.completed_at)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </Card>
        </Animated.View>

        {/* Proof Details (when proof_submitted) */}
        {booking.status === 'proof_submitted' && (
          <Animated.View entering={FadeInDown.duration(500).delay(350)}>
            <Card style={styles.proofCard}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                Proof
              </Text>

              {/* Proof URL */}
              {booking.proof_url && (
                <PressableScale onPress={handleOpenProofUrl} style={styles.proofUrlRow} scaleValue={0.96} accessibilityRole="link" accessibilityLabel="Open proof URL" accessibilityHint="Opens the submitted proof in your browser">
                  <ExternalLink size={16} color={colors.primary} strokeWidth={2} />
                  <Text
                    style={[styles.proofUrlText, { color: colors.primary }]}
                    numberOfLines={1}
                  >
                    {booking.proof_url}
                  </Text>
                </PressableScale>
              )}

              {/* Proof Screenshots */}
              {booking.proof_screenshots && booking.proof_screenshots.length > 0 && (
                <View style={styles.proofScreenshotsGrid}>
                  {booking.proof_screenshots.map((uri) => (
                    <AdaptiveImage
                      key={uri}
                      source={{ uri }}
                      contentFit="cover"
                      style={[
                        styles.proofScreenshotImage,
                        { borderColor: colors.border },
                      ]}
                      accessibilityLabel={`Proof screenshot`}
                    />
                  ))}
                </View>
              )}

              {/* Proof Note */}
              {booking.proof_note && (
                <Text style={[styles.proofNoteText, { color: colors.textSecondary }]}>
                  {booking.proof_note}
                </Text>
              )}

              {/* Auto-approve countdown */}
              {booking.auto_approve_at && (
                <View
                  style={[
                    styles.countdownContainer,
                    { backgroundColor: colors.pendingLight },
                  ]}
                >
                  <Clock size={14} color={colors.pending} strokeWidth={2} />
                  <Text style={[styles.countdownText, { color: colors.pending }]}>
                    Auto-approves in {countdown}
                  </Text>
                </View>
              )}
            </Card>
          </Animated.View>
        )}

        {/* Notes */}
        {booking.notes && (
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <Card style={styles.notesCard}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                Notes
              </Text>
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                {booking.notes}
              </Text>
            </Card>
          </Animated.View>
        )}

        {/* Refund request link — subtle, for business only */}
        {canRefund && (
          <Animated.View entering={FadeInDown.duration(500).delay(450)}>
            <PressableScale
              onPress={handleRefund}
              scaleValue={0.97}
              style={[
                styles.refundLink,
                { borderColor: colors.borderLight },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Request a refund"
            >
              <RotateCcw size={16} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.refundLinkText, { color: colors.textSecondary }]}>
                Request a refund
              </Text>
            </PressableScale>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
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
        {/* proof_submitted + business: Approve & Pay / Dispute */}
        {canApproveOrDispute ? (
          <>
            <Button
              title="Dispute"
              onPress={handleDispute}
              disabled={isOffline}
              variant="outline"
              size="lg"
              style={styles.ctaButtonHalf}
              icon={<AlertTriangle size={16} color={colors.error} strokeWidth={2} />}
            />
            <Button
              title={isOffline ? 'Offline' : 'Approve & Pay'}
              onPress={handleApproveAndPay}
              disabled={isOffline}
              size="lg"
              style={styles.ctaButtonHalf}
              icon={<CheckCircle size={16} color={colors.onPrimary} strokeWidth={2} />}
            />
          </>
        ) : canSubmitProof ? (
          /* in_progress + creator: Submit Proof */
          <>
            <Button
              title="Message"
              onPress={handleMessage}
              variant="outline"
              size="lg"
              style={styles.ctaButtonHalf}
              icon={<MessageCircle size={18} color={colors.primary} strokeWidth={2} />}
            />
            <Button
              title={isOffline ? 'Offline' : 'Submit Proof'}
              onPress={handleSubmitProof}
              disabled={isOffline}
              size="lg"
              style={styles.ctaButtonHalf}
              icon={<FileText size={16} color={colors.onPrimary} strokeWidth={2} />}
            />
          </>
        ) : canLeaveReview ? (
          /* completed: Leave Review */
          <>
            <Button
              title="Message"
              onPress={handleMessage}
              variant="outline"
              size="lg"
              style={styles.ctaButtonHalf}
              icon={<MessageCircle size={18} color={colors.primary} strokeWidth={2} />}
            />
            <Button
              title="Leave Review"
              onPress={handleLeaveReview}
              size="lg"
              style={styles.ctaButtonHalf}
              icon={<Star size={16} color={colors.onPrimary} strokeWidth={2} />}
            />
          </>
        ) : (
          /* Default actions (existing logic) */
          <>
            <Button
              title="Message"
              onPress={handleMessage}
              variant="outline"
              size="lg"
              style={styles.ctaButtonHalf}
              icon={<MessageCircle size={18} color={colors.primary} strokeWidth={2} />}
            />
            {canPay && (
              <Button
                title={isOffline ? 'Offline' : `Pay ${formatCurrency(booking.pay_agreed)}`}
                onPress={handlePay}
                disabled={isOffline}
                size="lg"
                style={styles.ctaButtonHalf}
                icon={<Lock size={16} color={colors.onPrimary} strokeWidth={2.2} />}
              />
            )}
            {!canPay && canComplete && (
              <Button
                title={isOffline ? 'Offline' : 'Mark Complete'}
                onPress={handleComplete}
                disabled={isOffline}
                size="lg"
                style={styles.ctaButtonHalf}
              />
            )}
            {!canPay && !canComplete && canCancel && (
              <Button
                title="Cancel"
                onPress={handleCancel}
                disabled={isOffline}
                variant="secondary"
                size="lg"
                style={styles.ctaButtonHalf}
              />
            )}
            {!canPay && !canComplete && !canCancel && (
              <Button
                title="View Listing"
                onPress={handleViewListing}
                size="lg"
                style={styles.ctaButtonHalf}
              />
            )}
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  disputedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  disputedBannerText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  listingCard: {
    marginBottom: Spacing.lg,
  },
  listingLabel: {
    ...Typography.caption1,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  listingTitle: {
    ...Typography.title3,
    marginBottom: Spacing.sm,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  listingCategory: {
    ...Typography.caption1,
    textTransform: 'capitalize' as const,
  },
  counterpartyCard: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.caption1,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  counterpartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterpartyInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  counterpartyName: {
    ...Typography.headline,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  locationText: {
    ...Typography.caption1,
    marginTop: Spacing.xxs,
  },
  detailsCard: {
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    ...Typography.caption1,
  },
  detailValue: {
    ...Typography.headline,
    marginTop: Spacing.xxs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.md,
  },
  proofCard: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  proofUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
  },
  proofUrlText: {
    ...Typography.body,
    flex: 1,
    textDecorationLine: 'underline',
  },
  proofScreenshotsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  proofScreenshotImage: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  proofNoteText: {
    ...Typography.body,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  countdownText: {
    ...Typography.caption1,
    fontWeight: '600',
  },
  notesCard: {
    marginBottom: Spacing.lg,
  },
  notesText: {
    ...Typography.body,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  refundLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.md,
  },
  refundLinkText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  bottomCta: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadows.lg,
  },
  ctaButtonHalf: {
    flex: 1,
  },
});
