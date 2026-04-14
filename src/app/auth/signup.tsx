import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Mail, Lock, User, ArrowRight, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Typography, Spacing } from '../../constants/theme';

export default function SignupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSignup = useCallback(() => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Error', 'You must accept the Terms of Service and confirm you are 18+.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Navigate to onboarding where role will be selected and account created
    setLoading(false);
    router.push({
      pathname: '/auth/onboarding',
      params: {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      },
    });
  }, [router, fullName, email, password, confirmPassword, termsAccepted]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Create Account" onBack={handleBack} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Spacing.xl, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.title, { color: colors.text }]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join thousands of creators and businesses
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(600).delay(300)}
          style={styles.form}
        >
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            autoCapitalize="words"
            icon={<User size={20} color={colors.textTertiary} strokeWidth={2} />}
          />
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
            placeholder="Create a password"
            secureTextEntry
            icon={<Lock size={20} color={colors.textTertiary} strokeWidth={2} />}
          />
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
            icon={<Lock size={20} color={colors.textTertiary} strokeWidth={2} />}
          />

          <Pressable
            style={styles.termsRow}
            onPress={() => setTermsAccepted((v) => !v)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: termsAccepted ? colors.primary : colors.border,
                  backgroundColor: termsAccepted ? colors.primary : 'transparent',
                },
              ]}
            >
              {termsAccepted && <Check size={14} color={colors.onPrimary} strokeWidth={3} />}
            </View>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              I am 18+ and agree to the{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                Privacy Policy
              </Text>
            </Text>
          </Pressable>

          <Button
            title="Continue"
            onPress={handleSignup}
            loading={loading}
            disabled={!termsAccepted}
            size="lg"
            fullWidth
            icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2} />}
          />
        </Animated.View>

        <View style={styles.bottomRow}>
          <Text style={[styles.bottomText, { color: colors.textSecondary }]}>
            Already have an account?
          </Text>
          <Pressable onPress={handleBack}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Sign In
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    ...Typography.largeTitle,
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxxl,
  },
  form: {
    gap: Spacing.xs,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsText: {
    ...Typography.subheadline,
    flex: 1,
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xxxl,
  },
  bottomText: {
    ...Typography.subheadline,
  },
  linkText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
});
