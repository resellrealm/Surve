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
import { FileText, CheckCircle2, Shield } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { WizardHeader } from './_WizardHeader';
import { useWizard } from './_context';

async function pickLicense(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Allow photo access to upload your license.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.9,
  });
  if (result.canceled) return null;
  return result.assets[0].uri;
}

export default function Step6License() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, update } = useWizard();

  const handlePick = useCallback(async () => {
    haptics.tap();
    const uri = await pickLicense();
    if (uri) update({ licenseUri: uri });
  }, [haptics, update]);

  const handleContinue = useCallback(() => {
    haptics.confirm();
    router.push('/(business-onboarding)/step7');
  }, [haptics, router]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <WizardHeader
        step={6}
        title="Business license"
        subtitle="Upload a photo of your license — reviewed within 24 hours"
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
          style={[styles.infoCard, { backgroundColor: colors.activeLight }]}
        >
          <Shield size={20} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Your document is encrypted and only visible to the Surve trust & safety team.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <PressableScale
            scaleValue={0.97}
            onPress={handlePick}
            accessibilityRole="button"
            accessibilityLabel="Upload business license"
            style={[
              styles.uploadBox,
              {
                borderColor: state.licenseUri ? colors.success : colors.border,
                backgroundColor: colors.surface,
                ...Shadows.sm,
              },
            ]}
          >
            {state.licenseUri ? (
              <View style={styles.uploadedContent}>
                <Image
                  source={{ uri: state.licenseUri }}
                  style={styles.preview}
                  resizeMode="cover"
                />
                <View style={[styles.uploadedBadge, { backgroundColor: colors.successLight }]}>
                  <CheckCircle2 size={16} color={colors.success} strokeWidth={2.5} />
                  <Text style={[styles.uploadedText, { color: colors.success }]}>
                    Document uploaded
                  </Text>
                </View>
                <Text style={[styles.retapHint, { color: colors.textSecondary }]}>
                  Tap to replace
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContent}>
                <View
                  style={[styles.iconCircle, { backgroundColor: colors.surfaceSecondary }]}
                >
                  <FileText size={32} color={colors.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={[styles.uploadTitle, { color: colors.text }]}>
                  Upload license photo
                </Text>
                <Text style={[styles.uploadSubtitle, { color: colors.textSecondary }]}>
                  JPG or PNG — photo of your current business license
                </Text>
                <Text style={[styles.uploadNote, { color: colors.textTertiary }]}>
                  PDF support coming soon via expo-document-picker
                </Text>
              </View>
            )}
          </PressableScale>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(160)}
          style={styles.checkList}
        >
          {[
            'Ensure all text is clearly readable',
            'Include the full document (not cropped)',
            'Valid and not expired',
          ].map((item) => (
            <View key={item} style={styles.checkRow}>
              <CheckCircle2 size={16} color={colors.success} strokeWidth={2.5} />
              <Text style={[styles.checkText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Button
          title={state.licenseUri ? 'Continue' : 'Skip for now'}
          onPress={handleContinue}
          size="lg"
          fullWidth
          variant={state.licenseUri ? 'primary' : 'secondary'}
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
    gap: Spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  infoText: {
    ...Typography.footnote,
    flex: 1,
    lineHeight: 18,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    minHeight: 200,
  },
  uploadedContent: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  preview: {
    width: '100%',
    height: 180,
  },
  uploadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  uploadedText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  retapHint: {
    ...Typography.caption2,
    marginBottom: Spacing.md,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    ...Typography.headline,
  },
  uploadSubtitle: {
    ...Typography.subheadline,
    textAlign: 'center',
  },
  uploadNote: {
    ...Typography.caption2,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  checkList: {
    gap: Spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkText: {
    ...Typography.subheadline,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
});
