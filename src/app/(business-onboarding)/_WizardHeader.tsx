import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { PressableScale } from '../../components/ui/PressableScale';
import { Typography, Spacing } from '../../constants/theme';

interface WizardHeaderProps {
  step: number;
  total?: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export function WizardHeader({
  step,
  total = 7,
  title,
  subtitle,
  onBack,
}: WizardHeaderProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    haptics.tap();
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.background },
      ]}
    >
      <View style={styles.row}>
        <PressableScale
          scaleValue={0.88}
          onPress={handleBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backBtn, { backgroundColor: colors.surfaceSecondary }]}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2.2} />
        </PressableScale>
        <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
          {step} / {total}
        </Text>
        <View style={styles.spacer} />
      </View>

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            { width: `${(step / total) * 100}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    ...Typography.footnote,
  },
  spacer: {
    width: 44,
  },
  track: {
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  title: {
    ...Typography.title1,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.subheadline,
  },
});
