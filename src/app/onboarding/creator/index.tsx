import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { User, MapPin, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useHaptics } from '../../../hooks/useHaptics';
import { useStore } from '../../../lib/store';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import { Typography, Spacing } from '../../../constants/theme';

const TOTAL_STEPS = 7;
const BIO_MAX = 160;

export default function CreatorBasicInfoScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { creatorDraft, updateCreatorDraft } = useStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!creatorDraft.full_name.trim()) e.full_name = 'Required';
    if (!creatorDraft.location.trim()) e.location = 'Required';
    if (creatorDraft.bio.length > BIO_MAX) e.bio = `Max ${BIO_MAX} characters`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [creatorDraft]);

  const handleNext = useCallback(() => {
    if (!validate()) return;
    haptics.confirm();
    router.push('/onboarding/creator/socials');
  }, [validate, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Basic Info" />
      <ProgressBar currentStep={1} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Tell us about yourself</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            This helps businesses find and connect with you
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <Input
            label="Full Name"
            placeholder="Your name"
            value={creatorDraft.full_name}
            onChangeText={(t) => updateCreatorDraft({ full_name: t })}
            error={errors.full_name}
            icon={<User size={18} color={colors.textTertiary} strokeWidth={2} />}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <Input
            label="Bio"
            placeholder="Tell businesses what you do"
            value={creatorDraft.bio}
            onChangeText={(t) => updateCreatorDraft({ bio: t.slice(0, BIO_MAX) })}
            error={errors.bio}
            multiline
            numberOfLines={3}
            maxLength={BIO_MAX}
            showCharCount
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(400)}>
          <Input
            label="Location"
            placeholder="e.g. Bali, Indonesia"
            value={creatorDraft.location}
            onChangeText={(t) => updateCreatorDraft({ location: t })}
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
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  title: { ...Typography.title1, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, marginBottom: Spacing.xxl },
  footer: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
});
