/**
 * verify-social.tsx — Per-platform social account verification screen.
 *
 * Flow:
 *   1. Enter handle → POST /social-verify-bio
 *   2. Show code "SURVE-XXXX" + 30-min countdown + copy button
 *   3. "I've added it" → POST /social-verify-check
 *      • Success → green checkmark + animated stats reveal
 *      • Fail    → error banner, retry or screenshot upload
 *   4. [Trouble verifying?] Screenshot path (code step OR fail step)
 *      → image picker + claimed stats form → POST /social-verify-screenshot
 *      → Pending review state shown
 *
 * Route params:
 *   platform  — SocialPlatform ('tiktok' | 'instagram' | 'youtube' | 'twitter')
 *   handle    — optional pre-filled handle
 *   returnTo  — optional route to push after success (default: back)
 *   creatorId — required for screenshot DB write
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  AtSign,
  Camera,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  Image as ImageIcon,
  RefreshCcw,
  Timer,
  Upload,
} from 'lucide-react-native';
import * as ExpoClipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { PressableScale } from '../../components/ui/PressableScale';
import {
  BorderRadius,
  Shadows,
  Spacing,
  Springs,
  Typography,
} from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { submitSocialVerificationScreenshot } from '../../lib/api';
import { useStore } from '../../lib/store';
import type { SocialPlatform } from '../../types';
import { AdaptiveImage } from '../../components/ui/AdaptiveImage';

// ─── Types ────────────────────────────────────────────────────────────────────

type VerifyStep = 'handle' | 'code' | 'success' | 'fail' | 'screenshot' | 'pending';

interface BioResponse {
  code: string;
  expires_at: string; // ISO
}

interface CheckResponse {
  verified: boolean;
  follower_count?: number;
  avg_views?: number;
  avg_likes?: number;
  engagement_rate?: number;
  message?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'X (Twitter)',
};

const PLATFORM_AT: Record<SocialPlatform, string> = {
  tiktok: '@',
  instagram: '@',
  youtube: '',
  twitter: '@',
};

const CODE_TTL_SECONDS = 30 * 60; // 30 minutes

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── API calls via Supabase edge functions ────────────────────────────────────

async function postVerifyBio(
  platform: SocialPlatform,
  handle: string,
): Promise<BioResponse> {
  const { data, error } = await supabase.functions.invoke<BioResponse>(
    'social-verify-bio',
    { body: { platform, handle } },
  );
  if (error || !data) throw new Error(error?.message ?? 'Failed to start verification');
  return data;
}

async function postVerifyCheck(
  platform: SocialPlatform,
  handle: string,
  code: string,
): Promise<CheckResponse> {
  const { data, error } = await supabase.functions.invoke<CheckResponse>(
    'social-verify-check',
    { body: { platform, handle, code } },
  );
  if (error || !data) throw new Error(error?.message ?? 'Verification check failed');
  return data;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerifySocialScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { user } = useStore();

  const params = useLocalSearchParams<{
    platform?: string;
    handle?: string;
    returnTo?: string;
    creatorId?: string;
  }>();

  const platform = (params.platform ?? 'tiktok') as SocialPlatform;
  const platformLabel = PLATFORM_LABEL[platform] ?? platform;
  const atSign = PLATFORM_AT[platform] ?? '@';
  const creatorId = params.creatorId ?? user?.id ?? '';

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<VerifyStep>('handle');
  const [handle, setHandle] = useState(params.handle ?? '');
  const [handleError, setHandleError] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(CODE_TTL_SECONDS);
  const [copied, setCopied] = useState(false);
  const [failMessage, setFailMessage] = useState('');
  const [stats, setStats] = useState<CheckResponse | null>(null);

  // Screenshot form state
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [claimedFollowers, setClaimedFollowers] = useState('');
  const [claimedViews, setClaimedViews] = useState('');
  const [claimedLikes, setClaimedLikes] = useState('');
  const [screenshotError, setScreenshotError] = useState('');
  const [screenshotLoading, setScreenshotLoading] = useState(false);

  // ── Countdown timer ────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback((expiry: Date) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((expiry.getTime() - Date.now()) / 1000),
      );
      setCountdown(remaining);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Animations (success) ───────────────────────────────────────────────────
  const checkScale = useSharedValue(0);
  const statsOpacity = useSharedValue(0);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));
  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ translateY: (1 - statsOpacity.value) * 16 }],
  }));

  const triggerSuccessAnimation = useCallback(() => {
    checkScale.value = reducedMotion
      ? withDelay(100, withTiming(1, { duration: 200 }))
      : withDelay(100, withSpring(1, { damping: 10, stiffness: 200 }));
    statsOpacity.value = reducedMotion
      ? withDelay(500, withTiming(1, { duration: 300 }))
      : withDelay(600, withTiming(1, { duration: 600 }));
  }, [checkScale, statsOpacity, reducedMotion]);

  // ── Pending animation ──────────────────────────────────────────────────────
  const pendingScale = useSharedValue(0);
  const pendingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pendingScale.value }],
  }));
  const triggerPendingAnimation = useCallback(() => {
    pendingScale.value = reducedMotion
      ? withDelay(100, withTiming(1, { duration: 200 }))
      : withDelay(100, withSpring(1, { damping: 12, stiffness: 180 }));
  }, [pendingScale, reducedMotion]);

  // ── Step 1: submit handle ──────────────────────────────────────────────────
  const handleSubmitHandle = useCallback(async () => {
    const trimmed = handle.trim().replace(/^@/, '');
    if (!trimmed) {
      setHandleError(`Enter your ${platformLabel} handle`);
      setShakeTrigger((n) => n + 1);
      haptics.error();
      return;
    }
    setHandleError('');
    setLoading(true);
    try {
      const res = await postVerifyBio(platform, trimmed);
      setCode(res.code);
      const expiry = new Date(res.expires_at);
      setExpiresAt(expiry);
      startTimer(expiry);
      haptics.confirm();
      setStep('code');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Could not start verification';
      setHandleError(msg);
      setShakeTrigger((n) => n + 1);
      haptics.error();
    } finally {
      setLoading(false);
    }
  }, [handle, platform, platformLabel, haptics, startTimer]);

  // ── Step 2: copy code ──────────────────────────────────────────────────────
  const handleCopyCode = useCallback(async () => {
    haptics.confirm();
    try {
      await ExpoClipboard.setStringAsync(code);
    } catch {
      Clipboard.setString(code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [code, haptics]);

  // ── Step 2: check bio ──────────────────────────────────────────────────────
  const handleCheckBio = useCallback(async () => {
    const trimmed = handle.trim().replace(/^@/, '');
    setLoading(true);
    setFailMessage('');
    try {
      const res = await postVerifyCheck(platform, trimmed, code);
      if (res.verified) {
        setStats(res);
        haptics.success();
        setStep('success');
        triggerSuccessAnimation();
      } else {
        haptics.error();
        setFailMessage(
          res.message ?? 'Code not found in bio. Try again or upload a screenshot.',
        );
        setStep('fail');
      }
    } catch (err: unknown) {
      haptics.error();
      setFailMessage(
        err instanceof Error
          ? err.message
          : 'Code not found in bio. Try again or upload a screenshot.',
      );
      setStep('fail');
    } finally {
      setLoading(false);
    }
  }, [handle, platform, code, haptics, triggerSuccessAnimation]);

  // ── Retry ──────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    haptics.tap();
    setFailMessage('');
    setStep('code');
  }, [haptics]);

  // ── Navigate to screenshot step ────────────────────────────────────────────
  const handleGoToScreenshot = useCallback(() => {
    haptics.tap();
    setScreenshotUri(null);
    setClaimedFollowers('');
    setClaimedViews('');
    setClaimedLikes('');
    setScreenshotError('');
    setStep('screenshot');
  }, [haptics]);

  // ── Pick image from library ────────────────────────────────────────────────
  const handlePickImage = useCallback(async () => {
    haptics.tap();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Allow photo library access to upload a screenshot.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri);
      if (screenshotError) setScreenshotError('');
      haptics.confirm();
    }
  }, [haptics, screenshotError]);

  // ── Submit screenshot form ─────────────────────────────────────────────────
  const handleSubmitScreenshot = useCallback(async () => {
    if (!screenshotUri) {
      setScreenshotError('Please attach a screenshot first.');
      setShakeTrigger((n) => n + 1);
      haptics.error();
      return;
    }
    setScreenshotError('');
    setScreenshotLoading(true);
    try {
      const trimmedHandle = handle.trim().replace(/^@/, '');
      await submitSocialVerificationScreenshot(user?.id ?? '', creatorId, {
        platform,
        handle: trimmedHandle,
        imageUri: screenshotUri,
        claimed_followers: claimedFollowers ? parseInt(claimedFollowers, 10) : null,
        claimed_avg_views: claimedViews ? parseInt(claimedViews, 10) : null,
        claimed_avg_likes: claimedLikes ? parseInt(claimedLikes, 10) : null,
      });
      haptics.success();
      setStep('pending');
      triggerPendingAnimation();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setScreenshotError(msg);
      haptics.error();
    } finally {
      setScreenshotLoading(false);
    }
  }, [
    screenshotUri,
    handle,
    platform,
    claimedFollowers,
    claimedViews,
    claimedLikes,
    user,
    creatorId,
    haptics,
    triggerPendingAnimation,
  ]);

  // ── Done / continue ────────────────────────────────────────────────────────
  const handleDone = useCallback(() => {
    haptics.tap();
    if (params.returnTo) {
      router.push(params.returnTo as any);
    } else if (router.canGoBack()) {
      router.back();
    }
  }, [haptics, router, params.returnTo]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title={`Verify ${platformLabel}`} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Spacing.massive },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP 1: Handle entry ────────────────────────────────────────── */}
        {step === 'handle' && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(300)}
            style={styles.section}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.activeLight }]}>
              <AtSign size={32} color={colors.primary} strokeWidth={2} />
            </View>

            <Text style={[Typography.title2, styles.heading, { color: colors.text }]}>
              Connect your {platformLabel}
            </Text>
            <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
              We'll place a short verification code in your bio to confirm ownership.
            </Text>

            <Input
              label={`${platformLabel} handle`}
              placeholder={`${atSign}yourhandle`}
              value={handle}
              onChangeText={(t) => {
                setHandle(t);
                if (handleError) setHandleError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmitHandle}
              error={handleError}
              shakeTrigger={shakeTrigger}
              icon={<Text style={[Typography.headline, { color: colors.textTertiary }]}>{atSign}</Text>}
              containerStyle={styles.inputContainer}
            />

            <Button
              title="Continue"
              onPress={handleSubmitHandle}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.primaryBtn}
            />
          </Animated.View>
        )}

        {/* ── STEP 2: Code display + countdown ───────────────────────────── */}
        {step === 'code' && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(300)}
            style={styles.section}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.activeLight }]}>
              <Timer size={32} color={colors.primary} strokeWidth={2} />
            </View>

            <Text style={[Typography.title2, styles.heading, { color: colors.text }]}>
              Add code to your bio
            </Text>
            <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
              Open {platformLabel}, paste the code below into your bio, then come back and tap{' '}
              <Text style={{ fontWeight: '600', color: colors.text }}>"I've added it"</Text>.
            </Text>

            {/* Code card */}
            <PressableScale
              scaleValue={0.97}
              onPress={handleCopyCode}
              accessibilityRole="button"
              accessibilityLabel={`Copy verification code ${code}`}
              style={[
                styles.codeCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: copied ? colors.success : colors.primary,
                },
                Shadows.md,
              ]}
            >
              <Text
                style={[
                  Typography.title1,
                  styles.codeText,
                  { color: colors.primary, letterSpacing: 3 },
                ]}
                selectable
              >
                {code}
              </Text>

              <View
                style={[
                  styles.copyBadge,
                  { backgroundColor: copied ? colors.successLight : colors.activeLight },
                ]}
              >
                {copied ? (
                  <Animated.View
                    entering={reducedMotion ? undefined : FadeIn.duration(200)}
                    style={styles.copyBadgeInner}
                  >
                    <CheckCircle2 size={16} color={colors.success} strokeWidth={2} />
                    <Text style={[Typography.footnote, { color: colors.success, fontWeight: '600' }]}>
                      Copied!
                    </Text>
                  </Animated.View>
                ) : (
                  <Animated.View
                    entering={reducedMotion ? undefined : FadeIn.duration(200)}
                    style={styles.copyBadgeInner}
                  >
                    <ClipboardCopy size={16} color={colors.primary} strokeWidth={2} />
                    <Text style={[Typography.footnote, { color: colors.primary, fontWeight: '600' }]}>
                      Tap to copy
                    </Text>
                  </Animated.View>
                )}
              </View>
            </PressableScale>

            {/* Instruction hint */}
            <View style={[styles.hintBox, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
              <Text style={[Typography.footnote, { color: colors.warning }]}>
                Add <Text style={{ fontWeight: '700' }}>{code}</Text> to your {platformLabel} bio.{' '}
                You have <Text style={{ fontWeight: '700' }}>{formatCountdown(countdown)}</Text> remaining.
              </Text>
            </View>

            {/* Countdown row */}
            <View style={styles.countdownRow}>
              <Timer size={16} color={countdown < 120 ? colors.error : colors.textTertiary} strokeWidth={2} />
              <Text
                style={[
                  Typography.footnote,
                  styles.countdownText,
                  { color: countdown < 120 ? colors.error : colors.textSecondary },
                ]}
              >
                Code expires in {formatCountdown(countdown)}
              </Text>
            </View>

            <Button
              title="I've added it"
              onPress={handleCheckBio}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.primaryBtn}
            />

            <Button
              title="Go back and change handle"
              onPress={() => {
                haptics.tap();
                setStep('handle');
              }}
              variant="ghost"
              fullWidth
              size="md"
            />

            {/* ── Trouble verifying? ─────────────────────────────────────── */}
            <PressableScale
              scaleValue={0.97}
              onPress={handleGoToScreenshot}
              accessibilityRole="button"
              accessibilityLabel="Trouble verifying? Upload a screenshot"
              style={[
                styles.troubleBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                Shadows.sm,
              ]}
            >
              <Camera size={18} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[Typography.callout, styles.troubleLabel, { color: colors.textSecondary }]}>
                Trouble verifying? Upload a screenshot of your analytics
              </Text>
            </PressableScale>
          </Animated.View>
        )}

        {/* ── STEP: Fail ──────────────────────────────────────────────────── */}
        {step === 'fail' && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(300)}
            style={styles.section}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.errorLight }]}>
              <RefreshCcw size={32} color={colors.error} strokeWidth={2} />
            </View>

            <Text style={[Typography.title2, styles.heading, { color: colors.text }]}>
              Code not found
            </Text>
            <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
              {failMessage || 'Code not found in bio. Try again or upload a screenshot.'}
            </Text>

            <View
              style={[
                styles.failHint,
                { backgroundColor: colors.errorLight, borderColor: colors.error },
              ]}
            >
              <Text style={[Typography.footnote, { color: colors.error }]}>
                Make sure the code appears exactly as{' '}
                <Text style={{ fontWeight: '700' }}>{code}</Text> in your {platformLabel} bio —
                not in a post or comment.
              </Text>
            </View>

            <Button
              title="Try again"
              onPress={handleRetry}
              fullWidth
              size="lg"
              style={styles.primaryBtn}
              icon={<RefreshCcw size={18} color={colors.onPrimary} strokeWidth={2} />}
            />

            <PressableScale
              scaleValue={0.97}
              onPress={handleGoToScreenshot}
              accessibilityRole="button"
              accessibilityLabel="Trouble verifying? Upload a screenshot of your analytics"
              style={[
                styles.troubleBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                Shadows.sm,
              ]}
            >
              <Camera size={18} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[Typography.callout, styles.troubleLabel, { color: colors.textSecondary }]}>
                Trouble verifying? Upload a screenshot of your analytics
              </Text>
            </PressableScale>
          </Animated.View>
        )}

        {/* ── STEP: Screenshot form ────────────────────────────────────────── */}
        {step === 'screenshot' && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(300)}
            style={styles.section}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.activeLight }]}>
              <Upload size={32} color={colors.primary} strokeWidth={2} />
            </View>

            <Text style={[Typography.title2, styles.heading, { color: colors.text }]}>
              Upload analytics screenshot
            </Text>
            <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
              Attach a screenshot of your {platformLabel} analytics and optionally tell us your stats.
              Our team reviews submissions within{' '}
              <Text style={{ fontWeight: '600', color: colors.text }}>24 hours</Text>.
            </Text>

            {/* Image picker area */}
            <PressableScale
              scaleValue={0.97}
              onPress={handlePickImage}
              accessibilityRole="button"
              accessibilityLabel={screenshotUri ? 'Replace screenshot' : 'Choose screenshot from library'}
              style={[
                styles.imagePickerArea,
                {
                  backgroundColor: screenshotUri ? 'transparent' : colors.surfaceSecondary,
                  borderColor: screenshotError ? colors.error : screenshotUri ? colors.success : colors.border,
                  borderStyle: screenshotUri ? 'solid' : 'dashed',
                },
              ]}
            >
              {screenshotUri ? (
                <View style={styles.imagePreviewWrap}>
                  <AdaptiveImage
                    source={{ uri: screenshotUri }}
                    contentFit="cover"
                    style={styles.imagePreview}
                    overlayOpacity={0}
                  />
                  <View style={[styles.imageReplaceOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                    <Camera size={22} color="#fff" strokeWidth={2} />
                    <Text style={[Typography.footnote, { color: '#fff', fontWeight: '600', marginTop: 4 }]}>
                      Tap to replace
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.imagePickerInner}>
                  <ImageIcon size={36} color={colors.textTertiary} strokeWidth={1.5} />
                  <Text style={[Typography.callout, { color: colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }]}>
                    Tap to choose from your photo library
                  </Text>
                  <Text style={[Typography.footnote, { color: colors.textTertiary, marginTop: Spacing.xs, textAlign: 'center' }]}>
                    JPG or PNG · max 10 MB
                  </Text>
                </View>
              )}
            </PressableScale>

            {screenshotError ? (
              <Animated.View
                entering={reducedMotion ? undefined : FadeIn.duration(200)}
                style={[styles.errorBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}
              >
                <Text style={[Typography.footnote, { color: colors.error }]}>{screenshotError}</Text>
              </Animated.View>
            ) : null}

            {/* Claimed stats section */}
            <View style={[styles.claimedSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }, Shadows.sm]}>
              <Text style={[Typography.headline, { color: colors.text, marginBottom: Spacing.sm }]}>
                Your claimed stats (optional)
              </Text>
              <Text style={[Typography.footnote, { color: colors.textSecondary, marginBottom: Spacing.md }]}>
                These will be cross-checked against your screenshot. Leave blank if unknown.
              </Text>

              <ClaimedField
                label="Followers"
                value={claimedFollowers}
                onChangeText={setClaimedFollowers}
                placeholder="e.g. 45000"
                colors={colors}
              />
              <ClaimedField
                label="Avg. views per post"
                value={claimedViews}
                onChangeText={setClaimedViews}
                placeholder="e.g. 12000"
                colors={colors}
              />
              <ClaimedField
                label="Avg. likes per post"
                value={claimedLikes}
                onChangeText={setClaimedLikes}
                placeholder="e.g. 850"
                colors={colors}
              />
            </View>

            <Button
              title={screenshotLoading ? 'Submitting…' : 'Submit for review'}
              onPress={handleSubmitScreenshot}
              loading={screenshotLoading}
              fullWidth
              size="lg"
              style={styles.primaryBtn}
              icon={<Upload size={18} color={colors.onPrimary} strokeWidth={2} />}
            />

            <Button
              title="Go back"
              onPress={() => {
                haptics.tap();
                setStep(code ? 'code' : 'handle');
              }}
              variant="ghost"
              fullWidth
              size="md"
            />
          </Animated.View>
        )}

        {/* ── STEP: Pending review ─────────────────────────────────────────── */}
        {step === 'pending' && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeInUp.duration(350)}
            style={[styles.section, styles.successSection]}
          >
            <Animated.View
              style={[
                styles.pendingBadge,
                { backgroundColor: colors.pendingLight },
                pendingStyle,
              ]}
            >
              <Clock size={52} color={colors.pending} strokeWidth={2} />
            </Animated.View>

            <Text style={[Typography.title1, styles.heading, { color: colors.text }]}>
              Pending review
            </Text>
            <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
              Your screenshot has been received.{'\n'}Our team will verify your{' '}
              <Text style={{ fontWeight: '600', color: colors.text }}>{platformLabel}</Text> account
              within{' '}
              <Text style={{ fontWeight: '600', color: colors.text }}>24 hours</Text>.
            </Text>

            <View
              style={[
                styles.pendingCard,
                { backgroundColor: colors.pendingLight, borderColor: colors.pending },
              ]}
            >
              <Clock size={16} color={colors.pending} strokeWidth={2} />
              <Text style={[Typography.footnote, { color: colors.pending, flex: 1 }]}>
                <Text style={{ fontWeight: '700' }}>Usually &lt;24h</Text> — we'll notify you once
                your account is verified. Your profile will show "Pending review" until then.
              </Text>
            </View>

            <Button
              title="Got it, take me back"
              onPress={handleDone}
              fullWidth
              size="lg"
              style={styles.primaryBtn}
            />
          </Animated.View>
        )}

        {/* ── STEP: Success ───────────────────────────────────────────────── */}
        {step === 'success' && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeInUp.duration(350)}
            style={[styles.section, styles.successSection]}
          >
            {/* Checkmark badge */}
            <Animated.View
              style={[
                styles.successBadge,
                { backgroundColor: colors.successLight },
                checkStyle,
              ]}
            >
              <CheckCircle2 size={60} color={colors.success} strokeWidth={2} />
            </Animated.View>

            <Text style={[Typography.title1, styles.heading, { color: colors.text }]}>
              {platformLabel} verified!
            </Text>
            <Text style={[Typography.callout, styles.subtitle, { color: colors.textSecondary }]}>
              Your {platformLabel} account{' '}
              <Text style={{ fontWeight: '600', color: colors.text }}>@{handle.replace(/^@/, '')}</Text> has
              been verified.
            </Text>

            {/* Stats reveal */}
            {stats && (
              <Animated.View style={[styles.statsGrid, statsStyle]}>
                {stats.follower_count != null && (
                  <StatCard
                    label="Followers"
                    value={stats.follower_count}
                    colors={colors}
                  />
                )}
                {stats.avg_views != null && (
                  <StatCard
                    label="Avg. views"
                    value={stats.avg_views}
                    colors={colors}
                  />
                )}
                {stats.avg_likes != null && (
                  <StatCard
                    label="Avg. likes"
                    value={stats.avg_likes}
                    colors={colors}
                  />
                )}
                {stats.engagement_rate != null && (
                  <StatCard
                    label="Engagement"
                    value={stats.engagement_rate}
                    suffix="%"
                    decimals={1}
                    colors={colors}
                  />
                )}
              </Animated.View>
            )}

            <Button
              title="Continue"
              onPress={handleDone}
              fullWidth
              size="lg"
              style={styles.primaryBtn}
            />
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── ClaimedField sub-component ───────────────────────────────────────────────

interface ClaimedFieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function ClaimedField({ label, value, onChangeText, placeholder, colors }: ClaimedFieldProps) {
  return (
    <View style={claimedStyles.row}>
      <Text style={[Typography.subheadline, claimedStyles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        style={[
          claimedStyles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.borderLight,
            color: colors.text,
          },
        ]}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ''))}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        returnKeyType="done"
        accessibilityLabel={label}
      />
    </View>
  );
}

const claimedStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  label: {
    flex: 1,
  },
  input: {
    width: 120,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    textAlign: 'right',
    minHeight: 44,
  },
});

// ─── StatCard sub-component ───────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  colors: ReturnType<typeof useTheme>['colors'];
}

function StatCard({ label, value, suffix = '', decimals = 0, colors }: StatCardProps) {
  return (
    <View
      style={[
        statStyles.card,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
        Shadows.sm,
      ]}
    >
      <AnimatedNumber
        value={value}
        duration={1200}
        prefix={suffix ? '' : ''}
        style={{ ...statStyles.value, color: colors.primary }}
      />
      {suffix ? (
        <Text style={[statStyles.suffix, { color: colors.primary }]}>{suffix}</Text>
      ) : null}
      <Text style={[Typography.caption1, statStyles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 120,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...Typography.title2,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  suffix: {
    ...Typography.title3,
    fontWeight: '600' as const,
    marginTop: -2,
  },
  label: {
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  section: {
    alignItems: 'center',
  },
  successSection: {
    paddingTop: Spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  heading: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.md,
  },
  inputContainer: {
    marginBottom: Spacing.sm,
    width: '100%',
  },
  primaryBtn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  // Code card
  codeCard: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  codeText: {
    fontWeight: '800' as const,
    textAlign: 'center',
  },
  copyBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  copyBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  hintBox: {
    width: '100%',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
    alignSelf: 'center',
  },
  countdownText: {
    fontWeight: '500' as const,
  },
  // Fail
  failHint: {
    width: '100%',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  // Trouble verifying / screenshot button (shared)
  troubleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
    marginTop: Spacing.sm,
  },
  troubleLabel: {
    fontWeight: '500' as const,
    flex: 1,
    textAlign: 'center',
  },
  // Screenshot step
  imagePickerArea: {
    width: '100%',
    minHeight: 160,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  imagePickerInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    minHeight: 160,
  },
  imagePreviewWrap: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
  },
  imageReplaceOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedSection: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorBanner: {
    width: '100%',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  // Pending step
  pendingBadge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    width: '100%',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  // Success
  successBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    width: '100%',
    marginBottom: Spacing.xl,
  },
});
