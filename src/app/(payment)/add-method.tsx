import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, CreditCard, Lock, Apple } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export default function AddPaymentMethodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const save = useCallback(() => {
    haptics.medium();
    setSaving(true);
    // TODO: wire to Stripe SetupIntent + stripe.confirmCardSetup()
    setTimeout(() => {
      setSaving(false);
      haptics.success();
      router.back();
    }, 1000);
  }, [haptics, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Pressable
          onPress={() => { haptics.light(); router.back(); }}
          style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
          hitSlop={8}
        >
          <ChevronLeft size={20} color={colors.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Add card</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={{ flex: 1, padding: Spacing.lg, gap: Spacing.lg }}>
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.cardPreview, { backgroundColor: colors.primary }]}>
          <CreditCard size={28} color={colors.onPrimary} strokeWidth={2} />
          <Text style={[styles.previewNumber, { color: colors.onPrimary }]} numberOfLines={1}>
            {number.padEnd(19, '•').replace(/(.{4})/g, '$1 ').trim() || '•••• •••• •••• ••••'}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={[styles.previewLabel, { color: 'rgba(255,255,255,0.7)' }]}>CARDHOLDER</Text>
              <Text style={[styles.previewValue, { color: colors.onPrimary }]} numberOfLines={1}>
                {name.toUpperCase() || 'YOUR NAME'}
              </Text>
            </View>
            <View>
              <Text style={[styles.previewLabel, { color: 'rgba(255,255,255,0.7)' }]}>EXPIRES</Text>
              <Text style={[styles.previewValue, { color: colors.onPrimary }]}>
                {expiry || 'MM/YY'}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ gap: Spacing.xs }}>
          <Input
            label="Card number"
            value={number}
            onChangeText={(v) => setNumber(v.replace(/\D/g, '').slice(0, 16))}
            placeholder="1234 5678 9012 3456"
            keyboardType="number-pad"
            icon={<CreditCard size={20} color={colors.textTertiary} strokeWidth={2} />}
          />
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Expiry"
                value={expiry}
                onChangeText={(v) => {
                  const cleaned = v.replace(/\D/g, '').slice(0, 4);
                  setExpiry(cleaned.length > 2 ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}` : cleaned);
                }}
                placeholder="MM/YY"
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="CVC"
                value={cvc}
                onChangeText={(v) => setCvc(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                keyboardType="number-pad"
                secureTextEntry
              />
            </View>
          </View>
          <Input
            label="Name on card"
            value={name}
            onChangeText={setName}
            placeholder="Jane Doe"
            autoCapitalize="words"
          />
        </Animated.View>

        <View style={{ flex: 1 }} />

        <View style={[styles.secureRow, { backgroundColor: colors.activeLight }]}>
          <Lock size={14} color={colors.primary} strokeWidth={2.2} />
          <Text style={[styles.secureText, { color: colors.textSecondary }]}>
            Card details are encrypted and handled by Stripe.
          </Text>
        </View>

        <Button title="Save card" onPress={save} loading={saving} size="lg" fullWidth />
      </View>
    </KeyboardAvoidingView>
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
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.headline, fontWeight: '700' },

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

  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  secureText: { ...Typography.footnote, flex: 1 },
});
