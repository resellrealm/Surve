import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { PressableScale } from './PressableScale';
import { Typography, Spacing } from '../../constants/theme';

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  transparent?: boolean;
  showBack?: boolean;
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  onBack,
  right,
  transparent = false,
  showBack = true,
  style,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const haptics = useHaptics();

  const handleBack = useCallback(() => {
    haptics.tap();
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  }, [haptics, onBack, router]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.md,
          backgroundColor: transparent ? 'transparent' : colors.background,
          borderBottomColor: transparent ? 'transparent' : colors.borderLight,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {showBack ? (
            <PressableScale
              scaleValue={0.88}
              onPress={handleBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={[
                styles.iconButton,
                { backgroundColor: transparent ? colors.surface : 'transparent' },
              ]}
            >
              <ArrowLeft size={22} color={colors.text} strokeWidth={2.2} />
            </PressableScale>
          ) : null}
        </View>

        <View style={styles.titleWrap} pointerEvents="none">
          {title ? (
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.text }]}
            >
              {title}
            </Text>
          ) : null}
        </View>

        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  title: {
    ...Typography.headline,
    textAlign: 'center',
  },
});
