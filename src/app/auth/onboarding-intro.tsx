import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  interpolateColor,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Extrapolation,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  ArrowRight,
  Search,
  Handshake,
  TrendingUp,
} from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { PressableScale } from '../../components/ui/PressableScale';
import {
  Typography,
  Spacing,
  BorderRadius,
  Fonts,
} from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ONBOARDING_INTRO_SEEN_KEY = 'surve_onboarding_intro_seen';

type Slide = {
  key: string;
  kicker: string;
  title: string;
  subtitle: string;
  Icon: typeof Search;
  accent: [string, string];
};

const SLIDES: readonly Slide[] = [
  {
    key: 'discover',
    kicker: 'Discover',
    title: 'Find the perfect\ncollaboration.',
    subtitle:
      'Browse curated listings from hotels, restaurants, bars and resorts looking for creators just like you.',
    Icon: Search,
    accent: ['#2c428f', '#4A6CF7'],
  },
  {
    key: 'connect',
    kicker: 'Connect',
    title: 'Work with brands\nyou love.',
    subtitle:
      'Apply to listings, chat directly with venues, and build lasting partnerships — all in one place.',
    Icon: Handshake,
    accent: ['#111d4a', '#2c428f'],
  },
  {
    key: 'earn',
    kicker: 'Earn & Book',
    title: 'Get paid for\nauthentic content.',
    subtitle:
      'Transparent rates, escrow-protected payments, and direct payouts. No guessing, no chasing invoices.',
    Icon: TrendingUp,
    accent: ['#1a2a5f', '#3a4f99'],
  },
] as const;

export default function OnboardingIntroScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptics = useHaptics();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const activeIndex = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
      const next = Math.round(e.contentOffset.x / SCREEN_WIDTH);
      if (next !== activeIndex.value) {
        activeIndex.value = next;
        runOnJS(haptics.tap)();
      }
    },
  });

  const markSeen = useCallback(async () => {
    await SecureStore.setItemAsync(ONBOARDING_INTRO_SEEN_KEY, '1');
  }, []);

  const goNext = useCallback(() => {
    haptics.confirm();
    const current = activeIndex.value;
    if (current < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (current + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      markSeen();
      router.replace('/auth/login');
    }
  }, [activeIndex.value, haptics, router, markSeen]);

  const skip = useCallback(() => {
    haptics.tap();
    markSeen();
    router.replace('/auth/login');
  }, [haptics, router, markSeen]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <AnimatedGradient scrollX={scrollX} />
      <FloatingOrbs scrollX={scrollX} />

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, i) => (
          <SlideView key={slide.key} slide={slide} index={i} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>

        <View style={styles.buttonRow}>
          <PressableScale onPress={skip} hitSlop={12} scaleValue={0.95} accessibilityRole="button" accessibilityLabel="Skip onboarding" accessibilityHint="Skips the introduction and goes to sign in">
            <Text style={styles.skipText}>Skip</Text>
          </PressableScale>
          <CTAButton scrollX={scrollX} onPress={goNext} />
        </View>
      </View>
    </View>
  );
}

function AnimatedGradient({ scrollX }: { scrollX: SharedValue<number> }) {
  const gradientStyle = useAnimatedStyle(() => {
    const input = SLIDES.map((_, i) => i * SCREEN_WIDTH);
    const opacity = interpolate(
      scrollX.value,
      input,
      SLIDES.map(() => 1),
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]}>
      <LinearGradient
        colors={['#111d4a', '#2c428f', '#1a2a5f']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function FloatingOrbs({ scrollX }: { scrollX: SharedValue<number> }) {
  const pulse = useSharedValue(0);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2800 }),
        withTiming(0, { duration: 2800 }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const topOrb = useAnimatedStyle(() => ({
    transform: [
      { translateX: -scrollX.value * 0.35 },
      { translateY: interpolate(pulse.value, [0, 1], [-8, 8]) },
      { scale: interpolate(pulse.value, [0, 1], [1, 1.08]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.6]),
  }));
  const bottomOrb = useAnimatedStyle(() => ({
    transform: [
      { translateX: -scrollX.value * 0.55 },
      { translateY: interpolate(pulse.value, [0, 1], [10, -10]) },
      { scale: interpolate(pulse.value, [0, 1], [1.1, 1]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.25, 0.5]),
  }));

  return (
    <>
      <Animated.View style={[styles.orb, styles.orbTop, topOrb]}>
        <LinearGradient
          colors={['rgba(74,108,247,0.9)', 'rgba(74,108,247,0)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.orb, styles.orbBottom, bottomOrb]}>
        <LinearGradient
          colors={['rgba(44,66,143,0.9)', 'rgba(44,66,143,0)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </>
  );
}

function SlideView({
  slide,
  index,
  scrollX,
}: {
  slide: Slide;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const logoFloat = useSharedValue(0);
  React.useEffect(() => {
    logoFloat.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200 }),
        withTiming(0, { duration: 3200 }),
      ),
      -1,
      false,
    );
  }, [logoFloat]);

  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const heroStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [SCREEN_WIDTH * 0.3, 0, -SCREEN_WIDTH * 0.3],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.85, 1, 0.85],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    );
    const float = interpolate(logoFloat.value, [0, 1], [-6, 6]);
    return {
      transform: [{ translateX }, { scale }, { translateY: float }],
      opacity,
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [SCREEN_WIDTH * 0.5, 0, -SCREEN_WIDTH * 0.5],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX }], opacity };
  });

  const subtitleStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [SCREEN_WIDTH * 0.7, 0, -SCREEN_WIDTH * 0.7],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX }], opacity };
  });

  const kickerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [12, 0, -12],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }], opacity };
  });

  const Icon = slide.Icon;

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.heroWrap, heroStyle]}>
        <GlassIcon Icon={Icon} accent={slide.accent} />
      </Animated.View>

      <View style={styles.copyBlock}>
        <Animated.Text style={[styles.kicker, kickerStyle]}>
          {slide.kicker.toUpperCase()}
        </Animated.Text>
        <Animated.Text style={[styles.title, titleStyle]}>
          {slide.title}
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          {slide.subtitle}
        </Animated.Text>
      </View>
    </View>
  );
}

function GlassIcon({
  Icon,
  accent,
}: {
  Icon: typeof Search;
  accent: [string, string];
}) {
  return (
    <View style={styles.glassIconWrap}>
      <LinearGradient
        colors={[accent[0], accent[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <BlurView intensity={40} tint="light" style={styles.glassBlur} />
      <View style={styles.glassHighlight} />
      <Icon size={96} color="#FFFFFF" strokeWidth={1.5} />
    </View>
  );
}

function Dot({
  index,
  scrollX,
}: {
  index: number;
  scrollX: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value,
      [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
      ],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return {
      width: 8 + progress * 20,
      opacity: 0.3 + progress * 0.7,
      backgroundColor: interpolateColor(
        progress,
        [0, 1],
        ['rgba(255,255,255,0.4)', '#FFFFFF'],
      ),
    };
  });
  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

function CTAButton({
  scrollX,
  onPress,
}: {
  scrollX: SharedValue<number>;
  onPress: () => void;
}) {
  const containerStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value,
      [0, (SLIDES.length - 1) * SCREEN_WIDTH],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const width = interpolate(progress, [0, 1], [140, 200]);
    return {
      width,
      backgroundColor: interpolateColor(
        progress,
        [0, 1],
        ['#FFFFFF', '#4A6CF7'],
      ),
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value,
      [0, (SLIDES.length - 1) * SCREEN_WIDTH],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      color: interpolateColor(progress, [0, 1], ['#111d4a', '#FFFFFF']),
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value,
      [0, (SLIDES.length - 1) * SCREEN_WIDTH],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX: interpolate(progress, [0, 1], [0, 4]) }],
    };
  });

  const [label, setLabel] = React.useState('Next');
  useAnimatedStyle(() => {
    const idx = Math.round(scrollX.value / SCREEN_WIDTH);
    runOnJS(setLabel)(idx >= SLIDES.length - 1 ? 'Get Started' : 'Next');
    return {};
  });

  return (
    <Animated.View style={[styles.cta, containerStyle]}>
      <PressableScale
        scaleValue={0.95}
        onPress={onPress}
        style={styles.ctaInner}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Animated.Text style={[styles.ctaText, textStyle]}>{label}</Animated.Text>
        <Animated.View style={iconStyle}>
          <ArrowRight
            size={18}
            color={label === 'Get Started' ? '#FFFFFF' : '#111d4a'}
            strokeWidth={2.5}
          />
        </Animated.View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111d4a',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  orbTop: {
    top: -SCREEN_HEIGHT * 0.15,
    left: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
  },
  orbBottom: {
    bottom: -SCREEN_HEIGHT * 0.1,
    right: -SCREEN_WIDTH * 0.3,
    width: SCREEN_WIDTH * 1.1,
    height: SCREEN_WIDTH * 1.1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: SCREEN_HEIGHT * 0.12,
    alignItems: 'center',
  },
  heroWrap: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.huge,
  },
  glassIconWrap: {
    width: 180,
    height: 180,
    borderRadius: BorderRadius.xxl * 1.4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  glassBlur: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  copyBlock: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: Spacing.huge,
  },
  kicker: {
    ...Typography.caption1,
    fontFamily: Fonts.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2.5,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.extrabold,
    fontSize: 34,
    lineHeight: 40,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xxl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: BorderRadius.full,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipText: {
    ...Typography.headline,
    fontFamily: Fonts.semibold,
    color: 'rgba(255,255,255,0.75)',
  },
  cta: {
    height: 56,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  ctaInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  ctaText: {
    ...Typography.headline,
    fontFamily: Fonts.bold,
  },
});
