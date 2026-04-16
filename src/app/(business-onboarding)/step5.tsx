import React, { useCallback, useState } from 'react';
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
import { Instagram, Globe } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Button } from '../../components/ui/Button';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';
import { WizardHeader } from './_WizardHeader';
import { useWizard } from './_context';

function TikTokIcon({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.75, fontWeight: '700' }}>T</Text>
    </View>
  );
}

function YouTubeIcon({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.7, fontWeight: '700' }}>▶</Text>
    </View>
  );
}

const isValidUrl = (url: string) => {
  if (!url) return true;
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
};

export default function Step5Social() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, update } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stripAt = (h: string) => h.replace(/^@/, '');

  const handleContinue = useCallback(() => {
    const e: Record<string, string> = {};
    if (state.website && !isValidUrl(state.website)) {
      e.website = 'Enter a valid URL, e.g. https://yourbrand.com';
    }
    if (Object.keys(e).length) {
      setErrors(e);
      haptics.warning();
      return;
    }
    haptics.confirm();
    router.push('/(business-onboarding)/step6');
  }, [state.website, haptics, router]);

  const inputRow = (
    icon: React.ReactNode,
    label: string,
    value: string,
    onChange: (t: string) => void,
    placeholder: string,
    field: string,
    keyboardType: 'default' | 'url' = 'default',
  ) => (
    <Animated.View entering={FadeInDown.duration(400).delay(50)} style={styles.section}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surface,
            borderColor: errors[field] ? colors.error : colors.border,
          },
        ]}
      >
        <View style={styles.inputIcon}>{icon}</View>
        <TextInput
          style={[styles.inputInner, { color: colors.text }]}
          value={value}
          onChangeText={(t) => {
            onChange(t);
            if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }));
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
          returnKeyType="next"
          accessibilityLabel={label}
        />
      </View>
      {errors[field] ? (
        <Text style={[styles.error, { color: colors.error }]}>{errors[field]}</Text>
      ) : null}
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <WizardHeader
        step={5}
        title="Social & web presence"
        subtitle="Let creators find your brand online"
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {inputRow(
          <Instagram size={20} color={colors.textSecondary} strokeWidth={2} />,
          'Instagram handle',
          state.instagramHandle,
          (t) => update({ instagramHandle: stripAt(t) }),
          '@yourbrand',
          'instagram',
        )}
        {inputRow(
          <TikTokIcon color={colors.textSecondary} size={20} />,
          'TikTok handle',
          state.tiktokHandle,
          (t) => update({ tiktokHandle: stripAt(t) }),
          '@yourbrand',
          'tiktok',
        )}
        {inputRow(
          <YouTubeIcon color={colors.textSecondary} size={20} />,
          'YouTube channel',
          state.youtubeHandle,
          (t) => update({ youtubeHandle: t }),
          'YourBrandChannel',
          'youtube',
        )}
        {inputRow(
          <Globe size={20} color={colors.textSecondary} strokeWidth={2} />,
          'Website',
          state.website,
          (t) => update({ website: t }),
          'https://yourbrand.com',
          'website',
          'url',
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Button
          title={
            state.instagramHandle || state.tiktokHandle || state.website
              ? 'Continue'
              : 'Skip for now'
          }
          onPress={handleContinue}
          size="lg"
          fullWidth
          variant={
            state.instagramHandle || state.tiktokHandle || state.website
              ? 'primary'
              : 'secondary'
          }
        />
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
    marginBottom: Spacing.xl,
  },
  label: {
    ...Typography.headline,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  inputIcon: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputInner: {
    flex: 1,
    height: '100%',
    ...Typography.body,
    paddingRight: Spacing.lg,
  },
  error: {
    ...Typography.caption1,
    marginTop: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
});
