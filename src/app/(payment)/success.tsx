import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Check, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

export default function PaymentSuccessScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ amount?: string; title?: string }>();

  const scale = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withDelay(150, withSpring(1, { damping: 12, stiffness: 180 }));
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.body}>
        <Animated.View style={[styles.badge, { backgroundColor: colors.primary }, checkStyle]}>
          <Check size={44} color={colors.onPrimary} strokeWidth={3} />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.duration(400).delay(250)}
          style={[styles.title, { color: colors.text }]}
        >
          Payment successful
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.duration(400).delay(350)}
          style={[styles.subtitle, { color: colors.textSecondary }]}
        >
          {params.title
            ? `$${Number(params.amount ?? 0).toLocaleString()} paid for ${params.title}`
            : 'Your booking is confirmed and funds are held in escrow.'}
        </Animated.Text>

        <Animated.View
          entering={FadeInUp.duration(400).delay(500)}
          style={[styles.receipt, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        >
          <Row label="Amount" value={`$${Number(params.amount ?? 0).toLocaleString()}`} colors={colors} bold />
          <Row label="Status" value="Paid" colors={colors} highlight />
          <Row label="Held in escrow" value="Yes" colors={colors} />
          <Row label="Reference" value={`SRV-${Date.now().toString().slice(-6)}`} colors={colors} />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.duration(400).delay(700)} style={styles.actions}>
        <Button
          title="Back to booking"
          onPress={() => router.replace('/(tabs)/bookings')}
          size="lg"
          fullWidth
          icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2} />}
        />
        <Pressable onPress={() => router.replace('/(tabs)')}>
          <Text style={[styles.ghostLink, { color: colors.textSecondary }]}>
            Back to home
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
  colors,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          {
            color: highlight ? colors.success : colors.text,
            fontWeight: bold ? '700' : '600',
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.xxl, justifyContent: 'space-between' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  title: { ...Typography.title1, fontWeight: '800', textAlign: 'center' },
  subtitle: { ...Typography.body, textAlign: 'center', marginTop: Spacing.sm, maxWidth: 320 },
  receipt: {
    marginTop: Spacing.xxxl,
    width: '100%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { ...Typography.subheadline },
  rowValue: { ...Typography.subheadline },
  actions: { gap: Spacing.md, alignItems: 'center', paddingBottom: Spacing.md },
  ghostLink: { ...Typography.subheadline, fontWeight: '600', padding: Spacing.sm },
});
