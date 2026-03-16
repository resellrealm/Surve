import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Glass } from '../../constants/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';

const AVATAR_SIZE = 104;
const RING_SIZE = AVATAR_SIZE + 8;

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { session, user, surveys, themePreference, setThemePreference } = useStore();

  const darkMode = themePreference === 'dark' || (themePreference === 'system' && isDark);
  const [notifications, setNotifications] = useState(true);

  const userEmail = user?.email || session?.user?.email || '';
  const fullName = user?.full_name || 'User';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const surveysCreated = surveys?.length ?? 0;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await supabase.auth.signOut();
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
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
                  0
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
                    0
                  </Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Streak
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Account Settings Card */}
        <View style={styles.sectionHeader}>
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
                  Haptics.selectionAsync();
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
                value={notifications}
                onValueChange={(v) => {
                  Haptics.selectionAsync();
                  setNotifications(v);
                }}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={notifications ? colors.primary : colors.surface}
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
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
          <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
          <SettingItem
            icon={<FileText size={20} color="#475569" strokeWidth={2} />}
            label="Terms of Service"
            isDark={isDark}
            colors={colors}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
          <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
          <SettingItem
            icon={<Shield size={20} color="#475569" strokeWidth={2} />}
            label="Privacy Policy"
            isDark={isDark}
            colors={colors}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
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
          Surve v1.0.0
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
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.settingRow,
        { opacity: pressed && onPress ? 0.7 : 1 },
      ]}
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
    </Pressable>
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
    backgroundColor: '#475569', // matches Colors.light.primary
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#F1F0EE', // off-white on grey avatar
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
