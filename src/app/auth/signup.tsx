import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Mail, Lock, User, ArrowRight, Check } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Typography, Spacing } from '../../constants/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

export default function SignupScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const clearFieldError = useCallback((field: keyof FormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSignup = useCallback(() => {
    const newErrors: FormErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!EMAIL_RE.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!termsAccepted) {
      newErrors.terms = 'You must accept the Terms of Service and confirm you are 18+';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeTrigger((n) => n + 1);
      haptics.error();
      return;
    }

    setErrors({});
    setLoading(true);
    haptics.confirm();

    setLoading(false);
    router.push({
      pathname: '/auth/onboarding',
      params: {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      },
    });
  }, [router, fullName, email, password, confirmPassword, termsAccepted, haptics]);

  const handleBack = useCallback(() => {
    haptics.tap();
    router.back();
  }, [router, haptics]);

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
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
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
            onChangeText={(v) => { setFullName(v); clearFieldError('fullName'); }}
            placeholder="Your full name"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            error={errors.fullName}
            shakeTrigger={errors.fullName ? shakeTrigger : 0}
            icon={<User size={20} color={colors.textTertiary} strokeWidth={2} />}
          />
          <Input
            ref={emailRef}
            label="Email"
            value={email}
            onChangeText={(v) => { setEmail(v); clearFieldError('email'); }}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={errors.email}
            shakeTrigger={errors.email ? shakeTrigger : 0}
            icon={<Mail size={20} color={colors.textTertiary} strokeWidth={2} />}
          />
          <Input
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); clearFieldError('password'); }}
            placeholder="Min. 8 characters"
            secureTextEntry
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            error={errors.password}
            shakeTrigger={errors.password ? shakeTrigger : 0}
            icon={<Lock size={20} color={colors.textTertiary} strokeWidth={2} />}
          />
          <Input
            ref={confirmRef}
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); clearFieldError('confirmPassword'); }}
            placeholder="Confirm your password"
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleSignup}
            error={errors.confirmPassword}
            shakeTrigger={errors.confirmPassword ? shakeTrigger : 0}
            icon={<Lock size={20} color={colors.textTertiary} strokeWidth={2} />}
          />

          <PressableScale
            style={styles.termsRow}
            onPress={() => {
              haptics.tap();
              setTermsAccepted((v) => !v);
              clearFieldError('terms');
            }}
            accessibilityRole="checkbox"
            accessibilityLabel="I am 18+ and agree to the Terms of Service and Privacy Policy"
            accessibilityState={{ checked: termsAccepted }}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: errors.terms ? colors.error : termsAccepted ? colors.primary : colors.border,
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
          </PressableScale>
          {errors.terms && (
            <Text style={[styles.termsError, { color: colors.error }]}>{errors.terms}</Text>
          )}

          <Button
            title="Continue"
            onPress={handleSignup}
            loading={loading}
            size="lg"
            fullWidth
            icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2} />}
          />
        </Animated.View>

        <View style={styles.bottomRow}>
          <Text style={[styles.bottomText, { color: colors.textSecondary }]}>
            Already have an account?
          </Text>
          <PressableScale onPress={handleBack} scaleValue={0.95} accessibilityRole="link" accessibilityLabel="Sign In" accessibilityHint="Double tap to go back to sign in">
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Sign In
            </Text>
          </PressableScale>
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
    marginBottom: Spacing.xs,
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
  termsError: {
    ...Typography.caption1,
    marginBottom: Spacing.sm,
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
