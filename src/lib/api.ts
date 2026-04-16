import { supabase } from './supabase';
import { moderateText } from './moderation';
import { toast } from './toast';
import { devWarn, logError } from './logger';
import * as mock from './mockData';
import type {
  User,
  Session,
  Creator,
  Business,
  Listing,
  Booking,
  Conversation,
  Message,
  Review,
  UserRole,
  Category,
  Platform,
  ListingStatus,
  BookingStatus,
  Notification,
  PaymentMethod,
  Transaction,
  Application,
  CreatorAnalytics,
  CreatorFilters,
  CreatorSocialAccount,
  SocialPlatform,
  ListingAnalyticsSummary,
  UserStats,
  Boost,
  BoostStatus,
} from '../types';
import { BOOST_TIERS, type BoostTierKey } from '../constants/pricing';

// Fallback to curated demo content when the DB is empty (dev + screenshots).
// Flip off for production to always hit the real DB.
const USE_MOCK_FALLBACK =
  (process.env.EXPO_PUBLIC_USE_MOCK_FALLBACK ?? 'true') !== 'false';

export const preferMock = <T,>(real: T[], fallback: T[]): T[] =>
  USE_MOCK_FALLBACK && real.length === 0 ? fallback : real;

// ─── Retry with backoff ────────────────────────────────────────────────────

const RETRY_DELAYS = [500, 1000, 2000];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  label = 'Request failed',
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS.length) {
        await wait(RETRY_DELAYS[attempt]);
      }
    }
  }
  toast.error(label, 6000, {
    label: 'Retry',
    onPress: () => { retryWithBackoff(fn, label); },
  });
  throw lastError;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email ?? '',
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    avatar_blurhash: row.avatar_blurhash ?? null,
    role: row.role as UserRole,
    onboarding_completed_at: row.onboarding_completed_at ?? null,
    email_verified_at: row.email_verified_at ?? null,
    phone: row.phone ?? null,
    phone_verified_at: row.phone_verified_at ?? null,
    username: row.username ?? null,
    bio: row.bio ?? null,
    location: row.location ?? null,
    accepted_terms_at: row.accepted_terms_at ?? null,
    terms_version: row.terms_version ?? null,
    show_reviews_publicly: row.show_reviews_publicly ?? true,
    milestones: row.milestones ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapCreator(row: any): Creator {
  return {
    id: row.id,
    user_id: row.user_id,
    user: mapUser(row.user ?? row.users ?? {}),
    bio: row.bio ?? '',
    instagram_handle: row.instagram_handle,
    tiktok_handle: row.tiktok_handle,
    instagram_followers: row.instagram_followers ?? 0,
    tiktok_followers: row.tiktok_followers ?? 0,
    engagement_rate: Number(row.engagement_rate ?? 0),
    avg_views: row.avg_views ?? 0,
    categories: (row.categories ?? []) as Category[],
    portfolio_urls: row.portfolio_urls ?? [],
    rating: Number(row.rating ?? 0),
    total_reviews: row.total_reviews ?? 0,
    total_bookings: row.total_bookings ?? 0,
    location: row.location ?? '',
    verified: row.verified ?? false,
    cover_photo_url: row.cover_photo_url ?? null,
    niches: row.niches ?? null,
    languages: row.languages ?? null,
    intro_video_url: row.intro_video_url ?? null,
    response_time_hours: row.response_time_hours != null ? Number(row.response_time_hours) : null,
    completion_rate: row.completion_rate != null ? Number(row.completion_rate) : null,
    highlight_metrics: row.highlight_metrics ?? null,
    show_rates_publicly: row.show_rates_publicly ?? false,
    stripe_account_id: row.stripe_account_id ?? null,
    stripe_onboarding_complete: row.stripe_onboarding_complete ?? false,
    created_at: row.created_at,
  };
}

export function mapCreatorSocialAccount(row: any): CreatorSocialAccount {
  return {
    id: row.id,
    creator_id: row.creator_id,
    platform: row.platform as SocialPlatform,
    handle: row.handle ?? '',
    verified: row.verified ?? false,
    followers: row.followers ?? null,
    avg_views: row.avg_views ?? null,
    avg_likes: row.avg_likes ?? null,
    avg_comments: row.avg_comments ?? null,
    engagement_rate: row.engagement_rate != null ? Number(row.engagement_rate) : null,
    verified_at: row.verified_at ?? null,
    last_synced_at: row.last_synced_at ?? null,
    verification_code: row.verification_code ?? null,
    verification_status: row.verification_status ?? null,
    created_at: row.created_at,
  };
}

export async function getStripeConnectLink(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'create-connect-link',
      { body: {} }
    );
    if (error || !data) return null;
    return (data as { url?: string }).url ?? null;
  } catch {
    return null;
  }
}

export function mapBusiness(row: any): Business {
  return {
    id: row.id,
    user_id: row.user_id,
    user: mapUser(row.user ?? row.users ?? {}),
    business_name: row.business_name ?? '',
    category: (row.category ?? '') as Category,
    description: row.description ?? '',
    location: row.location ?? '',
    website: row.website,
    image_url: row.image_url ?? '',
    image_blurhash: row.image_blurhash ?? null,
    rating: Number(row.rating ?? 0),
    total_reviews: row.total_reviews ?? 0,
    total_listings: row.total_listings ?? 0,
    verified: row.verified ?? false,
    created_at: row.created_at,
  };
}

export function mapListing(row: any): Listing {
  return {
    id: row.id,
    business_id: row.business_id,
    business: mapBusiness(row.business_profiles ?? {}),
    title: row.title,
    description: row.description ?? '',
    platform: row.platform as Platform,
    category: row.category as Category,
    pay_min: row.pay_min ?? 0,
    pay_max: row.pay_max ?? 0,
    content_type: row.content_type ?? '',
    min_followers: row.min_followers ?? 0,
    min_engagement_rate: Number(row.min_engagement_rate ?? 0),
    deadline: row.deadline,
    location: row.location ?? '',
    image_url: row.image_url ?? '',
    image_blurhash: row.image_blurhash ?? null,
    gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images : null,
    status: row.status as ListingStatus,
    applicants_count: row.applicants_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapBooking(row: any): Booking {
  return {
    id: row.id,
    listing_id: row.listing_id,
    listing: mapListing(row.listings ?? {}),
    creator_id: row.creator_id,
    creator: mapCreator(row.creator_profiles ?? {}),
    business_id: row.business_id,
    business: mapBusiness(row.business_profiles ?? {}),
    status: row.status as BookingStatus,
    pay_agreed: row.pay_agreed ?? 0,
    notes: row.notes,
    deadline: row.deadline,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
    proof_url: row.proof_url ?? null,
    proof_screenshots: row.proof_screenshots ?? null,
    proof_note: row.proof_note ?? null,
    proof_submitted_at: row.proof_submitted_at ?? null,
    auto_approve_at: row.auto_approve_at ?? null,
  };
}

export function mapConversation(row: any, currentUserId: string): Conversation {
  // Find the other participant
  const otherIds = (row.participant_ids ?? []).filter(
    (pid: string) => pid !== currentUserId
  );
  return {
    id: row.id,
    participant_ids: row.participant_ids ?? [],
    participant_name: row._other_name ?? 'Unknown',
    participant_avatar: row._other_avatar ?? null,
    participant_role: (row._other_role ?? 'creator') as UserRole,
    last_message: row.last_message ?? '',
    last_message_at: row.updated_at,
    unread_count: row._unread_count ?? 0,
    listing_title: row._listing_title ?? null,
  };
}

export function mapMessage(row: any): Message {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    text: row.text,
    read: row.read ?? false,
    reactions: row.reactions ?? {},
    moderation_flags: row.moderation_flags ?? [],
    created_at: row.created_at,
  };
}

export function mapReview(row: any): Review {
  return {
    id: row.id,
    reviewer_id: row.reviewer_id,
    reviewer_name: row._reviewer_name ?? 'Unknown',
    reviewer_avatar: row._reviewer_avatar ?? null,
    target_id: row.target_id,
    rating: row.rating,
    comment: row.comment ?? '',
    created_at: row.created_at,
  };
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: UserRole
): Promise<{ user: User; session: Session } | null> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });

  if (error || !data.user) {
    logError('signUp', error);
    return null;
  }

  // Trigger `on_auth_user_created` populates public.users + role profile.
  // If email confirmations are ON, we won't have a session yet — bail gracefully.
  if (!data.session) return null;

  await supabase
    .from('users')
    .update({
      accepted_terms_at: new Date().toISOString(),
      terms_version: 'v1.0.0',
    })
    .eq('id', data.user.id);

  const { data: userRow } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  const user: User = userRow
    ? mapUser(userRow)
    : {
        id: data.user.id,
        email,
        full_name: fullName,
        avatar_url: null,
        role,
        onboarding_completed_at: null,
        email_verified_at: null,
        accepted_terms_at: new Date().toISOString(),
        terms_version: 'v1.0.0',
        milestones: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  return {
    user,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? 0,
      user,
    },
  };
}

export async function resendVerificationEmail(email: string): Promise<boolean> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });
  if (error) {
    logError('resendVerificationEmail', error);
    return false;
  }
  return true;
}

export async function verifyEmailOtp(
  email: string,
  token: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function sendPhoneOtp(phone: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-phone-otp', {
      body: { phone },
    });
    if (error) {
      logError('sendPhoneOtp', error);
      return false;
    }
    return data?.success === true;
  } catch (err) {
    logError('sendPhoneOtp error', err);
    return false;
  }
}

export async function verifyPhoneOtp(
  phone: string,
  token: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-phone-otp', {
      body: { phone, code: token },
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    if (!data?.ok) {
      return { ok: false, message: data?.message ?? 'Verification failed' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: 'Verification request failed' };
  }
}

export async function enrollTotp(): Promise<
  | { ok: true; factorId: string; qrSvg: string; secret: string; uri: string }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'Surve',
  });
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Failed to start enrollment' };
  }
  return {
    ok: true,
    factorId: data.id,
    qrSvg: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

export async function verifyTotpEnrollment(
  factorId: string,
  code: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    return { ok: false, message: challenge.error?.message ?? 'Challenge failed' };
  }
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function challengeAndVerifyTotp(
  factorId: string,
  code: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (result.error) {
    return { ok: false, message: result.error.message };
  }
  return { ok: true };
}

export async function listMfaFactors(): Promise<
  { id: string; type: string; status: string; friendlyName?: string | null }[]
> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];
  return data.all.map((f) => ({
    id: f.id,
    type: f.factor_type,
    status: f.status,
    friendlyName: f.friendly_name,
  }));
}

export async function unenrollMfa(factorId: string): Promise<boolean> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    logError('unenrollMfa', error);
    return false;
  }
  return true;
}

// ─── Profile editing ────────────────────────────────────────────────────────

// ─── Saved searches ─────────────────────────────────────────────────────────

export type SavedSearch = {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, unknown>;
  created_at: string;
};

export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  return retryWithBackoff(async () => {
    const { data } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return (data as SavedSearch[]) ?? [];
  }, 'Failed to load saved searches');
}

export async function createSavedSearch(
  userId: string,
  name: string,
  filters: Record<string, unknown>
): Promise<SavedSearch | null> {
  const { data } = await supabase
    .from('saved_searches')
    .insert({ user_id: userId, name, filters })
    .select()
    .single();
  return (data as SavedSearch) ?? null;
}

export async function deleteSavedSearch(id: string): Promise<boolean> {
  const { error } = await supabase.from('saved_searches').delete().eq('id', id);
  return !error;
}

export async function replyToReview(
  reviewId: string,
  replierId: string,
  text: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, message: 'Reply cannot be empty' };
  const { error } = await supabase
    .from('reviews')
    .update({
      reply_text: trimmed,
      replied_at: new Date().toISOString(),
      replied_by: replierId,
    })
    .eq('id', reviewId)
    .is('reply_text', null);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ─── Notification preferences ───────────────────────────────────────────────

export type NotificationPrefs = {
  messages: boolean;
  bookings: boolean;
  payments: boolean;
  reviews: boolean;
  marketing: boolean;
  email_messages: boolean;
  email_bookings: boolean;
  email_payments: boolean;
  email_marketing: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  messages: true,
  bookings: true,
  payments: true,
  reviews: true,
  marketing: false,
  email_messages: true,
  email_bookings: true,
  email_payments: true,
  email_marketing: false,
};

export async function getNotificationPrefs(
  userId: string
): Promise<NotificationPrefs> {
  return retryWithBackoff(async () => {
    const { data } = await supabase
      .from('users')
      .select('notification_prefs')
      .eq('id', userId)
      .single();
    return {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...((data?.notification_prefs as Partial<NotificationPrefs>) ?? {}),
    };
  }, 'Failed to load notification preferences');
}

export async function setNotificationPrefs(
  userId: string,
  prefs: Partial<NotificationPrefs>
): Promise<boolean> {
  const current = await getNotificationPrefs(userId);
  const next = { ...current, ...prefs };
  const { error } = await supabase
    .from('users')
    .update({ notification_prefs: next })
    .eq('id', userId);
  return !error;
}

export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  return retryWithBackoff(async () => {
    const lower = username.toLowerCase();
    let q = supabase.from('users').select('id').eq('username', lower).limit(1);
    if (excludeUserId) q = q.neq('id', excludeUserId);
    const { data } = await q;
    return !data || data.length === 0;
  }, 'Failed to check username availability');
}

export async function updateProfile(
  userId: string,
  patch: {
    full_name?: string;
    username?: string;
    bio?: string | null;
    location?: string | null;
    avatar_url?: string | null;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const clean: Record<string, unknown> = {};
  if (patch.full_name !== undefined) clean.full_name = patch.full_name.trim();
  if (patch.username !== undefined) clean.username = patch.username.toLowerCase().trim();
  if (patch.bio !== undefined) clean.bio = patch.bio;
  if (patch.location !== undefined) clean.location = patch.location;
  if (patch.avatar_url !== undefined) clean.avatar_url = patch.avatar_url;

  const { error } = await supabase.from('users').update(clean).eq('id', userId);
  if (error) {
    if (error.code === '23505') {
      return { ok: false, message: 'That username is already taken.' };
    }
    if (error.code === '23514') {
      return {
        ok: false,
        message: 'Username must be 3–24 characters, lowercase letters, numbers or underscores, starting with a letter.',
      };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function uploadAvatar(
  userId: string,
  uri: string
): Promise<string | null> {
  // Infer extension from uri; default to jpg
  const match = /\.(\w+)(?:\?|$)/.exec(uri);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const type =
    ext === 'png'
      ? 'image/png'
      : ext === 'webp'
        ? 'image/webp'
        : 'image/jpeg';
  return uploadUserFile('avatars', userId, {
    uri,
    name: `avatar.${ext}`,
    type,
  });
}

export async function getBlockedIds(userId: string): Promise<string[]> {
  return retryWithBackoff(async () => {
    const { data } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);
    return (data ?? []).map((r: { blocked_id: string }) => r.blocked_id);
  }, 'Failed to load blocked users');
}

export async function isBlockedBetween(
  userA: string,
  userB: string
): Promise<boolean> {
  return retryWithBackoff(async () => {
    const { data } = await supabase
      .from('user_blocks')
      .select('id')
      .or(
        `and(blocker_id.eq.${userA},blocked_id.eq.${userB}),and(blocker_id.eq.${userB},blocked_id.eq.${userA})`
      )
      .limit(1);
    return (data ?? []).length > 0;
  }, 'Failed to check block status');
}

export async function blockUser(
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  return !error;
}

export async function unblockUser(
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  return !error;
}

export async function reportUser(
  reporterId: string,
  targetUserId: string,
  reason: string,
  description?: string
): Promise<boolean> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    target_user_id: targetUserId,
    target_type: 'user',
    target_id: targetUserId,
    reason,
    description: description ?? null,
    status: 'open',
  });
  return !error;
}

export async function deleteAccount(
  password: string
): Promise<{ ok: true } | { ok: false; code: string; count?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      body: { password },
    });
    if (error) return { ok: false, code: error.message };
    if (data?.error) return { ok: false, code: data.error, count: data.count };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      code: e instanceof Error ? e.message : 'unknown_error',
    };
  }
}

export interface DataExportResult {
  exported_at: string;
  user_id: string;
  data: Record<string, unknown[]>;
}

export async function exportMyData(userId: string): Promise<DataExportResult> {
  const tableDefs: { table: string; filterCol: string }[] = [
    { table: 'users', filterCol: 'id' },
    { table: 'creators', filterCol: 'user_id' },
    { table: 'businesses', filterCol: 'user_id' },
    { table: 'listings', filterCol: 'user_id' },
    { table: 'applications', filterCol: 'user_id' },
    { table: 'bookings', filterCol: 'creator_id' },
    { table: 'messages', filterCol: 'sender_id' },
    { table: 'conversations', filterCol: 'user_id' },
    { table: 'reviews', filterCol: 'reviewer_id' },
    { table: 'transactions', filterCol: 'payer_id' },
    { table: 'notifications', filterCol: 'user_id' },
  ];

  const results: Record<string, unknown[]> = {};

  const fetches = tableDefs.map(async ({ table, filterCol }) => {
    const { data } = await supabase.from(table).select('*').eq(filterCol, userId);
    results[table] = data ?? [];
  });

  await Promise.all(fetches);

  if (USE_MOCK_FALLBACK && Object.values(results).every((arr) => arr.length === 0)) {
    results['users'] = [mock.mockCreatorUser];
    results['bookings'] = mock.mockBookings;
    results['conversations'] = mock.mockConversations;
    results['reviews'] = mock.mockReviews;
    results['transactions'] = mock.mockTransactions;
    results['notifications'] = mock.mockNotifications;
  }

  return {
    exported_at: new Date().toISOString(),
    user_id: userId,
    data: results,
  };
}

export function convertExportToCsv(exportData: DataExportResult): string {
  const lines: string[] = [];

  for (const [table, rows] of Object.entries(exportData.data)) {
    const arr = rows as Record<string, unknown>[];
    if (arr.length === 0) continue;

    lines.push(`--- ${table.toUpperCase()} ---`);
    const headers = Object.keys(arr[0]);
    lines.push(headers.join(','));
    for (const row of arr) {
      lines.push(
        headers
          .map((h) => {
            const val = row[h];
            const str = val === null || val === undefined ? '' : String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(',')
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function requestRefund(
  bookingId: string,
  reason: string,
  amount?: number
): Promise<{ ok: true; refundId: string; status: string } | { ok: false; message: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, message: 'Not authenticated' };

  try {
    const { data, error } = await supabase.functions.invoke('process-refund', {
      body: { booking_id: bookingId, reason, amount },
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    if (data?.error) {
      return { ok: false, message: data.message ?? data.error };
    }
    return { ok: true, refundId: data.refund_id, status: data.status };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getAssuranceLevel(): Promise<{
  currentLevel: 'aal1' | 'aal2' | null;
  nextLevel: 'aal1' | 'aal2' | null;
}> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { currentLevel: null, nextLevel: null };
  return {
    currentLevel: (data.currentLevel as 'aal1' | 'aal2') ?? null,
    nextLevel: (data.nextLevel as 'aal1' | 'aal2') ?? null,
  };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User; session: Session } | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    logError('signIn', error);
    return null;
  }

  // Fetch user profile
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (!userData) return null;

  const user = mapUser(userData);

  const session: Session = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? 0,
    user,
  };

  return { user, session };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<{
  user: User;
  session: Session;
} | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!userData) return null;

  const user = mapUser(userData);

  return {
    user,
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at ?? 0,
      user,
    },
  };
}

// ─── Listings ───────────────────────────────────────────────────────────────

export async function getListings(): Promise<Listing[]> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*, businesses(*, users(*))')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      logError('getListings', error);
      return USE_MOCK_FALLBACK ? mock.mockListings : [];
    }

    const real = (data ?? []).map((row: any) => {
      if (row.businesses) {
        row.businesses.user = row.businesses.users;
      }
      row.business_profiles = row.businesses;
      return mapListing(row);
    });

    return preferMock(real, mock.mockListings);
  }, 'Failed to load listings');
}

export async function searchListings(
  query: string,
  filters?: {
    platform?: string;
    category?: string;
    sortBy?: string;
    payMin?: number | null;
    payMax?: number | null;
    location?: string;
  }
): Promise<Listing[]> {
  return retryWithBackoff(async () => {
    let q = supabase
      .from('listings')
      .select('*, businesses(*, users(*))')
      .eq('status', 'active');

    if (query.trim()) {
      const tsQuery = query.trim().split(/\s+/).join(' & ');
      q = q.textSearch('fts', tsQuery, { type: 'plain', config: 'english' });
    }

    if (filters?.platform && filters.platform !== 'all') {
      q = q.eq('platform', filters.platform);
    }
    if (filters?.category && filters.category !== 'all') {
      q = q.eq('category', filters.category);
    }
    if (filters?.payMin != null) {
      q = q.gte('pay_max', filters.payMin);
    }
    if (filters?.payMax != null && filters.payMax > 0) {
      q = q.lte('pay_min', filters.payMax);
    }
    if (filters?.location && filters.location.trim()) {
      q = q.ilike('location', `%${filters.location.trim()}%`);
    }

    switch (filters?.sortBy) {
      case 'highest_pay':
        q = q.order('pay_max', { ascending: false });
        break;
      default:
        q = q.order('created_at', { ascending: false });
        break;
    }

    const { data, error } = await q;

    if (error) {
      logError('searchListings', error);
      return [];
    }

    return (data ?? []).map((row: any) => {
      if (row.businesses) {
        row.businesses.user = row.businesses.users;
      }
      row.business_profiles = row.businesses;
      return mapListing(row);
    });
  }, 'Search failed');
}

export async function getListing(id: string): Promise<Listing | null> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*, businesses(*, users(*))')
      .eq('id', id)
      .single();

    if (error || !data) {
      if (USE_MOCK_FALLBACK) {
        return mock.mockListings.find((l) => l.id === id) ?? mock.mockListings[0] ?? null;
      }
      return null;
    }

    if ((data as any).businesses) {
      (data as any).businesses.user = (data as any).businesses.users;
      (data as any).business_profiles = (data as any).businesses;
    }

    return mapListing(data);
  }, 'Failed to load listing');
}

export async function createListing(
  listing: Partial<Listing> & { business_id: string }
): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('listings')
    .insert({
      business_id: listing.business_id,
      title: listing.title ?? '',
      description: listing.description ?? '',
      platform: listing.platform ?? 'instagram',
      category: listing.category ?? 'hotel',
      pay_min: listing.pay_min ?? 0,
      pay_max: listing.pay_max ?? 0,
      content_type: listing.content_type ?? '',
      min_followers: listing.min_followers ?? 0,
      min_engagement_rate: listing.min_engagement_rate ?? 0,
      deadline: listing.deadline ?? new Date(Date.now() + 30 * 86400000).toISOString(),
      location: listing.location ?? '',
      image_url: listing.image_url ?? '',
      status: listing.status ?? 'active',
    })
    .select('*, businesses(*, users(*))')
    .single();

  if (error || !data) {
    logError('createListing', error);
    return null;
  }

  if ((data as any).businesses) {
    (data as any).businesses.user = (data as any).businesses.users;
    (data as any).business_profiles = (data as any).businesses;
  }

  return mapListing(data);
}

export async function applyToListing(
  listingId: string,
  creatorId: string,
  message: string
): Promise<boolean> {
  const { error } = await supabase.from('applications').insert({
    listing_id: listingId,
    creator_id: creatorId,
    message,
  });

  if (error) {
    logError('applyToListing', error);
    return false;
  }
  // Trigger `trg_app_count_ins` handles applicants_count — don't race it here.
  return true;
}

// ─── Creators ───────────────────────────────────────────────────────────────

export async function getCreators(excludeForUserId?: string): Promise<Creator[]> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('creators')
      .select('*, users(*)')
      .order('rating', { ascending: false });

    if (error) {
      logError('getCreators', error);
      return USE_MOCK_FALLBACK ? mock.mockCreators : [];
    }

    const real = (data ?? []).map((row: any) => {
      row.user = row.users;
      return mapCreator(row);
    });

    if (excludeForUserId) {
      const blocked = await getBlockedIds(excludeForUserId);
      if (blocked.length > 0) {
        const blockedSet = new Set(blocked);
        return real.filter((c) => !blockedSet.has(c.user_id));
      }
    }

    return preferMock(real, mock.mockCreators);
  }, 'Failed to load creators');
}

export async function searchCreators(
  query: string,
  filters?: CreatorFilters
): Promise<Creator[]> {
  return retryWithBackoff(async () => {
    let q = supabase
      .from('creators')
      .select('*, users(*)');

    if (filters?.category && filters.category !== 'all') {
      q = q.contains('categories', [filters.category]);
    }
    if (filters?.followersMin != null) {
      q = q.or(
        `instagram_followers.gte.${filters.followersMin},tiktok_followers.gte.${filters.followersMin}`
      );
    }
    if (filters?.followersMax != null) {
      q = q.lte('instagram_followers', filters.followersMax);
    }
    if (filters?.engagementMin != null) {
      q = q.gte('engagement_rate', filters.engagementMin);
    }

    q = q.order('rating', { ascending: false });

    const { data, error } = await q;

    if (error) {
      logError('searchCreators', error);
      return filterCreatorsMock(query, filters);
    }

    let results = (data ?? []).map((row: any) => {
      row.user = row.users;
      return mapCreator(row);
    });

    if (query.trim()) {
      const lower = query.toLowerCase();
      results = results.filter(
        (c) =>
          c.user.full_name.toLowerCase().includes(lower) ||
          c.bio.toLowerCase().includes(lower) ||
          c.location.toLowerCase().includes(lower) ||
          (c.instagram_handle?.toLowerCase().includes(lower) ?? false) ||
          (c.tiktok_handle?.toLowerCase().includes(lower) ?? false)
      );
    }

    return preferMock(results, filterCreatorsMock(query, filters));
  }, 'Search failed');
}

function filterCreatorsMock(
  query: string,
  filters?: CreatorFilters
): Creator[] {
  let results = [...mock.mockCreators];

  if (query.trim()) {
    const lower = query.toLowerCase();
    results = results.filter(
      (c) =>
        c.user.full_name.toLowerCase().includes(lower) ||
        c.bio.toLowerCase().includes(lower) ||
        c.location.toLowerCase().includes(lower) ||
        (c.instagram_handle?.toLowerCase().includes(lower) ?? false) ||
        (c.tiktok_handle?.toLowerCase().includes(lower) ?? false)
    );
  }
  if (filters?.category && filters.category !== 'all') {
    results = results.filter((c) =>
      c.categories.includes(filters.category as Category)
    );
  }
  if (filters?.followersMin != null) {
    const min = filters.followersMin;
    results = results.filter(
      (c) => c.instagram_followers >= min || c.tiktok_followers >= min
    );
  }
  if (filters?.followersMax != null) {
    const max = filters.followersMax;
    results = results.filter((c) => c.instagram_followers <= max);
  }
  if (filters?.engagementMin != null) {
    const min = filters.engagementMin;
    results = results.filter((c) => c.engagement_rate >= min);
  }

  return results;
}

export async function getCreatorProfile(
  userId: string,
  requestingUserId?: string
): Promise<Creator | null> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('creators')
      .select('*, users(*), creator_social_accounts(*)')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      if (USE_MOCK_FALLBACK) {
        const found =
          mock.mockCreators.find((c) => c.id === userId || c.user_id === userId) ??
          mock.mockCreators[0] ??
          null;
        if (found) return redactCreatorRates(found, userId, requestingUserId);
        return null;
      }
      return null;
    }

    (data as any).user = (data as any).users;
    const creator = mapCreator(data);
    const socialRows = (data as any).creator_social_accounts;
    if (Array.isArray(socialRows)) {
      creator.social_accounts = socialRows.map(mapCreatorSocialAccount);
    }
    return redactCreatorRates(creator, userId, requestingUserId);
  }, 'Failed to load creator profile');
}

/** Strip rate-related fields when the creator's show_rates_publicly is false and the requester is not the owner. */
function redactCreatorRates(
  creator: Creator,
  ownerUserId: string,
  requestingUserId?: string
): Creator {
  const isOwner = requestingUserId === ownerUserId;
  if (creator.show_rates_publicly || isOwner) return creator;
  return {
    ...creator,
    engagement_rate: 0,
    avg_views: 0,
  };
}

export async function updateCreatorProfile(
  userId: string,
  updates: Partial<Creator>
): Promise<Creator | null> {
  const { data, error } = await supabase
    .from('creators')
    .update({
      bio: updates.bio,
      instagram_handle: updates.instagram_handle,
      tiktok_handle: updates.tiktok_handle,
      instagram_followers: updates.instagram_followers,
      tiktok_followers: updates.tiktok_followers,
      engagement_rate: updates.engagement_rate,
      avg_views: updates.avg_views,
      categories: updates.categories,
      portfolio_urls: updates.portfolio_urls,
      location: updates.location,
    })
    .eq('user_id', userId)
    .select('*, users(*)')
    .single();

  if (error || !data) {
    logError('updateCreatorProfile', error);
    return null;
  }

  (data as any).user = (data as any).users;
  return mapCreator(data);
}

export async function completeOnboarding(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    logError('completeOnboarding', error);
    return false;
  }
  return true;
}

// ─── Businesses ─────────────────────────────────────────────────────────────

export async function getBusinessProfile(
  userId: string
): Promise<Business | null> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*, users(*)')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    (data as any).user = (data as any).users;
    return mapBusiness(data);
  }, 'Failed to load business profile');
}

export async function updateBusinessProfile(
  userId: string,
  updates: Partial<Business>
): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .update({
      business_name: updates.business_name,
      category: updates.category,
      description: updates.description,
      location: updates.location,
      website: updates.website,
      image_url: updates.image_url,
    })
    .eq('user_id', userId)
    .select('*, users(*)')
    .single();

  if (error || !data) {
    logError('updateBusinessProfile', error);
    return null;
  }

  (data as any).user = (data as any).users;
  return mapBusiness(data);
}

// ─── Applications ──────────────────────────────────────────────────────────

export async function getBusinessApplications(
  userId: string
): Promise<Application[]> {
  return retryWithBackoff(async () => {
    const { data: bizData } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!bizData) {
      if (USE_MOCK_FALLBACK) return mock.mockApplications;
      return [];
    }

    const { data: listingIds } = await supabase
      .from('listings')
      .select('id')
      .eq('business_id', bizData.id);

    if (!listingIds || listingIds.length === 0) {
      if (USE_MOCK_FALLBACK) return mock.mockApplications;
      return [];
    }

    const ids = listingIds.map((l: any) => l.id);

    const { data, error } = await supabase
      .from('applications')
      .select('*, creators(*, users(*)), listings(*, businesses(*, users(*)))')
      .in('listing_id', ids)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      if (USE_MOCK_FALLBACK) return mock.mockApplications;
      return [];
    }

    return data.map((a: any) => {
      const creator = a.creators
        ? { ...a.creators, user: a.creators.users }
        : undefined;
      const listing = a.listings
        ? { ...a.listings, business: a.listings.businesses ? { ...a.listings.businesses, user: a.listings.businesses.users } : undefined }
        : undefined;
      return { ...a, creator, listing, creators: undefined, listings: undefined };
    });
  }, 'Failed to load applications');
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export async function getBookings(userId: string): Promise<Booking[]> {
  return retryWithBackoff(async () => {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    let query = supabase
      .from('bookings')
      .select(
        '*, listings(*, businesses(*, users(*))), creators(*, users(*)), businesses!bookings_business_id_fkey(*, users(*))'
      )
      .order('created_at', { ascending: false });

    if (userData?.role === 'creator') {
      const { data: cp } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', userId)
        .single();
      if (cp) {
        query = query.eq('creator_id', cp.id);
      }
    } else {
      const { data: bp } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', userId)
        .single();
      if (bp) {
        query = query.eq('business_id', bp.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      logError('getBookings', error);
      return USE_MOCK_FALLBACK ? mock.mockBookings : [];
    }

    const real = (data ?? []).map((row: any) => {
      if (row.listings?.businesses) {
        row.listings.businesses.user = row.listings.businesses.users;
        row.listings.business_profiles = row.listings.businesses;
      }
      if (row.creators) {
        row.creators.user = row.creators.users;
        row.creator_profiles = row.creators;
      }
      if (row.businesses) {
        row.businesses.user = row.businesses.users;
        row.business_profiles = row.businesses;
      }
      return mapBooking(row);
    });

    return preferMock(real, mock.mockBookings);
  }, 'Failed to load bookings');
}

export async function getBookingById(bookingId: string): Promise<Booking | null> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        '*, listings(*, businesses(*, users(*))), creators(*, users(*)), businesses!bookings_business_id_fkey(*, users(*))'
      )
      .eq('id', bookingId)
      .single();

    if (error || !data) {
      logError('getBookingById', error);
      return null;
    }

    const row = data as any;
    if (row.listings?.businesses) {
      row.listings.businesses.user = row.listings.businesses.users;
      row.listings.business_profiles = row.listings.businesses;
    }
    if (row.creators) {
      row.creators.user = row.creators.users;
      row.creator_profiles = row.creators;
    }
    if (row.businesses) {
      row.businesses.user = row.businesses.users;
      row.business_profiles = row.businesses;
    }
    return mapBooking(row);
  }, 'Failed to load booking');
}

export async function createBooking(booking: {
  listing_id: string;
  creator_id: string;
  business_id: string;
  pay_agreed: number;
  notes?: string;
  deadline: string;
}): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select(
      '*, listings(*, businesses(*, users(*))), creators(*, users(*)), businesses!bookings_business_id_fkey(*, users(*))'
    )
    .single();

  if (error || !data) {
    logError('createBooking', error);
    return null;
  }

  return mapBooking(data);
}

export async function updateBooking(
  id: string,
  updates: {
    status?: BookingStatus;
    notes?: string;
    completed_at?: string;
    proof_url?: string;
    proof_screenshots?: string[];
    proof_note?: string | null;
    proof_submitted_at?: string;
    auto_approve_at?: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id);

  if (error) {
    logError('updateBooking', error);
    return false;
  }
  return true;
}

export async function batchUpdateBookings(
  ids: string[],
  updates: {
    status?: BookingStatus;
    completed_at?: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .update(updates)
    .in('id', ids);

  if (error) {
    logError('batchUpdateBookings', error);
    return false;
  }
  return true;
}

// ─── Messages ───────────────────────────────────────────────────────────────

export async function getConversations(
  userId: string
): Promise<Conversation[]> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [userId])
      .order('updated_at', { ascending: false });

    if (error) {
      logError('getConversations', error);
      return USE_MOCK_FALLBACK ? mock.mockConversations : [];
    }

    if (USE_MOCK_FALLBACK && (!data || data.length === 0)) {
      return mock.mockConversations;
    }

    const { data: blocks } = await supabase
      .from('user_blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    const blockedSet = new Set<string>();
    for (const b of blocks ?? []) {
      const other = b.blocker_id === userId ? b.blocked_id : b.blocker_id;
      blockedSet.add(other);
    }

    const conversations: Conversation[] = [];
    for (const row of data ?? []) {
      const otherIds = (row.participant_ids ?? []).filter(
        (pid: string) => pid !== userId
      );
      const otherId = otherIds[0];
      if (otherId && blockedSet.has(otherId)) continue;

      let name = 'Unknown';
      let avatar: string | null = null;
      let role: UserRole = 'creator';

      if (otherId) {
        const { data: otherUser } = await supabase
          .from('users')
          .select('full_name, avatar_url, role')
          .eq('id', otherId)
          .single();

        if (otherUser) {
          name = otherUser.full_name;
          avatar = otherUser.avatar_url;
          role = otherUser.role as UserRole;
        }
      }

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', row.id)
        .neq('sender_id', userId);

      conversations.push({
        id: row.id,
        participant_ids: row.participant_ids,
        participant_name: name,
        participant_avatar: avatar,
        participant_role: role,
        last_message: row.last_message ?? '',
        last_message_at: row.updated_at,
        unread_count: 0,
        listing_title: null,
      });
    }

    return conversations;
  }, 'Failed to load conversations');
}

export async function getMessages(
  conversationId: string
): Promise<Message[]> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      logError('getMessages', error);
      return USE_MOCK_FALLBACK ? mock.mockMessages[conversationId] ?? [] : [];
    }

    const real = (data ?? []).map(mapMessage);
    if (USE_MOCK_FALLBACK && real.length === 0) {
      return mock.mockMessages[conversationId] ?? [];
    }
    return real;
  }, 'Failed to load messages');
}

export async function searchMessages(
  conversationId: string,
  keyword: string,
  page = 0,
  pageSize = 20
): Promise<{ messages: Message[]; hasMore: boolean }> {
  return retryWithBackoff(async () => {
    const pattern = `%${keyword}%`;
    const from = page * pageSize;
    const to = from + pageSize;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .ilike('text', pattern)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logError('searchMessages', error);
      if (USE_MOCK_FALLBACK) {
        const all = (mock.mockMessages[conversationId] ?? []).filter((m) =>
          m.text.toLowerCase().includes(keyword.toLowerCase())
        );
        const slice = all.reverse().slice(from, to + 1);
        return { messages: slice.slice(0, pageSize).map(mapMessage), hasMore: slice.length > pageSize };
      }
      return { messages: [], hasMore: false };
    }

    const mapped = (data ?? []).map(mapMessage);
    if (USE_MOCK_FALLBACK && mapped.length === 0) {
      const all = (mock.mockMessages[conversationId] ?? []).filter((m) =>
        m.text.toLowerCase().includes(keyword.toLowerCase())
      );
      const reversed = [...all].reverse();
      const slice = reversed.slice(from, to + 1);
      return { messages: slice.slice(0, pageSize), hasMore: slice.length > pageSize };
    }

    return { messages: mapped.slice(0, pageSize), hasMore: mapped.length > pageSize };
  }, 'Failed to search messages');
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message | null> {
  // Reject sends if either party has blocked the other
  const { data: convRow } = await supabase
    .from('conversations')
    .select('participant_ids')
    .eq('id', conversationId)
    .maybeSingle();
  const otherId = ((convRow?.participant_ids as string[]) ?? []).find(
    (pid) => pid !== senderId
  );
  if (otherId) {
    const blocked = await isBlockedBetween(senderId, otherId);
    if (blocked) {
      devWarn('sendMessage blocked between parties');
      return null;
    }
  }

  const flags = moderateText(content);

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      text: content,
      moderation_flags: flags.length > 0 ? flags : [],
    })
    .select()
    .single();

  if (error || !data) {
    logError('sendMessage', error);
    return null;
  }
  return mapMessage(data);
}

// ─── Message reactions (emoji-based, stored in message_reactions table) ──────

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

export async function getConversationReactions(
  conversationId: string
): Promise<MessageReaction[]> {
  return retryWithBackoff(async () => {
    const { data: messageRows } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId);
    const ids = (messageRows ?? []).map((r: { id: string }) => r.id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('message_reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', ids);
    if (error) return [];
    return (data ?? []) as MessageReaction[];
  }, 'Failed to load reactions');
}

export async function toggleMessageReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<boolean> {
  // Check if the user already reacted with this emoji.
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('id', (existing as { id: string }).id);
    return !error;
  }

  const { error } = await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji });
  return !error;
}

export function subscribeToMessageReactions(
  conversationId: string,
  onChange: () => void
): () => void {
  const channel = supabase
    .channel(`reactions:${conversationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'message_reactions' },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<Record<string, string[]> | null> {
  const { data: row, error: fetchErr } = await supabase
    .from('messages')
    .select('reactions')
    .eq('id', messageId)
    .single();

  if (fetchErr || !row) {
    logError('toggleReaction fetch', fetchErr);
    return null;
  }

  const reactions: Record<string, string[]> = row.reactions ?? {};
  const users = reactions[emoji] ?? [];
  if (users.includes(userId)) {
    const filtered = users.filter((u) => u !== userId);
    if (filtered.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = filtered;
    }
  } else {
    reactions[emoji] = [...users, userId];
  }

  const { error: updateErr } = await supabase
    .from('messages')
    .update({ reactions })
    .eq('id', messageId);

  if (updateErr) {
    logError('toggleReaction update', updateErr);
    return null;
  }
  return reactions;
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export async function getReviews(targetUserId: string): Promise<Review[]> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('target_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('getReviews', error);
      return USE_MOCK_FALLBACK ? mock.mockReviews.filter((r) => r.target_id === targetUserId) : [];
    }

    const reviews: Review[] = [];
    for (const row of data ?? []) {
      const { data: reviewer } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', row.reviewer_id)
        .single();

      reviews.push({
        id: row.id,
        reviewer_id: row.reviewer_id,
        reviewer_name: reviewer?.full_name ?? 'Unknown',
        reviewer_avatar: reviewer?.avatar_url ?? null,
        target_id: row.target_id,
        rating: row.rating,
        comment: row.comment ?? '',
        created_at: row.created_at,
      });
    }

    if (USE_MOCK_FALLBACK && reviews.length === 0) {
      return mock.mockReviews.filter((r) => r.target_id === targetUserId);
    }

    return reviews;
  }, 'Failed to load reviews');
}

export async function createReview(review: {
  reviewer_id: string;
  target_id: string;
  rating: number;
  comment: string;
}): Promise<boolean> {
  const { error } = await supabase.from('reviews').insert(review);

  if (error) {
    logError('createReview', error);
    return false;
  }
  return true;
}

// ─── Notifications ──────────────────────────────────────────────────────────

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body ?? '',
    data: row.data ?? {},
    read: row.read ?? false,
    created_at: row.created_at,
  };
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      logError('getNotifications', error);
      return [];
    }
    return (data ?? []).map(mapNotification);
  }, 'Failed to load notifications');
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return retryWithBackoff(async () => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) return 0;
    return count ?? 0;
  }, 'Failed to load notification count');
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  return !error;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  return !error;
}

// ─── Setup Intent ───────────────────────────────────────────────────────────

export async function createSetupIntent(): Promise<{ client_secret: string; setup_intent_id: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('create-setup-intent', {
      body: {},
    });
    if (error || !data) return null;
    return data as { client_secret: string; setup_intent_id: string };
  } catch {
    return null;
  }
}

// ─── Payment Methods ────────────────────────────────────────────────────────

function mapPaymentMethod(row: any): PaymentMethod {
  return {
    id: row.id,
    user_id: row.user_id,
    stripe_payment_method_id: row.stripe_payment_method_id,
    brand: row.brand,
    last4: row.last4,
    exp_month: row.exp_month,
    exp_year: row.exp_year,
    is_default: row.is_default ?? false,
    created_at: row.created_at,
  };
}

export async function getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      logError('getPaymentMethods', error);
      return [];
    }
    return (data ?? []).map(mapPaymentMethod);
  }, 'Failed to load payment methods');
}

export async function addPaymentMethod(pm: {
  user_id: string;
  stripe_payment_method_id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  make_default?: boolean;
}): Promise<PaymentMethod | null> {
  const { data, error } = await supabase
    .from('payment_methods')
    .insert({
      user_id: pm.user_id,
      stripe_payment_method_id: pm.stripe_payment_method_id,
      brand: pm.brand,
      last4: pm.last4,
      exp_month: pm.exp_month,
      exp_year: pm.exp_year,
      is_default: pm.make_default ?? false,
    })
    .select()
    .single();
  if (error || !data) {
    logError('addPaymentMethod', error);
    return null;
  }
  return mapPaymentMethod(data);
}

export async function setDefaultPaymentMethod(id: string): Promise<boolean> {
  // Trigger enforces single default per user.
  const { error } = await supabase
    .from('payment_methods')
    .update({ is_default: true })
    .eq('id', id);
  return !error;
}

export async function deletePaymentMethod(id: string): Promise<boolean> {
  const { error } = await supabase.from('payment_methods').delete().eq('id', id);
  return !error;
}

// ─── Transactions ───────────────────────────────────────────────────────────

function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    booking_id: row.booking_id,
    payer_id: row.payer_id,
    payee_id: row.payee_id,
    kind: row.kind,
    amount_cents: row.amount_cents,
    currency: row.currency ?? 'usd',
    status: row.status,
    stripe_payment_intent_id: row.stripe_payment_intent_id,
    description: row.description ?? '',
    created_at: row.created_at,
  };
}

export async function getTransactions(userId: string): Promise<Transaction[]> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      logError('getTransactions', error);
      return [];
    }
    return (data ?? []).map(mapTransaction);
  }, 'Failed to load transactions');
}

export async function getEarningsSummary(userId: string): Promise<{
  total_cents: number;
  pending_cents: number;
  this_month_cents: number;
}> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount_cents, status, created_at, kind')
      .eq('payee_id', userId);
    if (error || !data) return { total_cents: 0, pending_cents: 0, this_month_cents: 0 };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let total = 0;
    let pending = 0;
    let thisMonth = 0;
    for (const r of data) {
      if (r.kind !== 'payout') continue;
      if (r.status === 'succeeded') {
        total += r.amount_cents;
        if (r.created_at >= startOfMonth) thisMonth += r.amount_cents;
      } else if (r.status === 'pending') {
        pending += r.amount_cents;
      }
    }
    return { total_cents: total, pending_cents: pending, this_month_cents: thisMonth };
  }, 'Failed to load earnings');
}

// ─── Payment Intent Status ─────────────────────────────────────────────────

export type PaymentIntentStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'unknown';

export interface PaymentIntentStatusResult {
  status: PaymentIntentStatus;
  payment_intent_id: string;
  booking_id: string | null;
  amount_cents: number;
  currency: string;
  refund_amount_cents: number | null;
  updated_at: string;
}

export async function getPaymentIntentStatus(
  paymentIntentId: string
): Promise<PaymentIntentStatusResult | null> {
  return retryWithBackoff(async () => {
    const { data: tx, error } = await supabase
      .from('transactions')
      .select('id, booking_id, amount_cents, currency, status, stripe_payment_intent_id, created_at, kind')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('kind', 'payment')
      .single();

    if (error || !tx) return null;

    let refundAmountCents: number | null = null;
    if (tx.status === 'refunded') {
      const { data: refundTx } = await supabase
        .from('transactions')
        .select('amount_cents')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .eq('kind', 'refund')
        .eq('status', 'succeeded')
        .single();
      refundAmountCents = refundTx?.amount_cents ?? null;
    }

    return {
      status: (tx.status as PaymentIntentStatus) ?? 'unknown',
      payment_intent_id: paymentIntentId,
      booking_id: tx.booking_id,
      amount_cents: tx.amount_cents,
      currency: tx.currency ?? 'usd',
      refund_amount_cents: refundAmountCents,
      updated_at: tx.created_at,
    };
  }, 'Failed to load payment status');
}

export async function getBookingPaymentStatus(
  bookingId: string
): Promise<PaymentIntentStatusResult | null> {
  return retryWithBackoff(async () => {
    const { data: tx, error } = await supabase
      .from('transactions')
      .select('id, booking_id, amount_cents, currency, status, stripe_payment_intent_id, created_at, kind')
      .eq('booking_id', bookingId)
      .eq('kind', 'payment')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !tx || !tx.stripe_payment_intent_id) return null;

    return getPaymentIntentStatus(tx.stripe_payment_intent_id);
  }, 'Failed to load booking payment status');
}

// ─── Message Reads / Unread Counts ──────────────────────────────────────────

export async function markConversationRead(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const { error } = await supabase.from('message_reads').upsert(
    {
      user_id: userId,
      conversation_id: conversationId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,conversation_id' }
  );
  return !error;
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  return retryWithBackoff(async () => {
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [userId]);
    if (!convs || convs.length === 0) return 0;

    const { data: reads } = await supabase
      .from('message_reads')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId);
    const readMap = new Map<string, string>();
    for (const r of reads ?? []) readMap.set(r.conversation_id, r.last_read_at);

    let total = 0;
    for (const c of convs) {
      const since = readMap.get(c.id) ?? '1970-01-01T00:00:00Z';
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .neq('sender_id', userId)
        .gt('created_at', since);
      total += count ?? 0;
    }
    return total;
  }, 'Failed to load unread message count');
}

// ─── Conversations: start-or-get helper ─────────────────────────────────────

export async function startConversation(
  userIdA: string,
  userIdB: string,
  listingId?: string
): Promise<Conversation | null> {
  const participants = [userIdA, userIdB].sort();
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .contains('participant_ids', participants)
    .limit(1)
    .maybeSingle();

  if (existing && (existing as any).participant_ids?.length === 2) {
    return mapConversation(existing, userIdA);
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({ participant_ids: participants, listing_id: listingId ?? null })
    .select()
    .single();
  if (error || !data) {
    logError('startConversation', error);
    return null;
  }
  return mapConversation(data, userIdA);
}

// ─── Realtime subscriptions ─────────────────────────────────────────────────
// Return an unsubscribe function. Keep channel names unique so reruns don't stack.

export async function getCounterpartyLastRead(
  conversationId: string,
  currentUserId: string
): Promise<string | null> {
  return retryWithBackoff(async () => {
    const { data } = await supabase
      .from('message_reads')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .neq('user_id', currentUserId)
      .order('last_read_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.last_read_at ?? null;
  }, 'Failed to load read receipts');
}

export function subscribeToReadReceipts(
  conversationId: string,
  currentUserId: string,
  onRead: (lastReadAt: string) => void
): () => void {
  const channel = supabase
    .channel(`reads:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reads',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: { new: { user_id?: string; last_read_at?: string } }) => {
        const row = payload.new;
        if (row?.user_id && row.user_id !== currentUserId && row.last_read_at) {
          onRead(row.last_read_at);
        }
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToTyping(
  conversationId: string,
  currentUserId: string,
  onTyping: (userId: string) => void
): { broadcastTyping: () => void; unsubscribe: () => void } {
  const channel = supabase.channel(`typing:${conversationId}`, {
    config: { broadcast: { self: false } },
  });
  channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      const fromUserId = (payload.payload as { user_id?: string })?.user_id;
      if (fromUserId && fromUserId !== currentUserId) {
        onTyping(fromUserId);
      }
    })
    .subscribe();
  return {
    broadcastTyping: () => {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: currentUserId, at: Date.now() },
      });
    },
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

export function subscribeToConversationMessages(
  conversationId: string,
  onMessage: (msg: Message) => void
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(mapMessage(payload.new))
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToUserNotifications(
  userId: string,
  onNotification: (n: Notification) => void
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNotification(mapNotification(payload.new))
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToUserBookings(
  userId: string,
  onChange: () => void
): () => void {
  // We don't know the creator/business profile IDs upfront — just listen broadly
  // and let the store refetch.
  const channel = supabase
    .channel(`bookings:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Storage helpers ────────────────────────────────────────────────────────

// ─── Creator Analytics ──────────────────────────────────────────────────────

export async function getCreatorAnalytics(
  creatorId: string
): Promise<CreatorAnalytics> {
  return retryWithBackoff(async () => {
    const now = new Date();
  const periodEnd = now.toISOString();
  const periodStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    now.getDate()
  ).toISOString();
  const prevStart = new Date(
    now.getFullYear(),
    now.getMonth() - 2,
    now.getDate()
  ).toISOString();

  const [analyticsRes, bookingsRes, prevBookingsRes] = await Promise.all([
    supabase
      .from('analytics')
      .select('profile_views, listing_clicks')
      .eq('creator_id', creatorId)
      .gte('recorded_at', periodStart)
      .lte('recorded_at', periodEnd),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .gte('created_at', prevStart)
      .lt('created_at', periodStart),
  ]);

  let profileViews = 0;
  let listingClicks = 0;
  if (!analyticsRes.error && analyticsRes.data) {
    for (const row of analyticsRes.data) {
      profileViews += row.profile_views ?? 0;
      listingClicks += row.listing_clicks ?? 0;
    }
  }

  const applicationsCount = bookingsRes.count ?? 0;

  // Previous-period totals for delta calculation
  const [prevAnalyticsRes] = await Promise.all([
    supabase
      .from('analytics')
      .select('profile_views, listing_clicks')
      .eq('creator_id', creatorId)
      .gte('recorded_at', prevStart)
      .lt('recorded_at', periodStart),
  ]);

  let prevViews = 0;
  let prevClicks = 0;
  if (!prevAnalyticsRes.error && prevAnalyticsRes.data) {
    for (const row of prevAnalyticsRes.data) {
      prevViews += row.profile_views ?? 0;
      prevClicks += row.listing_clicks ?? 0;
    }
  }
  const prevApplications = prevBookingsRes.count ?? 0;

  const pctDelta = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

  const result: CreatorAnalytics = {
    profile_views: profileViews,
    listing_clicks: listingClicks,
    applications_count: applicationsCount,
    profile_views_delta: Math.round(pctDelta(profileViews, prevViews) * 10) / 10,
    listing_clicks_delta: Math.round(pctDelta(listingClicks, prevClicks) * 10) / 10,
    applications_delta: Math.round(pctDelta(applicationsCount, prevApplications) * 10) / 10,
    period_start: periodStart,
    period_end: periodEnd,
  };

  if (
    USE_MOCK_FALLBACK &&
    profileViews === 0 &&
    listingClicks === 0 &&
    applicationsCount === 0
  ) {
    return mock.mockCreatorAnalytics;
  }

    return result;
  }, 'Failed to load creator analytics');
}

// ─── Creator Weekly Applications ────────────────────────────────────────────

export async function getCreatorWeeklyApplications(
  creatorId: string,
): Promise<{ week: string; count: number }[]> {
  return retryWithBackoff(async () => {
    const now = new Date();
    const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('bookings')
      .select('created_at')
      .eq('creator_id', creatorId)
      .gte('created_at', eightWeeksAgo.toISOString())
      .lte('created_at', now.toISOString());

    if (error || !data || data.length === 0) return mock.mockWeeklyApplications;

    // Build 8 week buckets (oldest first)
    const buckets: { week: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd   = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const count = data.filter((r) => {
        const d = new Date(r.created_at).getTime();
        return d >= weekStart.getTime() && d < weekEnd.getTime();
      }).length;
      buckets.push({ week: label, count });
    }

    const hasData = buckets.some((b) => b.count > 0);
    return hasData ? buckets : mock.mockWeeklyApplications;
  }, 'Failed to load weekly applications');
}

// ─── Creator Top Niches ──────────────────────────────────────────────────────

export async function getCreatorTopNiches(
  creatorId: string,
): Promise<{ name: string; count: number }[]> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('listing:listing_id(category)')
      .eq('creator_id', creatorId);

    if (error || !data || data.length === 0) return mock.mockTopNiches;

    const tally: Record<string, number> = {};
    for (const row of data) {
      const cat = (row.listing as unknown as { category?: string } | null)?.category;
      if (cat) tally[cat] = (tally[cat] ?? 0) + 1;
    }

    const result = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
      }));

    return result.length > 0 ? result : mock.mockTopNiches;
  }, 'Failed to load top niches');
}

// ─── Listing Analytics ──────────────────────────────────────────────────────

export async function fetchListingAnalytics(
  listingId: string
): Promise<ListingAnalyticsSummary> {
  return retryWithBackoff(async () => {
    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    ).toISOString();
    const prevStart = new Date(
      now.getFullYear(),
      now.getMonth() - 2,
      now.getDate()
    ).toISOString();

    const { data, error } = await supabase
      .from('listing_analytics')
      .select('recorded_date, views, clicks, applications')
      .eq('listing_id', listingId)
      .gte('recorded_date', periodStart)
      .lte('recorded_date', periodEnd)
      .order('recorded_date', { ascending: true });

    if (!error && data && data.length > 0) {
      const daily = data.map((row: { recorded_date: string; views: number; clicks: number; applications: number }) => ({
        date: row.recorded_date,
        views: row.views ?? 0,
        clicks: row.clicks ?? 0,
        applications: row.applications ?? 0,
      }));
      const total_views = daily.reduce((s, d) => s + d.views, 0);
      const total_clicks = daily.reduce((s, d) => s + d.clicks, 0);
      const total_applications = daily.reduce((s, d) => s + d.applications, 0);

      const { data: prevData } = await supabase
        .from('listing_analytics')
        .select('views, clicks, applications')
        .eq('listing_id', listingId)
        .gte('recorded_date', prevStart)
        .lt('recorded_date', periodStart);

      let prevViews = 0, prevClicks = 0, prevApps = 0;
      if (prevData) {
        for (const r of prevData) {
          prevViews += r.views ?? 0;
          prevClicks += r.clicks ?? 0;
          prevApps += r.applications ?? 0;
        }
      }

      const pctDelta = (curr: number, prev: number) =>
        prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

      return {
        total_views,
        total_clicks,
        total_applications,
        views_delta: Math.round(pctDelta(total_views, prevViews) * 10) / 10,
        clicks_delta: Math.round(pctDelta(total_clicks, prevClicks) * 10) / 10,
        applications_delta: Math.round(pctDelta(total_applications, prevApps) * 10) / 10,
        daily,
      };
    }

    if (USE_MOCK_FALLBACK) {
      return (
        mock.mockListingAnalytics[listingId] ??
        Object.values(mock.mockListingAnalytics)[0]
      );
    }

    return {
      total_views: 0,
      total_clicks: 0,
      total_applications: 0,
      views_delta: 0,
      clicks_delta: 0,
      applications_delta: 0,
      daily: [],
    };
  }, 'Failed to load listing analytics');
}

// ─── User Stats ────────────────────────────────────────────────────────────

const MOCK_USER_STATS: UserStats = {
  total_bookings: 24,
  total_earnings: 12_450,
  avg_rating: 4.8,
  response_time: 1.2,
};

export async function getUserStats(userId: string): Promise<UserStats> {
  return retryWithBackoff(async () => {
    try {
      const [bookingsRes, transactionsRes, reviewsRes, messagesRes] =
        await Promise.all([
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .or(`creator_id.eq.${userId},business_id.eq.${userId}`),
          supabase
            .from('transactions')
            .select('amount_cents')
            .eq('payee_id', userId)
            .eq('status', 'succeeded')
            .in('kind', ['payment', 'payout']),
          supabase
            .from('reviews')
            .select('rating')
            .eq('target_id', userId),
          supabase
            .from('conversations')
            .select('created_at, updated_at')
            .contains('participant_ids', [userId]),
        ]);

      const totalBookings = bookingsRes.count ?? 0;

      const totalEarnings = (transactionsRes.data ?? []).reduce(
        (sum, t) => sum + (t.amount_cents ?? 0),
        0
      ) / 100;

      const ratings = (reviewsRes.data ?? []).map((r) => Number(r.rating));
      const avgRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : 0;

      const conversations = messagesRes.data ?? [];
      let responseTime = 0;
      if (conversations.length > 0) {
        const diffs = conversations.map((c) => {
          const created = new Date(c.created_at).getTime();
          const updated = new Date(c.updated_at).getTime();
          return Math.max(0, (updated - created) / (1000 * 60 * 60));
        });
        responseTime =
          Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10;
      }

      const stats: UserStats = {
        total_bookings: totalBookings,
        total_earnings: totalEarnings,
        avg_rating: avgRating,
        response_time: responseTime,
      };

      if (
        USE_MOCK_FALLBACK &&
        totalBookings === 0 &&
        totalEarnings === 0 &&
        avgRating === 0
      ) {
        return MOCK_USER_STATS;
      }

      return stats;
    } catch {
      return USE_MOCK_FALLBACK ? MOCK_USER_STATS : {
        total_bookings: 0,
        total_earnings: 0,
        avg_rating: 0,
        response_time: 0,
      };
    }
  }, 'Failed to load user stats');
}

// ─── File Upload ────────────────────────────────────────────────────────────

export async function uploadUserFile(
  bucket: 'avatars' | 'listing-images' | 'portfolio',
  userId: string,
  file: { uri: string; name: string; type: string }
): Promise<string | null> {
  // Path prefix = userId (required by RLS policy).
  const path = `${userId}/${Date.now()}_${file.name}`;

  // React Native: fetch the URI as a blob.
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    logError(`upload ${bucket} error`, error);
    return null;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Saved Listings (Optimistic) ────────────────────────────────────────────

export async function saveListing(userId: string, listingId: string): Promise<boolean> {
  const { error } = await supabase
    .from('saved_listings')
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id' });
  return !error;
}

export async function unsaveListing(userId: string, listingId: string): Promise<boolean> {
  const { error } = await supabase
    .from('saved_listings')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId);
  return !error;
}

export async function getSavedListingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', userId);
  if (error || !data) return [];
  return data.map((r: any) => r.listing_id);
}

// ─── Followed Creators (Optimistic) ────────────────────────────────────────

export async function followCreator(userId: string, creatorId: string): Promise<boolean> {
  const { error } = await supabase
    .from('followed_creators')
    .upsert({ user_id: userId, creator_id: creatorId }, { onConflict: 'user_id,creator_id' });
  return !error;
}

export async function unfollowCreator(userId: string, creatorId: string): Promise<boolean> {
  const { error } = await supabase
    .from('followed_creators')
    .delete()
    .eq('user_id', userId)
    .eq('creator_id', creatorId);
  return !error;
}

export async function getFollowedCreatorIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('followed_creators')
    .select('creator_id')
    .eq('user_id', userId);
  if (error || !data) return [];
  return data.map((r: any) => r.creator_id);
}

// ─── Creator Social Accounts ───────────────────────────────────────────────

export async function getCreatorSocials(
  creatorId: string,
): Promise<CreatorSocialAccount[]> {
  const { data, error } = await supabase
    .from('creator_social_accounts')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    logError('getCreatorSocials', error);
    return [];
  }

  return data.map(mapCreatorSocialAccount);
}

export async function upsertCreatorSocial(
  account: Pick<CreatorSocialAccount, 'creator_id' | 'platform' | 'handle'> &
    Partial<Omit<CreatorSocialAccount, 'id' | 'creator_id' | 'platform' | 'handle' | 'created_at'>>,
): Promise<CreatorSocialAccount | null> {
  const { data, error } = await supabase
    .from('creator_social_accounts')
    .upsert(
      {
        creator_id: account.creator_id,
        platform: account.platform,
        handle: account.handle,
        followers: account.followers ?? null,
        avg_views: account.avg_views ?? null,
        avg_likes: account.avg_likes ?? null,
        avg_comments: account.avg_comments ?? null,
        engagement_rate: account.engagement_rate ?? null,
        verified: account.verified ?? false,
        verified_at: account.verified_at ?? null,
        last_synced_at: account.last_synced_at ?? null,
        verification_code: account.verification_code ?? null,
        verification_status: account.verification_status ?? null,
      },
      { onConflict: 'creator_id,platform,handle' },
    )
    .select('*')
    .single();

  if (error || !data) {
    logError('upsertCreatorSocial', error);
    return null;
  }

  return mapCreatorSocialAccount(data);
}

export async function deleteCreatorSocial(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('creator_social_accounts')
    .delete()
    .eq('id', id);

  if (error) {
    logError('deleteCreatorSocial', error);
    return false;
  }

  return true;
}

// ─── Social Verification — Screenshot Path ──────────────────────────────────

export interface ScreenshotVerifyPayload {
  platform: SocialPlatform;
  handle: string;
  screenshot_url: string;
  claimed_followers: number | null;
  claimed_avg_views: number | null;
  claimed_avg_likes: number | null;
}

/**
 * Upload a screenshot to Supabase storage and invoke the
 * `social-verify-screenshot` edge function to queue a manual review.
 * Also marks the social account row as `pending_screenshot`.
 */
export async function submitSocialVerificationScreenshot(
  userId: string,
  creatorId: string,
  payload: Omit<ScreenshotVerifyPayload, 'screenshot_url'> & { imageUri: string },
): Promise<void> {
  // 1. Upload image to storage (reuse portfolio bucket; screenshots/<userId>/).
  const ext = payload.imageUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const filename = `${Date.now()}_social_verify.${ext}`;
  const storagePath = `${userId}/${filename}`;

  const response = await fetch(payload.imageUri);
  const blob = await response.blob();
  const { error: uploadError } = await supabase.storage
    .from('portfolio')
    .upload(storagePath, blob, { contentType: `image/${ext}`, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(storagePath);
  const screenshotUrl = urlData.publicUrl;

  // 2. Call edge function.
  const body: ScreenshotVerifyPayload = {
    platform: payload.platform,
    handle: payload.handle,
    screenshot_url: screenshotUrl,
    claimed_followers: payload.claimed_followers,
    claimed_avg_views: payload.claimed_avg_views,
    claimed_avg_likes: payload.claimed_avg_likes,
  };
  const { error: fnError } = await supabase.functions.invoke('social-verify-screenshot', { body });
  if (fnError) throw new Error(fnError.message);

  // 3. Mark DB row pending so the profile can reflect it immediately.
  await supabase
    .from('creator_social_accounts')
    .update({ verification_status: 'pending_screenshot' })
    .eq('creator_id', creatorId)
    .eq('platform', payload.platform)
    .eq('handle', payload.handle.replace(/^@/, ''));
}

// ─── Profile View Tracking ─────────────────────────────────────────────────

export async function trackProfileView(
  targetId: string,
  viewerId: string | null,
): Promise<void> {
  if (!targetId) return;
  try {
    await supabase
      .from('profile_views')
      .insert({ target_id: targetId, viewer_id: viewerId });
  } catch (err) {
    devWarn('trackProfileView failed', err);
  }
}

// ─── Boosts ────────────────────────────────────────────────────────────────

function mapBoost(row: any): Boost {
  return {
    id: row.id,
    listing_id: row.listing_id,
    business_id: row.business_id,
    tier: row.tier,
    status: row.status as BoostStatus,
    amount_cents: row.amount_cents ?? 0,
    currency: row.currency ?? 'gbp',
    stripe_payment_intent_id: row.stripe_payment_intent_id ?? null,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    listing: row.listings ? mapListing(row.listings) : undefined,
  };
}

/**
 * Create a boost for a listing. Calls `create-payment-intent` edge function
 * with `boost_id` in metadata so the webhook can activate the boost on payment.
 */
export async function createBoost(
  listingId: string,
  businessId: string,
  tier: BoostTierKey,
): Promise<{ boost: Boost; clientSecret: string } | null> {
  const tierConfig = BOOST_TIERS[tier];
  if (!tierConfig) {
    logError('createBoost', `Invalid tier: ${tier}`);
    return null;
  }

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + tierConfig.durationDays);

  // Insert the boost row with pending status
  const { data: boostRow, error: insertError } = await supabase
    .from('boosts')
    .insert({
      listing_id: listingId,
      business_id: businessId,
      tier,
      status: 'pending' as BoostStatus,
      amount_cents: tierConfig.priceGBP,
      currency: 'gbp',
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select('*')
    .single();

  if (insertError || !boostRow) {
    logError('createBoost insert', insertError);
    toast.error('Failed to create boost. Please try again.');
    return null;
  }

  const boost = mapBoost(boostRow);

  // Call create-payment-intent with boost metadata
  const { data, error: fnError } = await supabase.functions.invoke(
    'create-payment-intent',
    {
      body: {
        amount_cents: tierConfig.priceGBP,
        boost_id: boost.id,
        metadata: {
          boost_id: boost.id,
          boost_tier: tier,
          listing_id: listingId,
        },
      },
    },
  );

  if (fnError || !data?.client_secret) {
    logError('createBoost payment intent', fnError);
    toast.error('Failed to start payment. Please try again.');
    // Clean up orphan boost
    await supabase.from('boosts').delete().eq('id', boost.id);
    return null;
  }

  // Store the payment intent ID on the boost
  await supabase
    .from('boosts')
    .update({ stripe_payment_intent_id: data.payment_intent_id })
    .eq('id', boost.id);

  boost.stripe_payment_intent_id = data.payment_intent_id;

  return { boost, clientSecret: data.client_secret };
}

/**
 * Get all currently active boosts (status = 'active' and ends_at > now).
 * Optionally filter by business.
 */
export async function getActiveBoosts(
  businessId?: string,
): Promise<Boost[]> {
  let query = supabase
    .from('boosts')
    .select('*, listings!inner(*, business_profiles(*, users(*)))')
    .eq('status', 'active')
    .gt('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: true });

  if (businessId) {
    query = query.eq('business_id', businessId);
  }

  const { data, error } = await query;

  if (error) {
    logError('getActiveBoosts', error);
    return [];
  }

  return (data ?? []).map(mapBoost);
}

/**
 * List listing IDs that currently have an active boost, ordered by tier rank
 * (top > premium > standard) then by boost creation time.
 * Useful for the feed to surface boosted listings first.
 */
export async function listListingsWithBoost(): Promise<string[]> {
  const tierOrder: Record<string, number> = { top: 0, premium: 1, standard: 2 };

  const { data, error } = await supabase
    .from('boosts')
    .select('listing_id, tier')
    .eq('status', 'active')
    .gt('ends_at', new Date().toISOString());

  if (error) {
    logError('listListingsWithBoost', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Deduplicate — keep highest tier per listing
  const bestTier = new Map<string, string>();
  for (const row of data) {
    const existing = bestTier.get(row.listing_id);
    if (!existing || (tierOrder[row.tier] ?? 9) < (tierOrder[existing] ?? 9)) {
      bestTier.set(row.listing_id, row.tier);
    }
  }

  // Sort by tier rank
  return [...bestTier.entries()]
    .sort((a, b) => (tierOrder[a[1]] ?? 9) - (tierOrder[b[1]] ?? 9))
    .map(([listingId]) => listingId);
}
