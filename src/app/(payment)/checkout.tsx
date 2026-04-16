import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useIsOffline } from '../../hooks/useIsOffline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import { useStripe } from '@stripe/stripe-react-native';
import {
  Lock,
  Check,
  CreditCard,
  Plus,
  ShieldCheck,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ModalHeader } from '../../components/ui/ModalHeader';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { PLATFORM_FEE_RATE } from '../../constants/pricing';
import { formatCurrency } from '../../lib/currency';
import { getPaymentMethods, preferMock } from '../../lib/api';
import { mockPaymentMethods } from '../../lib/mockData';
import type { PaymentMethod } from '../../types';

function formatBrand(brand: string) {
  if (brand === 'apple_pay') return 'Apple Pay';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export default function CheckoutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const isOffline = useIsOffline();
  const params = useLocalSearchParams<{ bookingId?: string; listingId?: string; amount?: string }>();
  const { listings, bookings, user } = useStore();

  const booking = useMemo(
    () => bookings.find((b) => b.id === params.bookingId) ?? bookings[0],
    [bookings, params.bookingId]
  );
  const listing = useMemo(() => {
    if (booking) return booking.listing;
    return listings.find((l) => l.id === params.listingId) ?? listings[0];
  }, [booking, listings, params.listingId]);

  const baseAmount = useMemo(() => {
    if (params.amount) return Number(params.amount);
    if (booking?.pay_agreed) return booking.pay_agreed;
    if (listing?.pay_max) return listing.pay_max;
    return 1500;
  }, [booking, listing, params.amount]);

  const platformFee = Math.round(baseAmount * PLATFORM_FEE_RATE);
  const total = baseAmount + platformFee;

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMethodsLoading(true);
      const userId = user?.id;
      const fetched = userId ? await getPaymentMethods(userId) : [];
      const resolved = preferMock(fetched, mockPaymentMethods as unknown as PaymentMethod[]);
      if (cancelled) return;
      setMethods(resolved);
      const defaultMethod = resolved.find((p) => p.is_default) ?? resolved[0];
      if (defaultMethod) setSelectedId(defaultMethod.id);
      setMethodsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handlePay = useCallback(async () => {
    haptics.confirm();
    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not signed in: Please sign in to complete payment.');
        setProcessing(false);
        return;
      }

      const bookingId = booking?.id ?? params.bookingId;
      if (!bookingId) {
        toast.error('No booking associated with this payment.');
        setProcessing(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        'create-payment-intent',
        { body: { booking_id: bookingId, amount_cents: total * 100 } },
      );

      if (fnError || !data?.client_secret) {
        toast.error(`Payment error: ${data?.error ?? 'Could not create payment intent.'}`);
        setProcessing(false);
        return;
      }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.client_secret,
        merchantDisplayName: 'Surve',
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        toast.error(`Payment error: ${initError.message}`);
        setProcessing(false);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          toast.error(`Payment failed: ${presentError.message}`);
        }
        setProcessing(false);
        return;
      }

      haptics.success();
      router.replace({
        pathname: '/(payment)/success',
        params: { amount: String(total), title: listing?.title ?? 'Booking' },
      });
    } catch (err: any) {
      toast.error(`Payment error: ${err?.message ?? 'Something went wrong.'}`);
    } finally {
      setProcessing(false);
    }
  }, [haptics, router, total, listing, booking, params.bookingId, initPaymentSheet, presentPaymentSheet]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ModalHeader />
      <ScreenHeader title="Checkout" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
          style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        >
          {listing?.image_url ? (
            <AdaptiveImage source={{ uri: listing.image_url }} contentFit="cover" overlayOpacity={0.18} blurhash={listing.image_blurhash} style={styles.summaryImage} accessibilityLabel={`${listing.title} image`} />
          ) : (
            <View style={[styles.summaryImage, { backgroundColor: colors.surfaceSecondary }]} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              {listing?.business?.business_name ?? 'Surve'}
            </Text>
            <Text style={[styles.summaryTitle, { color: colors.text }]} numberOfLines={2}>
              {listing?.title ?? 'Creator Booking'}
            </Text>
            <Text style={[styles.summaryMeta, { color: colors.textTertiary }]} numberOfLines={1}>
              {listing?.location ?? 'Remote'} · {listing?.content_type ?? 'Content'}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">Price breakdown</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Row label={`Creator fee`} value={formatCurrency(baseAmount)} colors={colors} />
            <Row
              label={`Platform fee (${Math.round(PLATFORM_FEE_RATE * 100)}%)`}
              value={formatCurrency(platformFee)}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
            <Row label="Total due today" value={formatCurrency(total)} bold colors={colors} />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">Pay with</Text>
          <View style={{ gap: Spacing.sm }}>
            {methodsLoading ? (
              [0, 1].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.method,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.borderLight,
                      borderWidth: 1,
                      height: 68,
                    },
                  ]}
                />
              ))
            ) : methods.map((pm) => {
              const selected = pm.id === selectedId;
              return (
                <PressableScale
                  key={pm.id}
                  onPress={() => { haptics.select(); setSelectedId(pm.id); }}
                  scaleValue={0.97}
                  style={[
                    styles.method,
                    {
                      backgroundColor: colors.surface,
                      borderColor: selected ? colors.primary : colors.borderLight,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={`${formatBrand(pm.brand)} ${pm.last4 ? `ending in ${pm.last4}` : ''}`}
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.methodIcon, { backgroundColor: colors.surfaceSecondary }]}>
                    <CreditCard size={18} color={colors.text} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.methodTitle, { color: colors.text }]}>
                      {formatBrand(pm.brand)} {pm.last4 ? `•• ${pm.last4}` : ''}
                    </Text>
                    {pm.exp_year ? (
                      <Text style={[styles.methodMeta, { color: colors.textTertiary }]}>
                        Expires {String(pm.exp_month).padStart(2, '0')}/{String(pm.exp_year).slice(-2)}
                      </Text>
                    ) : (
                      <Text style={[styles.methodMeta, { color: colors.textTertiary }]}>
                        Use Face ID
                      </Text>
                    )}
                  </View>
                  {selected ? (
                    <View style={[styles.checkDot, { backgroundColor: colors.primary }]}>
                      <Check size={14} color={colors.onPrimary} strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={[styles.checkDot, { borderColor: colors.border, borderWidth: 1, backgroundColor: 'transparent' }]} />
                  )}
                </PressableScale>
              );
            })}

            {!methodsLoading && methods.length === 0 && (
              <Text style={[styles.methodMeta, { color: colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.md }]}>
                No saved payment methods
              </Text>
            )}

            <PressableScale
              onPress={() => { haptics.tap(); router.push('/(payment)/methods'); }}
              scaleValue={0.97}
              style={[styles.addMethod, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Add new payment method"
            >
              <Plus size={18} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.addMethodText, { color: colors.primary }]}>
                Add new payment method
              </Text>
            </PressableScale>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={[styles.guarantee, { backgroundColor: colors.activeLight, borderColor: colors.borderLight }]}
        >
          <ShieldCheck size={18} color={colors.primary} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.guaranteeTitle, { color: colors.text }]}>Payments held in escrow</Text>
            <Text style={[styles.guaranteeBody, { color: colors.textSecondary }]}>
              Your payment is released to the creator only after content is approved.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.borderLight, paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.footerAmount, { color: colors.text }]}>{formatCurrency(total)}</Text>
        </View>
        <Button
          title={isOffline ? 'Offline' : processing ? 'Processing…' : 'Pay now'}
          onPress={handlePay}
          loading={processing}
          disabled={isOffline}
          size="lg"
          icon={<Lock size={18} color={colors.onPrimary} strokeWidth={2.2} />}
          style={{ minWidth: 180 }}
          accessibilityHint="Processes your payment and confirms the booking"
        />
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  colors,
}: {
  label: string;
  value: string;
  bold?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: bold ? colors.text : colors.textSecondary, fontWeight: bold ? '600' : '400' }]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, { color: colors.text, fontWeight: bold ? '700' : '500' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  summary: {
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  summaryImage: { width: 72, height: 72, borderRadius: BorderRadius.md },
  summaryLabel: { ...Typography.caption1, letterSpacing: 0.5, textTransform: 'uppercase' },
  summaryTitle: { ...Typography.headline, fontWeight: '700' },
  summaryMeta: { ...Typography.footnote },

  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.headline, fontWeight: '700', marginBottom: Spacing.md },

  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...Typography.body, fontSize: 15 },
  rowValue: { ...Typography.body, fontSize: 15 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },

  method: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  methodIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { ...Typography.headline, fontWeight: '600' },
  methodMeta: { ...Typography.footnote, marginTop: 2 },
  checkDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  addMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addMethodText: { ...Typography.subheadline, fontWeight: '600' },

  guarantee: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  guaranteeTitle: { ...Typography.subheadline, fontWeight: '700', marginBottom: 2 },
  guaranteeBody: { ...Typography.footnote, lineHeight: 18 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  footerLabel: { ...Typography.caption1, textTransform: 'uppercase', letterSpacing: 0.5 },
  footerAmount: { ...Typography.title2 },
});
