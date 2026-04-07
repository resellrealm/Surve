import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Switch,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Bell,
  HelpCircle,
  FileText,
  Shield,
  LogOut,
  Flame,
  Award,
  Users,
  History,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Glass, Springs } from '../../constants/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { fetchScores } from '../../lib/sportScores';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AVATAR_SIZE = 104;
const RING_SIZE = AVATAR_SIZE + 8;

function calculateStreak(scores: Array<{ completed_at: string | null; created_at: string }>): number {
  if (scores.length === 0) return 0;

  // Get unique days with activity (using completed_at or created_at)
  const daySet = new Set<string>();
  scores.forEach((s) => {
    const dateStr = s.completed_at ?? s.created_at;
    if (dateStr) {
      const d = new Date(dateStr);
      daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  });

  const days = Array.from(daySet)
    .map((key) => {
      const [y, m, d] = key.split('-').map(Number);
      return new Date(y, m, d);
    })
    .sort((a, b) => b.getTime() - a.getTime());

  if (days.length === 0) return 0;

  // Check from today/yesterday backwards
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mostRecent = new Date(days[0]);
  mostRecent.setHours(0, 0, 0, 0);

  // If most recent activity is not today or yesterday, streak is broken
  if (mostRecent.getTime() < yesterday.getTime()) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    prev.setHours(0, 0, 0, 0);
    const curr = new Date(days[i]);
    curr.setHours(0, 0, 0, 0);
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { session, user, surveys, themePreference, setThemePreference, notificationsEnabled, setNotificationsEnabled, sportScores, setSportScores } = useStore();
  const settingsRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);

  const darkMode = themePreference === 'dark' || (themePreference === 'system' && isDark);
  const [refreshing, setRefreshing] = useState(false);

  // Real data
  const [totalResponses, setTotalResponses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const userEmail = user?.email || session?.user?.email || '';
  const fullName = user?.full_name || 'User';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const surveysCreated = surveys?.length ?? 0;

  const fetchProfileData = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      // Fetch total responses across all surveys
      const { data: surveyData } = await supabase
        .from('surveys')
        .select('responses(count)')
        .eq('user_id', session.user.id);

      if (surveyData) {
        const count = surveyData.reduce((acc: number, s: any) => {
          return acc + (s.responses?.[0]?.count || 0);
        }, 0);
        setTotalResponses(count);
      }

      // Fetch sport scores for streak calculation
      const scores = await fetchScores(session.user.id);
      setSportScores(scores);
      setStreak(calculateStreak(scores));
    } catch (err) {
      console.error('Failed to fetch profile data:', err);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Also recalculate streak when sportScores change
  useEffect(() => {
    setStreak(calculateStreak(sportScores));
  }, [sportScores]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  }, [fetchProfileData]);

  const handleSettingsPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Scroll to the settings section
    scrollRef.current?.scrollTo({ y: 400, animated: true });
  }, []);

  const showInfoAlert = useCallback((title: string, message: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(title, message, [{ text: 'OK' }]);
  }, []);

  const handleSignOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
            return;
          }
          router.replace('/auth');
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header with settings */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerButton}
          >
            <ChevronLeft size={24} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Profile
          </Text>
          <Pressable
            onPress={handleSettingsPress}
            style={styles.headerButton}
          >
            <Settings size={22} color={colors.text} strokeWidth={1.8} />
          </Pressable>
        </Animated.View>

        {/* Avatar with gradient ring */}
        <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.profileSection}>
          <View style={styles.avatarRingOuter}>
            <LinearGradient
              colors={['#475569', '#64748B', '#475569']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={[styles.avatarInner, { backgroundColor: colors.background }]}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>
            {fullName}
          </Text>

          {userEmail ? (
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {userEmail}
            </Text>
          ) : null}

          {/* Level badge */}
          <View style={[styles.levelBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Award size={14} color="#475569" strokeWidth={2.5} />
            <Text style={styles.levelText}>Survey Pro</Text>
          </View>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.duration(400).delay(80).springify()}>
          <GlassCard delay={0} style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {surveysCreated}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Created
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {totalResponses}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Responses
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <View style={styles.streakRow}>
                  <Flame size={16} color="#F59E0B" strokeWidth={2.5} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {streak}
                  </Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Streak
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Social Section */}
        <View style={styles.sectionHeader}>
          <Animated.Text
            entering={FadeInDown.duration(400).delay(120)}
            style={[styles.sectionTitle, { color: colors.textSecondary }]}
          >
            SOCIAL
          </Animated.Text>
        </View>

        <GlassCard delay={140} style={styles.settingsCard}>
          <SettingItem
            icon={<Users size={20} color="#475569" strokeWidth={2} />}
            label="Friends"
            isDark={isDark}
            colors={colors}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/friends');
            }}
          />
          <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
          <SettingItem
            icon={<History size={20} color="#475569" strokeWidth={2} />}
            label="Game History"
            isDark={isDark}
            colors={colors}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/history');
            }}
          />
        </GlassCard>

        {/* Account Settings Card */}
        <View ref={settingsRef} style={styles.sectionHeader}>
          <Animated.Text
            entering={FadeInDown.duration(400).delay(160)}
            style={[styles.sectionTitle, { color: colors.textSecondary }]}
          >
            ACCOUNT
          </Animated.Text>
        </View>

        <GlassCard delay={200} style={styles.settingsCard}>
          <SettingItem
            icon={<Moon size={20} color="#475569" strokeWidth={2} />}
            label="Dark Mode"
            isDark={isDark}
            colors={colors}
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setThemePreference(v ? 'dark' : 'light');
                }}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={darkMode ? colors.primary : colors.surface}
              />
            }
          />
          <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
          <SettingItem
            icon={<Bell size={20} color="#475569" strokeWidth={2} />}
            label="Notifications"
            isDark={isDark}
            colors={colors}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setNotificationsEnabled(v);
                }}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={notificationsEnabled ? colors.primary : colors.surface}
              />
            }
          />
        </GlassCard>

        {/* Support Card */}
        <View style={styles.sectionHeader}>
          <Animated.Text
            entering={FadeInDown.duration(400).delay(280)}
            style={[styles.sectionTitle, { color: colors.textSecondary }]}
          >
            SUPPORT
          </Animated.Text>
        </View>

        <GlassCard delay={320} style={styles.settingsCard}>
          <SettingItem
            icon={<HelpCircle size={20} color="#475569" strokeWidth={2} />}
            label="Help & Support"
            isDark={isDark}
            colors={colors}
            onPress={() =>
              showInfoAlert(
                'Help & Support',
                'Need help with Point!?\n\nEmail us at support@pointapp.io\n\nWe typically respond within 24 hours. You can also check our FAQ section on pointapp.io/help for quick answers to common questions.',
              )
            }
          />
          <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
          <SettingItem
            icon={<FileText size={20} color="#475569" strokeWidth={2} />}
            label="Terms of Service"
            isDark={isDark}
            colors={colors}
            onPress={() =>
              showInfoAlert(
                'Terms of Service',
                'By using Point!, you agree to our Terms of Service.\n\nKey points:\n- You retain ownership of your survey data\n- We do not sell your personal information\n- You must be 13+ to use this app\n- Misuse of the platform may result in account suspension\n\nFull terms available at pointapp.io/terms',
              )
            }
          />
          <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
          <SettingItem
            icon={<Shield size={20} color="#475569" strokeWidth={2} />}
            label="Privacy Policy"
            isDark={isDark}
            colors={colors}
            onPress={() =>
              showInfoAlert(
                'Privacy Policy',
                'Your privacy matters to us.\n\nWhat we collect:\n- Account info (email, name)\n- Survey data you create\n- Anonymous usage analytics\n\nWhat we never do:\n- Sell your data to third parties\n- Share respondent data with advertisers\n- Track you across other apps\n\nFull policy at pointapp.io/privacy',
              )
            }
          />
        </GlassCard>

        {/* Sign Out Card */}
        <GlassCard
          delay={400}
          onPress={handleSignOut}
          style={styles.signOutCard}
        >
          <View style={styles.signOutInner}>
            <View style={[styles.iconCircle, { backgroundColor: colors.errorLight }]}>
              <LogOut size={20} color="#EF4444" strokeWidth={2} />
            </View>
            <Text style={styles.signOutText}>Sign Out</Text>
          </View>
        </GlassCard>

        {/* Version */}
        <Animated.Text
          entering={FadeInDown.duration(400).delay(480)}
          style={[styles.versionText, { color: colors.textTertiary }]}
        >
          Point! v1.0.0
        </Animated.Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Inline setting item component
function SettingItem({
  icon,
  label,
  rightElement,
  onPress,
  isDark,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  isDark: boolean;
  colors: typeof Colors.light | typeof Colors.dark;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (onPress) scale.value = withSpring(0.97, Springs.snappy);
      }}
      onPressOut={() => {
        if (onPress) scale.value = withSpring(1, Springs.snappy);
      }}
      disabled={!onPress && !rightElement}
      style={[styles.settingRow, animatedStyle]}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSecondary }]}>
          {icon}
        </View>
        <Text style={[styles.settingLabel, { color: colors.text }]}>
          {label}
        </Text>
      </View>
      {rightElement || (
        onPress && (
          <ChevronRight
            size={18}
            color={colors.textTertiary}
            strokeWidth={2}
          />
        )
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarRingOuter: {
    marginBottom: 12,
  },
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: RING_SIZE - 4,
    height: RING_SIZE - 4,
    borderRadius: (RING_SIZE - 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#F1F0EE',
    fontSize: 36,
    fontWeight: '700',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  levelText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  statsCard: {
    paddingVertical: 14,
    paddingHorizontal: 0,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  settingsCard: {
    padding: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginLeft: 62,
  },
  signOutCard: {
    marginTop: 20,
    padding: 0,
  },
  signOutInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
});
