// ─── Platform ────────────────────────────────────────────────────────────────

export type Platform = 'instagram' | 'tiktok' | 'both';

// ─── Category ────────────────────────────────────────────────────────────────

export type Category = 'hotel' | 'restaurant' | 'bar' | 'cafe' | 'resort' | 'spa';

// ─── User Role ───────────────────────────────────────────────────────────────

export type UserRole = 'creator' | 'business';

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  onboarding_completed_at: string | null;
  email_verified_at: string | null;
  accepted_terms_at: string | null;
  terms_version: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Creator ─────────────────────────────────────────────────────────────────

export interface Creator {
  id: string;
  user_id: string;
  user: User;
  bio: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  instagram_followers: number;
  tiktok_followers: number;
  engagement_rate: number;
  avg_views: number;
  categories: Category[];
  portfolio_urls: string[];
  rating: number;
  total_reviews: number;
  total_bookings: number;
  location: string;
  verified: boolean;
  created_at: string;
}

// ─── Business ────────────────────────────────────────────────────────────────

export interface Business {
  id: string;
  user_id: string;
  user: User;
  business_name: string;
  category: Category;
  description: string;
  location: string;
  website: string | null;
  image_url: string;
  rating: number;
  total_reviews: number;
  total_listings: number;
  verified: boolean;
  created_at: string;
}

// ─── Listing ─────────────────────────────────────────────────────────────────

export type ListingStatus = 'active' | 'paused' | 'closed' | 'draft';

export interface Listing {
  id: string;
  business_id: string;
  business: Business;
  title: string;
  description: string;
  platform: Platform;
  category: Category;
  pay_min: number;
  pay_max: number;
  content_type: string;
  min_followers: number;
  min_engagement_rate: number;
  deadline: string;
  location: string;
  image_url: string;
  status: ListingStatus;
  applicants_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'accepted' | 'active' | 'in_progress' | 'proof_submitted' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  listing_id: string;
  listing: Listing;
  creator_id: string;
  creator: Creator;
  business_id: string;
  business: Business;
  status: BookingStatus;
  pay_agreed: number;
  notes: string | null;
  deadline: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  proof_url: string | null;
  proof_screenshots: string[] | null;
  proof_note: string | null;
  proof_submitted_at: string | null;
  auto_approve_at: string | null;
}

// ─── Message ─────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  read: boolean;
  created_at: string;
}

// ─── Conversation ────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  participant_ids: string[];
  participant_name: string;
  participant_avatar: string | null;
  participant_role: UserRole;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  listing_title: string | null;
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
  target_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

// ─── Filter ──────────────────────────────────────────────────────────────────

export interface ListingFilters {
  platform: Platform | 'all';
  category: Category | 'all';
  pay_min: number | null;
  pay_max: number | null;
  sort_by: 'newest' | 'highest_pay' | 'closest';
  search_query: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

// ─── Notification ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'booking'
  | 'message'
  | 'application'
  | 'review'
  | 'payment'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// ─── Payment Method ──────────────────────────────────────────────────────────

export interface PaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

// ─── Transaction ─────────────────────────────────────────────────────────────

export type TransactionKind = 'payment' | 'payout' | 'platform_fee' | 'refund';
export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Transaction {
  id: string;
  booking_id: string | null;
  payer_id: string | null;
  payee_id: string | null;
  kind: TransactionKind;
  amount_cents: number;
  currency: string;
  status: TransactionStatus;
  stripe_payment_intent_id: string | null;
  description: string;
  created_at: string;
}

// ─── Application ─────────────────────────────────────────────────────────────

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface Application {
  id: string;
  listing_id: string;
  creator_id: string;
  message: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}
