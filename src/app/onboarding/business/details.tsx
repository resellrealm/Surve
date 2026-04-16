import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowRight, Globe, Phone, FileText } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useHaptics } from '../../../hooks/useHaptics';
import { useStore } from '../../../lib/store';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import { Typography, Spacing } from '../../../constants/theme';

const TOTAL_STEPS = 5;
const MAX_DESCRIPTION = 500;

export default function BusinessDetailsScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { businessDraft, updateBusinessDraft } = useStore();

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!businessDraft.description.trim()) e.description = 'Required';
    if (businessDraft.description.length > MAX_DESCRIPTION)
      e.description = `Max ${MAX_DESCRIPTION} characters`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [businessDraft]);

  const handleNext = useCallback(() => {
    if (!validate()) return;
    haptics.confirm();
    router.push('/onboarding/business/photos');
  }, [validate, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Details" />
      <ProgressBar currentStep={3} totalSteps={TOTAL_STEPS} />

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
            Add some details
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Help creators understand what makes your business special
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <Input
            label="Description"
            placeholder="Describe your business, atmosphere, and what you offer..."
            value={businessDraft.description}
            onChangeText={(t) => updateBusinessDraft({ description: t.slice(0, MAX_DESCRIPTION) })}
            error={errors.description}
            multiline
            numberOfLines={5}
            maxLength={MAX_DESCRIPTION}
            showCharCount
            style={{ minHeight: 120, textAlignVertical: 'top' }}
            icon={<FileText size={18} color={colors.textTertiary} strokeWidth={2} />}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <Input
            label="Website (optional)"
            placeholder="https://yourbusiness.com"
            value={businessDraft.website}
            onChangeText={(t) => updateBusinessDraft({ website: t })}
            autoCapitalize="none"
            keyboardType="url"
            icon={<Globe size={18} color={colors.textTertiary} strokeWidth={2} />}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(400)}>
          <Input
            label="Phone (optional)"
            placeholder="+1 234 567 8900"
            value={businessDraft.phone}
            onChangeText={(t) => updateBusinessDraft({ phone: t })}
            keyboardType="phone-pad"
            icon={<Phone size={18} color={colors.textTertiary} strokeWidth={2} />}
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
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
});
