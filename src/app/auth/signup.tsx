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
import { ChevronLeft, AlertCircle, UserCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function SignUpScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSignUp = async () => {
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
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
            <Text style={[styles.title, { color: isDark ? colors.text : '#111827' }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
              Start creating surveys today
            </Text>
          </Animated.View>

          {/* Error */}
          {error && (
            <Animated.View entering={FadeInDown.duration(400)} style={[styles.errorContainer, { backgroundColor: colors.errorLight }]}>
              <AlertCircle size={18} color="#DC2626" strokeWidth={2} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          {/* Form */}
          <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? colors.textSecondary : '#374151' }]}>Full Name</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <UserCircle size={20} color={placeholderColor} strokeWidth={1.8} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: inputText }]}
                  placeholder="John Appleseed"
                  placeholderTextColor={placeholderColor}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoComplete="name"
                />
              </View>
            </View>

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
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={placeholderColor}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  {showPassword ? (
                    <EyeOff size={20} color={placeholderColor} strokeWidth={1.8} />
                  ) : (
                    <Eye size={20} color={placeholderColor} strokeWidth={1.8} />
                  )}
                </Pressable>
              </View>
              {password.length > 0 && password.length < 8 && (
                <Text style={styles.hintText}>
                  {8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Sign Up Button */}
          <Animated.View entering={FadeInDown.duration(600).delay(400).springify()}>
            <Pressable
              onPress={handleSignUp}
              disabled={loading}
              style={({ pressed }) => [
                styles.signUpButton,
                {
                  opacity: loading ? 0.7 : pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.signUpButtonText}>Create Account</Text>
              )}
            </Pressable>
          </Animated.View>

          {/* Terms */}
          <Animated.Text
            entering={FadeInDown.duration(600).delay(500)}
            style={[styles.termsText, { color: isDark ? colors.textSecondary : '#9CA3AF' }]}
          >
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </Animated.Text>
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
  hintText: {
    color: '#F59E0B',
    fontSize: Typography.caption2.fontSize,
    marginLeft: 4,
    fontWeight: '500',
  },
  signUpButton: {
    backgroundColor: '#475569',
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
  termsText: {
    fontSize: Typography.caption2.fontSize,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 18,
  },
});
