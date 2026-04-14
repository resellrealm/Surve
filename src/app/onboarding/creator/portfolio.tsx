import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus, X, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../hooks/useTheme';
import { useStore } from '../../../lib/store';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import { Typography, Spacing, BorderRadius } from '../../../constants/theme';

const TOTAL_STEPS = 7;
const MAX_ITEMS = 5;

export default function CreatorPortfolioScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { creatorDraft, updateCreatorDraft } = useStore();
  const [picking, setPicking] = useState(false);

  const pickImage = useCallback(async () => {
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newUris = result.assets.map((a) => a.uri);
        updateCreatorDraft({
          portfolio_uris: [...creatorDraft.portfolio_uris, ...newUris].slice(0, MAX_ITEMS),
        });
      }
    } finally {
      setPicking(false);
    }
  }, [picking, creatorDraft.portfolio_uris, updateCreatorDraft]);

  const removeItem = useCallback(
    (uri: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateCreatorDraft({
        portfolio_uris: creatorDraft.portfolio_uris.filter((u) => u !== uri),
      });
    },
    [creatorDraft.portfolio_uris, updateCreatorDraft],
  );

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/creator/stripe-connect' as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Portfolio" />
      <ProgressBar currentStep={5} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.title, { color: colors.text }]}>Show your work</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Upload up to {MAX_ITEMS} sample photos or videos
          </Text>
        </Animated.View>

        <View style={styles.grid}>
          {creatorDraft.portfolio_uris.map((uri) => (
            <View key={uri} style={styles.thumbWrap}>
              <Image source={{ uri }} style={[styles.thumb, { borderColor: colors.border }]} />
              <Pressable
                onPress={() => removeItem(uri)}
                style={[styles.removeBtn, { backgroundColor: colors.error }]}
              >
                <X size={14} color="#fff" strokeWidth={3} />
              </Pressable>
            </View>
          ))}
          {creatorDraft.portfolio_uris.length < MAX_ITEMS && (
            <Pressable
              onPress={pickImage}
              style={[styles.addBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Plus size={28} color={colors.textTertiary} strokeWidth={2} />
            </Pressable>
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
          <Pressable onPress={handleNext} style={styles.skipWrap}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip for now</Text>
          </Pressable>
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
