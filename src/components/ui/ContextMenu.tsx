// Long-press context menu. A lightweight, in-app replacement for
// expo-context-menu / react-native-context-menu-view so we avoid adding a
// native dependency right now. Presents a modal with ordered actions and a
// destructive tint for Block.
//
// Usage:
//   <ContextMenu actions={[...]}>...</ContextMenu>
//
// The child is wrapped in a Pressable that fires `onLongPress` and triggers
// a haptic `tap`. Tapping an action fires its handler and dismisses the menu.
import React, { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';

export interface ContextMenuAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

interface ContextMenuProps {
  actions: ContextMenuAction[];
  children: React.ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export function ContextMenu({
  actions,
  children,
  accessibilityLabel,
  disabled,
}: ContextMenuProps) {
  const [visible, setVisible] = useState(false);
  const haptics = useHaptics();
  const { colors } = useTheme();

  const onLongPress = useCallback(() => {
    if (disabled) return;
    haptics.heavy();
    setVisible(true);
  }, [disabled, haptics]);

  const close = useCallback(() => setVisible(false), []);

  const onSelect = useCallback(
    (action: ContextMenuAction) => {
      haptics.select();
      setVisible(false);
      // Defer so the modal fully dismisses before the action runs — prevents
      // double-modal flicker (e.g. when the action opens a Share sheet).
      setTimeout(() => action.onPress(), 120);
    },
    [haptics]
  );

  return (
    <>
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={320}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Long press to open context menu"
      >
        {children}
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={close}
      >
        <Pressable
          style={styles.backdrop}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close context menu"
        >
          <Animated.View entering={FadeIn.duration(120)} style={StyleSheet.absoluteFill} />
          <Animated.View
            entering={FadeInUp.duration(180)}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            {actions.map((action, i) => (
              <Pressable
                key={action.key}
                onPress={() => onSelect(action)}
                accessibilityRole="menuitem"
                accessibilityLabel={action.label}
                style={({ pressed }) => [
                  styles.row,
                  i < actions.length - 1 && {
                    borderBottomColor: colors.borderLight,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                  pressed && { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                {action.icon ? <View style={styles.icon}>{action.icon}</View> : null}
                <Text
                  style={[
                    styles.label,
                    {
                      color: action.destructive ? colors.error : colors.text,
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    minHeight: 52,
  },
  icon: {
    width: 22,
    alignItems: 'center',
  },
  label: {
    ...Typography.body,
    fontWeight: '500',
  },
});
