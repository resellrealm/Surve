import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  ArrowLeft,
  Share2,
  Heart,
  MapPin,
  Clock,
  Users,
  DollarSign,
  CheckCircle,
  Calendar,
  Camera,
  TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { PlatformBadge } from '../../components/creator/PlatformBadge';
import { RequirementTag, formatFollowers } from '../../components/listing/RequirementTag';
import { ListingCard } from '../../components/listing/ListingCard';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import type { Listing } from '../../types';

function formatDeadline(deadline: string): string {
  const d = new Date(deadline);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listings, user } = useStore();

  const listing = useMemo(
    () => listings.find((l) => l.id === id),
    [listings, id]
  );

  const similarListings = useMemo(() => {
    if (!listing) return [];
    return listings
      .filter(
        (l) =>
          l.id !== listing.id &&
          (l.category === listing.category ||
            l.platform === listing.platform)
      )
      .slice(0, 3);
  }, [listings, listing]);

  const isCreator = user?.role === 'creator';

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleApply = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isCreator) {
      Alert.alert('Application Sent', 'Your application has been submitted. The business will review your profile.');
    } else {
      router.push(`/(listing)/create`);
    }
  }, [isCreator, router]);

  const handleSimilarPress = useCallback(
    (l: Listing) => {
      router.push(`/(listing)/${l.id}`);
    },
    [router]
  );

  if (!listing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={styles.errorState}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Listing not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: listing.image_url }} style={styles.heroImage} />
          <View style={[styles.topBar, { paddingTop: insets.top }]}>
            <Pressable
              onPress={handleBack}
              style={[styles.topButton, { backgroundColor: colors.overlay }]}
            >
              <ArrowLeft size={22} color={colors.onPrimary} strokeWidth={2} />
            </Pressable>
            <View style={styles.topRight}>
              <Pressable
                style={[styles.topButton, { backgroundColor: colors.overlay }]}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <Heart size={22} color={colors.onPrimary} strokeWidth={2} />
              </Pressable>
              <Pressable
                style={[styles.topButton, { backgroundColor: colors.overlay }]}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <Share2 size={22} color={colors.onPrimary} strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <View style={styles.badgesRow}>
              <PlatformBadge platform={listing.platform} />
              <Badge text={capitalizeFirst(listing.category)} />
              <Badge text={`${listing.applicants_count} applicants`} variant="info" />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              {listing.title}
            </Text>

            {/* Business Info */}
            <Pressable
              style={[
                styles.businessRow,
                { borderColor: colors.borderLight },
              ]}
            >
              <Avatar
                uri={listing.business.image_url}
                name={listing.business.business_name}
                size={44}
              />
              <View style={styles.businessInfo}>
                <View style={styles.businessNameRow}>
                  <Text
                    style={[styles.businessName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {listing.business.business_name}
                  </Text>
                  {listing.business.verified && (
                    <CheckCircle
                      size={16}
                      color={colors.primary}
                      fill={colors.primary}
                      strokeWidth={2}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.businessLocation,
                    { color: colors.textSecondary },
                  ]}
                >
                  {listing.business.location}
                </Text>
              </View>
            </Pressable>
          </Animated.View>

          {/* Pay Range */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Card style={styles.payCard}>
              <View style={styles.payRow}>
                <DollarSign
                  size={24}
                  color={colors.primary}
                  strokeWidth={2}
                />
                <View>
                  <Text style={[styles.payAmount, { color: colors.primary }]}>
                    ${listing.pay_min} - ${listing.pay_max}
                  </Text>
                  <Text
                    style={[styles.payLabel, { color: colors.textSecondary }]}
                  >
                    Compensation
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Description
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {listing.description}
            </Text>
          </Animated.View>

          {/* Requirements */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Requirements
            </Text>
            <View style={styles.requirementsGrid}>
              <RequirementTag
                type="followers"
                value={`${formatFollowers(listing.min_followers)}+ followers`}
              />
              <RequirementTag
                type="engagement"
                value={`${listing.min_engagement_rate}%+ engagement`}
              />
              <RequirementTag
                type="content"
                value={listing.content_type}
              />
            </View>
          </Animated.View>

          {/* Details */}
          <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Details
            </Text>
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Calendar
                  size={18}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.detailText, { color: colors.textSecondary }]}
                >
                  Deadline: {formatDeadline(listing.deadline)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <MapPin
                  size={18}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.detailText, { color: colors.textSecondary }]}
                >
                  {listing.location}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Camera
                  size={18}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.detailText, { color: colors.textSecondary }]}
                >
                  Content: {listing.content_type}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Similar Listings */}
          {similarListings.length > 0 && (
            <Animated.View entering={FadeInDown.duration(500).delay(600)}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Similar Listings
              </Text>
              {similarListings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  onPress={handleSimilarPress}
                />
              ))}
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
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
        <View style={styles.ctaPayInfo}>
          <Text style={[styles.ctaPayLabel, { color: colors.textSecondary }]}>
            Pay range
          </Text>
          <Text style={[styles.ctaPayAmount, { color: colors.text }]}>
            ${listing.pay_min} - ${listing.pay_max}
          </Text>
        </View>
        <Button
          title={isCreator ? 'Apply Now' : 'Edit Listing'}
          onPress={handleApply}
          size="lg"
          style={styles.ctaButton}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroContainer: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 280,
    resizeMode: 'cover',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  topButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  title: {
    ...Typography.title1,
    marginBottom: Spacing.lg,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
  businessInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  businessName: {
    ...Typography.headline,
  },
  businessLocation: {
    ...Typography.caption1,
    marginTop: Spacing.xxs,
  },
  payCard: {
    marginBottom: Spacing.xl,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  payAmount: {
    ...Typography.title2,
    fontWeight: '800',
  },
  payLabel: {
    ...Typography.caption1,
    marginTop: Spacing.xxs,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    lineHeight: 26,
    marginBottom: Spacing.xxl,
  },
  requirementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  detailsList: {
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailText: {
    ...Typography.subheadline,
  },
  bottomCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadows.lg,
  },
  ctaPayInfo: {},
  ctaPayLabel: {
    ...Typography.caption1,
  },
  ctaPayAmount: {
    ...Typography.title3,
    fontWeight: '700',
  },
  ctaButton: {
    minWidth: 150,
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
