import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  Lock,
  Check,
  CreditCard,
  Plus,
  ShieldCheck,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import {
  mockPaymentMethods,
  type PaymentMethod,
} from '../../lib/mockData';

const PLATFORM_FEE_RATE = 0.05;

function formatBrand(brand: PaymentMethod['brand']) {
  if (brand === 'apple_pay') return 'Apple Pay';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export default function CheckoutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const params = useLocalSearchParams<{ bookingId?: string; listingId?: string; amount?: string }>();
  const { listings, bookings } = useStore();

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

  const [selectedId, setSelectedId] = useState<string>(
    mockPaymentMethods.find((p) => p.is_default)?.id ?? mockPaymentMethods[0].id
  );
  const [processing, setProcessing] = useState(false);

  const handlePay = useCallback(() => {
    haptics.medium();
    setProcessing(true);
    // TODO: swap for real Stripe PaymentSheet.confirm() when keys are wired
    setTimeout(() => {
      setProcessing(false);
      haptics.success();
      router.replace({ pathname: '/(payment)/success', params: { amount: String(total), title: listing?.title ?? 'Booking' } });
    }, 1400);
  }, [haptics, router, total, listing]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Pressable
          onPress={() => { haptics.light(); router.back(); }}
          style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
          hitSlop={8}
        >
          <ChevronLeft size={20} color={colors.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Checkout</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
          style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        >
          {listing?.image_url ? (
            <Image source={{ uri: listing.image_url }} style={styles.summaryImage} />
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Price breakdown</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Row label={`Creator fee`} value={`$${baseAmount.toLocaleString()}`} colors={colors} />
            <Row
              label={`Platform fee (${Math.round(PLATFORM_FEE_RATE * 100)}%)`}
              value={`$${platformFee.toLocaleString()}`}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
            <Row label="Total due today" value={`$${total.toLocaleString()}`} bold colors={colors} />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pay with</Text>
          <View style={{ gap: Spacing.sm }}>
            {mockPaymentMethods.map((pm) => {
              const selected = pm.id === selectedId;
              return (
                <Pressable
                  key={pm.id}
                  onPress={() => { haptics.selection(); setSelectedId(pm.id); }}
                  style={[
                    styles.method,
                    {
                      backgroundColor: colors.surface,
                      borderColor: selected ? colors.primary : colors.borderLight,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
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
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => { haptics.light(); router.push('/(payment)/methods'); }}
              style={[styles.addMethod, { borderColor: colors.border }]}
            >
              <Plus size={18} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.addMethodText, { color: colors.primary }]}>
                Add new payment method
              </Text>
            </Pressable>
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
          <Text style={[styles.footerAmount, { color: colors.text }]}>${total.toLocaleString()}</Text>
        </View>
        <Button
          title={processing ? 'Processing…' : 'Pay now'}
          onPress={handlePay}
          loading={processing}
          size="lg"
          icon={<Lock size={18} color={colors.onPrimary} strokeWidth={2.2} />}
          style={{ minWidth: 180 }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.headline, fontWeight: '700' },

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
