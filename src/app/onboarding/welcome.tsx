import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions,
  FlatList,
  type ViewToken,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Handshake, DollarSign, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import {
  Typography,
  Spacing,
  BorderRadius,
  Springs,
} from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    Icon: Handshake,
    title: 'Connect creators\nwith hospitality',
    subtitle: 'Find the perfect match for authentic content collaborations.',
  },
  {
    key: '2',
    Icon: DollarSign,
    title: 'Get paid for\nauthentic content',
    subtitle: 'Transparent pricing and direct payments for every collaboration.',
  },
  {
    key: '3',
    Icon: ShieldCheck,
    title: 'Escrow-protected\ndeals',
    subtitle: 'Funds are held safely until both sides are happy with the result.',
  },
] as const;

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptics = useHaptics();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const newIndex = viewableItems[0].index;
        if (newIndex !== activeIndex) {
          setActiveIndex(newIndex);
          haptics.light();
        }
      }
    },
    [activeIndex, haptics],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goNext = useCallback(() => {
    haptics.medium();
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      router.push('/onboarding/role');
    }
  }, [activeIndex, haptics, router]);

  const skip = useCallback(() => {
    haptics.medium();
    router.push('/onboarding/role');
  }, [haptics, router]);

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <SlideItem
            Icon={item.Icon}
            title={item.title}
            subtitle={item.subtitle}
          />
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} active={i === activeIndex} />
          ))}
        </View>

        <View style={styles.buttons}>
          {!isLast && (
            <Pressable onPress={skip} hitSlop={12} accessibilityRole="button">
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                Skip
              </Text>
            </Pressable>
          )}
          <AnimatedButton
            label={isLast ? 'Get Started' : 'Next'}
            onPress={goNext}
          />
        </View>
      </View>
    </View>
  );
}

function SlideItem({
  Icon,
  title,
  subtitle,
}: {
  Icon: typeof Handshake;
  title: string;
  subtitle: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.slide}>
      <View
        style={[styles.iconWrap, { backgroundColor: colors.activeLight }]}
      >
        <Icon size={48} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={[styles.slideTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.slideSubtitle, { color: colors.textSecondary }]}>
        {subtitle}
      </Text>
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const progress = useSharedValue(active ? 1 : 0);

  React.useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, Springs.snappy);
  }, [active, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: 8 + progress.value * 16,
    opacity: 0.3 + progress.value * 0.7,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.textTertiary, colors.primary],
    ),
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

function AnimatedButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.95, Springs.snappy);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, Springs.bouncy);
        }}
        style={[styles.nextButton, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
      >
        <Text style={[styles.nextText, { color: colors.onPrimary }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  slideTitle: {
    ...Typography.title1,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  slideSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 300,
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
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipText: {
    ...Typography.headline,
  },
  nextButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginLeft: 'auto',
  },
  nextText: {
    ...Typography.headline,
  },
});
