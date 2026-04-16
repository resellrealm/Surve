import React, { useState, useCallback, useRef } from 'react';
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
import { Plus, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { WizardHeader } from './_WizardHeader';
import { useWizard } from './_context';

const SUGGESTED_VALUES = [
  'Sustainability',
  'Luxury',
  'Authenticity',
  'Innovation',
  'Community',
  'Wellness',
  'Diversity',
  'Quality',
];

export default function Step3Story() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, update } = useWizard();
  const [valueInput, setValueInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const valueRef = useRef<TextInput>(null);

  const addValue = useCallback(
    (val: string) => {
      const trimmed = val.trim();
      if (!trimmed || state.values.includes(trimmed)) return;
      haptics.tap();
      update({ values: [...state.values, trimmed] });
      setValueInput('');
    },
    [state.values, update, haptics],
  );

  const removeValue = useCallback(
    (val: string) => {
      haptics.tap();
      update({ values: state.values.filter((v) => v !== val) });
    },
    [state.values, update, haptics],
  );

  const handleContinue = useCallback(() => {
    if (!state.brandStory.trim() || state.brandStory.trim().length < 30) {
      setErrors({ brandStory: 'Write at least 30 characters about your brand' });
      haptics.warning();
      return;
    }
    haptics.confirm();
    router.push('/(business-onboarding)/step4');
  }, [state.brandStory, haptics, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <WizardHeader
        step={3}
        title="Your brand story"
        subtitle="Help creators understand what makes you special"
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400).delay(50)} style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Brand story *</Text>
          <TextInput
            style={[
              styles.textarea,
              {
                backgroundColor: colors.surface,
                borderColor: errors.brandStory ? colors.error : colors.border,
                color: colors.text,
              },
            ]}
            value={state.brandStory}
            onChangeText={(t) => {
              update({ brandStory: t });
              if (errors.brandStory) setErrors({});
            }}
            placeholder="Tell creators about your brand history, mission, and what makes you unique..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            accessibilityLabel="Brand story"
          />
          <Text style={[styles.charCount, { color: colors.textTertiary }]}>
            {state.brandStory.length} chars (min 30)
          </Text>
          {errors.brandStory ? (
            <Text style={[styles.error, { color: colors.error }]}>{errors.brandStory}</Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Brand values</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Add up to 8 values that define your culture
          </Text>

          <View style={styles.addRow}>
            <TextInput
              ref={valueRef}
              style={[
                styles.valueInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                  flex: 1,
                },
              ]}
              value={valueInput}
              onChangeText={setValueInput}
              placeholder="e.g. Sustainability"
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={() => addValue(valueInput)}
              returnKeyType="done"
              accessibilityLabel="Add a brand value"
            />
            <PressableScale
              scaleValue={0.9}
              onPress={() => addValue(valueInput)}
              disabled={!valueInput.trim() || state.values.length >= 8}
              accessibilityRole="button"
              accessibilityLabel="Add value"
              style={[
                styles.addBtn,
                {
                  backgroundColor:
                    valueInput.trim() && state.values.length < 8
                      ? colors.primary
                      : colors.surfaceSecondary,
                },
              ]}
            >
              <Plus
                size={20}
                color={
                  valueInput.trim() && state.values.length < 8
                    ? colors.onPrimary
                    : colors.textTertiary
                }
                strokeWidth={2.5}
              />
            </PressableScale>
          </View>

          {state.values.length > 0 && (
            <View style={styles.chips}>
              {state.values.map((v) => (
                <View
                  key={v}
                  style={[styles.chip, { backgroundColor: colors.activeLight, ...Shadows.sm }]}
                >
                  <Text style={[styles.chipText, { color: colors.primary }]}>{v}</Text>
                  <PressableScale
                    scaleValue={0.85}
                    onPress={() => removeValue(v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${v}`}
                  >
                    <X size={14} color={colors.primary} strokeWidth={2.5} />
                  </PressableScale>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.sectionMini, { color: colors.textSecondary }]}>
            Suggestions
          </Text>
          <View style={styles.chips}>
            {SUGGESTED_VALUES.filter((s) => !state.values.includes(s)).map((s) => (
              <PressableScale
                key={s}
                scaleValue={0.95}
                onPress={() => addValue(s)}
                disabled={state.values.length >= 8}
                accessibilityRole="button"
                accessibilityLabel={`Add ${s}`}
                style={[
                  styles.suggestion,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.textSecondary }]}>+ {s}</Text>
              </PressableScale>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Button title="Continue" onPress={handleContinue} size="lg" fullWidth />
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
    marginBottom: Spacing.xxxl,
  },
  label: {
    ...Typography.headline,
    marginBottom: Spacing.sm,
  },
  hint: {
    ...Typography.caption1,
    marginBottom: Spacing.md,
  },
  textarea: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Typography.body,
    minHeight: 140,
  },
  charCount: {
    ...Typography.caption2,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  error: {
    ...Typography.caption1,
    marginTop: Spacing.xs,
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  valueInput: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  suggestion: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  sectionMini: {
    ...Typography.footnote,
    marginBottom: Spacing.sm,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
});
