import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ClipboardList,
  BarChart3,
  Trophy,
  Users,
  Zap,
  ChevronRight,
  Sparkles,
  Target,
  Share2,
  Timer,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Springs,
  Glass,
  Layout,
} from '../../constants/theme';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OnboardingProps {
  onComplete: () => void;
}

interface OnboardingStep {
  key: string;
  icon: React.ReactNode;
  floatingIcons: Array<{
    Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
    position: ViewStyle;
    delay: number;
    size: number;
  }>;
  title: string;
  subtitle: string;
  description: string;
  gradientColors: [string, string, string];
}

// ─── Animated Floating Icon ─────────────────────────────────────────────────

function FloatingIcon({
  Icon,
  position,
  delay,
  size,
  color,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  position: ViewStyle;
  delay: number;
  size: number;
  color: string;
}) {
  const float = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-12, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(12, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.floatingIcon, position, animStyle]}>
      <Icon size={size} color={color} strokeWidth={1.5} />
    </Animated.View>
  );
}

// ─── Pulsing Hero Icon ──────────────────────────────────────────────────────

function HeroIcon({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.3);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <Animated.View style={[styles.heroContainer, animStyle]}>
      <Animated.View
        style={[
          styles.heroGlow,
          {
            backgroundColor: isDark
              ? 'rgba(203,213,225,0.15)'
              : 'rgba(71,85,105,0.08)',
          },
          glowStyle,
        ]}
      />
      <View
        style={[
          styles.heroInner,
          {
            backgroundColor: isDark
              ? 'rgba(45,55,72,0.8)'
              : 'rgba(255,255,255,0.85)',
            borderColor: isDark
              ? 'rgba(55,65,81,0.5)'
              : 'rgba(221,217,213,0.6)',
          },
        ]}
      >
        {children}
      </View>
    </Animated.View>
  );
}

// ─── Progress Dots ──────────────────────────────────────────────────────────

function ProgressDots({
  total,
  current,
  isDark,
}: {
  total: number;
  current: number;
  isDark: boolean;
}) {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: total }).map((_, i) => (
        <Dot key={i} active={i === current} isDark={isDark} />
      ))}
    </View>
  );
}

function Dot({ active, isDark }: { active: boolean; isDark: boolean }) {
  const width = useSharedValue(active ? 24 : 8);
  const opacity = useSharedValue(active ? 1 : 0.35);

  useEffect(() => {
    width.value = withSpring(active ? 24 : 8, Springs.snappy);
    opacity.value = withTiming(active ? 1 : 0.35, { duration: 300 });
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: isDark ? '#CBD5E1' : '#475569',
        },
        animStyle,
      ]}
    />
  );
}

// ─── Main Onboarding Component ──────────────────────────────────────────────

export function Onboarding({ onComplete }: OnboardingProps) {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const { width, height } = useWindowDimensions();
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Shared values for page transitions
  const contentOpacity = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);

  const steps: OnboardingStep[] = [
    {
      key: 'welcome',
      icon: (
        <Sparkles
          size={52}
          color={isDark ? '#CBD5E1' : '#475569'}
          strokeWidth={1.5}
        />
      ),
      floatingIcons: [
        { Icon: ClipboardList, position: { top: '15%', left: '8%' } as ViewStyle, delay: 200, size: 28 },
        { Icon: Trophy, position: { top: '10%', right: '12%' } as ViewStyle, delay: 400, size: 24 },
        { Icon: Users, position: { top: '30%', right: '5%' } as ViewStyle, delay: 600, size: 22 },
        { Icon: Zap, position: { top: '28%', left: '5%' } as ViewStyle, delay: 800, size: 20 },
      ],
      title: 'Welcome to Point!',
      subtitle: 'Your all-in-one companion',
      description:
        'Create surveys, track sports scores in real time, and connect with friends — all in one beautiful app.',
      gradientColors: isDark
        ? ['#1E293B', '#2D3748', '#1E293B']
        : ['#F1F0EE', '#E2E8F0', '#F1F0EE'],
    },
    {
      key: 'surveys',
      icon: (
        <BarChart3
          size={52}
          color={isDark ? '#6EE7B7' : '#059669'}
          strokeWidth={1.5}
        />
      ),
      floatingIcons: [
        { Icon: ClipboardList, position: { top: '12%', left: '10%' } as ViewStyle, delay: 200, size: 26 },
        { Icon: Share2, position: { top: '18%', right: '8%' } as ViewStyle, delay: 400, size: 24 },
        { Icon: Target, position: { top: '32%', left: '6%' } as ViewStyle, delay: 600, size: 22 },
        { Icon: BarChart3, position: { top: '28%', right: '10%' } as ViewStyle, delay: 800, size: 20 },
      ],
      title: 'Powerful Surveys',
      subtitle: 'Create, share, analyse',
      description:
        'Build beautiful polls and surveys in seconds, share them with anyone, and watch responses roll in with live analytics.',
      gradientColors: isDark
        ? ['#1E293B', '#15201D', '#1E293B']
        : ['#F1F0EE', '#ECFDF5', '#F1F0EE'],
    },
    {
      key: 'sports',
      icon: (
        <Trophy
          size={52}
          color={isDark ? '#FBBF24' : '#D97706'}
          strokeWidth={1.5}
        />
      ),
      floatingIcons: [
        { Icon: Timer, position: { top: '14%', left: '8%' } as ViewStyle, delay: 200, size: 26 },
        { Icon: Zap, position: { top: '10%', right: '12%' } as ViewStyle, delay: 400, size: 22 },
        { Icon: Target, position: { top: '30%', right: '6%' } as ViewStyle, delay: 600, size: 24 },
        { Icon: Trophy, position: { top: '26%', left: '5%' } as ViewStyle, delay: 800, size: 20 },
      ],
      title: 'Live Sports Scoring',
      subtitle: '11 sports, real-time tracking',
      description:
        'Keep score for football, tennis, basketball and more. Invite friends to follow along live, with beautiful match summaries.',
      gradientColors: isDark
        ? ['#1E293B', '#1F1D15', '#1E293B']
        : ['#F1F0EE', '#FFFBEB', '#F1F0EE'],
    },
    {
      key: 'start',
      icon: (
        <Users
          size={52}
          color={isDark ? '#CBD5E1' : '#475569'}
          strokeWidth={1.5}
        />
      ),
      floatingIcons: [
        { Icon: Sparkles, position: { top: '12%', left: '10%' } as ViewStyle, delay: 200, size: 26 },
        { Icon: Users, position: { top: '16%', right: '8%' } as ViewStyle, delay: 400, size: 24 },
        { Icon: Zap, position: { top: '30%', left: '6%' } as ViewStyle, delay: 600, size: 20 },
        { Icon: Share2, position: { top: '28%', right: '10%' } as ViewStyle, delay: 800, size: 22 },
      ],
      title: 'Better Together',
      subtitle: 'Connect with friends',
      description:
        'Add friends, send game invites, and build your stats. Your Point! journey starts now.',
      gradientColors: isDark
        ? ['#1E293B', '#2D3748', '#1E293B']
        : ['#F1F0EE', '#E2E8F0', '#F1F0EE'],
    },
  ];

  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const transitionTo = useCallback(
    (nextStep: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      haptics.light();

      // Fade out current content
      contentOpacity.value = withTiming(0, { duration: 180 });
      contentTranslateY.value = withTiming(-20, { duration: 180 });

      // After fade out, switch step and fade in
      const switchAndFadeIn = () => {
        setCurrentStep(nextStep);
        contentTranslateY.value = 30;
        contentOpacity.value = withDelay(
          50,
          withSpring(1, { damping: 20, stiffness: 200 }),
        );
        contentTranslateY.value = withDelay(
          50,
          withSpring(0, Springs.gentle),
        );
        setTimeout(() => setIsTransitioning(false), 400);
      };

      setTimeout(() => runOnJS(switchAndFadeIn)(), 200);
    },
    [isTransitioning, haptics, contentOpacity, contentTranslateY],
  );

  const handleNext = useCallback(() => {
    if (isLastStep) {
      haptics.success();
      onComplete();
    } else {
      transitionTo(currentStep + 1);
    }
  }, [isLastStep, currentStep, haptics, onComplete, transitionTo]);

  const handleSkip = useCallback(() => {
    haptics.light();
    onComplete();
  }, [haptics, onComplete]);

  const floatingIconColor = isDark
    ? 'rgba(203,213,225,0.2)'
    : 'rgba(71,85,105,0.12)';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={step.gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating background icons */}
      {step.floatingIcons.map((fi, i) => (
        <FloatingIcon
          key={`${step.key}-${i}`}
          Icon={fi.Icon}
          position={fi.position}
          delay={fi.delay}
          size={fi.size}
          color={floatingIconColor}
        />
      ))}

      {/* Skip button */}
      {!isLastStep && (
        <Animated.View
          entering={FadeIn.delay(600).duration(400)}
          style={styles.skipButton}
        >
          <Pressable
            onPress={handleSkip}
            hitSlop={16}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text
              style={[
                Typography.subheadline,
                { color: colors.textSecondary },
              ]}
            >
              Skip
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Main content */}
      <Animated.View style={[styles.contentContainer, contentStyle]}>
        {/* Hero icon */}
        <HeroIcon isDark={isDark}>{step.icon}</HeroIcon>

        {/* Glass card with text content */}
        <View style={styles.cardWrapper}>
          <View
            style={[
              styles.glassCard,
              {
                backgroundColor: isDark
                  ? Glass.dark.background
                  : Glass.light.background,
                borderColor: isDark ? Glass.dark.border : Glass.light.border,
              },
            ]}
          >
            <BlurView
              intensity={40}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.cardContent}>
              <Text
                style={[
                  Typography.largeTitle,
                  { color: colors.text, textAlign: 'center' },
                ]}
              >
                {step.title}
              </Text>
              <Text
                style={[
                  Typography.headline,
                  {
                    color: isDark ? '#6EE7B7' : '#059669',
                    textAlign: 'center',
                    marginTop: Spacing.sm,
                  },
                ]}
              >
                {step.subtitle}
              </Text>
              <Text
                style={[
                  Typography.body,
                  {
                    color: colors.textSecondary,
                    textAlign: 'center',
                    marginTop: Spacing.lg,
                    lineHeight: 24,
                    paddingHorizontal: Spacing.sm,
                  },
                ]}
              >
                {step.description}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Bottom area: dots + button */}
      <Animated.View
        entering={FadeInUp.delay(500).duration(500).springify()}
        style={styles.bottomArea}
      >
        <ProgressDots
          total={steps.length}
          current={currentStep}
          isDark={isDark}
        />

        <Pressable
          onPress={handleNext}
          disabled={isTransitioning}
          style={({ pressed }) => [
            styles.nextButton,
            {
              backgroundColor: isDark ? '#CBD5E1' : '#475569',
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Text
            style={[
              Typography.headline,
              {
                color: isDark ? '#1E293B' : '#FFFFFF',
                marginRight: isLastStep ? 0 : Spacing.xs,
              },
            ]}
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </Text>
          {!isLastStep && (
            <ChevronRight
              size={20}
              color={isDark ? '#1E293B' : '#FFFFFF'}
              strokeWidth={2.5}
            />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },
  floatingIcon: {
    position: 'absolute',
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: 40,
  },
  heroContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  heroGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroInner: {
    width: 120,
    height: 120,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 380,
  },
  glassCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    padding: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  bottomArea: {
    paddingBottom: 50,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.xxl,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: BorderRadius.full,
    width: '100%',
    maxWidth: 320,
  },
});
