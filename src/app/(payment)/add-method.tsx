import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsOffline } from '../../hooks/useIsOffline';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CardField, useConfirmSetupIntent, type CardFieldInput } from '@stripe/stripe-react-native';
import { CreditCard, Lock, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ModalHeader } from '../../components/ui/ModalHeader';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { createSetupIntent, addPaymentMethod } from '../../lib/api';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

const SUPPORTED_BRANDS = new Set(['visa', 'mastercard', 'amex', 'americanexpress', 'discover']);

function isCardBrandSupported(brand: string | undefined): boolean {
  if (!brand) return true;
  return SUPPORTED_BRANDS.has(brand.toLowerCase().replace(/\s+/g, ''));
}

export default function AddPaymentMethodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const haptics = useHaptics();
  const isOffline = useIsOffline();
  const { confirmSetupIntent } = useConfirmSetupIntent();
  const user = useStore((s) => s.user);

  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [cardIncomplete, setCardIncomplete] = useState<string | null>(null);

  const shakeX = useSharedValue(0);

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(-3, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
  }, [shakeX]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  useEffect(() => {
    (async () => {
      const result = await createSetupIntent();
      if (result) {
        setClientSecret(result.client_secret);
      } else {
        toast.error('Unable to initialise card setup. Please try again.');
      }
      setLoading(false);
    })();
  }, []);

  const handleCardChange = useCallback((details: CardFieldInput.Details) => {
    setCardDetails(details);
    setCardIncomplete(null);
    if (details.brand && !isCardBrandSupported(details.brand)) {
      setBrandError(`${details.brand} cards are not supported. Please use Visa, Mastercard, Amex, or Discover.`);
      haptics.warning();
    } else {
      setBrandError(null);
    }
  }, [haptics]);

  const cardComplete = cardDetails?.complete === true;
  const canSave = cardComplete && !brandError && !!clientSecret;

  const save = useCallback(async () => {
    if (!cardDetails || !cardDetails.complete) {
      setCardIncomplete('Please fill in all card details');
      triggerShake();
      haptics.error();
      return;
    }

    if (!clientSecret || !user) return;

    if (!isCardBrandSupported(cardDetails?.brand)) {
      haptics.error();
      triggerShake();
      setBrandError(`${cardDetails?.brand ?? 'This'} card type is not supported.`);
      return;
    }

    haptics.confirm();
    setSaving(true);

    try {
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        haptics.error();
        toast.error(`Card Setup Failed: ${error.message}`);
        setSaving(false);
        return;
      }

      if (setupIntent?.paymentMethodId) {
        const brand = cardDetails?.brand ?? 'unknown';
        const last4 = cardDetails?.last4 ?? '****';
        const expMonth = cardDetails?.expiryMonth ?? 0;
        const expYear = cardDetails?.expiryYear ?? 0;

        await addPaymentMethod({
          user_id: user.id,
          stripe_payment_method_id: setupIntent.paymentMethodId,
          brand,
          last4,
          exp_month: expMonth,
          exp_year: expYear,
          make_default: true,
        });
      }

      haptics.success();
      router.back();
    } catch {
      haptics.error();
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [clientSecret, cardDetails, user, haptics, confirmSetupIntent, router, triggerShake]);

  const hasError = !!brandError || !!cardIncomplete;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ModalHeader />
      <ScreenHeader title="Add Card" />

      <View style={{ flex: 1, padding: Spacing.lg, gap: Spacing.lg }}>
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.cardPreview, { backgroundColor: colors.primary }]}>
          <CreditCard size={28} color={colors.onPrimary} strokeWidth={2} />
          <Text style={[styles.previewNumber, { color: colors.onPrimary }]} numberOfLines={1}>
            {cardDetails?.last4 ? `•••• •••• •••• ${cardDetails.last4}` : '•••• •••• •••• ••••'}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={[styles.previewLabel, { color: 'rgba(255,255,255,0.7)' }]}>BRAND</Text>
              <Text style={[styles.previewValue, { color: colors.onPrimary }]} numberOfLines={1}>
                {cardDetails?.brand?.toUpperCase() || 'CARD'}
              </Text>
            </View>
            <View>
              <Text style={[styles.previewLabel, { color: 'rgba(255,255,255,0.7)' }]}>EXPIRES</Text>
              <Text style={[styles.previewValue, { color: colors.onPrimary }]}>
                {cardDetails?.expiryMonth && cardDetails?.expiryYear
                  ? `${String(cardDetails.expiryMonth).padStart(2, '0')}/${String(cardDetails.expiryYear).slice(-2)}`
                  : 'MM/YY'}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={shakeStyle}>
          <CardField
            postalCodeEnabled={false}
            placeholders={{ number: '4242 4242 4242 4242' }}
            cardStyle={{
              backgroundColor: colors.surface,
              textColor: colors.text,
              placeholderColor: colors.textTertiary,
              borderColor: hasError ? colors.error : colors.border,
              borderWidth: hasError ? 2 : 1,
              borderRadius: BorderRadius.md,
              fontSize: 16,
            }}
            style={styles.cardField}
            onCardChange={handleCardChange}
          />
        </Animated.View>

        {(brandError || cardIncomplete) && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[styles.errorRow, { backgroundColor: colors.errorLight }]}
          >
            <AlertCircle size={14} color={colors.error} strokeWidth={2.2} />
            <Text style={[styles.errorText, { color: colors.error }]}>{brandError || cardIncomplete}</Text>
          </Animated.View>
        )}

        <View style={{ flex: 1 }} />

        <View style={[styles.secureRow, { backgroundColor: colors.activeLight }]}>
          <Lock size={14} color={colors.primary} strokeWidth={2.2} />
          <Text style={[styles.secureText, { color: colors.textSecondary }]}>
            Card details are encrypted and handled by Stripe.
          </Text>
        </View>

        <Button
          title={isOffline ? 'Offline' : 'Save card'}
          onPress={save}
          loading={saving || loading}
          disabled={isOffline || (!canSave && !(!cardDetails?.complete && !saving))}
          size="lg"
          fullWidth
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  cardPreview: {
    height: 200,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    justifyContent: 'space-between',
    ...Shadows.lg,
  },
  previewNumber: { ...Typography.title3, fontWeight: '600', letterSpacing: 2 },
  previewLabel: { ...Typography.caption2, fontWeight: '700', letterSpacing: 0.8 },
  previewValue: { ...Typography.subheadline, fontWeight: '700', marginTop: 2 },

  cardField: {
    width: '100%',
    height: 50,
  },

  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  secureText: { ...Typography.footnote, flex: 1 },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  errorText: { ...Typography.footnote, flex: 1, fontWeight: '500' },
});
