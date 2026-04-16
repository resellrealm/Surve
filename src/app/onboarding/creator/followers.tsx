import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TrendingUp, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useHaptics } from '../../../hooks/useHaptics';
import { useStore } from '../../../lib/store';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import { Typography, Spacing } from '../../../constants/theme';

const TOTAL_STEPS = 7;

export default function CreatorFollowersScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { creatorDraft, updateCreatorDraft } = useStore();

  const handleNext = useCallback(() => {
    haptics.confirm();
    router.push('/onboarding/creator/categories');
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Audience Stats" />
      <ProgressBar currentStep={3} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Your audience</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Approximate numbers are fine — businesses use these to match with creators
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <Input
            label="Instagram Followers"
            placeholder="e.g. 12000"
            value={creatorDraft.instagram_followers}
            onChangeText={(t) => updateCreatorDraft({ instagram_followers: t.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            icon={<TrendingUp size={18} color={colors.textTertiary} strokeWidth={2} />}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <Input
            label="TikTok Followers"
            placeholder="e.g. 25000"
            value={creatorDraft.tiktok_followers}
            onChangeText={(t) => updateCreatorDraft({ tiktok_followers: t.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            icon={<TrendingUp size={18} color={colors.textTertiary} strokeWidth={2} />}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(400)}>
          <Input
            label="Engagement Rate (%)"
            placeholder="e.g. 4.5"
            value={creatorDraft.engagement_rate}
            onChangeText={(t) => updateCreatorDraft({ engagement_rate: t.replace(/[^0-9.]/g, '') })}
            keyboardType="decimal-pad"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(500)}>
          <Input
            label="Average Views per Post"
            placeholder="e.g. 5000"
            value={creatorDraft.avg_views}
            onChangeText={(t) => updateCreatorDraft({ avg_views: t.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
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
