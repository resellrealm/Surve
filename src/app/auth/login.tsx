import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { toast } from '../../lib/toast';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Typography, Spacing, Fonts } from '../../constants/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { signIn, loginAsDemo } = useStore();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const clearFieldError = useCallback((field: 'email' | 'password') => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleLogin = useCallback(async () => {
    const newErrors: typeof errors = {};

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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeTrigger((n) => n + 1);
      haptics.error();
      return;
    }

    setErrors({});
    setLoading(true);
    haptics.confirm();

    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (!result.ok) {
      toast.error('Login Failed: Invalid email or password. Please try again.');
      return;
    }
    if (result.mfaRequired) {
      router.replace({
        pathname: '/auth/two-factor-challenge',
        params: { factorId: result.factorId },
      });
      return;
    }
    router.replace('/(tabs)');
  }, [haptics, signIn, router, email, password]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.brand, { color: colors.primary }]}>
            Surve
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
            placeholder="Enter your password"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            error={errors.password}
            shakeTrigger={errors.password ? shakeTrigger : 0}
            icon={<Lock size={20} color={colors.textTertiary} strokeWidth={2} />}
          />

          <PressableScale
            onPress={() => {
              haptics.tap();
              router.push('/auth/forgot-password');
            }}
            style={styles.forgotRow}
            scaleValue={0.95}
            accessibilityRole="link"
            accessibilityLabel="Forgot password?"
            accessibilityHint="Double tap to reset your password"
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>
              Forgot password?
            </Text>
          </PressableScale>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            fullWidth
            icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2} />}
          />

          <PressableScale
            onPress={() => {
              haptics.tap();
              loginAsDemo('creator');
              router.replace('/(tabs)');
            }}
            style={[styles.demoBtn, { borderColor: colors.border }]}
            scaleValue={0.96}
            accessibilityRole="button"
            accessibilityLabel="Explore as demo creator"
            accessibilityHint="Browse the app with sample data without signing in"
          >
            <Sparkles size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.demoText, { color: colors.primary }]}>
              Explore as demo creator
            </Text>
          </PressableScale>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(600).delay(700)}
          style={styles.bottomRow}
        >
          <Text style={[styles.bottomText, { color: colors.textSecondary }]}>
            Don't have an account?
          </Text>
          <PressableScale onPress={() => { haptics.tap(); router.push('/auth/signup'); }} scaleValue={0.95} accessibilityRole="link" accessibilityLabel="Sign Up" accessibilityHint="Double tap to create a new account">
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Sign Up
            </Text>
          </PressableScale>
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
    fontFamily: Fonts.extrabold,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.2,
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
  demoBtn: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  demoText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.xs,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
  },
  forgotText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
});
