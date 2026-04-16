import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Camera, Store, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PressableScale } from '../../components/ui/PressableScale';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Colors,
} from '../../constants/theme';

export default function RoleScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptics = useHaptics();

  const handleSelect = useCallback(
    (role: 'creator' | 'business' | 'both') => {
      haptics.confirm();
      if (role === 'both' || role === 'creator') {
        router.push('/onboarding/creator' as any);
      } else {
        router.push('/onboarding/business' as any);
      }
    },
    [haptics, router],
  );

  const gradientColors: [string, string] = isDark
    ? [Colors.dark.primaryLight, Colors.dark.primary]
    : [Colors.light.primaryLight, Colors.light.primary];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Who are you?" showBack={false} />

      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose how you'd like to use Surve
        </Text>

        <View style={styles.cards}>
          <RoleCard
            Icon={Camera}
            label="Creator"
            description="Create content and collaborate with businesses"
            gradientColors={gradientColors}
            onPress={() => handleSelect('creator')}
          />
          <RoleCard
            Icon={Store}
            label="Business"
            description="Find creators for authentic hospitality content"
            gradientColors={gradientColors}
            onPress={() => handleSelect('business')}
          />
        </View>

        <BothOption onPress={() => handleSelect('both')} />
      </View>
    </View>
  );
}

function RoleCard({
  Icon,
  label,
  description,
  gradientColors,
  onPress,
}: {
  Icon: typeof Camera;
  label: string;
  description: string;
  gradientColors: [string, string];
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <PressableScale
      scaleValue={0.96}
      onPress={onPress}
      style={[
        styles.cardOuter,
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        Shadows.md,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${description}`}
      accessibilityHint="Double tap to select this role"
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconCircle}
      >
        <Icon size={28} color="#FFFFFF" strokeWidth={2} />
      </LinearGradient>
      <Text style={[styles.cardLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
        {description}
      </Text>
    </PressableScale>
  );
}

function BothOption({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.bothButton,
        { borderColor: colors.border },
      ]}
      accessibilityRole="button"
      accessibilityLabel="I want to do both"
      accessibilityHint="Double tap to set up as both creator and business"
    >
      <Users size={20} color={colors.primary} strokeWidth={2} />
      <Text style={[styles.bothText, { color: colors.primary }]}>
        I want to do both
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  cards: {
    gap: Spacing.lg,
  },
  cardOuter: {
    width: '100%',
  },
  card: {
    padding: Spacing.xxl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cardLabel: {
    ...Typography.title3,
  },
  cardDesc: {
    ...Typography.subheadline,
    textAlign: 'center',
  },
  bothButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xxl,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  bothText: {
    ...Typography.headline,
  },
});
