import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowRight, Check } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useHaptics } from '../../../hooks/useHaptics';
import { useStore } from '../../../lib/store';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { PressableScale } from '../../../components/ui/PressableScale';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import { Typography, Spacing, BorderRadius } from '../../../constants/theme';
import type { Category } from '../../../types';

const TOTAL_STEPS = 7;

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'hotel', label: 'Hotels', emoji: '🏨' },
  { key: 'restaurant', label: 'Restaurants', emoji: '🍽️' },
  { key: 'bar', label: 'Bars', emoji: '🍸' },
  { key: 'cafe', label: 'Cafés', emoji: '☕' },
  { key: 'resort', label: 'Resorts', emoji: '🏖️' },
  { key: 'spa', label: 'Spas', emoji: '💆' },
];

export default function CreatorCategoriesScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { creatorDraft, updateCreatorDraft } = useStore();

  const toggle = useCallback(
    (cat: Category) => {
      haptics.tap();
      const current = creatorDraft.categories;
      const next = current.includes(cat)
        ? current.filter((c) => c !== cat)
        : [...current, cat];
      updateCreatorDraft({ categories: next });
    },
    [creatorDraft.categories, updateCreatorDraft],
  );

  const handleNext = useCallback(() => {
    haptics.confirm();
    router.push('/onboarding/creator/portfolio');
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Categories" />
      <ProgressBar currentStep={4} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>What interests you?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Pick the types of businesses you'd like to work with
          </Text>
        </Animated.View>

        <View style={styles.chips}>
          {CATEGORIES.map((cat, i) => {
            const selected = creatorDraft.categories.includes(cat.key);
            return (
              <Animated.View
                key={cat.key}
                entering={FadeInDown.duration(400).delay(150 + i * 80)}
              >
                <PressableScale
                  onPress={() => toggle(cat.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  scaleValue={0.94}
                  accessibilityRole="checkbox"
                  accessibilityLabel={cat.label}
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={styles.emoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: selected ? colors.onPrimary : colors.text },
                    ]}
                  >
                    {cat.label}
                  </Text>
                  {selected && <Check size={16} color={colors.onPrimary} strokeWidth={3} />}
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          title="Next"
          onPress={handleNext}
          size="lg"
          fullWidth
          disabled={creatorDraft.categories.length === 0}
          icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  title: { ...Typography.title1, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, marginBottom: Spacing.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  emoji: { fontSize: 20 },
  chipLabel: { ...Typography.headline },
  footer: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
});
