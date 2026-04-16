import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowRight, CreditCard, Shield, DollarSign } from 'lucide-react-native';
import { getStripeConnectLink } from '../../../lib/api';
import { useHaptics } from '../../../hooks/useHaptics';
import { toast } from '../../../lib/toast';
import { useTheme } from '../../../hooks/useTheme';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { PressableScale } from '../../../components/ui/PressableScale';
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
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [busy, setBusy] = useState(false);

  const handleSetupStripe = useCallback(async () => {
    haptics.confirm();
    setBusy(true);
    const url = await getStripeConnectLink();
    setBusy(false);
    if (!url) {
      toast.error("Stripe unavailable: We couldn't start Stripe onboarding right now. You can skip this step and set up payouts later from your profile.");
      return;
    }
    try {
      await Linking.openURL(url);
      // When the user returns, they continue on review. In production, the
      // create-connect-link edge function sets a `return_url` that brings them
      // back into the app via deep link.
      router.push('/onboarding/creator/review' as any);
    } catch {
      toast.error('Could not open Stripe. Try again in a moment.');
    }
  }, [router]);

  const handleSkip = useCallback(() => {
    haptics.tap();
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
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Set up payouts</Text>
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
        <PressableScale onPress={handleSkip} style={styles.skipWrap} scaleValue={0.95} accessibilityRole="button" accessibilityLabel="Set up later" accessibilityHint="Double tap to skip Stripe setup and continue">
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Set up later</Text>
        </PressableScale>
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
