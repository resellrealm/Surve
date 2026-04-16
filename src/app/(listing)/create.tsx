import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Dimensions,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeOutUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import {
  Hotel,
  UtensilsCrossed,
  Wine,
  Palmtree,
  CalendarDays,
  Sparkles,
  ShoppingBag,
  Compass,
  Check,
  X,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Camera,
  DollarSign,
  Gift,
  Film,
  Instagram,
  BookOpen,
  FileText,
  Hash,
  AtSign,
  Shield,
  Clock,
  Users,
  Star,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { usePermissionPrime } from '../../hooks/usePermissionPrime';
import { useStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import * as api from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PermissionPrime } from '../../components/ui/PermissionPrime';
import { Typography, Spacing, BorderRadius, Shadows, Springs } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Listing Types ────────────────────────────────────────────────────────────

const LISTING_TYPES = [
  { key: 'hotel', label: 'Hotel', Icon: Hotel, color: '#2c428f' },
  { key: 'restaurant', label: 'Restaurant', Icon: UtensilsCrossed, color: '#D97706' },
  { key: 'bar', label: 'Bar', Icon: Wine, color: '#7C3AED' },
  { key: 'resort', label: 'Resort', Icon: Palmtree, color: '#059669' },
  { key: 'event', label: 'Event', Icon: CalendarDays, color: '#DB2777' },
  { key: 'spa', label: 'Spa', Icon: Sparkles, color: '#0891B2' },
  { key: 'retail', label: 'Retail', Icon: ShoppingBag, color: '#EA580C' },
  { key: 'experience', label: 'Experience', Icon: Compass, color: '#65A30D' },
] as const;

// ─── Niche Options ────────────────────────────────────────────────────────────

const NICHE_OPTIONS = [
  'Food & Dining', 'Travel', 'Lifestyle', 'Fashion', 'Beauty',
  'Fitness', 'Wellness', 'Luxury', 'Budget Travel', 'Adventure',
  'Family', 'Couples', 'Solo Travel', 'Business Travel', 'Nightlife',
  'Local Culture', 'Sustainability', 'Tech', 'Photography', 'LGBTQ+',
];

// ─── Duration Types ───────────────────────────────────────────────────────────

const DURATION_TYPES = [
  { key: 'single_day', label: 'Day Visit' },
  { key: 'overnight', label: 'Overnight' },
  { key: 'weekend', label: 'Weekend' },
  { key: 'week', label: '1 Week' },
  { key: 'flexible', label: 'Flexible' },
] as const;

// ─── Follower Presets ─────────────────────────────────────────────────────────

const FOLLOWER_PRESETS = [0, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
const ENGAGEMENT_PRESETS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15];

function formatFollowers(n: number): string {
  if (n === 0) return 'Any';
  if (n >= 1000000) return `${n / 1000000}M+`;
  if (n >= 1000) return `${n / 1000}K+`;
  return `${n}+`;
}

// ─── Wizard Data ──────────────────────────────────────────────────────────────

interface WizardData {
  // Step 0
  listingType: string;
  // Step 1
  title: string;
  description: string;
  brandGuidelines: string;
  // Step 2
  photos: string[];
  // Step 3
  compensationType: 'paid' | 'gifted' | 'both';
  paidAmount: string;
  perkValue: string;
  perkDescription: string;
  // Step 4
  tiktoks: number;
  igReels: number;
  igStories: number;
  igPosts: number;
  blogPosts: number;
  // Step 5
  startDate: string;
  endDate: string;
  durationType: string;
  // Step 6
  minFollowersInstagram: number;
  minFollowersTiktok: number;
  minEngagement: number;
  niches: string[];
  // Step 7
  contentRights: 'standard' | 'extended' | 'exclusive';
  exclusivityMonths: string;
  hashtags: string;
  handles: string;
}

const INITIAL_DATA: WizardData = {
  listingType: '',
  title: '',
  description: '',
  brandGuidelines: '',
  photos: [],
  compensationType: 'both',
  paidAmount: '',
  perkValue: '',
  perkDescription: '',
  tiktoks: 0,
  igReels: 1,
  igStories: 2,
  igPosts: 0,
  blogPosts: 0,
  startDate: '',
  endDate: '',
  durationType: 'overnight',
  minFollowersInstagram: 0,
  minFollowersTiktok: 0,
  minEngagement: 0,
  niches: [],
  contentRights: 'standard',
  exclusivityMonths: '1',
  hashtags: '',
  handles: '',
};

const STEP_TITLES = [
  'Listing Type',
  'Details',
  'Photos',
  'Compensation',
  'Deliverables',
  'Date & Duration',
  'Requirements',
  'Content Rights',
  'Review & Publish',
];

const TOTAL_STEPS = STEP_TITLES.length;
const DRAFT_KEY = 'surve:listing-wizard-draft-v2';

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function StepProgressBar({ step }: { step: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.progressBar} accessibilityLabel={`Step ${step + 1} of ${TOTAL_STEPS}`}>
      {STEP_TITLES.map((_, i) => {
        const done = i <= step;
        return (
          <View
            key={i}
            style={[
              styles.progressSegment,
              { backgroundColor: done ? colors.primary : colors.border },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Section Title ─────────────────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
      {label}
    </Text>
  );
}

// ─── Counter Row ──────────────────────────────────────────────────────────────

function CounterRow({
  label,
  value,
  onChange,
  max = 20,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const decrement = useCallback(() => {
    if (value <= 0) return;
    haptics.tap();
    onChange(value - 1);
  }, [value, onChange, haptics]);

  const increment = useCallback(() => {
    if (value >= max) return;
    haptics.tap();
    onChange(value + 1);
  }, [value, max, onChange, haptics]);

  return (
    <View style={styles.counterRow}>
      <Text style={[styles.counterLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.counterControls}>
        <PressableScale
          onPress={decrement}
          disabled={value <= 0}
          style={[
            styles.counterBtn,
            {
              backgroundColor: value <= 0 ? colors.surfaceSecondary : colors.activeLight,
              borderColor: value <= 0 ? colors.border : colors.primary,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          hitSlop={8}
        >
          <Minus size={16} color={value <= 0 ? colors.textTertiary : colors.primary} strokeWidth={2.5} />
        </PressableScale>
        <Text style={[styles.counterValue, { color: colors.text }]}>{value}</Text>
        <PressableScale
          onPress={increment}
          disabled={value >= max}
          style={[
            styles.counterBtn,
            {
              backgroundColor: value >= max ? colors.surfaceSecondary : colors.activeLight,
              borderColor: value >= max ? colors.border : colors.primary,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          hitSlop={8}
        >
          <Plus size={16} color={value >= max ? colors.textTertiary : colors.primary} strokeWidth={2.5} />
        </PressableScale>
      </View>
    </View>
  );
}

// ─── Preset Stepper ───────────────────────────────────────────────────────────

function PresetStepper({
  label,
  presets,
  value,
  onChange,
  formatValue,
}: {
  label: string;
  presets: number[];
  value: number;
  onChange: (v: number) => void;
  formatValue: (n: number) => string;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const idx = presets.indexOf(value);

  const prev = useCallback(() => {
    if (idx <= 0) return;
    haptics.tap();
    onChange(presets[idx - 1]);
  }, [idx, presets, onChange, haptics]);

  const next = useCallback(() => {
    if (idx >= presets.length - 1) return;
    haptics.tap();
    onChange(presets[idx + 1]);
  }, [idx, presets, onChange, haptics]);

  return (
    <View style={styles.stepperRow}>
      <Text style={[styles.stepperLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.stepperControls}>
        <PressableScale
          onPress={prev}
          disabled={idx <= 0}
          style={[styles.stepperBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          hitSlop={8}
        >
          <ChevronLeft size={18} color={idx <= 0 ? colors.textTertiary : colors.text} strokeWidth={2} />
        </PressableScale>
        <Text style={[styles.stepperValue, { color: colors.primary }]}>{formatValue(value)}</Text>
        <PressableScale
          onPress={next}
          disabled={idx >= presets.length - 1}
          style={[styles.stepperBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          hitSlop={8}
        >
          <ChevronRight size={18} color={idx >= presets.length - 1 ? colors.textTertiary : colors.text} strokeWidth={2} />
        </PressableScale>
      </View>
    </View>
  );
}

// ─── Step 0: Listing Type ────────────────────────────────────────────────────

function Step0_ListingType({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <Animated.View entering={FadeInDown.duration(350).springify()}>
      <Text style={[styles.stepHeading, { color: colors.text }]}>
        What type of venue or experience are you listing?
      </Text>
      <View style={styles.typeGrid}>
        {LISTING_TYPES.map(({ key, label, Icon, color }) => {
          const selected = data.listingType === key;
          return (
            <PressableScale
              key={key}
              scaleValue={0.94}
              onPress={() => {
                haptics.select();
                onChange({ listingType: key });
              }}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              style={[
                styles.typeCard,
                {
                  backgroundColor: selected ? colors.activeLight : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
                selected && Shadows.sm,
              ]}
            >
              <View
                style={[
                  styles.typeIconWrap,
                  { backgroundColor: selected ? colors.primary : `${color}1A` },
                ]}
              >
                <Icon size={22} color={selected ? colors.onPrimary : color} strokeWidth={1.8} />
              </View>
              <Text
                style={[
                  styles.typeLabel,
                  { color: selected ? colors.primary : colors.text },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
              {selected && (
                <View style={[styles.typeCheck, { backgroundColor: colors.primary }]}>
                  <Check size={9} color={colors.onPrimary} strokeWidth={3} />
                </View>
              )}
            </PressableScale>
          );
        })}
      </View>
    </Animated.View>
  );
}

// ─── Step 1: Details ─────────────────────────────────────────────────────────

function Step1_Details({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(350).springify()}>
      <Input
        label="Listing Title"
        value={data.title}
        onChangeText={(v) => onChange({ title: v })}
        placeholder="e.g., Rooftop Suite Experience — 1 Night Stay"
        maxLength={100}
        showCharCount
        returnKeyType="next"
      />
      <Input
        label="Description"
        value={data.description}
        onChangeText={(v) => onChange({ description: v })}
        placeholder="Describe the experience, what's included, and what you're looking for from creators..."
        multiline
        numberOfLines={5}
        maxLength={600}
        showCharCount
      />
      <Input
        label="Brand Guidelines (optional)"
        value={data.brandGuidelines}
        onChangeText={(v) => onChange({ brandGuidelines: v })}
        placeholder="Any specific tone, style, dos and don'ts for content creators..."
        multiline
        numberOfLines={3}
        maxLength={400}
        showCharCount
      />
    </Animated.View>
  );
}

// ─── Step 2: Photos ───────────────────────────────────────────────────────────

function Step2_Photos({
  data,
  onChange,
  onPickPhotos,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  onPickPhotos: () => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const removePhoto = useCallback(
    (idx: number) => {
      haptics.warning();
      const next = data.photos.filter((_, i) => i !== idx);
      onChange({ photos: next });
      setSelectedIdx(null);
    },
    [data.photos, onChange, haptics],
  );

  const handlePhotoTap = useCallback(
    (idx: number) => {
      if (selectedIdx === null) {
        haptics.select();
        setSelectedIdx(idx);
      } else if (selectedIdx === idx) {
        haptics.tap();
        setSelectedIdx(null);
      } else {
        // Swap
        haptics.confirm();
        const next = [...data.photos];
        const tmp = next[selectedIdx];
        next[selectedIdx] = next[idx];
        next[idx] = tmp;
        onChange({ photos: next });
        setSelectedIdx(null);
      }
    },
    [selectedIdx, data.photos, onChange, haptics],
  );

  const canAdd = data.photos.length < 10;
  const photoSize = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm * 2) / 3;

  return (
    <Animated.View entering={FadeInDown.duration(350).springify()}>
      <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
        Add 3–10 photos. Tap a photo to select it, then tap another to swap positions.
      </Text>

      <View style={styles.photoGrid}>
        {data.photos.map((uri, idx) => {
          const isSelected = selectedIdx === idx;
          return (
            <PressableScale
              key={uri + idx}
              scaleValue={0.96}
              onPress={() => handlePhotoTap(idx)}
              accessibilityRole="button"
              accessibilityLabel={`Photo ${idx + 1}${isSelected ? ', selected — tap another photo to swap' : ''}`}
              style={[
                styles.photoThumb,
                {
                  width: photoSize,
                  height: photoSize,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2.5 : 1,
                },
              ]}
            >
              <Image
                source={{ uri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
              {/* Position badge */}
              <View style={[styles.photoIndex, { backgroundColor: isSelected ? colors.primary : 'rgba(0,0,0,0.45)' }]}>
                <Text style={styles.photoIndexText}>{idx + 1}</Text>
              </View>
              {/* Remove button */}
              <PressableScale
                onPress={() => removePhoto(idx)}
                style={[styles.photoRemove, { backgroundColor: colors.error }]}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                hitSlop={4}
              >
                <X size={10} color="#fff" strokeWidth={3} />
              </PressableScale>
              {isSelected && (
                <View style={[styles.photoSelectedOverlay, { borderColor: colors.primary }]} />
              )}
            </PressableScale>
          );
        })}

        {canAdd && (
          <PressableScale
            scaleValue={0.96}
            onPress={onPickPhotos}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            style={[
              styles.photoAdd,
              {
                width: photoSize,
                height: photoSize,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Camera size={24} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={[styles.photoAddText, { color: colors.textTertiary }]}>
              Add
            </Text>
          </PressableScale>
        )}
      </View>

      <View style={styles.photoMeta}>
        <Text style={[styles.photoCount, { color: data.photos.length >= 3 ? colors.success : colors.warning }]}>
          {data.photos.length}/10 photos {data.photos.length < 3 ? `(need ${3 - data.photos.length} more)` : '✓'}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Step 3: Compensation ─────────────────────────────────────────────────────

function Step3_Compensation({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const selectType = useCallback(
    (t: WizardData['compensationType']) => {
      haptics.select();
      onChange({ compensationType: t });
    },
    [onChange, haptics],
  );

  const types: Array<{ key: WizardData['compensationType']; label: string; desc: string; Icon: any }> = [
    { key: 'paid', label: 'Paid', desc: 'Cash payment for deliverables', Icon: DollarSign },
    { key: 'gifted', label: 'Gifted', desc: 'Complimentary stay / experience only', Icon: Gift },
    { key: 'both', label: 'Paid + Gifted', desc: 'Cash plus complimentary experience', Icon: Star },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(350).springify()}>
      <SectionTitle label="Compensation Type" />
      <View style={styles.compTypeRow}>
        {types.map(({ key, label, desc, Icon }) => {
          const sel = data.compensationType === key;
          return (
            <PressableScale
              key={key}
              scaleValue={0.95}
              onPress={() => selectType(key)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: sel }}
              style={[
                styles.compTypeCard,
                {
                  backgroundColor: sel ? colors.activeLight : colors.surface,
                  borderColor: sel ? colors.primary : colors.border,
                },
              ]}
            >
              <Icon size={20} color={sel ? colors.primary : colors.textSecondary} strokeWidth={1.8} />
              <Text style={[styles.compTypeLabel, { color: sel ? colors.primary : colors.text }]}>
                {label}
              </Text>
              <Text style={[styles.compTypeDesc, { color: colors.textTertiary }]} numberOfLines={2}>
                {desc}
              </Text>
              {sel && (
                <View style={[styles.compCheck, { backgroundColor: colors.primary }]}>
                  <Check size={9} color={colors.onPrimary} strokeWidth={3} />
                </View>
              )}
            </PressableScale>
          );
        })}
      </View>

      {(data.compensationType === 'paid' || data.compensationType === 'both') && (
        <Animated.View entering={FadeInDown.duration(250)}>
          <SectionTitle label="Cash Amount (USD)" />
          <Input
            label="Amount"
            value={data.paidAmount}
            onChangeText={(v) => onChange({ paidAmount: v })}
            placeholder="e.g. 500"
            keyboardType="numeric"
            icon={<DollarSign size={16} color={colors.textTertiary} />}
          />
        </Animated.View>
      )}

      {(data.compensationType === 'gifted' || data.compensationType === 'both') && (
        <Animated.View entering={FadeInDown.duration(250)}>
          <SectionTitle label="Perk / Gift Value" />
          <Input
            label="Estimated Value (USD)"
            value={data.perkValue}
            onChangeText={(v) => onChange({ perkValue: v })}
            placeholder="e.g. 400"
            keyboardType="numeric"
            icon={<DollarSign size={16} color={colors.textTertiary} />}
          />
          <Input
            label="What's Included"
            value={data.perkDescription}
            onChangeText={(v) => onChange({ perkDescription: v })}
            placeholder="e.g., 1-night stay, breakfast for 2, spa access..."
            multiline
            numberOfLines={3}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Step 4: Deliverables ─────────────────────────────────────────────────────

function Step4_Deliverables({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  const { colors } = useTheme();

  const deliverables: Array<{ key: keyof WizardData; label: string; Icon: any }> = [
    { key: 'tiktoks', label: 'TikTok Videos', Icon: Film },
    { key: 'igReels', label: 'Instagram Reels', Icon: Instagram },
    { key: 'igStories', label: 'Instagram Stories', Icon: Instagram },
    { key: 'igPosts', label: 'Instagram Posts', Icon: Instagram },
    { key: 'blogPosts', label: 'Blog / Article', Icon: BookOpen },
  ];

  const total =
    (data.tiktoks + data.igReels + data.igStories + data.igPosts + data.blogPosts);

  return (
    <Animated.View entering={FadeInDown.duration(350).springify()}>
      <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
        Set the minimum deliverables expected from the creator.
      </Text>
      <View style={[styles.delivCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {deliverables.map(({ key, label, Icon }) => (
          <CounterRow
            key={key}
            label={label}
            value={data[key] as number}
            onChange={(v) => onChange({ [key]: v })}
          />
        ))}
      </View>
      <View style={[styles.delivTotal, { backgroundColor: colors.activeLight, borderColor: colors.primary }]}>
        <Text style={[styles.delivTotalText, { color: colors.primary }]}>
          Total deliverables: <Text style={{ fontWeight: '700' }}>{total}</Text>
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Step 5: Date Window ─────────────────────────────────────────────────────

function Step5_Dates({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <Animated.View entering={FadeInDown.duration(350).springify()}>
      <SectionTitle label="Availability Window" />
      <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
        When should creators visit? Bookings must fall within this window.
      </Text>
      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <Input
            label="Start Date"
            value={data.startDate}
            onChangeText={(v) => onChange({ startDate: v })}
            placeholder="e.g. May 1, 2026"
            returnKeyType="next"
          />
        </View>
        <View style={styles.dateSep}>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="End Date"
            value={data.endDate}
            onChangeText={(v) => onChange({ endDate: v })}
            placeholder="e.g. Jun 30, 2026"
          />
        </View>
      </View>

      <SectionTitle label="Stay Duration" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {DURATION_TYPES.map(({ key, label }) => {
          const sel = data.durationType === key;
          return (
            <PressableScale
              key={key}
              onPress={() => {
                haptics.select();
                onChange({ durationType: key });
              }}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: sel }}
              style={[
                styles.chip,
                {
                  backgroundColor: sel ? colors.primary : colors.surface,
                  borderColor: sel ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: sel ? colors.onPrimary : colors.text }]}>
                {label}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

// ─── Step 6: Creator Requirements ────────────────────────────────────────────

function Step6_Requirements({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const toggleNiche = useCallback(
    (niche: string) => {
      haptics.select();
      const next = data.niches.includes(niche)
        ? data.niches.filter((n) => n !== niche)
        : [...data.niches, niche];
      onChange({ niches: next });
    },
    [data.niches, onChange, haptics],
  );

  return (
    <Animated.View entering={FadeInDown.duration(350).springify()}>
      <SectionTitle label="Minimum Followers" />
      <View style={[styles.reqCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <PresetStepper
          label="Instagram"
          presets={FOLLOWER_PRESETS}
          value={data.minFollowersInstagram}
          onChange={(v) => onChange({ minFollowersInstagram: v })}
          formatValue={formatFollowers}
        />
        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
        <PresetStepper
          label="TikTok"
          presets={FOLLOWER_PRESETS}
          value={data.minFollowersTiktok}
          onChange={(v) => onChange({ minFollowersTiktok: v })}
          formatValue={formatFollowers}
        />
      </View>

      <SectionTitle label="Min. Engagement Rate" />
      <View style={[styles.reqCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <PresetStepper
          label="Engagement %"
          presets={ENGAGEMENT_PRESETS}
          value={data.minEngagement}
          onChange={(v) => onChange({ minEngagement: v })}
          formatValue={(n) => (n === 0 ? 'Any' : `${n}%+`)}
        />
      </View>

      <SectionTitle label="Creator Niches" />
      <Text style={[styles.stepHint, { color: colors.textSecondary }]}>
        Select all relevant niches — leave empty to accept any creator.
      </Text>
      <View style={styles.nicheGrid}>
        {NICHE_OPTIONS.map((niche) => {
          const sel = data.niches.includes(niche);
          return (
            <PressableScale
              key={niche}
              onPress={() => toggleNiche(niche)}
              accessibilityRole="button"
              accessibilityLabel={niche}
              accessibilityState={{ selected: sel }}
              style={[
                styles.nicheChip,
                {
                  backgroundColor: sel ? colors.primary : colors.surface,
                  borderColor: sel ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.nicheChipText, { color: sel ? colors.onPrimary : colors.text }]}>
                {niche}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </Animated.View>
  );
}

// ─── Step 7: Content Rights ───────────────────────────────────────────────────

function Step7_ContentRights({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const rights: Array<{ key: WizardData['contentRights']; label: string; desc: string }> = [
    {
      key: 'standard',
      label: 'Standard',
      desc: 'Creator retains full rights. You may reshare with credit.',
    },
    {
      key: 'extended',
      label: 'Extended',
      desc: 'License to use content in paid ads and marketing for agreed period.',
    },
    {
      key: 'exclusive',
      label: 'Exclusive',
      desc: 'Full exclusive license. Creator may not post to competitor brands.',
    },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(350).springify()}>
      <SectionTitle label="Content Rights" />
      <View style={styles.rightsStack}>
        {rights.map(({ key, label, desc }) => {
          const sel = data.contentRights === key;
          return (
            <PressableScale
              key={key}
              scaleValue={0.97}
              onPress={() => {
                haptics.select();
                onChange({ contentRights: key });
              }}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected: sel }}
              style={[
                styles.rightsRow,
                {
                  backgroundColor: sel ? colors.activeLight : colors.surface,
                  borderColor: sel ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={[styles.radioOuter, { borderColor: sel ? colors.primary : colors.border }]}>
                {sel && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.rightsText}>
                <Text style={[styles.rightsLabel, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.rightsDesc, { color: colors.textSecondary }]}>{desc}</Text>
              </View>
              <Shield size={18} color={sel ? colors.primary : colors.textTertiary} strokeWidth={1.8} />
            </PressableScale>
          );
        })}
      </View>

      {data.contentRights !== 'standard' && (
        <Animated.View entering={FadeInDown.duration(250)}>
          <Input
            label="License Duration (months)"
            value={data.exclusivityMonths}
            onChangeText={(v) => onChange({ exclusivityMonths: v })}
            placeholder="e.g. 3"
            keyboardType="numeric"
            icon={<Clock size={16} color={colors.textTertiary} />}
          />
        </Animated.View>
      )}

      <SectionTitle label="Required Tags" />
      <Input
        label="Hashtags"
        value={data.hashtags}
        onChangeText={(v) => onChange({ hashtags: v })}
        placeholder="#surve #luxuryhotel #ad (comma-separated)"
        icon={<Hash size={16} color={colors.textTertiary} />}
      />
      <Input
        label="Handles to Tag"
        value={data.handles}
        onChangeText={(v) => onChange({ handles: v })}
        placeholder="@yourbrand @partner (comma-separated)"
        icon={<AtSign size={16} color={colors.textTertiary} />}
      />
    </Animated.View>
  );
}

// ─── Step 8: Review & Publish ─────────────────────────────────────────────────

function Step8_Review({ data }: { data: WizardData }) {
  const { colors } = useTheme();

  const typeInfo = LISTING_TYPES.find((t) => t.key === data.listingType);

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Type', value: typeInfo?.label ?? '—' },
    { label: 'Title', value: data.title || '—' },
    {
      label: 'Compensation',
      value:
        data.compensationType === 'paid'
          ? `$${data.paidAmount || '0'} cash`
          : data.compensationType === 'gifted'
          ? `Gifted ($${data.perkValue || '0'} value)`
          : `$${data.paidAmount || '0'} + gift ($${data.perkValue || '0'})`,
    },
    {
      label: 'Deliverables',
      value: [
        data.tiktoks > 0 ? `${data.tiktoks} TikTok${data.tiktoks > 1 ? 's' : ''}` : null,
        data.igReels > 0 ? `${data.igReels} Reel${data.igReels > 1 ? 's' : ''}` : null,
        data.igStories > 0 ? `${data.igStories} Stor${data.igStories > 1 ? 'ies' : 'y'}` : null,
        data.igPosts > 0 ? `${data.igPosts} Post${data.igPosts > 1 ? 's' : ''}` : null,
        data.blogPosts > 0 ? `${data.blogPosts} Blog` : null,
      ]
        .filter(Boolean)
        .join(', ') || '—',
    },
    {
      label: 'Dates',
      value:
        data.startDate && data.endDate
          ? `${data.startDate} → ${data.endDate}`
          : data.startDate || '—',
    },
    { label: 'Duration', value: DURATION_TYPES.find((d) => d.key === data.durationType)?.label ?? '—' },
    {
      label: 'Min Followers',
      value: `IG: ${formatFollowers(data.minFollowersInstagram)}, TikTok: ${formatFollowers(data.minFollowersTiktok)}`,
    },
    {
      label: 'Min Engagement',
      value: data.minEngagement === 0 ? 'Any' : `${data.minEngagement}%+`,
    },
    {
      label: 'Niches',
      value: data.niches.length > 0 ? data.niches.join(', ') : 'Any',
    },
    { label: 'Content Rights', value: data.contentRights.charAt(0).toUpperCase() + data.contentRights.slice(1) },
    {
      label: 'Hashtags',
      value: data.hashtags || '—',
    },
    { label: 'Handles', value: data.handles || '—' },
    { label: 'Photos', value: `${data.photos.length} photo${data.photos.length !== 1 ? 's' : ''}` },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(350).springify()}>
      {data.photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.reviewPhotoScroll}
        >
          {data.photos.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={styles.reviewPhoto}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {rows.map(({ label, value }, i) => (
          <View key={label}>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>{label}</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]} numberOfLines={3}>
                {value}
              </Text>
            </View>
            {i < rows.length - 1 && (
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreateListingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const user = useStore((s) => s.user);

  const photoPrime = usePermissionPrime('photo-library');

  // Draft restore on mount
  const restoredRef = useRef(false);
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.data) setData({ ...INITIAL_DATA, ...saved.data });
          if (typeof saved.step === 'number') setStep(saved.step);
        }
      } catch {
        // ignore
      } finally {
        restoredRef.current = true;
      }
    })();
  }, []);

  // Draft auto-save on change (debounced 600ms)
  useEffect(() => {
    if (!restoredRef.current) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data })).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [step, data]);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Validation per step
  const validateStep = useCallback((): string | null => {
    switch (step) {
      case 0:
        if (!data.listingType) return 'Please select a listing type.';
        break;
      case 1:
        if (!data.title.trim()) return 'Title is required.';
        if (!data.description.trim()) return 'Description is required.';
        break;
      case 2:
        if (data.photos.length < 3) return `Add at least 3 photos (${data.photos.length}/3 added).`;
        break;
      case 3:
        if (
          (data.compensationType === 'paid' || data.compensationType === 'both') &&
          !data.paidAmount
        )
          return 'Enter the cash amount.';
        break;
      case 4: {
        const total =
          data.tiktoks + data.igReels + data.igStories + data.igPosts + data.blogPosts;
        if (total === 0) return 'Add at least one deliverable.';
        break;
      }
      case 5:
        if (!data.startDate.trim()) return 'Enter a start date.';
        break;
    }
    return null;
  }, [step, data]);

  const handleNext = useCallback(() => {
    const err = validateStep();
    if (err) {
      haptics.error();
      toast.error(err);
      return;
    }
    haptics.confirm();
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, [validateStep, haptics]);

  const handleBack = useCallback(() => {
    if (step === 0) {
      haptics.tap();
      router.back();
    } else {
      haptics.tap();
      setStep((s) => s - 1);
    }
  }, [step, haptics, router]);

  // Photo picker
  const launchPicker = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 10 - data.photos.length,
    });
    if (!result.canceled) {
      haptics.confirm();
      const uris = result.assets.map((a) => a.uri);
      const next = [...data.photos, ...uris].slice(0, 10);
      updateData({ photos: next });
    }
  }, [data.photos, updateData, haptics]);

  const pickPhotos = useCallback(() => {
    photoPrime.prime(launchPicker);
  }, [photoPrime, launchPicker]);

  const handlePublish = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await api.createListing({
        business_id: user.id,
        title: data.title,
        description: data.description,
        platform: 'both' as any,
        category: data.listingType as any,
        pay_min:
          data.compensationType === 'gifted'
            ? 0
            : Number(data.paidAmount) || 0,
        pay_max:
          data.compensationType === 'gifted'
            ? 0
            : Number(data.paidAmount) || 0,
        min_followers:
          Math.max(data.minFollowersInstagram, data.minFollowersTiktok),
        min_engagement_rate: data.minEngagement,
        content_type: [
          data.tiktoks > 0 ? 'TikTok' : '',
          data.igReels > 0 ? 'Reels' : '',
          data.igStories > 0 ? 'Stories' : '',
          data.igPosts > 0 ? 'Posts' : '',
        ]
          .filter(Boolean)
          .join(', '),
        deadline: data.endDate
          ? new Date(data.endDate).toISOString()
          : new Date(Date.now() + 60 * 86400000).toISOString(),
        image_url: data.photos[0] ?? '',
      } as any);

      if (result) {
        await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
        haptics.success();
        toast.success('Listing published!');
        router.back();
      } else {
        toast.error('Failed to publish listing');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [user, data, haptics, router]);

  const isLastStep = step === TOTAL_STEPS - 1;

  const stepContent = () => {
    switch (step) {
      case 0:
        return <Step0_ListingType data={data} onChange={updateData} />;
      case 1:
        return <Step1_Details data={data} onChange={updateData} />;
      case 2:
        return (
          <Step2_Photos data={data} onChange={updateData} onPickPhotos={pickPhotos} />
        );
      case 3:
        return <Step3_Compensation data={data} onChange={updateData} />;
      case 4:
        return <Step4_Deliverables data={data} onChange={updateData} />;
      case 5:
        return <Step5_Dates data={data} onChange={updateData} />;
      case 6:
        return <Step6_Requirements data={data} onChange={updateData} />;
      case 7:
        return <Step7_ContentRights data={data} onChange={updateData} />;
      case 8:
        return <Step8_Review data={data} />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <PermissionPrime
        kind="photo-library"
        visible={photoPrime.visible}
        onConfirm={photoPrime.confirm}
        onDismiss={photoPrime.dismiss}
      />

      <ScreenHeader
        title={STEP_TITLES[step]}
        onBack={handleBack}
        right={
          <Text style={[styles.stepCounter, { color: colors.textTertiary }]}>
            {step + 1}/{TOTAL_STEPS}
          </Text>
        }
      />

      <StepProgressBar step={step} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {stepContent()}

        <View style={styles.navRow}>
          {step > 0 && (
            <Button
              title="Back"
              variant="outline"
              onPress={handleBack}
              style={styles.backBtn}
            />
          )}
          <Button
            title={isLastStep ? 'Publish Listing' : 'Continue'}
            onPress={isLastStep ? handlePublish : handleNext}
            loading={loading}
            style={isLastStep || step === 0 ? styles.fullBtn : styles.nextBtn}
            fullWidth={step === 0}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  stepCounter: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  stepHeading: {
    ...Typography.title3,
    marginBottom: Spacing.xxl,
    lineHeight: 28,
  },
  stepHint: {
    ...Typography.subheadline,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  sectionTitle: {
    ...Typography.headline,
    fontWeight: '600',
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  // ─ Type grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  typeCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 3) / 4,
    aspectRatio: 0.9,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    gap: Spacing.xs,
    position: 'relative',
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  typeLabel: {
    ...Typography.caption1,
    fontWeight: '600',
    textAlign: 'center',
  },
  typeCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─ Photo grid
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoThumb: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIndexText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.md,
    borderWidth: 2.5,
  },
  photoAdd: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  photoAddText: {
    ...Typography.caption2,
    fontWeight: '600',
  },
  photoMeta: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  photoCount: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  // ─ Compensation
  compTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  compTypeCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    position: 'relative',
    minHeight: 100,
  },
  compTypeLabel: {
    ...Typography.footnote,
    fontWeight: '700',
    textAlign: 'center',
  },
  compTypeDesc: {
    ...Typography.caption2,
    textAlign: 'center',
    lineHeight: 14,
  },
  compCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─ Deliverables
  delivCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  delivTotal: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  delivTotalText: {
    ...Typography.footnote,
  },
  // ─ Counter
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  counterLabel: {
    ...Typography.subheadline,
    fontWeight: '500',
    flex: 1,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    ...Typography.headline,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  // ─ Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  stepperLabel: {
    ...Typography.subheadline,
    fontWeight: '500',
    flex: 1,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    ...Typography.subheadline,
    fontWeight: '700',
    minWidth: 56,
    textAlign: 'center',
  },
  // ─ Dates
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dateSep: {
    marginTop: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  // ─ Requirements
  reqCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  nicheGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  nicheChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nicheChipText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  // ─ Rights
  rightsStack: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  rightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    minHeight: 72,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  rightsText: {
    flex: 1,
    gap: Spacing.xxs,
  },
  rightsLabel: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  rightsDesc: {
    ...Typography.caption1,
    lineHeight: 16,
  },
  // ─ Review
  reviewPhotoScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  reviewPhoto: {
    width: 120,
    height: 90,
    borderRadius: BorderRadius.md,
  },
  reviewCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  reviewLabel: {
    ...Typography.footnote,
    width: 110,
    paddingTop: 2,
  },
  reviewValue: {
    ...Typography.footnote,
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
  },
  // ─ Nav
  navRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xxl,
  },
  backBtn: {
    flex: 1,
  },
  nextBtn: {
    flex: 2,
  },
  fullBtn: {
    flex: 1,
  },
  // ─ Shared
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
  },
});
