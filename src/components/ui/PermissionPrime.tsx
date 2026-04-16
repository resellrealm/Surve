import React from 'react';
import { StyleSheet, View, Text, Modal } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { Bell, Camera, ImageIcon, Shield } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Button } from './Button';
import { PressableScale } from './PressableScale';
import type { PermissionKind } from '../../hooks/usePermissionPrime';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Springs,
} from '../../constants/theme';

interface PermissionConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  detail: string;
  cta: string;
}

function getConfig(kind: PermissionKind, iconColor: string): PermissionConfig {
  switch (kind) {
    case 'notifications':
      return {
        icon: <Bell size={32} color={iconColor} strokeWidth={1.8} />,
        title: 'Stay in the loop',
        description:
          'Get instant updates when businesses accept your application, send you a message, or when a booking status changes.',
        detail: 'You can turn this off anytime in Settings.',
        cta: 'Enable Notifications',
      };
    case 'camera':
      return {
        icon: <Camera size={32} color={iconColor} strokeWidth={1.8} />,
        title: 'Capture content proof',
        description:
          'Take photos directly to attach proof of delivered content for your bookings.',
        detail: 'Used only when you choose to take a photo.',
        cta: 'Allow Camera',
      };
    case 'photo-library':
      return {
        icon: <ImageIcon size={32} color={iconColor} strokeWidth={1.8} />,
        title: 'Choose your best shots',
        description:
          'Pick photos from your library for your profile, portfolio, or as booking proof.',
        detail: 'We never access photos without your action.',
        cta: 'Allow Photo Access',
      };
  }
}

interface PermissionPrimeProps {
  kind: PermissionKind;
  visible: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function PermissionPrime({
  kind,
  visible,
  onConfirm,
  onDismiss,
}: PermissionPrimeProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const config = getConfig(kind, colors.primary);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View
        entering={reducedMotion ? undefined : FadeIn.duration(200)}
        exiting={reducedMotion ? undefined : FadeOut.duration(150)}
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
      >
        <Animated.View
          entering={reducedMotion
            ? SlideInDown.duration(150)
            : SlideInDown.duration(400)
                .springify()
                .damping(Springs.gentle.damping)
                .stiffness(Springs.gentle.stiffness)}
          exiting={reducedMotion
            ? SlideOutDown.duration(150)
            : SlideOutDown.duration(250)}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, Spacing.xxl),
            },
          ]}
          accessibilityRole="alert"
          accessibilityLabel={`${config.title}. ${config.description}`}
        >
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
          </View>

          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.primary + '14' },
            ]}
          >
            {config.icon}
          </View>

          <Text
            style={[styles.title, Typography.title2, { color: colors.text }]}
          >
            {config.title}
          </Text>

          <Text
            style={[
              styles.description,
              Typography.body,
              { color: colors.textSecondary },
            ]}
          >
            {config.description}
          </Text>

          <View
            style={[
              styles.detailRow,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Shield size={16} color={colors.textTertiary} strokeWidth={2} />
            <Text
              style={[
                styles.detailText,
                Typography.footnote,
                { color: colors.textTertiary },
              ]}
            >
              {config.detail}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              title={config.cta}
              onPress={() => {
                onConfirm();
              }}
              variant="primary"
              size="lg"
              fullWidth
            />
            <PressableScale
              scaleValue={0.97}
              onPress={() => {
                haptics.tap();
                onDismiss();
              }}
              style={styles.skipBtn}
              accessibilityRole="button"
              accessibilityLabel="Skip for now"
            >
              <Text
                style={[
                  Typography.subheadline,
                  { color: colors.textSecondary, fontWeight: '500' },
                ]}
              >
                Not now
              </Text>
            </PressableScale>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.sm,
    ...Shadows.xl,
  },
  handle: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: BorderRadius.full,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: Spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  description: {
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xxl,
  },
  detailText: {
    flex: 1,
  },
  actions: {
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
});
