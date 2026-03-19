import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  MapPin,
  MessageCircle,
  FileText,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/booking/StatusBadge';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings, user } = useStore();

  const booking = useMemo(
    () => bookings.find((b) => b.id === id),
    [bookings, id]
  );

  const isCreator = user?.role === 'creator';

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleViewListing = useCallback(() => {
    if (!booking) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(listing)/${booking.listing_id}`);
  }, [booking, router]);

  const handleMessage = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Message', 'Opening conversation...');
  }, []);

  const handleCancel = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive' },
      ]
    );
  }, []);

  const handleComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Complete', 'Booking marked as complete!');
  }, []);

  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={styles.errorState}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Booking not found
          </Text>
        </View>
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Header */}
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Booking Details
          </Text>
          <View style={styles.backButton} />
        </View>

        {/* Status */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          style={styles.statusSection}
        >
          <StatusBadge status={booking.status} />
        </Animated.View>

        {/* Listing Info */}
        <Animated.View entering={FadeInDown.duration(500).delay(150)}>
          <Pressable onPress={handleViewListing}>
            <Card style={styles.listingCard}>
              <Text style={[styles.listingLabel, { color: colors.textTertiary }]}>
                Listing
              </Text>
              <Text style={[styles.listingTitle, { color: colors.text }]}>
                {booking.listing.title}
              </Text>
              <View style={styles.listingMeta}>
                <Badge text={booking.listing.platform} variant="primary" />
                <Text style={[styles.listingCategory, { color: colors.textSecondary }]}>
                  {booking.listing.category}
                </Text>
              </View>
            </Card>
          </Pressable>
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
                  ${booking.pay_agreed}
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
        <Button
          title="Message"
          onPress={handleMessage}
          variant="outline"
          size="lg"
          style={styles.ctaButtonHalf}
          icon={<MessageCircle size={18} color={colors.primary} strokeWidth={2} />}
        />
        {canComplete && (
          <Button
            title="Mark Complete"
            onPress={handleComplete}
            size="lg"
            style={styles.ctaButtonHalf}
          />
        )}
        {canCancel && (
          <Button
            title="Cancel"
            onPress={handleCancel}
            variant="secondary"
            size="lg"
            style={styles.ctaButtonHalf}
          />
        )}
        {!canComplete && !canCancel && (
          <Button
            title="View Listing"
            onPress={handleViewListing}
            size="lg"
            style={styles.ctaButtonHalf}
          />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.headline,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
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
  notesCard: {
    marginBottom: Spacing.lg,
  },
  notesText: {
    ...Typography.body,
    lineHeight: 24,
    fontStyle: 'italic',
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
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...Typography.title3,
  },
});
