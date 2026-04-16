import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { WizardHeader } from './_WizardHeader';
import { useWizard } from './_context';

async function pickImage(aspect: [number, number]): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Allow photo access to upload images.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.85,
  });
  if (result.canceled) return null;
  return result.assets[0].uri;
}

export default function Step2Media() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, update } = useWizard();

  const pickLogo = useCallback(async () => {
    haptics.tap();
    const uri = await pickImage([1, 1]);
    if (uri) update({ logoUri: uri });
  }, [haptics, update]);

  const pickCover = useCallback(async () => {
    haptics.tap();
    const uri = await pickImage([16, 9]);
    if (uri) update({ coverUri: uri });
  }, [haptics, update]);

  const handleContinue = useCallback(() => {
    haptics.confirm();
    router.push('/(business-onboarding)/step3');
  }, [haptics, router]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <WizardHeader
        step={2}
        title="Add your brand visuals"
        subtitle="Logo and cover photo help creators recognise your brand"
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400).delay(50)} style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Logo</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Square image, at least 400×400 px
          </Text>
          <PressableScale
            scaleValue={0.96}
            onPress={pickLogo}
            accessibilityRole="button"
            accessibilityLabel="Upload logo"
            style={[
              styles.logoBox,
              { borderColor: colors.border, backgroundColor: colors.surface, ...Shadows.sm },
            ]}
          >
            {state.logoUri ? (
              <Image source={{ uri: state.logoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.placeholder}>
                <Camera size={32} color={colors.textTertiary} strokeWidth={1.5} />
                <Text style={[styles.placeholderText, { color: colors.textTertiary }]}>
                  Tap to upload
                </Text>
              </View>
            )}
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Cover photo</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            16:9 landscape image — shown at the top of your profile
          </Text>
          <PressableScale
            scaleValue={0.97}
            onPress={pickCover}
            accessibilityRole="button"
            accessibilityLabel="Upload cover photo"
            style={[
              styles.coverBox,
              { borderColor: colors.border, backgroundColor: colors.surface, ...Shadows.sm },
            ]}
          >
            {state.coverUri ? (
              <Image source={{ uri: state.coverUri }} style={styles.coverImage} />
            ) : (
              <View style={styles.placeholder}>
                <ImageIcon size={36} color={colors.textTertiary} strokeWidth={1.5} />
                <Text style={[styles.placeholderText, { color: colors.textTertiary }]}>
                  Tap to upload
                </Text>
              </View>
            )}
          </PressableScale>
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Button
          title={state.logoUri || state.coverUri ? 'Continue' : 'Skip for now'}
          onPress={handleContinue}
          size="lg"
          fullWidth
          variant={state.logoUri || state.coverUri ? 'primary' : 'secondary'}
        />
      </View>
    </View>
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
    marginBottom: Spacing.xs,
  },
  hint: {
    ...Typography.caption1,
    marginBottom: Spacing.md,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  coverBox: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 180,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  placeholderText: {
    ...Typography.footnote,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
});
