import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { BorderRadius, Spacing, Shadows, Layout } from '../../constants/theme';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width,
  height,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const translateX = useSharedValue(-Layout.screenWidth);

  useEffect(() => {
    if (reducedMotion) return;
    translateX.value = withRepeat(
      withSequence(
        withTiming(Layout.screenWidth, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
        withDelay(400, withTiming(-Layout.screenWidth, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [translateX, reducedMotion]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.skeleton,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {!reducedMotion && (
        <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', `${colors.skeleton}88`, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, { width: Layout.screenWidth }]}
          />
        </Animated.View>
      )}
    </View>
  );
}

export function ListingCardSkeleton({ delay = 0 }: { delay?: number }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const shimmer = useSharedValue(-Layout.screenWidth);

  useEffect(() => {
    if (reducedMotion) return;
    shimmer.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(Layout.screenWidth, {
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
          }),
          withDelay(400, withTiming(-Layout.screenWidth, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
  }, [shimmer, delay, reducedMotion]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value }],
  }));

  const shimmerOverlay = reducedMotion ? null : (
    <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]} pointerEvents="none">
      <LinearGradient
        colors={['transparent', `${colors.skeleton}88`, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, { width: Layout.screenWidth }]}
      />
    </Animated.View>
  );

  return (
    <View
      style={[
        cardStyles.container,
        { backgroundColor: colors.card, borderColor: colors.borderLight },
      ]}
      accessibilityLabel="Loading listing"
    >
      {/* Image area */}
      <View style={[cardStyles.image, { backgroundColor: colors.skeleton, overflow: 'hidden' }]}>
        {shimmerOverlay}
      </View>

      <View style={cardStyles.content}>
        {/* Badges + pay row */}
        <View style={cardStyles.topRow}>
          <View style={cardStyles.badges}>
            <View style={[cardStyles.badgePill, { backgroundColor: colors.skeleton, overflow: 'hidden' }]}>
              {shimmerOverlay}
            </View>
            <View style={[cardStyles.badgePill, { backgroundColor: colors.skeleton, width: 60, overflow: 'hidden' }]}>
              {shimmerOverlay}
            </View>
          </View>
          <View style={[cardStyles.payBlock, { backgroundColor: colors.skeleton, overflow: 'hidden' }]}>
            {shimmerOverlay}
          </View>
        </View>

        {/* Title */}
        <View style={[cardStyles.titleLine, { backgroundColor: colors.skeleton, overflow: 'hidden' }]}>
          {shimmerOverlay}
        </View>

        {/* Business name */}
        <View style={[cardStyles.subtitleLine, { backgroundColor: colors.skeleton, overflow: 'hidden' }]}>
          {shimmerOverlay}
        </View>

        {/* Meta row */}
        <View style={cardStyles.metaRow}>
          <View style={[cardStyles.metaItem, { backgroundColor: colors.skeleton, overflow: 'hidden' }]}>
            {shimmerOverlay}
          </View>
          <View style={[cardStyles.metaItem, { backgroundColor: colors.skeleton, overflow: 'hidden' }]}>
            {shimmerOverlay}
          </View>
          <View style={[cardStyles.metaItem, { backgroundColor: colors.skeleton, width: 36, overflow: 'hidden' }]}>
            {shimmerOverlay}
          </View>
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  image: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  content: {
    padding: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badgePill: {
    width: 48,
    height: 22,
    borderRadius: BorderRadius.full,
  },
  payBlock: {
    width: 72,
    height: 20,
    borderRadius: BorderRadius.sm,
  },
  titleLine: {
    width: '75%',
    height: 18,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  subtitleLine: {
    width: '50%',
    height: 14,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  metaItem: {
    width: 64,
    height: 14,
    borderRadius: BorderRadius.sm,
  },
});

export function CreatorProfileSkeleton() {
  const { colors } = useTheme();

  return (
    <View
      style={{ paddingHorizontal: Spacing.lg, gap: Spacing.xl }}
      accessibilityLabel="Loading creator profile"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <Skeleton width={90} height={90} borderRadius={45} />
        <View style={{ flex: 1, gap: Spacing.sm }}>
          <Skeleton width="70%" height={22} />
          <Skeleton width="50%" height={14} />
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
            <Skeleton width={70} height={24} borderRadius={BorderRadius.full} />
            <Skeleton width={80} height={24} borderRadius={BorderRadius.full} />
          </View>
        </View>
      </View>
      <View style={{ gap: Spacing.sm }}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="60%" height={14} />
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Skeleton width={140} height={36} borderRadius={BorderRadius.sm} />
        <Skeleton width={130} height={36} borderRadius={BorderRadius.sm} />
      </View>
      <View
        style={{
          padding: Spacing.lg,
          borderRadius: BorderRadius.lg,
          backgroundColor: colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.borderLight,
          gap: Spacing.md,
        }}
      >
        <Skeleton width="40%" height={16} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ alignItems: 'center', gap: Spacing.xs }}>
              <Skeleton width={48} height={28} />
              <Skeleton width={56} height={12} />
            </View>
          ))}
        </View>
      </View>
      <View
        style={{
          padding: Spacing.lg,
          borderRadius: BorderRadius.lg,
          backgroundColor: colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.borderLight,
          gap: Spacing.md,
        }}
      >
        <Skeleton width="35%" height={16} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ alignItems: 'center', gap: Spacing.xs }}>
              <Skeleton width={40} height={28} />
              <Skeleton width={52} height={12} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function BookingDetailSkeleton() {
  const { colors } = useTheme();
  const cardStyle = {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    marginBottom: Spacing.lg,
  };

  return (
    <View
      style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg }}
      accessibilityLabel="Loading booking details"
    >
      <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
        <Skeleton width={100} height={28} borderRadius={BorderRadius.full} />
      </View>
      <View style={[cardStyle, { gap: Spacing.sm }]}>
        <Skeleton width="30%" height={12} />
        <Skeleton width="80%" height={20} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Skeleton width={60} height={22} borderRadius={BorderRadius.full} />
          <Skeleton width={80} height={22} borderRadius={BorderRadius.full} />
        </View>
      </View>
      <View style={[cardStyle, { gap: Spacing.md }]}>
        <Skeleton width="30%" height={12} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={{ flex: 1, gap: Spacing.xs }}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
      </View>
      <View style={[cardStyle, { gap: Spacing.md }]}>
        {[0, 1, 2].map((i) => (
          <React.Fragment key={i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Skeleton width={36} height={36} borderRadius={BorderRadius.sm} />
              <View style={{ gap: Spacing.xs }}>
                <Skeleton width={80} height={12} />
                <Skeleton width={120} height={16} />
              </View>
            </View>
            {i < 2 && (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight }} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

export function ListingDetailSkeleton() {
  const { colors } = useTheme();

  return (
    <View accessibilityLabel="Loading listing details">
      <Skeleton
        width="100%"
        height={280}
        borderRadius={0}
        style={{ marginBottom: Spacing.xl }}
      />
      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.xl }}>
        <View style={{ gap: Spacing.md }}>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Skeleton width={70} height={24} borderRadius={BorderRadius.full} />
            <Skeleton width={80} height={24} borderRadius={BorderRadius.full} />
            <Skeleton width={90} height={24} borderRadius={BorderRadius.full} />
          </View>
          <Skeleton width="85%" height={28} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md }}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <Skeleton width="50%" height={16} />
              <Skeleton width="35%" height={12} />
            </View>
          </View>
        </View>
        <View
          style={{
            padding: Spacing.lg,
            borderRadius: BorderRadius.lg,
            backgroundColor: colors.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.borderLight,
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.md,
          }}
        >
          <Skeleton width={24} height={24} borderRadius={BorderRadius.xs} />
          <View style={{ gap: Spacing.xs }}>
            <Skeleton width={140} height={22} />
            <Skeleton width={90} height={12} />
          </View>
        </View>
        <View style={{ gap: Spacing.sm }}>
          <Skeleton width="35%" height={20} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="70%" height={14} />
        </View>
        <View style={{ gap: Spacing.sm }}>
          <Skeleton width="40%" height={20} />
          <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
            <Skeleton width={120} height={32} borderRadius={BorderRadius.sm} />
            <Skeleton width={140} height={32} borderRadius={BorderRadius.sm} />
            <Skeleton width={100} height={32} borderRadius={BorderRadius.sm} />
          </View>
        </View>
      </View>
    </View>
  );
}
