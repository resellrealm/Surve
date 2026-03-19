import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { mockCreatorSession, mockBusinessSession } from '../../lib/mockData';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Typography, Spacing, Layout } from '../../constants/theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { login } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(() => {
    setLoading(true);
    haptics.medium();

    // Mock login - simulate network delay
    setTimeout(() => {
      // Default to creator role for demo
      login(mockCreatorSession);
      setLoading(false);
      router.replace('/(tabs)');
    }, 800);
  }, [haptics, login, router]);

  const handleDemoCreator = useCallback(() => {
    haptics.light();
    login(mockCreatorSession);
    router.replace('/(tabs)');
  }, [haptics, login, router]);

  const handleDemoBusiness = useCallback(() => {
    haptics.light();
    login(mockBusinessSession);
    router.replace('/(tabs)');
  }, [haptics, login, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.brand, { color: colors.primary }]}>
            CreatorLink
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Connect. Create. Collaborate.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(600).delay(300)}
          style={styles.form}
        >
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Mail size={20} color={colors.textTertiary} strokeWidth={2} />}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            icon={<Lock size={20} color={colors.textTertiary} strokeWidth={2} />}
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            fullWidth
            icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2} />}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(600).delay(500)}
          style={styles.demoSection}
        >
          <Text style={[styles.demoLabel, { color: colors.textTertiary }]}>
            Quick Demo Access
          </Text>
          <View style={styles.demoButtons}>
            <Button
              title="Demo as Creator"
              onPress={handleDemoCreator}
              variant="outline"
              size="md"
              style={styles.demoButton}
            />
            <Button
              title="Demo as Business"
              onPress={handleDemoBusiness}
              variant="secondary"
              size="md"
              style={styles.demoButton}
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(600).delay(700)}
          style={styles.bottomRow}
        >
          <Text style={[styles.bottomText, { color: colors.textSecondary }]}>
            Don't have an account?
          </Text>
          <Pressable onPress={() => { haptics.light(); router.push('/auth/signup'); }}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Sign Up
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
  },
  brand: {
    ...Typography.largeTitle,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    ...Typography.title3,
    fontWeight: '400',
    marginTop: Spacing.sm,
    marginBottom: Spacing.huge,
  },
  form: {
    gap: Spacing.xs,
  },
  demoSection: {
    marginTop: Spacing.xxxl,
    alignItems: 'center',
  },
  demoLabel: {
    ...Typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  demoButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  demoButton: {
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 'auto',
    marginBottom: Spacing.xxxl,
  },
  bottomText: {
    ...Typography.subheadline,
  },
  linkText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
});
