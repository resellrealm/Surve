import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = isDark ? Colors.dark : Colors.light;

  const handleSignUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/auth/signup');
  };

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]}>
      <View style={styles.content}>
        {/* Logo Area */}
        <Animated.View entering={FadeInUp.duration(800).springify()} style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>P</Text>
          </View>
          <Text style={[styles.logoText, { color: colors.primary }]}>Point!</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text
          entering={FadeInUp.duration(800).delay(200).springify()}
          style={[styles.tagline, { color: isDark ? colors.textSecondary : '#6B7280' }]}
        >
          Create beautiful surveys{'\n'}in seconds
        </Animated.Text>

        {/* Decorative dots */}
        <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.dotsRow}>
          {[Colors.light.primary, '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0'].map((color, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: color }]} />
          ))}
        </Animated.View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Animated.View entering={FadeInDown.duration(600).delay(500).springify()}>
          <Pressable
            onPress={handleSignUp}
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Text style={styles.primaryButtonText}>Sign Up</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(650).springify()}>
          <Pressable
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: isDark ? colors.border : '#E5E7EB',
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: isDark ? colors.text : '#374151' }]}>
              I already have an account
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  logoIcon: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: Typography.title3.fontSize,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: '#475569',
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
});
