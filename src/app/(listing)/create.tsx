import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useIsOffline } from '../../hooks/useIsOffline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';
import {
  ImagePlus,
  Eye,
  Globe,
  Sparkles,
  Zap,
  TrendingUp,
  Star,
  Video,
  Heart,
  Check,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
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
import { ListingFilterChips } from '../../components/listing/ListingFilters';
import { platforms, categories, filterTemplates, FilterTemplate } from '../../constants/filters';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { formatCurrencyRange } from '../../lib/currency';

const TEMPLATE_ICONS: Record<string, React.ComponentType<any>> = {
  globe: Globe,
  sparkles: Sparkles,
  zap: Zap,
  'trending-up': TrendingUp,
  star: Star,
  video: Video,
  heart: Heart,
};

function TemplateCard({
  template,
  selected,
  onPress,
}: {
  template: FilterTemplate;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handlePress = useCallback(() => {
    haptics.select();
    onPress();
  }, [haptics, onPress]);

  const Icon = TEMPLATE_ICONS[template.icon] || Globe;

  return (
    <PressableScale
      scaleValue={0.95}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Template: ${template.label}`}
      accessibilityState={{ selected }}
      style={[
        styles.templateCard,
        {
          backgroundColor: selected ? colors.activeLight : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
        selected && Shadows.sm,
      ]}
    >
      <View style={styles.templateTop}>
        <View
          style={[
            styles.templateIcon,
            {
              backgroundColor: selected ? colors.primary : colors.surfaceSecondary,
            },
          ]}
        >
          <Icon
            size={16}
            color={selected ? colors.onPrimary : colors.textSecondary}
            strokeWidth={2}
          />
        </View>
        {selected && (
          <View style={[styles.templateCheck, { backgroundColor: colors.primary }]}>
            <Check size={10} color={colors.onPrimary} strokeWidth={3} />
          </View>
        )}
      </View>
      <Text
        style={[
          styles.templateLabel,
          { color: selected ? colors.primary : colors.text },
        ]}
        numberOfLines={1}
      >
        {template.label}
      </Text>
      <Text
        style={[styles.templateDesc, { color: colors.textTertiary }]}
        numberOfLines={2}
      >
        {template.description}
      </Text>
    </PressableScale>
  );
}

type FormErrors = {
  title?: string;
  description?: string;
  payMin?: string;
  payMax?: string;
};

const DRAFT_STORAGE_KEY = 'surve:listing-draft';

type DraftData = {
  title: string;
  description: string;
  platform: string;
  category: string;
  payMin: string;
  payMax: string;
  minFollowers: string;
  minEngagement: string;
  contentType: string;
  deadline: string;
  coverUri: string;
  selectedTemplate: string | null;
};

export default function CreateListingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const isOffline = useIsOffline();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [category, setCategory] = useState('hotel');
  const [payMin, setPayMin] = useState('');
  const [payMax, setPayMax] = useState('');
  const [minFollowers, setMinFollowers] = useState('');
  const [minEngagement, setMinEngagement] = useState('');
  const [contentType, setContentType] = useState('');
  const [deadline, setDeadline] = useState('');
  const [coverUri, setCoverUri] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const user = useStore((s) => s.user);

  const [errors, setErrors] = useState<FormErrors>({});
  const [shakeTrigger, setShakeTrigger] = useState(0);

  // --- Draft auto-save: restore on mount ---
  const restoredRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const draft: DraftData = JSON.parse(raw);
          setTitle(draft.title ?? '');
          setDescription(draft.description ?? '');
          setPlatform(draft.platform ?? 'instagram');
          setCategory(draft.category ?? 'hotel');
          setPayMin(draft.payMin ?? '');
          setPayMax(draft.payMax ?? '');
          setMinFollowers(draft.minFollowers ?? '');
          setMinEngagement(draft.minEngagement ?? '');
          setContentType(draft.contentType ?? '');
          setDeadline(draft.deadline ?? '');
          setCoverUri(draft.coverUri ?? '');
          setSelectedTemplate(draft.selectedTemplate ?? null);
        }
      } catch {
        // ignore corrupt draft
      } finally {
        restoredRef.current = true;
      }
    })();
  }, []);

  // --- Draft auto-save: persist on change (debounced 500ms) ---
  useEffect(() => {
    if (!restoredRef.current) return;
    const timer = setTimeout(() => {
      const draft: DraftData = {
        title,
        description,
        platform,
        category,
        payMin,
        payMax,
        minFollowers,
        minEngagement,
        contentType,
        deadline,
        coverUri,
        selectedTemplate,
      };
      AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft)).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [title, description, platform, category, payMin, payMax, minFollowers, minEngagement, contentType, deadline, coverUri, selectedTemplate]);

  const clearFieldError = useCallback((field: keyof FormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const applyTemplate = useCallback(
    (template: FilterTemplate) => {
      if (selectedTemplate === template.key) {
        setSelectedTemplate(null);
        setMinFollowers('');
        setMinEngagement('');
        setContentType('');
        setPlatform('instagram');
        haptics.tap();
        return;
      }
      setSelectedTemplate(template.key);
      setMinFollowers(template.minFollowers);
      setMinEngagement(template.minEngagement);
      if (template.contentType) setContentType(template.contentType);
      setPlatform(template.platform);
      haptics.confirm();
    },
    [selectedTemplate, haptics],
  );

  const photoPrime = usePermissionPrime('photo-library');

  const launchCoverPicker = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      haptics.tap();
      setCoverUri(result.assets[0].uri);
    }
  }, [haptics]);

  const pickCoverImage = useCallback(async () => {
    await photoPrime.prime(launchCoverPicker);
  }, [photoPrime, launchCoverPicker]);

  const handlePreview = useCallback(() => {
    haptics.confirm();
    setShowPreview(!showPreview);
  }, [showPreview, haptics]);

  const handleSubmit = useCallback(async () => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    const minVal = Number(payMin);
    const maxVal = Number(payMax);
    if (payMin && (isNaN(minVal) || minVal < 0)) {
      newErrors.payMin = 'Enter a valid amount';
    }
    if (payMax && (isNaN(maxVal) || maxVal < 0)) {
      newErrors.payMax = 'Enter a valid amount';
    }
    if (payMin && payMax && !isNaN(minVal) && !isNaN(maxVal) && minVal > maxVal) {
      newErrors.payMax = 'Max must be greater than min';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeTrigger((n) => n + 1);
      haptics.error();
      return;
    }

    setErrors({});
    if (!user) return;
    setLoading(true);
    try {
      const result = await api.createListing({
        business_id: user.id,
        title,
        description,
        platform: platform as any,
        category: category as any,
        pay_min: Number(payMin) || 0,
        pay_max: Number(payMax) || 0,
        min_followers: Number(minFollowers) || 0,
        min_engagement_rate: Number(minEngagement) || 0,
        content_type: contentType,
        deadline: deadline || new Date(Date.now() + 30 * 86400000).toISOString(),
        image_url: coverUri,
      } as any);
      if (result) {
        await AsyncStorage.removeItem(DRAFT_STORAGE_KEY).catch(() => {});
        haptics.success();
        router.back();
      } else {
        toast.error('Failed to create listing');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [title, description, platform, category, payMin, payMax, minFollowers, minEngagement, contentType, deadline, coverUri, user, router, haptics]);

  const platformItems = platforms.filter((p) => p.key !== 'all');
  const categoryItems = categories.filter((c) => c.key !== 'all');

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
        title="New Listing"
        right={
          <PressableScale onPress={handlePreview} hitSlop={8} scaleValue={0.88} accessibilityRole="button" accessibilityLabel={showPreview ? "Hide preview" : "Show preview"}>
            <Eye size={22} color={colors.primary} strokeWidth={2} />
          </PressableScale>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Upload */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <PressableScale
            style={[
              styles.imageUpload,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={pickCoverImage}
            accessibilityRole="button"
            accessibilityLabel={coverUri ? "Change cover image" : "Add cover image"}
            accessibilityHint="Double tap to select an image from your photo library"
          >
            {coverUri ? (
              <AdaptiveImage source={{ uri: coverUri }} contentFit="cover" style={styles.coverImage} accessibilityLabel="Selected cover image" />
            ) : (
              <>
                <ImagePlus size={32} color={colors.textTertiary} strokeWidth={1.5} />
                <Text style={[styles.imageUploadText, { color: colors.textTertiary }]}>
                  Add cover image
                </Text>
                <Text style={[styles.imageUploadHint, { color: colors.textTertiary }]}>
                  Recommended: 1200x800px
                </Text>
              </>
            )}
          </PressableScale>
        </Animated.View>

        {/* Basic Info */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
            Basic Information
          </Text>
          <Input
            label="Title"
            value={title}
            onChangeText={(v) => { setTitle(v); clearFieldError('title'); }}
            placeholder="e.g., Luxury Suite Experience - Instagram Reel"
            maxLength={100}
            showCharCount
            returnKeyType="next"
            error={errors.title}
            shakeTrigger={errors.title ? shakeTrigger : 0}
          />
          <Input
            label="Description"
            value={description}
            onChangeText={(v) => { setDescription(v); clearFieldError('description'); }}
            placeholder="Describe what you need from the creator..."
            multiline
            numberOfLines={4}
            maxLength={500}
            showCharCount
            error={errors.description}
            shakeTrigger={errors.description ? shakeTrigger : 0}
          />
        </Animated.View>

        {/* Platform */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
            Platform
          </Text>
          <ListingFilterChips
            items={platformItems}
            selectedKey={platform}
            onSelect={setPlatform}
          />
        </Animated.View>

        {/* Category */}
        <Animated.View entering={FadeInDown.duration(400).delay(350)}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, marginTop: Spacing.xl },
            ]}
            accessibilityRole="header"
          >
            Category
          </Text>
          <ListingFilterChips
            items={categoryItems}
            selectedKey={category}
            onSelect={setCategory}
          />
        </Animated.View>

        {/* Audience Templates */}
        <Animated.View entering={FadeInDown.duration(400).delay(375)}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, marginTop: Spacing.xl },
            ]}
            accessibilityRole="header"
          >
            Audience Template
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>
            Quick-fill creator requirements from a preset
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templateScroll}
          >
            {filterTemplates.map((t) => (
              <TemplateCard
                key={t.key}
                template={t}
                selected={selectedTemplate === t.key}
                onPress={() => applyTemplate(t)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Pay Range */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, marginTop: Spacing.xl },
            ]}
            accessibilityRole="header"
          >
            Compensation
          </Text>
          <View style={styles.payRow}>
            <View style={styles.payInput}>
              <Input
                label="Min ($)"
                value={payMin}
                onChangeText={(v) => { setPayMin(v); clearFieldError('payMin'); }}
                placeholder="100"
                keyboardType="numeric"
                error={errors.payMin}
                shakeTrigger={errors.payMin ? shakeTrigger : 0}
              />
            </View>
            <View style={styles.payInput}>
              <Input
                label="Max ($)"
                value={payMax}
                onChangeText={(v) => { setPayMax(v); clearFieldError('payMax'); }}
                placeholder="500"
                keyboardType="numeric"
                error={errors.payMax}
                shakeTrigger={errors.payMax ? shakeTrigger : 0}
              />
            </View>
          </View>
        </Animated.View>

        {/* Requirements */}
        <Animated.View entering={FadeInDown.duration(400).delay(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
            Requirements
          </Text>
          <View style={styles.payRow}>
            <View style={styles.payInput}>
              <Input
                label="Min Followers"
                value={minFollowers}
                onChangeText={setMinFollowers}
                placeholder="10000"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.payInput}>
              <Input
                label="Min Engagement %"
                value={minEngagement}
                onChangeText={setMinEngagement}
                placeholder="3.0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Input
            label="Content Type"
            value={contentType}
            onChangeText={setContentType}
            placeholder="e.g., Reels + Stories"
          />
          <Input
            label="Deadline"
            value={deadline}
            onChangeText={setDeadline}
            placeholder="e.g., April 15, 2026"
          />
        </Animated.View>

        {/* Preview */}
        {showPreview && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>
              Preview
            </Text>
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <Text style={[styles.previewTitle, { color: colors.text }]}>
                {title || 'Your listing title'}
              </Text>
              <Text
                style={[
                  styles.previewDescription,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={3}
              >
                {description || 'Your listing description will appear here...'}
              </Text>
              <Text style={[styles.previewPay, { color: colors.primary }]}>
                {formatCurrencyRange(Number(payMin) || 0, Number(payMax) || 0)}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Submit */}
        <View style={styles.submitSection}>
          <Button
            title={isOffline ? 'Offline' : 'Post Listing'}
            onPress={handleSubmit}
            loading={loading}
            disabled={isOffline}
            size="lg"
            fullWidth
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  imageUpload: {
    height: 160,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.lg,
  },
  imageUploadText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  imageUploadHint: {
    ...Typography.caption1,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  payRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  payInput: {
    flex: 1,
  },
  previewCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  previewTitle: {
    ...Typography.headline,
    marginBottom: Spacing.sm,
  },
  previewDescription: {
    ...Typography.subheadline,
    marginBottom: Spacing.sm,
  },
  previewPay: {
    ...Typography.title3,
    fontWeight: '700',
  },
  submitSection: {
    marginTop: Spacing.xl,
  },
  sectionHint: {
    ...Typography.caption1,
    marginBottom: Spacing.md,
  },
  templateScroll: {
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  templateCard: {
    width: 140,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  templateTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  templateIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateCheck: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateLabel: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  templateDesc: {
    ...Typography.caption2,
    lineHeight: 14,
  },
});
