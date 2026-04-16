import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { PressableScale } from '../../components/ui/PressableScale';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  Mail,
  Lock,
  Smartphone,
  ShieldCheck,
  FileText,
  Trash2,
  ChevronRight,
  Check,
  Download,
  FileJson,
  FileSpreadsheet,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { listMfaFactors, exportMyData, convertExportToCsv } from '../../lib/api';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export default function AccountScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const user = useStore((s) => s.user);

  const [twoFactorOn, setTwoFactorOn] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadMfaStatus = useCallback(async () => {
    const factors = await listMfaFactors();
    setTwoFactorOn(factors.some((f) => f.type === 'totp' && f.status === 'verified'));
  }, []);

  useEffect(() => {
    loadMfaStatus();
  }, [loadMfaStatus]);

  useFocusEffect(
    useCallback(() => {
      loadMfaStatus();
    }, [loadMfaStatus])
  );

  const go = useCallback(
    (path: string) => {
      haptics.tap();
      router.push(path);
    },
    [haptics, router]
  );

  const handleExport = useCallback(
    async (format: 'json' | 'csv') => {
      if (!user?.id) return;
      setExporting(true);
      try {
        const exportData = await exportMyData(user.id);
        const isJson = format === 'json';
        const content = isJson
          ? JSON.stringify(exportData, null, 2)
          : convertExportToCsv(exportData);
        const ext = isJson ? 'json' : 'csv';
        const mime = isJson ? 'application/json' : 'text/csv';
        const file = new ExpoFile(Paths.cache, `surve-data-export.${ext}`);
        file.write(content);

        setExportModalVisible(false);
        haptics.success();

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, { mimeType: mime, UTI: isJson ? 'public.json' : 'public.comma-separated-values-text' });
        } else {
          toast.success('Your data export is ready.');
        }
      } catch {
        haptics.error();
        toast.error('Export Failed: Something went wrong exporting your data. Please try again.');
      } finally {
        setExporting(false);
      }
    },
    [user?.id, haptics]
  );

  const emailVerified = Boolean(user?.email_verified_at);
  const phoneValue = user?.phone ?? 'Add phone';

  const rows: {
    Icon: typeof Mail;
    label: string;
    value: string;
    badge?: 'verified' | null;
    onPress: () => void;
  }[] = [
    {
      Icon: Mail,
      label: 'Email',
      value: user?.email ?? '—',
      badge: emailVerified ? 'verified' : null,
      onPress: () => go('/auth/verify-email'),
    },
    {
      Icon: Lock,
      label: 'Password',
      value: '•••••••••',
      onPress: () => go('/(profile)/change-password'),
    },
    {
      Icon: Smartphone,
      label: 'Phone number',
      value: phoneValue,
      badge: user?.phone_verified_at ? 'verified' : null,
      onPress: () => go('/(profile)/verify-phone'),
    },
    {
      Icon: ShieldCheck,
      label: 'Two-factor authentication',
      value: twoFactorOn ? 'On' : 'Off',
      onPress: () => go('/(profile)/two-factor'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Account" />

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + 40,
          gap: Spacing.xl,
        }}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>SIGN IN</Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            {rows.map((r, i) => (
              <React.Fragment key={r.label}>
                <PressableScale style={styles.row} onPress={r.onPress} accessibilityRole="button" accessibilityLabel={`${r.label}: ${r.value}`}>
                  <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSecondary }]}>
                    <r.Icon size={18} color={colors.text} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{r.label}</Text>
                    <Text
                      style={[styles.rowValue, { color: colors.textTertiary }]}
                      numberOfLines={1}
                    >
                      {r.value}
                    </Text>
                  </View>
                  {r.badge === 'verified' && (
                    <View
                      style={[
                        styles.verifiedBadge,
                        { backgroundColor: colors.successLight },
                      ]}
                    >
                      <Check size={12} color={colors.success} strokeWidth={3} />
                      <Text style={[styles.verifiedText, { color: colors.success }]}>
                        Verified
                      </Text>
                    </View>
                  )}
                  <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
                </PressableScale>
                {i < rows.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            PRIVACY & DATA
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            <PressableScale
              style={styles.row}
              onPress={() => {
                haptics.tap();
                setExportModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Download my data"
              accessibilityHint="Double tap to choose an export format"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <FileText size={18} color={colors.text} strokeWidth={2} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>
                Download my data
              </Text>
              <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
            </PressableScale>
            <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
            <PressableScale
              style={styles.row}
              onPress={() => {
                haptics.warning();
                router.push('/(profile)/delete-account');
              }}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              accessibilityHint="Permanently deletes your account and all data"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.errorLight }]}>
                <Trash2 size={18} color={colors.error} strokeWidth={2} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.error, flex: 1 }]}>
                Delete account
              </Text>
              <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
            </PressableScale>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !exporting && setExportModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!exporting) {
              haptics.tap();
              setExportModalVisible(false);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Close export dialog"
        >
          <Animated.View entering={FadeIn.duration(200)}>
            <Pressable
              style={[
                styles.modalContent,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ]}
              onPress={() => {}}
              accessible={false}
            >
              <View style={styles.modalHeader}>
                <Download size={22} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Export Your Data</Text>
                {!exporting && (
                  <PressableScale
                    style={styles.modalClose}
                    onPress={() => {
                      haptics.tap();
                      setExportModalVisible(false);
                    }}
                    hitSlop={12}
                    scaleValue={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Close export dialog"
                  >
                    <X size={20} color={colors.textTertiary} strokeWidth={2} />
                  </PressableScale>
                )}
              </View>

              <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                Download a copy of your profile, bookings, messages, reviews, and transaction history.
              </Text>

              {exporting ? (
                <View style={styles.exportingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.exportingText, { color: colors.textSecondary }]}>
                    Preparing your data…
                  </Text>
                </View>
              ) : (
                <View style={styles.formatButtons}>
                  <PressableScale
                    style={[
                      styles.formatButton,
                      { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
                    ]}
                    onPress={() => {
                      haptics.confirm();
                      handleExport('json');
                    }}
                    scaleValue={0.94}
                    accessibilityRole="button"
                    accessibilityLabel="Export as JSON"
                  >
                    <FileJson size={28} color={colors.primary} strokeWidth={1.5} />
                    <Text style={[styles.formatLabel, { color: colors.text }]}>JSON</Text>
                    <Text style={[styles.formatHint, { color: colors.textTertiary }]}>
                      Structured data
                    </Text>
                  </PressableScale>

                  <PressableScale
                    style={[
                      styles.formatButton,
                      { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
                    ]}
                    onPress={() => {
                      haptics.confirm();
                      handleExport('csv');
                    }}
                    scaleValue={0.94}
                    accessibilityRole="button"
                    accessibilityLabel="Export as CSV"
                  >
                    <FileSpreadsheet size={28} color={colors.primary} strokeWidth={1.5} />
                    <Text style={[styles.formatLabel, { color: colors.text }]}>CSV</Text>
                    <Text style={[styles.formatHint, { color: colors.textTertiary }]}>
                      Spreadsheet-ready
                    </Text>
                  </PressableScale>
                </View>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: {
    ...Typography.caption2,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...Typography.subheadline, fontWeight: '600' },
  rowValue: { ...Typography.footnote, marginTop: 2 },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md + 36 + Spacing.md,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  verifiedText: { ...Typography.caption2, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.headline,
    fontWeight: '700',
    flex: 1,
  },
  modalClose: {
    padding: 4,
  },
  modalDesc: {
    ...Typography.subheadline,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  formatButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  formatButton: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  formatLabel: {
    ...Typography.subheadline,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  formatHint: {
    ...Typography.caption2,
  },
  exportingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  exportingText: {
    ...Typography.subheadline,
  },
});
