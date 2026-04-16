import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus, X, ArrowRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useHaptics } from '../../../hooks/useHaptics';
import { useTheme } from '../../../hooks/useTheme';
import { usePermissionPrime } from '../../../hooks/usePermissionPrime';
import { useStore } from '../../../lib/store';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { PressableScale } from '../../../components/ui/PressableScale';
import { PermissionPrime } from '../../../components/ui/PermissionPrime';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import { AdaptiveImage } from '../../../components/ui/AdaptiveImage';
import { Typography, Spacing, BorderRadius } from '../../../constants/theme';

const TOTAL_STEPS = 7;
const MAX_ITEMS = 5;

export default function CreatorPortfolioScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { creatorDraft, updateCreatorDraft } = useStore();
  const [picking, setPicking] = useState(false);
  const photoPrime = usePermissionPrime('photo-library');

  const launchPortfolioPicker = useCallback(async () => {
    if (picking || creatorDraft.portfolio_uris.length >= MAX_ITEMS) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: MAX_ITEMS - creatorDraft.portfolio_uris.length,
      });
      if (!result.canceled && result.assets.length > 0) {
        haptics.tap();
        const newUris = result.assets.map((a) => a.uri);
        updateCreatorDraft({
          portfolio_uris: [...creatorDraft.portfolio_uris, ...newUris].slice(0, MAX_ITEMS),
        });
      }
    } finally {
      setPicking(false);
    }
  }, [picking, creatorDraft.portfolio_uris, updateCreatorDraft]);

  const pickImage = useCallback(async () => {
    await photoPrime.prime(launchPortfolioPicker);
  }, [photoPrime, launchPortfolioPicker]);

  const removeItem = useCallback(
    (uri: string) => {
      haptics.warning();
      updateCreatorDraft({
        portfolio_uris: creatorDraft.portfolio_uris.filter((u) => u !== uri),
      });
    },
    [creatorDraft.portfolio_uris, updateCreatorDraft],
  );

  const handleNext = useCallback(() => {
    haptics.confirm();
    router.push('/onboarding/creator/stripe-connect' as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PermissionPrime
        kind="photo-library"
        visible={photoPrime.visible}
        onConfirm={photoPrime.confirm}
        onDismiss={photoPrime.dismiss}
      />
      <ScreenHeader title="Portfolio" />
      <ProgressBar currentStep={5} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Show your work</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Upload up to {MAX_ITEMS} sample photos or videos
          </Text>
        </Animated.View>

        <View style={styles.grid}>
          {creatorDraft.portfolio_uris.map((uri) => (
            <View key={uri} style={styles.thumbWrap}>
              <AdaptiveImage source={{ uri }} style={[styles.thumb, { borderColor: colors.border }]} contentFit="cover" accessibilityLabel="Portfolio upload" />
              <PressableScale
                onPress={() => removeItem(uri)}
                style={[styles.removeBtn, { backgroundColor: colors.error }]}
                scaleValue={0.85}
                accessibilityRole="button"
                accessibilityLabel="Remove this image"
                accessibilityHint="Removes this photo from your portfolio"
              >
                <X size={14} color="#fff" strokeWidth={3} />
              </PressableScale>
            </View>
          ))}
          {creatorDraft.portfolio_uris.length < MAX_ITEMS && (
            <PressableScale
              onPress={pickImage}
              style={[styles.addBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              scaleValue={0.94}
              accessibilityRole="button"
              accessibilityLabel="Add portfolio image"
              accessibilityHint="Opens camera roll to select a photo"
            >
              <Plus size={28} color={colors.textTertiary} strokeWidth={2} />
            </PressableScale>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          title="Next"
          onPress={handleNext}
          size="lg"
          fullWidth
          icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2} />}
        />
        {creatorDraft.portfolio_uris.length === 0 && (
          <PressableScale onPress={() => { haptics.tap(); handleNext(); }} style={styles.skipWrap} scaleValue={0.95} accessibilityRole="button" accessibilityLabel="Skip for now">
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip for now</Text>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

const GRID_COLS = 3;
const GRID_GAP = Spacing.md;
const SCREEN_PADDING = Spacing.xxl * 2;
const THUMB_SIZE = (Dimensions.get('window').width - SCREEN_PADDING - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  title: { ...Typography.title1, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, marginBottom: Spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  skipWrap: { alignItems: 'center', marginTop: Spacing.md },
  skipText: { ...Typography.subheadline },
});
