import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import {
  UtensilsCrossed,
  Plane,
  Shirt,
  Sparkles,
  Dumbbell,
  Heart,
  Cpu,
  Gamepad2,
  Music,
  Smile,
  Briefcase,
  Trophy,
  CheckCircle2,
  X,
  Camera,
  Plus,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { PressableScale } from '../../components/ui/PressableScale';
import { Button } from '../../components/ui/Button';
import { ThemedText } from '../../components/ui/ThemedText';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Springs,
  Layout,
} from '../../constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const TOTAL_STEPS = 5;

const STEP_META = [
  { title: 'Your basics', subtitle: 'Tell creators who you are' },
  { title: 'Your niches', subtitle: 'Pick what you create' },
  { title: 'Connect socials', subtitle: 'Link your platforms' },
  { title: 'Portfolio', subtitle: 'Show your best work' },
  { title: 'Rates & availability', subtitle: 'Set your terms' },
];

const NICHES: { key: string; label: string; Icon: React.ComponentType<any> }[] =
  [
    { key: 'food', label: 'Food & Drink', Icon: UtensilsCrossed },
    { key: 'travel', label: 'Travel', Icon: Plane },
    { key: 'fashion', label: 'Fashion', Icon: Shirt },
    { key: 'beauty', label: 'Beauty', Icon: Sparkles },
    { key: 'fitness', label: 'Fitness', Icon: Dumbbell },
    { key: 'lifestyle', label: 'Lifestyle', Icon: Heart },
    { key: 'tech', label: 'Tech', Icon: Cpu },
    { key: 'gaming', label: 'Gaming', Icon: Gamepad2 },
    { key: 'music', label: 'Music', Icon: Music },
    { key: 'comedy', label: 'Comedy', Icon: Smile },
    { key: 'business', label: 'Business', Icon: Briefcase },
    { key: 'sports', label: 'Sports', Icon: Trophy },
  ];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Portuguese',
  'Italian', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Hindi', 'Dutch',
];

const AGE_RANGES = ['18–24', '25–34', '35–44', '45–54', '55+'];

const TRAVEL_OPTIONS = [
  { key: 'local', label: 'Local only' },
  { key: 'regional', label: 'Regional' },
  { key: 'national', label: 'National' },
  { key: 'international', label: 'International' },
];

// ─── Form State ───────────────────────────────────────────────────────────────

interface FormState {
  displayName: string;
  bio: string;
  location: string;
  ageRange: string;
  languages: string[];
  niches: string[];
  tiktokHandle: string;
  tiktokVerified: boolean;
  igHandle: string;
  igVerified: boolean;
  ytHandle: string;
  ytVerified: boolean;
  portfolioPhotos: string[];
  ratesVisible: boolean;
  baseRate: string;
  travelWillingness: string;
}

const INITIAL_FORM: FormState = {
  displayName: '',
  bio: '',
  location: '',
  ageRange: '',
  languages: [],
  niches: [],
  tiktokHandle: '',
  tiktokVerified: false,
  igHandle: '',
  igVerified: false,
  ytHandle: '',
  ytVerified: false,
  portfolioPhotos: [],
  ratesVisible: true,
  baseRate: '',
  travelWillingness: 'local',
};

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const widthPct = ((step + 1) / total) * 100;

  const animatedStyle = useAnimatedStyle(() => ({
    width: reducedMotion
      ? withTiming(`${widthPct}%` as any, { duration: 200 })
      : withSpring(`${widthPct}%` as any, Springs.gentle),
  }));

  return (
    <View
      style={[
        styles.progressTrack,
        { backgroundColor: colors.surfaceSecondary },
      ]}
    >
      <Animated.View
        style={[
          styles.progressFill,
          { backgroundColor: colors.primary },
          animatedStyle,
        ]}
      />
    </View>
  );
}

// ─── Step 1 — Basics ─────────────────────────────────────────────────────────

interface Step1Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  error: string;
}

function Step1Basics({ form, setForm, error }: Step1Props) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const toggleLanguage = useCallback(
    (lang: string) => {
      haptics.select();
      setForm((f) => ({
        ...f,
        languages: f.languages.includes(lang)
          ? f.languages.filter((l) => l !== lang)
          : [...f.languages, lang],
      }));
    },
    [haptics, setForm],
  );

  const selectAgeRange = useCallback(
    (range: string) => {
      haptics.select();
      setForm((f) => ({ ...f, ageRange: range }));
    },
    [haptics, setForm],
  );

  return (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.stepContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ThemedText variant="title2" style={{ color: colors.text }}>
        {STEP_META[0].title}
      </ThemedText>
      <ThemedText
        variant="subheadline"
        style={[styles.stepSubtitle, { color: colors.textSecondary }]}
      >
        {STEP_META[0].subtitle}
      </ThemedText>

      {/* Display name */}
      <View style={styles.fieldGroup}>
        <ThemedText
          variant="footnote"
          style={[styles.label, { color: colors.textSecondary }]}
        >
          DISPLAY NAME *
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: error && !form.displayName.trim() ? colors.error : colors.border,
            },
          ]}
          placeholder="e.g. Maya Chen"
          placeholderTextColor={colors.textTertiary}
          value={form.displayName}
          onChangeText={(v) => setForm((f) => ({ ...f, displayName: v }))}
          returnKeyType="next"
          autoCorrect={false}
          autoCapitalize="words"
        />
        {error !== '' && !form.displayName.trim() && (
          <ThemedText
            variant="footnote"
            style={[styles.errorText, { color: colors.error }]}
          >
            {error}
          </ThemedText>
        )}
      </View>

      {/* Bio */}
      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <ThemedText
            variant="footnote"
            style={[styles.label, { color: colors.textSecondary }]}
          >
            BIO
          </ThemedText>
          <ThemedText
            variant="caption1"
            style={{
              color:
                form.bio.length > 140 ? colors.error : colors.textTertiary,
            }}
          >
            {form.bio.length}/160
          </ThemedText>
        </View>
        <TextInput
          style={[
            styles.textInput,
            styles.textArea,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="A short intro about you and your content…"
          placeholderTextColor={colors.textTertiary}
          value={form.bio}
          onChangeText={(v) =>
            setForm((f) => ({ ...f, bio: v.slice(0, 160) }))
          }
          multiline
          numberOfLines={4}
          returnKeyType="default"
          textAlignVertical="top"
        />
      </View>

      {/* Location */}
      <View style={styles.fieldGroup}>
        <ThemedText
          variant="footnote"
          style={[styles.label, { color: colors.textSecondary }]}
        >
          LOCATION
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="City, Country"
          placeholderTextColor={colors.textTertiary}
          value={form.location}
          onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
          returnKeyType="done"
          autoCorrect={false}
        />
      </View>

      {/* Age Range */}
      <View style={styles.fieldGroup}>
        <ThemedText
          variant="footnote"
          style={[styles.label, { color: colors.textSecondary }]}
        >
          AGE RANGE
        </ThemedText>
        <View style={styles.chipRow}>
          {AGE_RANGES.map((range) => {
            const selected = form.ageRange === range;
            return (
              <PressableScale
                key={range}
                scaleValue={0.94}
                onPress={() => selectAgeRange(range)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? colors.primary
                      : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={range}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? colors.onPrimary : colors.text },
                  ]}
                >
                  {range}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      {/* Languages */}
      <View style={[styles.fieldGroup, styles.lastField]}>
        <ThemedText
          variant="footnote"
          style={[styles.label, { color: colors.textSecondary }]}
        >
          LANGUAGES
        </ThemedText>
        <View style={styles.chipRow}>
          {LANGUAGES.map((lang) => {
            const selected = form.languages.includes(lang);
            return (
              <PressableScale
                key={lang}
                scaleValue={0.94}
                onPress={() => toggleLanguage(lang)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? colors.primary
                      : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={lang}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? colors.onPrimary : colors.text },
                  ]}
                >
                  {lang}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Step 2 — Niches ─────────────────────────────────────────────────────────

interface Step2Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  error: string;
}

function Step2Niches({ form, setForm, error }: Step2Props) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const toggleNiche = useCallback(
    (key: string) => {
      haptics.select();
      setForm((f) => ({
        ...f,
        niches: f.niches.includes(key)
          ? f.niches.filter((n) => n !== key)
          : [...f.niches, key],
      }));
    },
    [haptics, setForm],
  );

  return (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText variant="title2" style={{ color: colors.text }}>
        {STEP_META[1].title}
      </ThemedText>
      <ThemedText
        variant="subheadline"
        style={[styles.stepSubtitle, { color: colors.textSecondary }]}
      >
        {STEP_META[1].subtitle}
      </ThemedText>

      {error !== '' && form.niches.length === 0 && (
        <Animated.View entering={FadeIn.duration(250)}>
          <ThemedText
            variant="footnote"
            style={[
              styles.errorBanner,
              { backgroundColor: colors.errorLight, color: colors.error },
            ]}
          >
            {error}
          </ThemedText>
        </Animated.View>
      )}

      <View style={styles.nicheGrid}>
        {NICHES.map(({ key, label, Icon }) => {
          const selected = form.niches.includes(key);
          return (
            <PressableScale
              key={key}
              scaleValue={0.93}
              onPress={() => toggleNiche(key)}
              style={[
                styles.nicheCard,
                {
                  backgroundColor: selected
                    ? colors.activeLight
                    : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  borderWidth: selected ? 2 : 1,
                },
                Shadows.sm,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
            >
              <View
                style={[
                  styles.nicheIconWrap,
                  {
                    backgroundColor: selected
                      ? colors.primary
                      : colors.surfaceSecondary,
                  },
                ]}
              >
                <Icon
                  size={22}
                  color={selected ? colors.onPrimary : colors.primary}
                  strokeWidth={2}
                />
              </View>
              <Text
                style={[
                  styles.nicheLabel,
                  { color: selected ? colors.primary : colors.text },
                ]}
                numberOfLines={2}
              >
                {label}
              </Text>
              {selected && (
                <CheckCircle2
                  size={16}
                  color={colors.primary}
                  style={styles.nicheCheck}
                  strokeWidth={2.5}
                />
              )}
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.lastField} />
    </ScrollView>
  );
}

// ─── Step 3 — Connect Socials ────────────────────────────────────────────────

interface Step3Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}

type SocialKey = 'tiktok' | 'ig' | 'yt';

interface SocialRowProps {
  platform: SocialKey;
  label: string;
  handleValue: string;
  verified: boolean;
  color: string;
  onChangeHandle: (v: string) => void;
  onVerify: () => void;
  verifying: boolean;
}

function SocialRow({
  platform,
  label,
  handleValue,
  verified,
  color,
  onChangeHandle,
  onVerify,
  verifying,
}: SocialRowProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handleVerify = useCallback(() => {
    haptics.confirm();
    onVerify();
  }, [haptics, onVerify]);

  return (
    <View
      style={[
        styles.socialCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        Shadows.sm,
      ]}
    >
      <View
        style={[styles.socialIconBadge, { backgroundColor: color + '20' }]}
      >
        <ThemedText
          variant="footnote"
          style={[styles.socialPlatformLetter, { color }]}
        >
          {label[0]}
        </ThemedText>
      </View>
      <View style={styles.socialInputWrap}>
        <ThemedText
          variant="footnote"
          style={[styles.label, { color: colors.textSecondary }]}
        >
          {label.toUpperCase()}
        </ThemedText>
        <TextInput
          style={[
            styles.socialInput,
            { color: colors.text, borderBottomColor: colors.borderLight },
          ]}
          placeholder="@handle"
          placeholderTextColor={colors.textTertiary}
          value={handleValue}
          onChangeText={onChangeHandle}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>
      {verified ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.verifiedBadge}>
          <CheckCircle2 size={20} color={colors.success} strokeWidth={2.5} />
          <ThemedText
            variant="caption1"
            style={{ color: colors.success, marginLeft: 4 }}
          >
            Verified
          </ThemedText>
        </Animated.View>
      ) : (
        <PressableScale
          scaleValue={0.92}
          onPress={handleVerify}
          disabled={!handleValue.trim() || verifying}
          style={[
            styles.verifyBtn,
            {
              backgroundColor:
                handleValue.trim() ? colors.primary : colors.surfaceSecondary,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Verify ${label}`}
          accessibilityState={{ disabled: !handleValue.trim() || verifying }}
        >
          <Text
            style={[
              styles.verifyBtnText,
              {
                color: handleValue.trim()
                  ? colors.onPrimary
                  : colors.textTertiary,
              },
            ]}
          >
            {verifying ? '…' : 'Verify'}
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

function Step3Socials({ form, setForm }: Step3Props) {
  const { colors } = useTheme();
  const [verifying, setVerifying] = useState<SocialKey | null>(null);

  const handleVerify = useCallback(
    (platform: SocialKey) => {
      setVerifying(platform);
      setTimeout(() => {
        setVerifying(null);
        const key =
          platform === 'tiktok'
            ? 'tiktokVerified'
            : platform === 'ig'
              ? 'igVerified'
              : 'ytVerified';
        setForm((f) => ({ ...f, [key]: true }));
      }, 1500);
    },
    [setForm],
  );

  return (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.stepContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ThemedText variant="title2" style={{ color: colors.text }}>
        {STEP_META[2].title}
      </ThemedText>
      <ThemedText
        variant="subheadline"
        style={[styles.stepSubtitle, { color: colors.textSecondary }]}
      >
        {STEP_META[2].subtitle}
      </ThemedText>

      <View style={styles.socialsStack}>
        <SocialRow
          platform="tiktok"
          label="TikTok"
          handleValue={form.tiktokHandle}
          verified={form.tiktokVerified}
          color="#010101"
          onChangeHandle={(v) => setForm((f) => ({ ...f, tiktokHandle: v, tiktokVerified: false }))}
          onVerify={() => handleVerify('tiktok')}
          verifying={verifying === 'tiktok'}
        />
        <SocialRow
          platform="ig"
          label="Instagram"
          handleValue={form.igHandle}
          verified={form.igVerified}
          color="#E1306C"
          onChangeHandle={(v) => setForm((f) => ({ ...f, igHandle: v, igVerified: false }))}
          onVerify={() => handleVerify('ig')}
          verifying={verifying === 'ig'}
        />
        <SocialRow
          platform="yt"
          label="YouTube"
          handleValue={form.ytHandle}
          verified={form.ytVerified}
          color="#FF0000"
          onChangeHandle={(v) => setForm((f) => ({ ...f, ytHandle: v, ytVerified: false }))}
          onVerify={() => handleVerify('yt')}
          verifying={verifying === 'yt'}
        />
      </View>

      <ThemedText
        variant="caption1"
        style={[styles.socialHint, { color: colors.textTertiary }]}
      >
        Verifying your accounts builds trust with businesses. You can skip and
        connect later in Profile settings.
      </ThemedText>

      <View style={styles.lastField} />
    </ScrollView>
  );
}

// ─── Step 4 — Portfolio ───────────────────────────────────────────────────────

interface Step4Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}

function Step4Portfolio({ form, setForm }: Step4Props) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const pickImages = useCallback(async () => {
    haptics.tap();
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    const remaining = 5 - form.portfolioPhotos.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setForm((f) => ({
        ...f,
        portfolioPhotos: [...f.portfolioPhotos, ...newUris].slice(0, 5),
      }));
      haptics.confirm();
    }
  }, [form.portfolioPhotos.length, haptics, setForm]);

  const removePhoto = useCallback(
    (uri: string) => {
      haptics.tap();
      setForm((f) => ({
        ...f,
        portfolioPhotos: f.portfolioPhotos.filter((p) => p !== uri),
      }));
    },
    [haptics, setForm],
  );

  const canAdd = form.portfolioPhotos.length < 5;

  return (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText variant="title2" style={{ color: colors.text }}>
        {STEP_META[3].title}
      </ThemedText>
      <ThemedText
        variant="subheadline"
        style={[styles.stepSubtitle, { color: colors.textSecondary }]}
      >
        {STEP_META[3].subtitle}
      </ThemedText>

      <ThemedText
        variant="caption1"
        style={[styles.portfolioHint, { color: colors.textTertiary }]}
      >
        Add up to 5 photos that showcase your content style
      </ThemedText>

      <View style={styles.portfolioGrid}>
        {form.portfolioPhotos.map((uri) => (
          <View
            key={uri}
            style={[
              styles.portfolioThumb,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <PressableScale
              scaleValue={0.9}
              onPress={() => removePhoto(uri)}
              style={[
                styles.removeBtn,
                { backgroundColor: 'rgba(0,0,0,0.65)' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <X size={14} color="#FFF" strokeWidth={2.5} />
            </PressableScale>
          </View>
        ))}

        {canAdd && (
          <PressableScale
            scaleValue={0.95}
            onPress={pickImages}
            style={[
              styles.portfolioThumb,
              styles.portfolioAdd,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              Shadows.sm,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add portfolio photo"
          >
            <View
              style={[
                styles.addIconWrap,
                { backgroundColor: colors.activeLight },
              ]}
            >
              <Camera size={22} color={colors.primary} strokeWidth={2} />
            </View>
            <Text
              style={[
                styles.addPhotoText,
                { color: colors.primary },
              ]}
            >
              Add photo
            </Text>
          </PressableScale>
        )}
      </View>

      {form.portfolioPhotos.length === 0 && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.emptyPortfolio,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <Camera size={36} color={colors.textTertiary} strokeWidth={1.5} />
          <ThemedText
            variant="subheadline"
            style={[styles.emptyTitle, { color: colors.textSecondary }]}
          >
            No photos yet
          </ThemedText>
          <ThemedText
            variant="footnote"
            style={{ color: colors.textTertiary, textAlign: 'center' }}
          >
            Your portfolio helps businesses understand your style
          </ThemedText>
        </Animated.View>
      )}

      <View style={styles.lastField} />
    </ScrollView>
  );
}

// ─── Step 5 — Rates & Availability ───────────────────────────────────────────

interface Step5Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}

function Step5Rates({ form, setForm }: Step5Props) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const toggleVisible = useCallback(
    (val: boolean) => {
      haptics.select();
      setForm((f) => ({ ...f, ratesVisible: val }));
    },
    [haptics, setForm],
  );

  const selectTravel = useCallback(
    (key: string) => {
      haptics.select();
      setForm((f) => ({ ...f, travelWillingness: key }));
    },
    [haptics, setForm],
  );

  return (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.stepContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ThemedText variant="title2" style={{ color: colors.text }}>
        {STEP_META[4].title}
      </ThemedText>
      <ThemedText
        variant="subheadline"
        style={[styles.stepSubtitle, { color: colors.textSecondary }]}
      >
        {STEP_META[4].subtitle}
      </ThemedText>

      {/* Visible toggle */}
      <View
        style={[
          styles.toggleRow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          Shadows.sm,
        ]}
      >
        <View style={styles.toggleInfo}>
          <ThemedText variant="headline" style={{ color: colors.text }}>
            Show rates publicly
          </ThemedText>
          <ThemedText
            variant="footnote"
            style={{ color: colors.textSecondary, marginTop: 2 }}
          >
            Businesses can see your rate on your profile
          </ThemedText>
        </View>
        <Switch
          value={form.ratesVisible}
          onValueChange={toggleVisible}
          trackColor={{
            false: colors.surfaceSecondary,
            true: colors.primary,
          }}
          thumbColor={colors.surface}
          accessibilityLabel="Toggle public rates visibility"
        />
      </View>

      {/* Base rate */}
      <View style={styles.fieldGroup}>
        <ThemedText
          variant="footnote"
          style={[styles.label, { color: colors.textSecondary }]}
        >
          BASE RATE (USD / POST)
        </ThemedText>
        <View
          style={[
            styles.rateInputWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <ThemedText
            variant="body"
            style={[styles.currencySymbol, { color: colors.textSecondary }]}
          >
            $
          </ThemedText>
          <TextInput
            style={[styles.rateInput, { color: colors.text }]}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            value={form.baseRate}
            onChangeText={(v) => {
              const numeric = v.replace(/[^0-9.]/g, '');
              setForm((f) => ({ ...f, baseRate: numeric }));
            }}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Travel willingness */}
      <View style={[styles.fieldGroup, styles.lastField]}>
        <ThemedText
          variant="footnote"
          style={[styles.label, { color: colors.textSecondary }]}
        >
          TRAVEL WILLINGNESS
        </ThemedText>
        <View style={styles.travelGrid}>
          {TRAVEL_OPTIONS.map(({ key, label }) => {
            const selected = form.travelWillingness === key;
            return (
              <PressableScale
                key={key}
                scaleValue={0.94}
                onPress={() => selectTravel(key)}
                style={[
                  styles.travelChip,
                  {
                    backgroundColor: selected
                      ? colors.primary
                      : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                  Shadows.sm,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
              >
                <Text
                  style={[
                    styles.travelChipText,
                    { color: selected ? colors.onPrimary : colors.text },
                  ]}
                >
                  {label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreatorOnboardingScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const translateX = useSharedValue(0);

  const carouselStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const goToStep = useCallback(
    (nextStep: number) => {
      const target = -nextStep * SCREEN_WIDTH;
      translateX.value = reducedMotion
        ? withTiming(target, { duration: 250 })
        : withSpring(target, Springs.gentle);
      setCurrentStep(nextStep);
      setError('');
    },
    [reducedMotion, translateX],
  );

  const validate = useCallback((): boolean => {
    if (currentStep === 0 && !form.displayName.trim()) {
      setError('Display name is required');
      haptics.error();
      return false;
    }
    if (currentStep === 1 && form.niches.length === 0) {
      setError('Select at least one niche');
      haptics.error();
      return false;
    }
    return true;
  }, [currentStep, form.displayName, form.niches.length, haptics]);

  const handleNext = useCallback(() => {
    Keyboard.dismiss();
    if (!validate()) return;
    if (currentStep < TOTAL_STEPS - 1) {
      haptics.confirm();
      goToStep(currentStep + 1);
    } else {
      // Submit
      haptics.success();
      setSubmitting(true);
      setTimeout(() => {
        setSubmitting(false);
        router.replace('/(tabs)');
      }, 800);
    }
  }, [currentStep, goToStep, haptics, router, validate]);

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    if (currentStep === 0) {
      haptics.tap();
      router.back();
    } else {
      haptics.tap();
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep, haptics, router]);

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + Spacing.md, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.headerTop}>
          <PressableScale
            scaleValue={0.88}
            onPress={handleBack}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronRight
              size={24}
              color={colors.text}
              strokeWidth={2.2}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </PressableScale>

          <ThemedText
            variant="footnote"
            style={{ color: colors.textSecondary }}
          >
            {currentStep + 1} of {TOTAL_STEPS}
          </ThemedText>

          <View style={{ width: 44 }} />
        </View>

        <ProgressBar step={currentStep} total={TOTAL_STEPS} />
      </View>

      {/* Carousel */}
      <View style={styles.carouselViewport}>
        <Animated.View
          style={[
            styles.carouselTrack,
            { width: SCREEN_WIDTH * TOTAL_STEPS },
            carouselStyle,
          ]}
        >
          <View style={[styles.stepPage, { width: SCREEN_WIDTH }]}>
            <Step1Basics form={form} setForm={setForm} error={error} />
          </View>
          <View style={[styles.stepPage, { width: SCREEN_WIDTH }]}>
            <Step2Niches form={form} setForm={setForm} error={error} />
          </View>
          <View style={[styles.stepPage, { width: SCREEN_WIDTH }]}>
            <Step3Socials form={form} setForm={setForm} />
          </View>
          <View style={[styles.stepPage, { width: SCREEN_WIDTH }]}>
            <Step4Portfolio form={form} setForm={setForm} />
          </View>
          <View style={[styles.stepPage, { width: SCREEN_WIDTH }]}>
            <Step5Rates form={form} setForm={setForm} />
          </View>
        </Animated.View>
      </View>

      {/* Bottom Navigation */}
      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: colors.background,
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        {currentStep > 0 && (
          <Button
            title="Back"
            variant="outline"
            size="lg"
            onPress={handleBack}
            style={styles.backBtnNav}
          />
        )}
        <Button
          title={isLastStep ? 'Finish' : 'Continue'}
          variant="primary"
          size="lg"
          onPress={handleNext}
          loading={submitting}
          fullWidth={currentStep === 0}
          style={currentStep > 0 ? styles.nextBtnNav : undefined}
          icon={
            !isLastStep && !submitting ? (
              <ChevronRight size={20} color={colors.onPrimary} strokeWidth={2.5} />
            ) : undefined
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    minHeight: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress bar
  progressTrack: {
    height: 4,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },

  // Carousel
  carouselViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  carouselTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  stepPage: {
    flex: 1,
  },

  // Step shared
  stepScroll: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.massive,
  },
  stepSubtitle: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xxl,
  },
  lastField: {
    paddingBottom: Spacing.massive,
  },

  // Fields
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
    minHeight: 44,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  errorText: {
    marginTop: Spacing.xs,
  },
  errorBanner: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    ...Typography.footnote,
    fontWeight: '500',
  },

  // Niche grid
  nicheGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  nicheCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'flex-start',
    position: 'relative',
  },
  nicheIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  nicheLabel: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  nicheCheck: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },

  // Socials
  socialsStack: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  socialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  socialIconBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialPlatformLetter: {
    fontWeight: '700',
    fontSize: 18,
  },
  socialInputWrap: {
    flex: 1,
  },
  socialInput: {
    ...Typography.body,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyBtn: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    height: 36,
    minWidth: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  socialHint: {
    textAlign: 'center',
    lineHeight: 18,
  },

  // Portfolio
  portfolioHint: {
    marginBottom: Spacing.xl,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  portfolioThumb: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2) / 3,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  portfolioAdd: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  addIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    ...Typography.caption1,
    fontWeight: '600',
  },
  removeBtn: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPortfolio: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyTitle: {
    fontWeight: '600',
  },

  // Rates
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  rateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    height: 52,
  },
  currencySymbol: {
    marginRight: Spacing.xs,
  },
  rateInput: {
    flex: 1,
    ...Typography.body,
    minHeight: 44,
  },
  travelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  travelChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  travelChipText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    alignItems: 'center',
  },
  backBtnNav: {
    flex: 1,
  },
  nextBtnNav: {
    flex: 2,
  },
});
