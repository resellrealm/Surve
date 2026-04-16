import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Building2,
  MapPin,
  Globe,
  Instagram,
  FileText,
  CheckCircle2,
  Mail,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { WizardHeader } from './_WizardHeader';
import { useWizard } from './_context';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useStore } from '../../lib/store';

async function uploadAsset(
  uri: string,
  bucket: string,
  path: string,
): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });
    if (error) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

function ReviewRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.reviewRow}>
      <View style={[styles.reviewIcon, { backgroundColor: colors.surfaceSecondary }]}>
        {icon}
      </View>
      <View style={styles.reviewText}>
        <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.reviewValue, { color: colors.text }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function Step7Review() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useWizard();
  const { user, setUser } = useStore();

  const [emailVerified, setEmailVerified] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(true);
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const checkEmailVerification = useCallback(async () => {
    setCheckingEmail(true);
    const { data } = await supabase.auth.getUser();
    setEmailVerified(!!data.user?.email_confirmed_at);
    setCheckingEmail(false);
  }, []);

  useEffect(() => {
    checkEmailVerification();
  }, [checkEmailVerification]);

  const resendVerification = useCallback(async () => {
    if (!user?.email) return;
    setResending(true);
    haptics.tap();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    setResending(false);
    if (error) {
      toast.error('Could not resend email. Try again shortly.');
    } else {
      toast.success('Verification email sent — check your inbox.');
    }
  }, [user?.email, haptics]);

  const handleGoLive = useCallback(async () => {
    if (!emailVerified) {
      haptics.warning();
      toast.error('Please verify your email first.');
      return;
    }
    if (!user?.id) return;

    setSubmitting(true);
    haptics.confirm();

    const uid = user.id;
    const ts = Date.now();

    // Upload assets in parallel
    const [logoUrl, coverUrl, licenseUrl] = await Promise.all([
      state.logoUri
        ? uploadAsset(state.logoUri, 'business-assets', `${uid}/logo_${ts}.jpg`)
        : Promise.resolve(null),
      state.coverUri
        ? uploadAsset(state.coverUri, 'business-assets', `${uid}/cover_${ts}.jpg`)
        : Promise.resolve(null),
      state.licenseUri
        ? uploadAsset(state.licenseUri, 'business-assets', `${uid}/license_${ts}.jpg`)
        : Promise.resolve(null),
    ]);

    // Upsert business record
    const socialHandles: Record<string, string> = {};
    if (state.instagramHandle) socialHandles.instagram = state.instagramHandle;
    if (state.tiktokHandle) socialHandles.tiktok = state.tiktokHandle;
    if (state.youtubeHandle) socialHandles.youtube = state.youtubeHandle;

    const { error: bizError } = await supabase.from('businesses').upsert({
      user_id: uid,
      business_name: state.brandName,
      category: state.category || 'restaurant',
      description: state.brandStory,
      location: state.locations[0]
        ? `${state.locations[0].city}, ${state.locations[0].country || ''}`.trim().replace(/,$/, '')
        : '',
      website: state.website || null,
      image_url: logoUrl ?? coverUrl ?? '',
      logo_url: logoUrl,
      cover_url: coverUrl,
      brand_story: state.brandStory,
      values: state.values,
      social_handles: Object.keys(socialHandles).length ? socialHandles : null,
      website_url: state.website || null,
      locations: state.locations.map((l) => ({
        name: l.name,
        address: l.address,
        lat: 0,
        lng: 0,
      })),
      founded_year: state.foundedYear ? parseInt(state.foundedYear, 10) : null,
      verified: false,
    });

    if (bizError) {
      toast.error('Failed to save business profile. Please try again.');
      setSubmitting(false);
      return;
    }

    // Store license reference (business_documents table if exists, else meta)
    if (licenseUrl) {
      await supabase.from('business_documents').upsert({
        user_id: uid,
        type: 'business_license',
        url: licenseUrl,
        status: 'pending_review',
      }).then(() => null, () => null); // table may not exist yet
    }

    // Mark onboarding complete on user record
    const now = new Date().toISOString();
    const { data: updatedUser } = await supabase
      .from('users')
      .update({ onboarding_completed_at: now })
      .eq('id', uid)
      .select()
      .single();

    if (updatedUser && setUser) {
      setUser({ ...user, onboarding_completed_at: now });
    }

    setSubmitting(false);
    toast.success('Welcome to Surve! Your profile is live.');
    router.replace('/(tabs)');
  }, [emailVerified, user, state, router, haptics, setUser]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <WizardHeader step={7} title="Review & go live" subtitle="Check everything looks good" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Email verification banner */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
          style={[
            styles.emailBanner,
            {
              backgroundColor: emailVerified ? colors.successLight : colors.warningLight,
              borderColor: emailVerified ? colors.success : colors.warning,
            },
          ]}
        >
          {checkingEmail ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : emailVerified ? (
            <>
              <CheckCircle2 size={20} color={colors.success} strokeWidth={2.5} />
              <Text style={[styles.emailText, { color: colors.success }]}>
                Email verified
              </Text>
            </>
          ) : (
            <View style={styles.emailUnverified}>
              <View style={styles.emailRow}>
                <Mail size={18} color={colors.warning} strokeWidth={2} />
                <Text style={[styles.emailText, { color: colors.warning, flex: 1 }]}>
                  Check your inbox to verify {user?.email}
                </Text>
              </View>
              <View style={styles.emailActions}>
                <PressableScale
                  scaleValue={0.95}
                  onPress={checkEmailVerification}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh verification status"
                  style={[styles.emailBtn, { borderColor: colors.warning }]}
                >
                  <RefreshCw size={14} color={colors.warning} strokeWidth={2.5} />
                  <Text style={[styles.emailBtnText, { color: colors.warning }]}>
                    Refresh
                  </Text>
                </PressableScale>
                <PressableScale
                  scaleValue={0.95}
                  onPress={resendVerification}
                  disabled={resending}
                  accessibilityRole="button"
                  accessibilityLabel="Resend verification email"
                  style={[styles.emailBtn, { borderColor: colors.warning }]}
                >
                  {resending ? (
                    <ActivityIndicator size="small" color={colors.warning} />
                  ) : (
                    <Text style={[styles.emailBtnText, { color: colors.warning }]}>
                      Resend email
                    </Text>
                  )}
                </PressableScale>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Profile preview */}
        {(state.logoUri || state.coverUri) && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={[styles.previewCard, { backgroundColor: colors.surface, ...Shadows.sm }]}
          >
            {state.coverUri ? (
              <Image source={{ uri: state.coverUri }} style={styles.coverPreview} />
            ) : null}
            <View style={styles.previewProfile}>
              {state.logoUri ? (
                <Image source={{ uri: state.logoUri }} style={styles.logoPreview} />
              ) : (
                <View
                  style={[
                    styles.logoPlaceholder,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <Building2 size={24} color={colors.textTertiary} strokeWidth={1.5} />
                </View>
              )}
              <View>
                <Text style={[styles.previewName, { color: colors.text }]}>
                  {state.brandName || 'Your Brand'}
                </Text>
                <Text style={[styles.previewCategory, { color: colors.textSecondary }]}>
                  {state.category
                    ? state.category.charAt(0).toUpperCase() + state.category.slice(1)
                    : ''}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Review rows */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={[styles.reviewCard, { backgroundColor: colors.surface, ...Shadows.sm }]}
        >
          <ReviewRow
            icon={<Building2 size={16} color={colors.textSecondary} strokeWidth={2} />}
            label="Legal name"
            value={state.legalName || '—'}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <ReviewRow
            icon={<Building2 size={16} color={colors.textSecondary} strokeWidth={2} />}
            label="Brand name"
            value={state.brandName || '—'}
          />
          {state.locations.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <ReviewRow
                icon={<MapPin size={16} color={colors.textSecondary} strokeWidth={2} />}
                label={`${state.locations.length} location${state.locations.length > 1 ? 's' : ''}`}
                value={state.locations.map((l) => l.name).join(', ')}
              />
            </>
          )}
          {(state.instagramHandle || state.tiktokHandle || state.website) && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <ReviewRow
                icon={<Globe size={16} color={colors.textSecondary} strokeWidth={2} />}
                label="Social / web"
                value={[
                  state.instagramHandle && `@${state.instagramHandle}`,
                  state.tiktokHandle && `@${state.tiktokHandle}`,
                  state.website,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </>
          )}
          {state.licenseUri && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <ReviewRow
                icon={<FileText size={16} color={colors.textSecondary} strokeWidth={2} />}
                label="Business license"
                value="Uploaded — pending review"
              />
            </>
          )}
          {state.values.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <ReviewRow
                icon={<CheckCircle2 size={16} color={colors.textSecondary} strokeWidth={2} />}
                label="Values"
                value={state.values.join(', ')}
              />
            </>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={[styles.noteCard, { backgroundColor: colors.surfaceSecondary }]}
        >
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Your profile goes live immediately. Business verification (blue badge) is
            completed by our team within 24 hours once your license is reviewed.
          </Text>
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Button
          title={emailVerified ? 'Go live' : 'Verify email to go live'}
          onPress={handleGoLive}
          size="lg"
          fullWidth
          loading={submitting}
          disabled={!emailVerified || submitting}
          icon={
            emailVerified ? (
              <CheckCircle2 size={20} color={colors.onPrimary} strokeWidth={2.5} />
            ) : undefined
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    gap: Spacing.xl,
  },
  emailBanner: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  emailUnverified: {
    gap: Spacing.md,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  emailText: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  emailActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 36,
  },
  emailBtnText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  previewCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  coverPreview: {
    width: '100%',
    height: 100,
  },
  previewProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  logoPreview: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
  },
  logoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    ...Typography.headline,
  },
  previewCategory: {
    ...Typography.footnote,
    marginTop: 2,
  },
  reviewCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  reviewIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewText: {
    flex: 1,
  },
  reviewLabel: {
    ...Typography.caption1,
    marginBottom: 2,
  },
  reviewValue: {
    ...Typography.subheadline,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.lg + 32 + Spacing.md,
  },
  noteCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  noteText: {
    ...Typography.footnote,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
});
