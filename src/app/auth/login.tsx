import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Typography, Spacing } from '../../constants/theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { signIn, loginAsDemo } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    haptics.medium();

    const success = await signIn(email.trim(), password);
    setLoading(false);

    if (success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
    }
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

          <Pressable
            onPress={() => {
              haptics.medium();
              loginAsDemo('creator');
              router.replace('/(tabs)');
            }}
            style={[styles.demoBtn, { borderColor: colors.border }]}
          >
            <Sparkles size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.demoText, { color: colors.primary }]}>
              Explore as demo creator
            </Text>
          </Pressable>
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
});
