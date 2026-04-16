import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MapPin, Plus, Trash2, Star, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PressableScale } from '../../components/ui/PressableScale';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';

interface BusinessLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  is_primary: boolean;
  created_at: string;
}

export default function LocationsScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { user } = useStore();

  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '' });

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data: biz } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
        if (!biz) { setLoading(false); return; }
        setBusinessId(biz.id);
        const { data: locs } = await supabase.from('business_locations').select('*').eq('business_id', biz.id).order('created_at');
        if (locs) setLocations(locs);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const handleAdd = useCallback(async () => {
    if (!businessId || !form.name.trim()) return;
    setSaving(true);
    haptics.confirm();
    const { data, error } = await supabase.from('business_locations').insert({
      business_id: businessId,
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      is_primary: locations.length === 0,
    }).select('*').single();
    if (!error && data) {
      setLocations((prev) => [...prev, data]);
      setForm({ name: '', address: '', city: '' });
      setModalVisible(false);
    }
    setSaving(false);
  }, [businessId, form, locations.length, haptics]);

  const handleDelete = useCallback((loc: BusinessLocation) => {
    haptics.confirm();
    Alert.alert(`Remove "${loc.name}"?`, 'This location will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('business_locations').delete().eq('id', loc.id);
          setLocations((prev) => prev.filter((l) => l.id !== loc.id));
        },
      },
    ]);
  }, [haptics]);

  const handleSetPrimary = useCallback(async (loc: BusinessLocation) => {
    haptics.tap();
    await supabase.from('business_locations').update({ is_primary: false }).eq('business_id', businessId!);
    await supabase.from('business_locations').update({ is_primary: true }).eq('id', loc.id);
    setLocations((prev) => prev.map((l) => ({ ...l, is_primary: l.id === loc.id })));
  }, [businessId, haptics]);

  const renderItem = ({ item, index }: { item: BusinessLocation; index: number }) => (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 40)}>
      <Card style={StyleSheet.flatten([styles.card, { backgroundColor: colors.surface, borderColor: colors.border }])}>
        <View style={styles.cardRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
            <MapPin size={18} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.locName, { color: colors.text }]}>{item.name}</Text>
              {item.is_primary && (
                <View style={[styles.primaryBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Star size={10} color={colors.primary} fill={colors.primary} />
                  <Text style={[styles.primaryText, { color: colors.primary }]}>Primary</Text>
                </View>
              )}
            </View>
            {item.address ? <Text style={[styles.locAddress, { color: colors.textSecondary }]}>{item.address}</Text> : null}
            {item.city ? <Text style={[styles.locCity, { color: colors.textTertiary }]}>{item.city}</Text> : null}
          </View>
          <View style={{ gap: 8 }}>
            {!item.is_primary && (
              <PressableScale scaleValue={0.85} onPress={() => handleSetPrimary(item)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Set as primary">
                <Star size={18} color={colors.textSecondary} strokeWidth={2} />
              </PressableScale>
            )}
            <PressableScale scaleValue={0.85} onPress={() => handleDelete(item)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove location">
              <Trash2 size={18} color={colors.error} strokeWidth={2} />
            </PressableScale>
          </View>
        </View>
      </Card>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Locations"
        right={
          <PressableScale scaleValue={0.9} onPress={() => { haptics.tap(); setModalVisible(true); }} style={[styles.addBtn, { backgroundColor: colors.primary }]} accessibilityRole="button" accessibilityLabel="Add location">
            <Plus size={18} color={colors.onPrimary} strokeWidth={2.5} />
          </PressableScale>
        }
      />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={locations}
          renderItem={renderItem}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <MapPin size={36} color={colors.textTertiary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No locations yet</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>Add your venues so creators know where to come</Text>
              <Button title="Add first location" variant="primary" size="sm" onPress={() => { haptics.tap(); setModalVisible(true); }} style={{ marginTop: Spacing.lg }} />
            </View>
          }
        />
      )}

      {/* Add Location Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.md, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Location</Text>
            <PressableScale scaleValue={0.9} onPress={() => setModalVisible(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <X size={22} color={colors.text} strokeWidth={2} />
            </PressableScale>
          </View>
          <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
            {[
              { key: 'name', label: 'Name', placeholder: 'e.g. Main Restaurant, Brighton Branch' },
              { key: 'address', label: 'Address', placeholder: 'Street address' },
              { key: 'city', label: 'City', placeholder: 'City' },
            ].map(({ key, label, placeholder }) => (
              <View key={key}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
                <TextInput
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  autoCapitalize="words"
                />
              </View>
            ))}
            <Button title="Add Location" variant="primary" onPress={handleAdd} disabled={!form.name.trim() || saving} loading={saving} style={{ marginTop: Spacing.md }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.md, padding: Spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  locName: { ...Typography.subheadline, fontWeight: '600' },
  locAddress: { ...Typography.caption1, marginTop: 2 },
  locCity: { ...Typography.caption2, marginTop: 1 },
  primaryBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.full },
  primaryText: { ...Typography.caption2, fontWeight: '600' },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...Typography.title3 },
  emptyBody: { ...Typography.body, textAlign: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { ...Typography.headline, fontWeight: '600' },
  inputLabel: { ...Typography.subheadline, marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, ...Typography.body },
});
