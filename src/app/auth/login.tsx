import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  useColorScheme,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleLogin = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const inputBg = isDark ? '#1F2937' : '#F9FAFB';
  const inputBorder = isDark ? '#374151' : '#E5E7EB';
  const inputText = isDark ? colors.text : '#111827';
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Animated.View entering={FadeInUp.duration(500)}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color={isDark ? colors.text : '#374151'} strokeWidth={2} />
            </Pressable>
          </Animated.View>

          {/* Header */}
          <Animated.View entering={FadeInUp.duration(600).delay(100).springify()} style={styles.header}>
            <Text style={[styles.title, { color: isDark ? colors.text : '#111827' }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
              Sign in to your account
            </Text>
          </Animated.View>

          {/* Error */}
          {error && (
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={[styles.errorContainer, { backgroundColor: colors.errorLight }]}
            >
              <AlertCircle size={18} color="#DC2626" strokeWidth={2} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          {/* Form */}
          <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? colors.textSecondary : '#374151' }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Mail size={20} color={placeholderColor} strokeWidth={1.8} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: inputText }]}
                  placeholder="you@example.com"
                  placeholderTextColor={placeholderColor}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? colors.textSecondary : '#374151' }]}>Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Lock size={20} color={placeholderColor} strokeWidth={1.8} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: inputText, flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={placeholderColor}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  {showPassword ? (
                    <EyeOff size={20} color={placeholderColor} strokeWidth={1.8} />
                  ) : (
                    <Eye size={20} color={placeholderColor} strokeWidth={1.8} />
                  )}
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </Animated.View>

          {/* Login Button */}
          <Animated.View entering={FadeInDown.duration(600).delay(400).springify()}>
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.loginButton,
                {
                  opacity: loading ? 0.7 : pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -Spacing.sm,
  },
  header: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.body.fontSize,
    marginTop: Spacing.xs,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    color: '#DC2626',
    fontSize: Typography.footnote.fontSize,
    fontWeight: '500',
    flex: 1,
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: Typography.footnote.fontSize,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    height: 52,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    height: '100%',
  },
  eyeButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  forgotButton: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: '#475569',
    fontSize: Typography.footnote.fontSize,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#475569',
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
});
