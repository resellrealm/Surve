import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowRight, Clock } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useHaptics } from '../../../hooks/useHaptics';
import { useStore } from '../../../lib/store';
import { Button } from '../../../components/ui/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { PressableScale } from '../../../components/ui/PressableScale';
import { ProgressBar } from '../../../components/onboarding/ProgressBar';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../../constants/theme';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const TOTAL_STEPS = 5;

export default function BusinessHoursScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { businessDraft, updateBusinessDraft } = useStore();

  const toggleClosed = useCallback(
    (day: string) => {
      haptics.select();
      const current = businessDraft.hours[day];
      updateBusinessDraft({
        hours: {
          ...businessDraft.hours,
          [day]: { ...current, closed: !current.closed },
        },
      });
    },
    [businessDraft.hours, updateBusinessDraft]
  );

  const updateTime = useCallback(
    (day: string, field: 'open' | 'close', value: string) => {
      const current = businessDraft.hours[day];
      updateBusinessDraft({
        hours: {
          ...businessDraft.hours,
          [day]: { ...current, [field]: value },
        },
      });
    },
    [businessDraft.hours, updateBusinessDraft]
  );

  const handleNext = useCallback(() => {
    haptics.confirm();
    router.push('/onboarding/business/details');
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Business Hours" />
      <ProgressBar currentStep={2} totalSteps={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            Set your hours
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Creators will see when you're open
          </Text>
        </Animated.View>

        {DAYS.map((day, i) => {
          const h = businessDraft.hours[day];
          return (
            <Animated.View
              key={day}
              entering={FadeInDown.duration(500).delay(150 + i * 60)}
            >
              <View
                style={[
                  styles.dayRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.dayLeft}>
                  <Clock size={16} color={colors.textTertiary} strokeWidth={2} />
                  <Text style={[styles.dayLabel, { color: colors.text }]}>
                    {day.slice(0, 3)}
                  </Text>
                </View>

                {h.closed ? (
                  <Text style={[styles.closedLabel, { color: colors.textTertiary }]}>
                    Closed
                  </Text>
                ) : (
                  <View style={styles.timeRow}>
                    <TextInput
                      style={[
                        styles.timeInput,
                        {
                          color: colors.text,
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                      accessibilityLabel={`${day} opening time`}
                      value={h.open}
                      onChangeText={(v) => updateTime(day, 'open', v)}
                      placeholder="09:00"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    <Text style={[styles.timeSep, { color: colors.textSecondary }]}>
                      —
                    </Text>
                    <TextInput
                      style={[
                        styles.timeInput,
                        {
                          color: colors.text,
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                      accessibilityLabel={`${day} closing time`}
                      value={h.close}
                      onChangeText={(v) => updateTime(day, 'close', v)}
                      placeholder="17:00"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                )}

                <PressableScale
                  scaleValue={0.9}
                  onPress={() => toggleClosed(day)}
                  hitSlop={8}
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: h.closed
                        ? colors.surfaceSecondary
                        : colors.primary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle ${day} ${h.closed ? 'open' : 'closed'}`}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      h.closed ? styles.toggleOff : styles.toggleOn,
                    ]}
                  />
                </PressableScale>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          title="Next"
          onPress={handleNext}
          size="lg"
          fullWidth
          icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  title: {
    ...Typography.title1,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    marginBottom: Spacing.xxl,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: 60,
  },
  dayLabel: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  closedLabel: {
    ...Typography.subheadline,
    flex: 1,
    textAlign: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
    justifyContent: 'center',
  },
  timeInput: {
    ...Typography.footnote,
    fontWeight: '500',
    textAlign: 'center',
    width: 64,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  timeSep: {
    ...Typography.footnote,
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  toggleOff: {
    alignSelf: 'flex-start',
  },
  toggleOn: {
    alignSelf: 'flex-end',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
});
