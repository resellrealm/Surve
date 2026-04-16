import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Calendar, DollarSign, Check } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from './StatusBadge';
import { PressableScale } from '../ui/PressableScale';
import { useTheme } from '../../hooks/useTheme';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import type { Booking } from '../../types';

interface BookingCardProps {
  booking: Booking;
  onPress?: (booking: Booking) => void;
  userRole: 'creator' | 'business';
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

import { formatSmartDate } from '../../lib/dateFormat';
import { formatCurrency } from '../../lib/currency';

const formatDate = formatSmartDate;

export function BookingCard({ booking, onPress, userRole, selectable, selected, onToggleSelect }: BookingCardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handlePress = useCallback(() => {
    if (selectable && onToggleSelect) {
      haptics.select();
      onToggleSelect(booking.id);
      return;
    }
    if (!onPress) return;
    haptics.tap();
    onPress(booking);
  }, [booking, onPress, selectable, onToggleSelect]);

  const displayName =
    userRole === 'creator'
      ? booking.business.business_name
      : booking.creator.user.full_name;
  const displayAvatar =
    userRole === 'creator'
      ? booking.business.image_url
      : booking.creator.user.avatar_url;

  return (
    <PressableScale
      onPress={handlePress}
      disabled={!onPress && !selectable}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityState={selectable ? { checked: selected } : undefined}
      accessibilityLabel={`Booking with ${displayName}, ${booking.listing.title}, status: ${booking.status}`}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.borderLight,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.header}>
        {selectable && (
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: selected ? colors.primary : 'transparent',
                borderColor: selected ? colors.primary : colors.textTertiary,
              },
            ]}
          >
            {selected && <Check size={14} color={colors.onPrimary} strokeWidth={3} />}
          </View>
        )}
        <Avatar uri={displayAvatar} name={displayName} size={44} />
        <View style={styles.headerInfo}>
          <Text
            style={[styles.name, { color: colors.text }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text
            style={[styles.listingTitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {booking.listing.title}
          </Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        <View style={styles.footerItem}>
          <DollarSign size={14} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.footerText, { color: colors.text }]}>
            {formatCurrency(booking.pay_agreed)}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Calendar size={14} color={colors.textTertiary} strokeWidth={2} />
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            {formatDate(booking.deadline)}
          </Text>
        </View>
      </View>

      {booking.notes && (
        <Text
          style={[styles.notes, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {booking.notes}
        </Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  name: {
    ...Typography.headline,
  },
  listingTitle: {
    ...Typography.caption1,
    marginTop: Spacing.xxs,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    ...Typography.subheadline,
    fontWeight: '500',
  },
  notes: {
    ...Typography.caption1,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});
