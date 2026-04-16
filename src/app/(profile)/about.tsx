import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Constants from 'expo-constants';
import { ChevronRight, Globe, Mail, Twitter } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PressableScale } from '../../components/ui/PressableScale';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Fonts,
} from '../../constants/theme';

const LEGAL_LINKS: { label: string; path: string }[] = [
  { label: 'Terms of Service', path: '/legal/terms' },
  { label: 'Privacy Policy', path: '/legal/privacy' },
  { label: 'Community Guidelines', path: '/legal/community' },
  { label: 'Refund & Dispute Policy', path: '/legal/disputes' },
  { label: 'Creator Agreement', path: '/legal/creator-terms' },
  { label: 'Business Agreement', path: '/legal/business-terms' },
];

const SOCIAL_LINKS: { label: string; url: string; Icon: typeof Globe }[] = [
  { label: 'surve.app', url: 'https://surve.app', Icon: Globe },
  { label: 'hello@surve.app', url: 'mailto:hello@surve.app', Icon: Mail },
  { label: '@surveapp', url: 'https://twitter.com/surveapp', Icon: Twitter },
];

export default function AboutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    '1';

  const go = useCallback(
    (path: string) => {
      haptics.tap();
      router.push(path as never);
    },
    [haptics, router]
  );

  const openUrl = useCallback(
    async (url: string) => {
      haptics.tap();
      await Linking.openURL(url);
    },
    [haptics]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="About" />

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.huge,
          gap: Spacing.xl,
        }}
      >
        {/* Brand block */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.brandBlock}>
          <Image
            source={require('../../../assets/icon-nobg.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Surve app logo"
          />
          <Text style={[styles.brand, { color: colors.text }]} accessibilityRole="header">Surve</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Where creators meet hospitality.
          </Text>
          <View style={styles.versionRow}>
            <Text style={[styles.versionText, { color: colors.textTertiary }]}>
              Version {version}
            </Text>
            <View
              style={[styles.versionDot, { backgroundColor: colors.textTertiary }]}
            />
            <Text style={[styles.versionText, { color: colors.textTertiary }]}>
              Build {build}
            </Text>
          </View>
        </Animated.View>

        {/* Legal */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            LEGAL
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            {LEGAL_LINKS.map((link, i) => (
              <React.Fragment key={link.path}>
                <PressableScale onPress={() => go(link.path)} style={styles.row} accessibilityRole="link" accessibilityLabel={link.label}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>
                    {link.label}
                  </Text>
                  <ChevronRight
                    size={18}
                    color={colors.textTertiary}
                    strokeWidth={2}
                  />
                </PressableScale>
                {i < LEGAL_LINKS.length - 1 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: colors.borderLight },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        {/* Links */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            REACH US
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            {SOCIAL_LINKS.map((s, i) => (
              <React.Fragment key={s.url}>
                <PressableScale onPress={() => openUrl(s.url)} style={styles.row} accessibilityRole="link" accessibilityLabel={s.label}>
                  <View
                    style={[
                      styles.socialIcon,
                      { backgroundColor: colors.surfaceSecondary },
                    ]}
                  >
                    <s.Icon size={16} color={colors.text} strokeWidth={2} />
                  </View>
                  <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>
                    {s.label}
                  </Text>
                  <ChevronRight
                    size={18}
                    color={colors.textTertiary}
                    strokeWidth={2}
                  />
                </PressableScale>
                {i < SOCIAL_LINKS.length - 1 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: colors.borderLight },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          © {new Date().getFullYear()} Surve, Inc. Made with care.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  logo: { width: 96, height: 96, marginBottom: Spacing.md },
  brand: {
    fontFamily: Fonts.extrabold,
    fontSize: 36,
    letterSpacing: -1,
  },
  tagline: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  versionText: { ...Typography.caption1 },
  versionDot: { width: 3, height: 3, borderRadius: 2 },
  sectionLabel: {
    ...Typography.caption2,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  rowLabel: { ...Typography.subheadline, fontWeight: '500', flex: 1 },
  socialIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md,
  },
  footer: {
    ...Typography.caption1,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
