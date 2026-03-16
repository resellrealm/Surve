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
  const { session, user, surveys } = useStore();

  const [darkMode, setDarkMode] = useState(isDark);
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
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#F9FAFB' }]}
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
            <ChevronLeft size={24} color={isDark ? colors.text : '#111827'} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: isDark ? colors.text : '#111827' }]}>
            Profile
          </Text>
          <Pressable
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            style={styles.headerButton}
          >
            <Settings size={22} color={isDark ? colors.text : '#111827'} strokeWidth={1.8} />
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
              <View style={[styles.avatarInner, { backgroundColor: isDark ? colors.background : '#F9FAFB' }]}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <Text style={[styles.userName, { color: isDark ? colors.text : '#111827' }]}>
            {fullName}
          </Text>

          {/* Level badge */}
          <View style={[styles.levelBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Award size={14} color="#475569" strokeWidth={2.5} />
            <Text style={styles.levelText}>Survey Pro</Text>
          </View>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.duration(400).delay(80).springify()}>
          <GlassCard delay={0} style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: isDark ? colors.text : '#111827' }]}>
                  {surveysCreated}
                </Text>
                <Text style={[styles.statLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
                  Created
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: isDark ? colors.text : '#111827' }]}>
                  0
                </Text>
                <Text style={[styles.statLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
                  Responses
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
              <View style={styles.statItem}>
                <View style={styles.streakRow}>
                  <Flame size={16} color="#F59E0B" strokeWidth={2.5} />
                  <Text style={[styles.statValue, { color: isDark ? colors.text : '#111827' }]}>
                    0
                  </Text>
                </View>
                <Text style={[styles.statLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
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
            style={[styles.sectionTitle, { color: isDark ? colors.textSecondary : '#6B7280' }]}
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
                  setDarkMode(v);
                }}
                trackColor={{ false: '#D1D5DB', true: '#94A3B8' }}
                thumbColor={darkMode ? '#475569' : '#F9FAFB'}
              />
            }
          />
          <View style={[styles.separator, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} />
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
                trackColor={{ false: '#D1D5DB', true: '#94A3B8' }}
                thumbColor={notifications ? '#475569' : '#F9FAFB'}
              />
            }
          />
        </GlassCard>

        {/* Support Card */}
        <View style={styles.sectionHeader}>
          <Animated.Text
            entering={FadeInDown.duration(400).delay(280)}
            style={[styles.sectionTitle, { color: isDark ? colors.textSecondary : '#6B7280' }]}
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
          <View style={[styles.separator, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} />
          <SettingItem
            icon={<FileText size={20} color="#475569" strokeWidth={2} />}
            label="Terms of Service"
            isDark={isDark}
            colors={colors}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
          <View style={[styles.separator, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} />
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
            <View style={[styles.iconCircle, { backgroundColor: isDark ? '#2D1515' : '#FEF2F2' }]}>
              <LogOut size={20} color="#EF4444" strokeWidth={2} />
            </View>
            <Text style={styles.signOutText}>Sign Out</Text>
          </View>
        </GlassCard>

        {/* Version */}
        <Animated.Text
          entering={FadeInDown.duration(400).delay(480)}
          style={[styles.versionText, { color: isDark ? colors.textSecondary : '#9CA3AF' }]}
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
        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          {icon}
        </View>
        <Text style={[styles.settingLabel, { color: isDark ? colors.text : '#111827' }]}>
          {label}
        </Text>
      </View>
      {rightElement || (
        onPress && (
          <ChevronRight
            size={18}
            color={isDark ? colors.textSecondary : '#9CA3AF'}
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
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
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
