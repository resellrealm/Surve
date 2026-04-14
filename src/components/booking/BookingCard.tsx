import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Calendar, DollarSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from './StatusBadge';
import { useTheme } from '../../hooks/useTheme';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Springs,
} from '../../constants/theme';
import type { Booking } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface BookingCardProps {
  booking: Booking;
  onPress?: (booking: Booking) => void;
  userRole: 'creator' | 'business';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function BookingCard({ booking, onPress, userRole }: BookingCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(0.97, Springs.snappy);
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(1, Springs.bouncy);
  }, [onPress, scale]);

  const handlePress = useCallback(() => {
    if (!onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(booking);
  }, [booking, onPress]);

  const displayName =
    userRole === 'creator'
      ? booking.business.business_name
      : booking.creator.user.full_name;
  const displayAvatar =
    userRole === 'creator'
      ? booking.business.image_url
      : booking.creator.user.avatar_url;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Booking with ${displayName}, ${booking.listing.title}, status: ${booking.status}`}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
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
            ${booking.pay_agreed}
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
    </AnimatedPressable>
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
