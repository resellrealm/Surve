import React, { useCallback } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, Heart, MessageCircle, Play } from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { PressableScale } from '../ui/PressableScale';
import { ThemedText } from '../ui/ThemedText';
import { BorderRadius, Shadows, Spacing } from '../../constants/theme';

export interface TopVideo {
  id: string;
  thumbnail_url: string | null;
  video_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  caption: string;
}

interface TopVideoCardProps {
  video: TopVideo;
  /** Optional override width; height is set to 16/9 portrait ratio */
  width?: number;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function TopVideoCard({ video, width }: TopVideoCardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();

  // Fade-in shared value — starts at 0, animate to 1 on image load
  const opacity = useSharedValue(0);

  const animatedImageStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleImageLoad = useCallback(() => {
    opacity.value = withTiming(1, { duration: reducedMotion ? 0 : 250 });
  }, [opacity, reducedMotion]);

  const handlePress = useCallback(async () => {
    haptics.tap();
    try {
      const canOpen = await Linking.canOpenURL(video.video_url);
      if (canOpen) {
        await Linking.openURL(video.video_url);
      }
    } catch {
      // swallow — URL invalid or app unavailable
    }
  }, [haptics, video.video_url]);

  const cardStyle = width ? { width, height: Math.round(width * (16 / 9)) } : undefined;

  return (
    <PressableScale
      onPress={handlePress}
      accessibilityRole="link"
      accessibilityLabel={`Play video: ${video.caption}`}
      style={[
        styles.container,
        { backgroundColor: colors.skeleton },
        cardStyle,
      ]}
    >
      {/* Thumbnail with fade-in */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedImageStyle]}>
        <Image
          source={{ uri: video.thumbnail_url ?? undefined }}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          onLoad={handleImageLoad}
          accessible={false}
          importantForAccessibility="no"
        />
      </Animated.View>

      {/* Bottom gradient scrim for legibility */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.72)']}
        locations={[0.45, 1]}
        style={styles.scrim}
        pointerEvents="none"
      />

      {/* Centred play button */}
      <View style={styles.playWrapper} pointerEvents="none">
        <View style={styles.playCircle}>
          <Play size={26} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
        </View>
      </View>

      {/* Bottom overlay: stats + caption */}
      <View style={styles.bottomOverlay} pointerEvents="none">
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Eye size={12} color="#FFFFFF" strokeWidth={2} />
            <ThemedText variant="caption2" style={styles.statText}>
              {formatCount(video.view_count)}
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <Heart size={12} color="#FFFFFF" strokeWidth={2} />
            <ThemedText variant="caption2" style={styles.statText}>
              {formatCount(video.like_count)}
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <MessageCircle size={12} color="#FFFFFF" strokeWidth={2} />
            <ThemedText variant="caption2" style={styles.statText}>
              {formatCount(video.comment_count)}
            </ThemedText>
          </View>
        </View>

        {/* Caption — max 2 lines */}
        <ThemedText
          variant="caption1"
          numberOfLines={2}
          style={styles.caption}
        >
          {video.caption}
        </ThemedText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    // Default portrait TikTok ratio; caller may pass explicit width
    aspectRatio: 9 / 16,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.md,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  playWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    // nudge play icon optically to the right
    paddingLeft: 3,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  caption: {
    color: '#FFFFFF',
    lineHeight: 16,
  },
});
