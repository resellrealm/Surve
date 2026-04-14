import { supabase } from './supabase';
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
} from '../types';

// Fallback to curated demo content when the DB is empty (dev + screenshots).
// Flip off for production to always hit the real DB.
const USE_MOCK_FALLBACK =
  (process.env.EXPO_PUBLIC_USE_MOCK_FALLBACK ?? 'true') !== 'false';

const preferMock = <T,>(real: T[], fallback: T[]): T[] =>
  USE_MOCK_FALLBACK && real.length === 0 ? fallback : real;

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email ?? '',
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    role: row.role as UserRole,
    onboarding_completed_at: row.onboarding_completed_at ?? null,
    email_verified_at: row.email_verified_at ?? null,
    accepted_terms_at: row.accepted_terms_at ?? null,
    terms_version: row.terms_version ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapCreator(row: any): Creator {
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
    created_at: row.created_at,
  };
}

function mapBusiness(row: any): Business {
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
    rating: Number(row.rating ?? 0),
    total_reviews: row.total_reviews ?? 0,
    total_listings: row.total_listings ?? 0,
    verified: row.verified ?? false,
    created_at: row.created_at,
  };
}

function mapListing(row: any): Listing {
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
    status: row.status as ListingStatus,
    applicants_count: row.applicants_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapBooking(row: any): Booking {
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

function mapConversation(row: any, currentUserId: string): Conversation {
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

function mapMessage(row: any): Message {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    text: row.text,
    read: row.read ?? false,
    created_at: row.created_at,
  };
}

function mapReview(row: any): Review {
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
    console.error('signUp error:', error?.message);
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
    console.error('resendVerificationEmail error:', error.message);
    return false;
  }
  return true;
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
    console.error('signIn error:', error?.message);
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
  const { data, error } = await supabase
    .from('listings')
    .select('*, businesses(*, users(*))')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getListings error:', error.message);
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
}

export async function getListing(id: string): Promise<Listing | null> {
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
    console.error('createListing error:', error?.message);
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
    console.error('applyToListing error:', error.message);
    return false;
  }
  // Trigger `trg_app_count_ins` handles applicants_count — don't race it here.
  return true;
}

// ─── Creators ───────────────────────────────────────────────────────────────

export async function getCreators(): Promise<Creator[]> {
  const { data, error } = await supabase
    .from('creators')
    .select('*, users(*)')
    .order('rating', { ascending: false });

  if (error) {
    console.error('getCreators error:', error.message);
    return USE_MOCK_FALLBACK ? mock.mockCreators : [];
  }

  const real = (data ?? []).map((row: any) => {
    row.user = row.users;
    return mapCreator(row);
  });

  return preferMock(real, mock.mockCreators);
}

export async function getCreatorProfile(
  userId: string
): Promise<Creator | null> {
  const { data, error } = await supabase
    .from('creators')
    .select('*, users(*)')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    if (USE_MOCK_FALLBACK) {
      return (
        mock.mockCreators.find((c) => c.id === userId || c.user_id === userId) ??
        mock.mockCreators[0] ??
        null
      );
    }
    return null;
  }

  (data as any).user = (data as any).users;
  return mapCreator(data);
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
    console.error('updateCreatorProfile error:', error?.message);
    return null;
  }

  (data as any).user = (data as any).users;
  return mapCreator(data);
}

// ─── Businesses ─────────────────────────────────────────────────────────────

export async function getBusinessProfile(
  userId: string
): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*, users(*)')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  (data as any).user = (data as any).users;
  return mapBusiness(data);
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
    console.error('updateBusinessProfile error:', error?.message);
    return null;
  }

  (data as any).user = (data as any).users;
  return mapBusiness(data);
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export async function getBookings(userId: string): Promise<Booking[]> {
  // Get bookings where user is either the creator or business
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
    console.error('getBookings error:', error.message);
    return USE_MOCK_FALLBACK ? mock.mockBookings : [];
  }

  const real = (data ?? []).map((row: any) => {
    // Flatten nested users
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
    console.error('createBooking error:', error?.message);
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
    console.error('updateBooking error:', error.message);
    return false;
  }
  return true;
}

// ─── Messages ───────────────────────────────────────────────────────────────

export async function getConversations(
  userId: string
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .contains('participant_ids', [userId])
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('getConversations error:', error.message);
    return USE_MOCK_FALLBACK ? mock.mockConversations : [];
  }

  if (USE_MOCK_FALLBACK && (!data || data.length === 0)) {
    return mock.mockConversations;
  }

  // For each conversation, resolve the other participant's info
  const conversations: Conversation[] = [];
  for (const row of data ?? []) {
    const otherIds = (row.participant_ids ?? []).filter(
      (pid: string) => pid !== userId
    );
    const otherId = otherIds[0];

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

    // Count unread messages
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
      unread_count: 0, // Simplified - real app would track read receipts
      listing_title: null,
    });
  }

  return conversations;
}

export async function getMessages(
  conversationId: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getMessages error:', error.message);
    return USE_MOCK_FALLBACK ? mock.mockMessages[conversationId] ?? [] : [];
  }

  const real = (data ?? []).map(mapMessage);
  if (USE_MOCK_FALLBACK && real.length === 0) {
    return mock.mockMessages[conversationId] ?? [];
  }
  return real;
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      text: content,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('sendMessage error:', error?.message);
    return null;
  }
  // Trigger `trg_conv_last_msg` syncs conversation.last_message + updated_at.
  return mapMessage(data);
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export async function getReviews(targetUserId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('target_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getReviews error:', error.message);
    return USE_MOCK_FALLBACK ? mock.mockReviews.filter((r) => r.target_id === targetUserId) : [];
  }

  // Resolve reviewer names
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
}

export async function createReview(review: {
  reviewer_id: string;
  target_id: string;
  rating: number;
  comment: string;
}): Promise<boolean> {
  const { error } = await supabase.from('reviews').insert(review);

  if (error) {
    console.error('createReview error:', error.message);
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
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('getNotifications error:', error.message);
    return [];
  }
  return (data ?? []).map(mapNotification);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) return 0;
  return count ?? 0;
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
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getPaymentMethods error:', error.message);
    return [];
  }
  return (data ?? []).map(mapPaymentMethod);
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
    console.error('addPaymentMethod error:', error?.message);
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
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('getTransactions error:', error.message);
    return [];
  }
  return (data ?? []).map(mapTransaction);
}

export async function getEarningsSummary(userId: string): Promise<{
  total_cents: number;
  pending_cents: number;
  this_month_cents: number;
}> {
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
  // Find conversations the user is in, then count messages from others after last_read_at.
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
    console.error('startConversation error:', error?.message);
    return null;
  }
  return mapConversation(data, userIdA);
}

// ─── Realtime subscriptions ─────────────────────────────────────────────────
// Return an unsubscribe function. Keep channel names unique so reruns don't stack.

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
    console.error(`upload ${bucket} error:`, error.message);
    return null;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
