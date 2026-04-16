import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Building2, MapPin, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useHaptics } from '../../../hooks/useHaptics';
import { useStore } from '../../../lib/store';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import { ListingFilterChips } from '../../../components/listing/ListingFilters';
import { categories } from '../../../constants/filters';
import { Typography, Spacing } from '../../../constants/theme';
import type { Category } from '../../../types';

const TOTAL_STEPS = 5;

export default function BusinessInfoScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { businessDraft, updateBusinessDraft } = useStore();

  const [errors, setErrors] = useState<Record<string, string>>({});

  const categoryItems = categories.filter((c) => c.key !== 'all');

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!businessDraft.business_name.trim()) e.business_name = 'Required';
    if (!businessDraft.category) e.category = 'Pick a category';
    if (!businessDraft.location.trim()) e.location = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [businessDraft]);

  const handleNext = useCallback(() => {
    if (!validate()) return;
    haptics.confirm();
    router.push('/onboarding/business/hours');
  }, [validate, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Business Info" showBack={false} />
      <ProgressBar currentStep={1} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            Tell us about your business
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            This helps creators find and connect with you
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <Input
            label="Business Name"
            placeholder="e.g. The Grand Hotel"
            value={businessDraft.business_name}
            onChangeText={(t) => updateBusinessDraft({ business_name: t })}
            error={errors.business_name}
            icon={<Building2 size={18} color={colors.textTertiary} strokeWidth={2} />}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <Text style={[styles.label, { color: colors.text }]} accessibilityRole="header">Category</Text>
          {errors.category && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.category}
            </Text>
          )}
          <ListingFilterChips
            items={categoryItems}
            selectedKey={businessDraft.category}
            onSelect={(key) => updateBusinessDraft({ category: key as Category })}
          />
          <View style={styles.chipSpacer} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(400)}>
          <Input
            label="Address"
            placeholder="e.g. 123 Main St, Bali"
            value={businessDraft.location}
            onChangeText={(t) => updateBusinessDraft({ location: t })}
            error={errors.location}
            icon={<MapPin size={18} color={colors.textTertiary} strokeWidth={2} />}
          />
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          title="Next"
          onPress={handleNext}
          size="lg"
          fullWidth
          icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  title: {
    ...Typography.title1,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    marginBottom: Spacing.xxl,
  },
  label: {
    ...Typography.subheadline,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.caption1,
    marginBottom: Spacing.xs,
  },
  chipSpacer: {
    height: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
});
