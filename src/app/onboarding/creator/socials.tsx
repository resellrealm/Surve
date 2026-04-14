import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Instagram, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../hooks/useTheme';
import { useStore } from '../../../lib/store';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import { Typography, Spacing } from '../../../constants/theme';

const TOTAL_STEPS = 7;

export default function CreatorSocialsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { creatorDraft, updateCreatorDraft } = useStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!creatorDraft.instagram_handle.trim() && !creatorDraft.tiktok_handle.trim()) {
      e.instagram_handle = 'At least one handle required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [creatorDraft]);

  const handleNext = useCallback(() => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/creator/followers');
  }, [validate, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Social Handles" />
      <ProgressBar currentStep={2} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.title, { color: colors.text }]}>Your social accounts</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Add at least one handle so businesses can see your work
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <Input
            label="Instagram Handle"
            placeholder="@yourhandle"
            value={creatorDraft.instagram_handle}
            onChangeText={(t) => updateCreatorDraft({ instagram_handle: t.replace(/^@/, '') })}
            error={errors.instagram_handle}
            autoCapitalize="none"
            icon={<Instagram size={18} color={colors.textTertiary} strokeWidth={2} />}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <Input
            label="TikTok Handle"
            placeholder="@yourhandle"
            value={creatorDraft.tiktok_handle}
            onChangeText={(t) => updateCreatorDraft({ tiktok_handle: t.replace(/^@/, '') })}
            autoCapitalize="none"
            icon={<Instagram size={18} color={colors.textTertiary} strokeWidth={2} />}
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
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  title: { ...Typography.title1, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, marginBottom: Spacing.xxl },
  footer: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
});
