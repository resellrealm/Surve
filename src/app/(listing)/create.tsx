import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  ImagePlus,
  Eye,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ListingFilterChips } from '../../components/listing/ListingFilters';
import { platforms, categories } from '../../lib/mockData';
import { Typography, Spacing, BorderRadius, Layout } from '../../constants/theme';

export default function CreateListingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handlePreview = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPreview(!showPreview);
  }, [showPreview]);

  const handleSubmit = useCallback(() => {
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      setLoading(false);
      router.back();
    }, 1000);
  }, [router]);

  const platformItems = platforms.filter((p) => p.key !== 'all');
  const categoryItems = categories.filter((c) => c.key !== 'all');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Create Listing
        </Text>
        <Pressable onPress={handlePreview} style={styles.previewButton}>
          <Eye size={22} color={colors.primary} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Upload */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Pressable
            style={[
              styles.imageUpload,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <ImagePlus size={32} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={[styles.imageUploadText, { color: colors.textTertiary }]}>
              Add cover image
            </Text>
            <Text style={[styles.imageUploadHint, { color: colors.textTertiary }]}>
              Recommended: 1200x800px
            </Text>
          </Pressable>
        </Animated.View>

        {/* Basic Info */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Basic Information
          </Text>
          <Input
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Luxury Suite Experience - Instagram Reel"
          />
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what you need from the creator..."
            multiline
            numberOfLines={4}
          />
        </Animated.View>

        {/* Platform */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
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
          >
            Category
          </Text>
          <ListingFilterChips
            items={categoryItems}
            selectedKey={category}
            onSelect={setCategory}
          />
        </Animated.View>

        {/* Pay Range */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, marginTop: Spacing.xl },
            ]}
          >
            Compensation
          </Text>
          <View style={styles.payRow}>
            <View style={styles.payInput}>
              <Input
                label="Min ($)"
                value={payMin}
                onChangeText={setPayMin}
                placeholder="100"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.payInput}>
              <Input
                label="Max ($)"
                value={payMax}
                onChangeText={setPayMax}
                placeholder="500"
                keyboardType="numeric"
              />
            </View>
          </View>
        </Animated.View>

        {/* Requirements */}
        <Animated.View entering={FadeInDown.duration(400).delay(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
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
                ${payMin || '0'} - ${payMax || '0'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Submit */}
        <View style={styles.submitSection}>
          <Button
            title="Post Listing"
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.headline,
  },
  previewButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
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
});
