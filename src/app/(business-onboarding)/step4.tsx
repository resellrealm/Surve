import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MapPin, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { WizardHeader } from './_WizardHeader';
import { useWizard } from './_context';
import type { WizardLocation } from './_context';

const EMPTY_LOCATION: WizardLocation = { name: '', address: '', city: '', country: '' };

export default function Step4Locations() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, update } = useWizard();

  const [draft, setDraft] = useState<WizardLocation>(EMPTY_LOCATION);
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(state.locations.length === 0);

  const validateDraft = useCallback(() => {
    const e: Record<string, string> = {};
    if (!draft.name.trim()) e.name = 'Location name required';
    if (!draft.address.trim()) e.address = 'Address required';
    if (!draft.city.trim()) e.city = 'City required';
    setDraftErrors(e);
    return Object.keys(e).length === 0;
  }, [draft]);

  const addLocation = useCallback(() => {
    if (!validateDraft()) {
      haptics.warning();
      return;
    }
    haptics.confirm();
    update({ locations: [...state.locations, { ...draft }] });
    setDraft(EMPTY_LOCATION);
    setAdding(false);
  }, [draft, state.locations, update, haptics, validateDraft]);

  const removeLocation = useCallback(
    (idx: number) => {
      haptics.tap();
      update({ locations: state.locations.filter((_, i) => i !== idx) });
    },
    [state.locations, update, haptics],
  );

  const handleContinue = useCallback(() => {
    if (state.locations.length === 0 && !adding) {
      haptics.warning();
      return;
    }
    if (adding && (draft.name || draft.address || draft.city)) {
      if (!validateDraft()) {
        haptics.warning();
        return;
      }
      update({ locations: [...state.locations, { ...draft }] });
    }
    haptics.confirm();
    router.push('/(business-onboarding)/step5');
  }, [state.locations, adding, draft, update, validateDraft, haptics, router]);

  const inputStyle = (field: string) => [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: draftErrors[field] ? colors.error : colors.border,
      color: colors.text,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <WizardHeader
        step={4}
        title="Your locations"
        subtitle="Add all venues where creators can be booked"
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {state.locations.map((loc, idx) => (
          <Animated.View
            key={idx}
            entering={FadeInDown.duration(300)}
            style={[styles.locationCard, { backgroundColor: colors.surface, ...Shadows.sm }]}
          >
            <View style={styles.cardRow}>
              <View
                style={[styles.iconWrap, { backgroundColor: colors.activeLight }]}
              >
                <MapPin size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.locName, { color: colors.text }]}>{loc.name}</Text>
                <Text style={[styles.locAddr, { color: colors.textSecondary }]}>
                  {loc.address}, {loc.city}
                  {loc.country ? `, ${loc.country}` : ''}
                </Text>
              </View>
              <PressableScale
                scaleValue={0.88}
                onPress={() => removeLocation(idx)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${loc.name}`}
              >
                <Trash2 size={18} color={colors.error} strokeWidth={2} />
              </PressableScale>
            </View>
          </Animated.View>
        ))}

        {adding ? (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {state.locations.length === 0 ? 'Primary location *' : 'New location'}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Location name</Text>
            <TextInput
              style={inputStyle('name')}
              value={draft.name}
              onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))}
              placeholder="e.g. The Grand Ace — Downtown"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
            />
            {draftErrors.name ? (
              <Text style={[styles.error, { color: colors.error }]}>{draftErrors.name}</Text>
            ) : null}

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Street address</Text>
            <TextInput
              style={inputStyle('address')}
              value={draft.address}
              onChangeText={(t) => setDraft((d) => ({ ...d, address: t }))}
              placeholder="e.g. 123 Sunset Blvd"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
            />
            {draftErrors.address ? (
              <Text style={[styles.error, { color: colors.error }]}>{draftErrors.address}</Text>
            ) : null}

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>City</Text>
            <TextInput
              style={inputStyle('city')}
              value={draft.city}
              onChangeText={(t) => setDraft((d) => ({ ...d, city: t }))}
              placeholder="e.g. Los Angeles"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
            />
            {draftErrors.city ? (
              <Text style={[styles.error, { color: colors.error }]}>{draftErrors.city}</Text>
            ) : null}

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Country (optional)</Text>
            <TextInput
              style={inputStyle('country')}
              value={draft.country}
              onChangeText={(t) => setDraft((d) => ({ ...d, country: t }))}
              placeholder="e.g. USA"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
            />

            <Text style={[styles.mapNote, { color: colors.textTertiary }]}>
              Map pin picker available once react-native-maps is installed
            </Text>

            <View style={styles.draftActions}>
              {state.locations.length > 0 ? (
                <Button
                  title="Cancel"
                  onPress={() => {
                    haptics.tap();
                    setAdding(false);
                    setDraft(EMPTY_LOCATION);
                    setDraftErrors({});
                  }}
                  variant="ghost"
                  size="md"
                />
              ) : null}
              <Button
                title="Add location"
                onPress={addLocation}
                variant="outline"
                size="md"
                icon={<Plus size={16} color={colors.primary} strokeWidth={2.5} />}
              />
            </View>
          </Animated.View>
        ) : (
          <PressableScale
            scaleValue={0.97}
            onPress={() => {
              haptics.tap();
              setAdding(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Add another location"
            style={[
              styles.addLocBtn,
              { borderColor: colors.primary, backgroundColor: colors.surface },
            ]}
          >
            <Plus size={20} color={colors.primary} strokeWidth={2.5} />
            <Text style={[styles.addLocText, { color: colors.primary }]}>
              Add another location
            </Text>
          </PressableScale>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Button
          title="Continue"
          onPress={handleContinue}
          size="lg"
          fullWidth
          disabled={state.locations.length === 0 && !adding}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  locationCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  locName: {
    ...Typography.headline,
  },
  locAddr: {
    ...Typography.footnote,
    marginTop: 2,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.headline,
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.footnote,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
  },
  error: {
    ...Typography.caption1,
    marginTop: 2,
  },
  mapNote: {
    ...Typography.caption2,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  draftActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  addLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    borderStyle: 'dashed',
    paddingVertical: Spacing.lg,
  },
  addLocText: {
    ...Typography.headline,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
});
