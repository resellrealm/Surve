import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { WizardHeader } from './_WizardHeader';
import { useWizard } from './_context';
import type { Category } from '../../types';

const CATEGORIES: { label: string; value: Category }[] = [
  { label: 'Hotel', value: 'hotel' },
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Bar', value: 'bar' },
  { label: 'Cafe', value: 'cafe' },
  { label: 'Resort', value: 'resort' },
  { label: 'Spa', value: 'spa' },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function Step1Basics() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, update } = useWizard();

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!state.legalName.trim()) e.legalName = 'Legal name is required';
    if (!state.brandName.trim()) e.brandName = 'Brand name is required';
    if (!state.category) e.category = 'Please select a category';
    if (state.foundedYear) {
      const yr = parseInt(state.foundedYear, 10);
      if (isNaN(yr) || yr < 1800 || yr > CURRENT_YEAR)
        e.foundedYear = `Enter a year between 1800 and ${CURRENT_YEAR}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [state]);

  const handleContinue = useCallback(() => {
    if (!validate()) {
      haptics.warning();
      return;
    }
    haptics.confirm();
    router.push('/(business-onboarding)/step2');
  }, [validate, haptics, router]);

  const inputStyle = (field: string) => [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: errors[field] ? colors.error : colors.border,
      color: colors.text,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <WizardHeader
        step={1}
        title="Tell us about your business"
        subtitle="This info appears on your public profile"
        onBack={() => router.replace('/(tabs)/profile')}
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400).delay(50)} style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Legal business name *</Text>
          <TextInput
            style={inputStyle('legalName')}
            value={state.legalName}
            onChangeText={(t) => update({ legalName: t })}
            placeholder="e.g. Acme Hospitality LLC"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Legal business name"
          />
          {errors.legalName ? (
            <Text style={[styles.error, { color: colors.error }]}>{errors.legalName}</Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Brand / trading name *</Text>
          <TextInput
            style={inputStyle('brandName')}
            value={state.brandName}
            onChangeText={(t) => update({ brandName: t })}
            placeholder="e.g. The Grand Ace"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Brand name"
          />
          {errors.brandName ? (
            <Text style={[styles.error, { color: colors.error }]}>{errors.brandName}</Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Category *</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((cat) => {
              const selected = state.category === cat.value;
              return (
                <PressableScale
                  key={cat.value}
                  scaleValue={0.95}
                  onPress={() => {
                    haptics.tap();
                    update({ category: cat.value });
                    setErrors((e) => ({ ...e, category: '' }));
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={cat.label}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                      ...Shadows.sm,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? colors.onPrimary : colors.text },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          {errors.category ? (
            <Text style={[styles.error, { color: colors.error }]}>{errors.category}</Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Founded year (optional)</Text>
          <TextInput
            style={inputStyle('foundedYear')}
            value={state.foundedYear}
            onChangeText={(t) => update({ foundedYear: t })}
            placeholder={`e.g. ${CURRENT_YEAR - 5}`}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            maxLength={4}
            returnKeyType="done"
            accessibilityLabel="Founded year"
          />
          {errors.foundedYear ? (
            <Text style={[styles.error, { color: colors.error }]}>{errors.foundedYear}</Text>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Button
          title="Continue"
          onPress={handleContinue}
          size="lg"
          fullWidth
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...Typography.headline,
    marginBottom: Spacing.sm,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
  },
  error: {
    ...Typography.caption1,
    marginTop: Spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  chipText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
});
