import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowRight, ImagePlus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../hooks/useTheme';
import { toast } from '../../../lib/toast';
import { useHaptics } from '../../../hooks/useHaptics';
import { usePermissionPrime } from '../../../hooks/usePermissionPrime';
import { useStore } from '../../../lib/store';
import { Button } from '../../../components/ui/Button';
import { PressableScale } from '../../../components/ui/PressableScale';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { PermissionPrime } from '../../../components/ui/PermissionPrime';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import { AdaptiveImage } from '../../../components/ui/AdaptiveImage';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../../constants/theme';

const TOTAL_STEPS = 5;
const MAX_GALLERY = 6;

async function pickImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export default function BusinessPhotosScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { businessDraft, updateBusinessDraft } = useStore();
  const photoPrime = usePermissionPrime('photo-library');

  const handlePickCover = useCallback(async () => {
    haptics.confirm();
    await photoPrime.prime(async () => {
      const uri = await pickImage();
      if (uri) updateBusinessDraft({ coverPhotoUri: uri });
    });
  }, [updateBusinessDraft, photoPrime]);

  const handleAddGallery = useCallback(async () => {
    if (businessDraft.galleryUris.length >= MAX_GALLERY) {
      toast.warning(`Maximum ${MAX_GALLERY} gallery photos`);
      return;
    }
    haptics.confirm();
    await photoPrime.prime(async () => {
      const uri = await pickImage();
      if (uri) {
        updateBusinessDraft({
          galleryUris: [...businessDraft.galleryUris, uri],
        });
      }
    });
  }, [businessDraft.galleryUris, updateBusinessDraft, photoPrime]);

  const handleRemoveGallery = useCallback(
    (index: number) => {
      haptics.tap();
      updateBusinessDraft({
        galleryUris: businessDraft.galleryUris.filter((_, i) => i !== index),
      });
    },
    [businessDraft.galleryUris, updateBusinessDraft]
  );

  const handleNext = useCallback(() => {
    haptics.confirm();
    router.push('/onboarding/business/review');
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PermissionPrime
        kind="photo-library"
        visible={photoPrime.visible}
        onConfirm={photoPrime.confirm}
        onDismiss={photoPrime.dismiss}
      />
      <ScreenHeader title="Photos" />
      <ProgressBar currentStep={4} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
            Add photos
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Show creators what your space looks like
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Cover Photo
          </Text>
          <PressableScale onPress={handlePickCover} scaleValue={0.97} accessibilityRole="button" accessibilityLabel="Pick cover photo">
            {businessDraft.coverPhotoUri ? (
              <AdaptiveImage
                source={{ uri: businessDraft.coverPhotoUri }}
                style={[styles.coverImage, { borderColor: colors.border }]}
                contentFit="cover"
                accessibilityLabel="Business cover photo"
              />
            ) : (
              <View
                style={[
                  styles.coverPlaceholder,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSecondary,
                  },
                ]}
              >
                <ImagePlus size={32} color={colors.textTertiary} strokeWidth={1.5} />
                <Text style={[styles.placeholderText, { color: colors.textTertiary }]}>
                  Add cover image
                </Text>
                <Text style={[styles.placeholderHint, { color: colors.textTertiary }]}>
                  Recommended: 1200x800px
                </Text>
              </View>
            )}
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Gallery ({businessDraft.galleryUris.length}/{MAX_GALLERY})
          </Text>
          <View style={styles.galleryGrid}>
            {businessDraft.galleryUris.map((uri, i) => (
              <View key={i} style={styles.galleryItem}>
                <AdaptiveImage
                  source={{ uri }}
                  style={[styles.galleryImage, { borderColor: colors.border }]}
                  contentFit="cover"
                  accessibilityLabel={`Gallery image ${i + 1}`}
                />
                <PressableScale
                  onPress={() => handleRemoveGallery(i)}
                  style={[styles.removeBtn, { backgroundColor: colors.error }]}
                  hitSlop={8}
                  scaleValue={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Remove gallery image"
                >
                  <X size={12} color="#fff" strokeWidth={3} />
                </PressableScale>
              </View>
            ))}
            {businessDraft.galleryUris.length < MAX_GALLERY && (
              <PressableScale onPress={handleAddGallery} scaleValue={0.94} accessibilityRole="button" accessibilityLabel="Add gallery image">
                <View
                  style={[
                    styles.galleryAdd,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                    },
                  ]}
                >
                  <ImagePlus size={24} color={colors.textTertiary} strokeWidth={1.5} />
                </View>
              </PressableScale>
            )}
          </View>
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
  sectionLabel: {
    ...Typography.headline,
    marginBottom: Spacing.md,
  },
  coverImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xxl,
  },
  coverPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  placeholderText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  placeholderHint: {
    ...Typography.caption1,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  galleryItem: {
    position: 'relative',
  },
  galleryImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryAdd: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
});
