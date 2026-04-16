import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import {
  Camera,
  Building2,
  ArrowRight,
} from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { toast } from '../../lib/toast';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';

interface RoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  selected: boolean;
  onPress: () => void;
}

function RoleCard({
  title,
  description,
  icon,
  features,
  selected,
  onPress,
}: RoleCardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handlePress = useCallback(() => {
    haptics.confirm();
    onPress();
  }, [onPress, haptics]);

  return (
    <PressableScale
      scaleValue={0.96}
      onPress={handlePress}
      style={[
        styles.roleCard,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${description}`}
      accessibilityState={{ selected }}
      accessibilityHint="Double tap to select this role"
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: selected
              ? colors.primary
              : colors.surfaceSecondary,
          },
        ]}
      >
        {icon}
      </View>
      <Text style={[styles.roleTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
      <View style={styles.featureList}>
        {features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <View
              style={[
                styles.featureDot,
                { backgroundColor: colors.primary },
              ]}
            />
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>
              {feature}
            </Text>
          </View>
        ))}
      </View>
    </PressableScale>
  );
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useStore();
  const params = useLocalSearchParams<{
    fullName: string;
    email: string;
    password: string;
  }>();

  const [selectedRole, setSelectedRole] = React.useState<
    'creator' | 'business' | null
  >(null);
  const [loading, setLoading] = React.useState(false);

  const handleContinue = useCallback(async () => {
    if (!selectedRole) return;

    const { fullName, email, password } = params;

    if (!fullName || !email || !password) {
      toast.error('Missing registration details. Please go back and try again.');
      return;
    }

    setLoading(true);
    haptics.success();

    const success = await signUp(email, password, fullName, selectedRole);
    setLoading(false);

    if (success) {
      router.replace('/(tabs)');
    } else {
      toast.error('Sign Up Failed: Could not create your account. The email may already be in use.');
    }
  }, [selectedRole, params, signUp, router]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      <Animated.View entering={FadeInDown.duration(600).delay(100)}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          Choose your role
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          You can always switch later in settings
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(600).delay(300)}
        style={styles.cards}
      >
        <RoleCard
          title="Creator"
          description="I create content on Instagram & TikTok"
          icon={
            <Camera
              size={28}
              color={selectedRole === 'creator' ? colors.onPrimary : colors.primary}
              strokeWidth={2}
            />
          }
          features={[
            'Browse paid opportunities',
            'Apply to listings from top brands',
            'Build your portfolio',
            'Track bookings and earnings',
          ]}
          selected={selectedRole === 'creator'}
          onPress={() => setSelectedRole('creator')}
        />

        <RoleCard
          title="Business"
          description="I own a hotel, restaurant, or venue"
          icon={
            <Building2
              size={28}
              color={selectedRole === 'business' ? colors.onPrimary : colors.primary}
              strokeWidth={2}
            />
          }
          features={[
            'Post listings for creators',
            'Browse creator profiles',
            'Manage bookings easily',
            'Grow your social presence',
          ]}
          selected={selectedRole === 'business'}
          onPress={() => setSelectedRole('business')}
        />
      </Animated.View>

      <View style={styles.bottomContainer}>
        <Button
          title="Get Started"
          onPress={handleContinue}
          loading={loading}
          size="lg"
          fullWidth
          disabled={!selectedRole}
          icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    ...Typography.largeTitle,
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxxl,
  },
  cards: {
    gap: Spacing.lg,
    flex: 1,
  },
  roleCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  roleTitle: {
    ...Typography.title2,
    marginBottom: Spacing.xs,
  },
  roleDescription: {
    ...Typography.subheadline,
    marginBottom: Spacing.md,
  },
  featureList: {
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  featureText: {
    ...Typography.subheadline,
  },
  bottomContainer: {
    paddingTop: Spacing.xl,
  },
});
