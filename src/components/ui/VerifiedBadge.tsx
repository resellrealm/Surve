/**
 * VerifiedBadge
 *
 * Blue checkmark with optional platform icon. On press shows a tooltip
 * explaining the verification date and method.
 *
 * Props:
 *   platform?   — 'tiktok' | 'instagram' | 'youtube'
 *   verifiedAt? — ISO date string, e.g. "2024-03-15T00:00:00Z"
 *   size?       — 'sm' (16pt) | 'md' (20pt) — default 'md'
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { PressableScale } from './PressableScale';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/theme';
import { formatDateShort } from '../../lib/dateFormat';

// ─── Platform config ──────────────────────────────────────────────────────────

type Platform = 'tiktok' | 'instagram' | 'youtube';

const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

const PLATFORM_SHORT: Record<Platform, string> = {
  tiktok: 'TT',
  instagram: 'IG',
  youtube: 'YT',
};

const PLATFORM_BG: Record<Platform, string> = {
  tiktok: '#010101',
  instagram: '#E4405F',
  youtube: '#FF0000',
};

// ─── Size config ──────────────────────────────────────────────────────────────

const SIZE_PX: Record<'sm' | 'md', number> = {
  sm: 16,
  md: 20,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerifiedBadgeProps {
  platform?: Platform;
  verifiedAt?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({
  visible,
  text,
  onDismiss,
}: {
  visible: boolean;
  text: string;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(150)}
        style={styles.tooltipOverlay}
        pointerEvents="box-none"
      >
        <PressableScale
          scaleValue={1}
          onPress={onDismiss}
          style={StyleSheet.absoluteFillObject as ViewStyle}
          accessibilityLabel="Dismiss tooltip"
        >
          {null}
        </PressableScale>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[
            styles.tooltipBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              ...Shadows.md,
            },
          ]}
          pointerEvents="none"
        >
          <CheckCircle size={14} color={colors.primary} fill={colors.primary} strokeWidth={2} />
          <Text style={[styles.tooltipText, { color: colors.text }]}>{text}</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Platform micro-badge ─────────────────────────────────────────────────────

function PlatformMicrobadge({ platform, iconSize }: { platform: Platform; iconSize: number }) {
  const microSize = Math.round(iconSize * 0.65);
  const fontSize = Math.round(microSize * 0.45);
  return (
    <View
      accessible={false}
      style={[
        styles.microBadge,
        {
          width: microSize,
          height: microSize,
          borderRadius: microSize / 4,
          backgroundColor: PLATFORM_BG[platform],
        },
      ]}
    >
      <Text style={{ color: '#FFF', fontSize, fontWeight: '800', lineHeight: microSize }} allowFontScaling={false}>
        {PLATFORM_SHORT[platform]}
      </Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VerifiedBadge({ platform, verifiedAt, size = 'md', style }: VerifiedBadgeProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const iconSize = SIZE_PX[size];

  const tooltipText = React.useMemo(() => {
    const dateStr = verifiedAt ? formatDateShort(verifiedAt) : null;
    if (platform && dateStr) {
      return `Verified via bio code on ${dateStr} · ${PLATFORM_LABEL[platform]}`;
    }
    if (platform) {
      return `Verified via ${PLATFORM_LABEL[platform]} bio code`;
    }
    if (dateStr) {
      return `Verified via bio code on ${dateStr}`;
    }
    return 'Verified creator';
  }, [platform, verifiedAt]);

  const handlePress = useCallback(() => {
    haptics.tap();
    setTooltipVisible(true);
  }, [haptics]);

  const handleDismiss = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  return (
    <>
      <PressableScale
        scaleValue={0.85}
        onPress={handlePress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={tooltipText}
        accessibilityHint="Double-tap to view verification details"
        style={[styles.container, { minWidth: iconSize, minHeight: iconSize }, style]}
      >
        <CheckCircle
          size={iconSize}
          color={colors.primary}
          fill={colors.primary}
          strokeWidth={2}
        />
        {platform && (
          <View style={styles.microBadgeWrap} pointerEvents="none">
            <PlatformMicrobadge platform={platform} iconSize={iconSize} />
          </View>
        )}
      </PressableScale>

      <Tooltip
        visible={tooltipVisible}
        text={tooltipText}
        onDismiss={handleDismiss}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  microBadgeWrap: {
    position: 'absolute',
    bottom: -2,
    right: -4,
  },
  microBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tooltip ──────────────────────────────────────────────────────────────────
  tooltipOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  tooltipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    maxWidth: 280,
  },
  tooltipText: {
    ...Typography.footnote,
    flex: 1,
    lineHeight: 18,
  },
});
