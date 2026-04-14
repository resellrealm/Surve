import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { PlatformBadge } from '../../components/creator/PlatformBadge';
import { StatsRow } from '../../components/creator/StatsRow';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import * as api from '../../lib/api';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Springs,
  Layout,
} from '../../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
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
}: SettingsRowProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, Springs.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, Springs.bouncy);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.settingsRow, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
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
    </AnimatedPressable>
  );
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useStore();

  const isCreator = user?.role === 'creator';
  const [creatorData, setCreatorData] = React.useState<import('../../types').Creator | null>(null);
  const [businessData, setBusinessData] = React.useState<import('../../types').Business | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [profileError, setProfileError] = React.useState<string | null>(null);

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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    logout();
    router.replace('/auth');
  }, [logout, router]);

  if (profileLoading && !creatorData && !businessData) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.sm + Spacing.xl },
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
          <Pressable
            onPress={handleRetry}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading profile"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>Try Again</Text>
          </Pressable>
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
          paddingTop: insets.top + Spacing.sm,
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
        <Avatar
          uri={user?.avatar_url ?? null}
          name={user?.full_name ?? 'User'}
          size={80}
        />
        <Text style={[styles.profileName, { color: colors.text }]}>
          {user?.full_name}
        </Text>
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
        {(isCreator ? creatorData?.location : businessData?.location) && (
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {isCreator ? creatorData?.location : businessData?.location}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Creator-specific section */}
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
                <Image
                  key={idx}
                  source={{ uri: url }}
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
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<CreditCard size={20} color={colors.primary} strokeWidth={2} />}
            title="Payment methods"
            subtitle="Cards, Apple Pay, bank"
            onPress={() => router.push('/(payment)/methods')}
          />
        </Card>
      </Animated.View>

      {/* Settings */}
      <Animated.View entering={FadeInDown.duration(500).delay(420)}>
        <Card style={styles.settingsCard} padding={0}>
          <SettingsRow
            icon={<Bell size={20} color={colors.primary} strokeWidth={2} />}
            title="Notifications"
            subtitle="Activity, alerts, payouts"
            onPress={() => router.push('/(profile)/notifications')}
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<Shield size={20} color={colors.primary} strokeWidth={2} />}
            title="Account & Privacy"
            subtitle="Password, email, data"
            onPress={() => router.push('/(profile)/account')}
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<Settings size={20} color={colors.primary} strokeWidth={2} />}
            title="Preferences"
            subtitle="Theme, notifications"
            onPress={() => router.push('/(profile)/preferences')}
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<HelpCircle size={20} color={colors.primary} strokeWidth={2} />}
            title="Help & Support"
            subtitle="FAQ, contact us"
            onPress={() => Alert.alert('Help & Support', 'Contact us at support@surve.app')}
          />
          <View style={[styles.settingsSeparator, { backgroundColor: colors.borderLight }]} />
          <SettingsRow
            icon={<LogOut size={20} color={colors.error} strokeWidth={2} />}
            title="Log Out"
            onPress={handleLogout}
            destructive
          />
        </Card>
      </Animated.View>

      <Text style={[styles.version, { color: colors.textTertiary }]}>
        Surve v1.0.0
      </Text>
    </ScrollView>
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
});
