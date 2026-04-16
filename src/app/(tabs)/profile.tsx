import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import {
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Star,
  MapPin,
  LinkIcon,
  Shield,
  Instagram,
  Wallet,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  User as UserIcon,
  Info,
  Bookmark,
} from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { toast } from '../../lib/toast';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { PlatformBadge } from '../../components/creator/PlatformBadge';
import { StatsRow } from '../../components/creator/StatsRow';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { PulsingDot } from '../../components/ui/PulsingDot';
import { Skeleton } from '../../components/ui/Skeleton';
import * as api from '../../lib/api';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
} from '../../constants/theme';

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  accessibilityHint?: string;
}

function ProfileSkeleton() {
  return (
    <View style={{ alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.lg }}>
      <Skeleton width={80} height={80} borderRadius={40} />
      <Skeleton width={160} height={22} />
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Skeleton width={70} height={24} borderRadius={BorderRadius.full} />
        <Skeleton width={70} height={24} borderRadius={BorderRadius.full} />
      </View>
      <View style={{ width: '100%', gap: Spacing.md, marginTop: Spacing.lg }}>
        <Skeleton width="100%" height={120} borderRadius={BorderRadius.lg} />
        <Skeleton width="100%" height={100} borderRadius={BorderRadius.lg} />
        <Skeleton width="100%" height={180} borderRadius={BorderRadius.lg} />
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  destructive = false,
  accessibilityHint,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handlePress = useCallback(() => {
    haptics.tap();
    onPress();
  }, [onPress, haptics]);

  return (
    <PressableScale
      scaleValue={0.98}
      onPress={handlePress}
      style={styles.settingsRow}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
    >
      <View
        style={[
          styles.settingsIcon,
          {
            backgroundColor: destructive
              ? colors.cancelledLight
              : colors.surfaceSecondary,
          },
        ]}
      >
        {icon}
      </View>
      <View style={styles.settingsInfo}>
        <Text
          style={[
            styles.settingsTitle,
            { color: destructive ? colors.error : colors.text },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingsSubtitle, { color: colors.textTertiary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
    </PressableScale>
  );
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, unreadNotificationsCount } = useStore();

  const isCreator = user?.role === 'creator';
  const [creatorData, setCreatorData] = React.useState<import('../../types').Creator | null>(null);
  const [businessData, setBusinessData] = React.useState<import('../../types').Business | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    api.trackProfileView(user.id, user.id);
  }, [user?.id]);

  React.useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    setProfileError(null);
    const load = isCreator
      ? api.getCreatorProfile(user.id).then(setCreatorData)
      : api.getBusinessProfile(user.id).then(setBusinessData);
    load
      .catch((e: any) => setProfileError(e?.message ?? 'Failed to load profile'))
      .finally(() => setProfileLoading(false));
  }, [user, isCreator]);

  const handleRetry = useCallback(() => {
    if (!user) return;
    setProfileLoading(true);
    setProfileError(null);
    const load = isCreator
      ? api.getCreatorProfile(user.id).then(setCreatorData)
      : api.getBusinessProfile(user.id).then(setBusinessData);
    load
      .catch((e: any) => setProfileError(e?.message ?? 'Failed to load profile'))
      .finally(() => setProfileLoading(false));
  }, [user, isCreator]);

  const handleLogout = useCallback(() => {
    haptics.warning();
    logout();
    router.replace('/auth');
  }, [logout, router]);

  if (profileLoading && !creatorData && !businessData) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.lg },
        ]}
      >
        <ProfileSkeleton />
      </ScrollView>
    );
  }

  if (profileError && !creatorData && !businessData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} accessibilityRole="alert">
        <View style={[styles.errorState, { paddingTop: insets.top + 80 }]}>
          <View style={[styles.errorIcon, { backgroundColor: colors.cancelledLight }]}>
            <AlertTriangle size={40} color={colors.error} strokeWidth={1.5} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Couldn't load profile
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            {profileError}
          </Text>
          <PressableScale
            onPress={handleRetry}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading profile"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>Try Again</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: Layout.tabBarHeight + 40,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <Animated.View
        entering={FadeInDown.duration(500).delay(100)}
        style={styles.profileHeader}
      >
        <PressableScale onPress={() => router.push('/(profile)/edit')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit profile picture">
          <Avatar
            uri={user?.avatar_url ?? null}
            name={user?.full_name ?? 'User'}
            size={88}
          />
        </PressableScale>
        <Text style={[styles.profileName, { color: colors.text }]} accessibilityRole="header">
          {user?.full_name}
        </Text>
        {user?.username && (
          <Text style={[styles.profileHandle, { color: colors.textSecondary }]}>
            @{user.username}
          </Text>
        )}
        <View style={styles.roleBadgeRow}>
          <Badge
            text={isCreator ? 'Creator' : 'Business'}
            variant="primary"
          />
          {((isCreator && creatorData?.verified) ||
            (!isCreator && businessData?.verified)) && (
            <Badge text="Verified" variant="success" />
          )}
        </View>
        {user?.bio && (
          <Text style={[styles.profileBio, { color: colors.textSecondary }]}>
            {user.bio}
          </Text>
        )}
        {(user?.location ??
          (isCreator ? creatorData?.location : businessData?.location)) && (
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {user?.location ??
                (isCreator ? creatorData?.location : businessData?.location)}
            </Text>
          </View>
        )}
        <PressableScale
          onPress={() => router.push('/(profile)/edit')}
          style={[
            styles.editProfileBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Text style={[styles.editProfileText, { color: colors.text }]}>
            Edit profile
          </Text>
        </PressableScale>
      </Animated.View>

      {/* Creator-specific section */}
      {isCreator && creatorData && (
        <Animated.View entering={FadeInDown.duration(500).delay(180)}>
          <StripeConnectCard
            creatorData={creatorData}
            onPress={async () => {
              const url = await api.getStripeConnectLink();
              if (url) Linking.openURL(url);
              else toast.error('Not available. Try again in a moment.');
            }}
          />
        </Animated.View>
      )}

      {isCreator && creatorData && (
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Card style={styles.statsCard}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Platform Stats
            </Text>
            <View style={styles.platformBadges}>
              {creatorData.instagram_handle && (
                <PlatformBadge platform="instagram" />
              )}
              {creatorData.tiktok_handle && (
                <PlatformBadge platform="tiktok" />
              )}
            </View>
            <StatsRow
              instagramFollowers={creatorData.instagram_followers}
              tiktokFollowers={creatorData.tiktok_followers}
              engagementRate={creatorData.engagement_rate}
              avgViews={creatorData.avg_views}
            />
          </Card>

          <Card style={styles.statsCard}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Performance
            </Text>
            <View style={styles.perfRow} accessibilityRole="summary">
              <View style={styles.perfItem}>
                <Star size={20} color={colors.rating} fill={colors.rating} strokeWidth={2} />
                <Text style={[styles.perfValue, { color: colors.text }]}>
                  {creatorData.rating.toFixed(1)}
                </Text>
                <Text
                  style={[styles.perfLabel, { color: colors.textTertiary }]}
                >
                  Rating
                </Text>
              </View>
              <View
                style={[
                  styles.perfDivider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <View style={styles.perfItem}>
                <Text style={[styles.perfValue, { color: colors.text }]}>
                  {creatorData.total_bookings}
                </Text>
                <Text
                  style={[styles.perfLabel, { color: colors.textTertiary }]}
                >
                  Bookings
                </Text>
              </View>
              <View
                style={[
                  styles.perfDivider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <View style={styles.perfItem}>
                <Text style={[styles.perfValue, { color: colors.text }]}>
                  {creatorData.total_reviews}
                </Text>
                <Text
                  style={[styles.perfLabel, { color: colors.textTertiary }]}
                >
                  Reviews
                </Text>
              </View>
            </View>
          </Card>

          {/* Portfolio */}
          <Card style={styles.statsCard}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Portfolio
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.portfolioScroll}
            >
              {creatorData.portfolio_urls.map((url, idx) => (
                <AdaptiveImage
                  key={idx}
                  source={{ uri: url }}
                  contentFit="cover"
                  overlayOpacity={0.18}
                  style={styles.portfolioImage}
                  accessibilityLabel={`Portfolio image ${idx + 1}`}
                />
              ))}
            </ScrollView>
          </Card>
        </Animated.View>
      )}

      {/* Business-specific section */}
      {!isCreator && businessData && (
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Card style={styles.statsCard}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Business Info
            </Text>
            <Text
              style={[styles.bioText, { color: colors.textSecondary }]}
            >
              {businessData.description}
            </Text>
            <View style={styles.perfRow} accessibilityRole="summary">
              <View style={styles.perfItem}>
                <Star size={20} color={colors.rating} fill={colors.rating} strokeWidth={2} />
                <Text style={[styles.perfValue, { color: colors.text }]}>
                  {businessData.rating.toFixed(1)}
                </Text>
                <Text
                  style={[styles.perfLabel, { color: colors.textTertiary }]}
                >
                  Rating
                </Text>
              </View>
              <View
                style={[
                  styles.perfDivider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <View style={styles.perfItem}>
                <Text style={[styles.perfValue, { color: colors.text }]}>
                  {businessData.total_listings}
                </Text>
                <Text
                  style={[styles.perfLabel, { color: colors.textTertiary }]}
                >
                  Listings
                </Text>
              </View>
              <View
                style={[
                  styles.perfDivider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <View style={styles.perfItem}>
                <Text style={[styles.perfValue, { color: colors.text }]}>
                  {businessData.total_reviews}
                </Text>
                <Text
                  style={[styles.perfLabel, { color: colors.textTertiary }]}
                >
                  Reviews
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Money */}
      <Animated.View entering={FadeInDown.duration(500).delay(380)}>
        <Card style={styles.settingsCard} padding={0}>
          <SettingsRow
            icon={<Wallet size={20} color={colors.primary} strokeWidth={2} />}
            title={isCreator ? 'Earnings' : 'Spending'}
            subtitle="Payouts, transactions, history"
            onPress={() => router.push('/(profile)/earnings')}
            accessibilityHint="Opens your earnings and transaction history"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<CreditCard size={20} color={colors.primary} strokeWidth={2} />}
            title="Payment methods"
            subtitle="Cards, Apple Pay, bank"
            onPress={() => router.push('/(payment)/methods')}
            accessibilityHint="Opens your saved payment methods"
          />
        </Card>
      </Animated.View>

      {/* Settings */}
      <Animated.View entering={FadeInDown.duration(500).delay(420)}>
        <Card style={styles.settingsCard} padding={0}>
          <SettingsRow
            icon={
              <View>
                <Bell size={20} color={colors.primary} strokeWidth={2} />
                {unreadNotificationsCount > 0 && (
                  <PulsingDot size={8} style={styles.notifBadge} />
                )}
              </View>
            }
            title="Notifications"
            subtitle={unreadNotificationsCount > 0 ? `${unreadNotificationsCount} unread` : 'Activity, alerts, payouts'}
            onPress={() => router.push('/(profile)/notifications')}
            accessibilityHint="Opens your notification feed"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<Bookmark size={20} color={colors.primary} strokeWidth={2} />}
            title="Saved searches"
            subtitle="Quick-jump to filters you use"
            onPress={() => router.push('/(profile)/saved-searches')}
            accessibilityHint="Opens your saved search filters"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<Shield size={20} color={colors.primary} strokeWidth={2} />}
            title="Account & Privacy"
            subtitle="Password, email, data"
            onPress={() => router.push('/(profile)/account')}
            accessibilityHint="Opens account and privacy settings"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<Settings size={20} color={colors.primary} strokeWidth={2} />}
            title="Preferences"
            subtitle="Theme, notifications"
            onPress={() => router.push('/(profile)/preferences')}
            accessibilityHint="Opens theme and notification preferences"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<HelpCircle size={20} color={colors.primary} strokeWidth={2} />}
            title="Help & Support"
            subtitle="FAQ, contact us"
            onPress={() => router.push('/(profile)/support')}
            accessibilityHint="Opens help and support options"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<Info size={20} color={colors.primary} strokeWidth={2} />}
            title="About"
            subtitle="Version, legal, links"
            onPress={() => router.push('/(profile)/about')}
            accessibilityHint="Opens app version and legal information"
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<LogOut size={20} color={colors.error} strokeWidth={2} />}
            title="Log Out"
            onPress={handleLogout}
            destructive
            accessibilityHint="Signs you out of your account"
          />
        </Card>
      </Animated.View>

      <Text style={[styles.version, { color: colors.textTertiary }]}>
        Surve v1.0.0
      </Text>
    </ScrollView>
  );
}

function StripeConnectCard({
  creatorData,
  onPress,
}: {
  creatorData: import('../../types').Creator;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const connected = creatorData.stripe_onboarding_complete === true;
  const started = Boolean(creatorData.stripe_account_id) && !connected;

  const tone = connected
    ? { bg: colors.completedLight, fg: colors.completed }
    : started
      ? { bg: colors.pendingLight, fg: colors.pending }
      : { bg: colors.errorLight, fg: colors.error };

  const title = connected
    ? 'Payouts set up'
    : started
      ? 'Finish Stripe verification'
      : 'Set up payouts';
  const body = connected
    ? 'Stripe Connect is active — payouts land in your bank after each completed booking.'
    : started
      ? 'Stripe needs a couple more details before it can send you money.'
      : "Before you can get paid, connect your bank through Stripe. Takes about 2 minutes.";

  return (
    <PressableScale onPress={connected ? undefined : onPress} disabled={connected} accessibilityRole="button" accessibilityLabel={title}>
      <Card style={styles.statsCard}>
        <View style={styles.stripeRow}>
          <View style={[styles.stripeIcon, { backgroundColor: tone.bg }]}>
            <CreditCard size={20} color={tone.fg} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stripeTitle, { color: colors.text }]}>
              {title}
            </Text>
            <Text
              style={[styles.stripeBody, { color: colors.textSecondary }]}
            >
              {body}
            </Text>
          </View>
          {!connected && (
            <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
          )}
        </View>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  profileName: {
    ...Typography.title1,
    marginTop: Spacing.lg,
  },
  profileHandle: {
    ...Typography.subheadline,
    fontWeight: '600',
    marginTop: 2,
  },
  profileBio: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    lineHeight: 22,
  },
  editProfileBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  editProfileText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  roleBadgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  locationText: {
    ...Typography.subheadline,
  },
  statsCard: {
    marginBottom: Spacing.lg,
  },
  stripeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stripeIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripeTitle: {
    ...Typography.headline,
    fontWeight: '700',
  },
  stripeBody: {
    ...Typography.footnote,
    marginTop: 2,
    lineHeight: 18,
  },
  cardTitle: {
    ...Typography.headline,
    marginBottom: Spacing.md,
  },
  platformBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  perfItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  perfValue: {
    ...Typography.title3,
    fontWeight: '700',
  },
  perfLabel: {
    ...Typography.caption2,
  },
  perfDivider: {
    width: 1,
    height: 32,
  },
  bioText: {
    ...Typography.subheadline,
    marginBottom: Spacing.sm,
  },
  portfolioScroll: {
    gap: Spacing.sm,
  },
  portfolioImage: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
    resizeMode: 'cover',
  },
  settingsCard: {
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsInfo: {
    flex: 1,
  },
  settingsTitle: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  settingsSubtitle: {
    ...Typography.caption1,
    marginTop: Spacing.xxs,
  },
  settingsSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  version: {
    ...Typography.caption1,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  errorTitle: {
    ...Typography.title3,
    marginBottom: Spacing.sm,
  },
  errorSubtitle: {
    ...Typography.subheadline,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  retryText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
});
