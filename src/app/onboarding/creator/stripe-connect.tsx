import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowRight, CreditCard, Shield, DollarSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../hooks/useTheme';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import { Typography, Spacing, BorderRadius } from '../../../constants/theme';

const TOTAL_STEPS = 7;

const BENEFITS = [
  {
    icon: DollarSign,
    title: 'Get paid directly',
    description: 'Receive payouts straight to your bank account',
  },
  {
    icon: Shield,
    title: 'Secure payments',
    description: 'Industry-standard encryption protects your data',
  },
  {
    icon: CreditCard,
    title: 'Instant transfers',
    description: 'Fast payouts after content is approved',
  },
];

export default function CreatorStripeConnectScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSetupStripe = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Launch Stripe Connect onboarding flow when credentials are configured
    router.push('/onboarding/creator/review' as any);
  }, [router]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/onboarding/creator/review' as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Payouts" />
      <ProgressBar currentStep={6} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.title, { color: colors.text }]}>Set up payouts</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Connect your Stripe account to receive payments for your work
          </Text>
        </Animated.View>

        {BENEFITS.map((benefit, i) => (
          <Animated.View
            key={benefit.title}
            entering={FadeInDown.duration(400).delay(200 + i * 80)}
          >
            <View style={[styles.benefitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
                <benefit.icon size={20} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.benefitText}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>{benefit.title}</Text>
                <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                  {benefit.description}
                </Text>
              </View>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          title="Connect Stripe"
          onPress={handleSetupStripe}
          size="lg"
          fullWidth
          icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2} />}
        />
        <Pressable onPress={handleSkip} style={styles.skipWrap}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Set up later</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  title: { ...Typography.title1, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, marginBottom: Spacing.xxl },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { flex: 1 },
  benefitTitle: { ...Typography.headline, marginBottom: Spacing.xxs },
  benefitDesc: { ...Typography.subheadline },
  footer: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  skipWrap: { alignItems: 'center', marginTop: Spacing.md },
  skipText: { ...Typography.subheadline },
});
