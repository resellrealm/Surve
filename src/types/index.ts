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
  username?: string | null;
  bio?: string | null;
  location?: string | null;
  avatar_url: string | null;
  avatar_blurhash?: string | null;
  role: UserRole;
  onboarding_completed_at: string | null;
  email_verified_at: string | null;
  phone?: string | null;
  phone_verified_at?: string | null;
  accepted_terms_at: string | null;
  terms_version: string | null;
  show_reviews_publicly?: boolean;
  milestones: UserMilestones;
  created_at: string;
  updated_at: string;
}

export type MilestoneKey = 'first_booking_confirmed' | 'first_review_left' | 'first_payout_received';

export interface UserMilestones {
  first_booking_confirmed?: string;
  first_review_left?: string;
  first_payout_received?: string;
}

// ─── Creator Social Account ─────────────────────────────────────────────────

export type SocialPlatform = 'tiktok' | 'instagram' | 'youtube' | 'twitter';

export interface CreatorSocialAccount {
  id: string;
  creator_id: string;
  platform: SocialPlatform;
  handle: string;
  verified: boolean;
  followers: number | null;
  avg_views: number | null;
  avg_likes: number | null;
  avg_comments: number | null;
  engagement_rate: number | null;
  verified_at: string | null;
  last_synced_at: string | null;
  verification_code: string | null;
  /** Set when a screenshot has been submitted for manual review. */
  verification_status: 'pending_screenshot' | 'approved' | 'rejected' | null;
  created_at: string;
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
  cover_photo_url?: string | null;
  niches?: string[] | null;
  languages?: string[] | null;
  intro_video_url?: string | null;
  response_time_hours?: number | null;
  completion_rate?: number | null;
  highlight_metrics?: Record<string, unknown> | null;
  show_rates_publicly?: boolean;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | null;
  social_accounts?: CreatorSocialAccount[];
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
  image_blurhash?: string | null;
  rating: number;
  total_reviews: number;
  total_listings: number;
  verified: boolean;
  created_at: string;
  logo_url?: string | null;
  cover_url?: string | null;
  brand_story?: string | null;
  values?: string[] | null;
  cuisine_tags?: string[] | null;
  category_tags?: string[] | null;
  social_handles?: Record<string, string> | null;
  website_url?: string | null;
  press_kit_url?: string | null;
  locations?: Array<{ name: string; address: string; lat: number; lng: number }> | null;
  past_creator_collabs?: Array<Record<string, unknown>> | null;
  founded_year?: number | null;
  employee_count_range?: string | null;
}

// ─── Location ───────────────────────────────────────────────────────────────

export type VenueType = 'hotel' | 'restaurant' | 'bar' | 'cafe' | 'resort' | 'spa' | 'other';

export interface Location {
  id: string;
  business_id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  country_code: string;
  lat: number | null;
  lng: number | null;
  venue_type: VenueType | null;
  is_primary: boolean;
  created_at: string;
}

// ─── Listing ─────────────────────────────────────────────────────────────────

export type ListingStatus = 'active' | 'paused' | 'closed' | 'draft';
export type ListingType = 'collab' | 'paid' | 'gifted' | 'exchange';
export type CompType = 'paid' | 'comped_stay' | 'comped_meal' | 'product' | 'mixed';
export type ContentRights = 'creator_owns' | 'shared' | 'business_owns' | 'licensed';
export type DurationType = 'single_day' | 'multi_day' | 'ongoing' | 'flexible';

export interface Deliverable {
  type: string;
  count: number;
  platform?: string;
  notes?: string;
}

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
  image_blurhash?: string | null;
  gallery_images?: string[] | null;
  status: ListingStatus;
  applicants_count: number;
  listing_type?: ListingType | null;
  comp_type?: CompType | null;
  deliverables?: Deliverable[] | null;
  content_rights?: ContentRights | null;
  required_hashtags?: string[] | null;
  date_window_start?: string | null;
  date_window_end?: string | null;
  duration_type?: DurationType | null;
  max_applicants?: number | null;
  brand_guidelines?: string | null;
  location_id?: string | null;
  location_detail?: Location | null;
  is_boosted?: boolean;
  boost_tier?: 'standard' | 'premium' | 'top';
  inspiration_links?: string[] | null;
  created_at: string;
  updated_at: string;
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'accepted' | 'active' | 'in_progress' | 'proof_submitted' | 'completed' | 'disputed' | 'cancelled' | 'refunded';

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
  refund_status?: 'requested' | 'processing' | 'refunded' | 'failed' | 'rejected' | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  refund_requested_at?: string | null;
  refunded_at?: string | null;
  stripe_refund_id?: string | null;
}

// ─── Message ─────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  read: boolean;
  reactions: Record<string, string[]>;
  moderation_flags: ModerationFlag[];
  created_at: string;
}

export type ModerationFlag =
  | { kind: 'profanity'; match: string }
  | { kind: 'phone_number'; match: string }
  | { kind: 'email'; match: string }
  | { kind: 'off_platform'; match: string };

// ─── Conversation ────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  participant_ids: string[];
  participant_name: string;
  participant_avatar: string | null;
  participant_role: UserRole;
  participant_verified?: boolean;
  participant_verified_at?: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  listing_title: string | null;
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  reviewer_id: string;
  reply_text?: string | null;
  replied_at?: string | null;
  replied_by?: string | null;
  reply_name?: string | null;
  reviewer_name: string;
  reviewer_avatar: string | null;
  target_id: string;
  rating: number;
  comment: string;
  created_at: string;
  tags?: string[] | null;
  is_public?: boolean | null;
  photos?: string[] | null;
  verified_booking_id?: string | null;
  reviewer_role?: 'creator' | 'business' | null;
  reviewer_verified?: boolean;
  reviewer_verified_at?: string | null;
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

export interface CreatorFilters {
  category: Category | 'all';
  followersMin: number | null;
  followersMax: number | null;
  engagementMin: number | null;
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

// ─── Fraud Flag ─────────────────────────────────────────────────────────────

export type FraudFlagType =
  | 'chargeback'
  | 'chargeback_updated'
  | 'chargeback_won'
  | 'chargeback_lost'
  | 'high_amount'
  | 'velocity'
  | 'new_account'
  | 'mismatched_country';

export type FraudFlagSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FraudFlagStatus = 'pending_review' | 'reviewing' | 'resolved_safe' | 'resolved_fraud' | 'auto_dismissed';

export interface FraudFlag {
  id: string;
  booking_id: string | null;
  user_id: string | null;
  stripe_dispute_id: string | null;
  stripe_payment_intent_id: string | null;
  flag_type: FraudFlagType;
  risk_score: number;
  severity: FraudFlagSeverity;
  status: FraudFlagStatus;
  reason: string;
  details: Record<string, unknown>;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Application ─────────────────────────────────────────────────────────────

// ─── Creator Analytics ──────────────────────────────────────────────────────

export interface CreatorAnalytics {
  profile_views: number;
  listing_clicks: number;
  applications_count: number;
  profile_views_delta: number;
  listing_clicks_delta: number;
  applications_delta: number;
  period_start: string;
  period_end: string;
}

// ─── Listing Analytics ──────────────────────────────────────────────────────

export interface ListingAnalyticsPoint {
  date: string;
  views: number;
  clicks: number;
  applications: number;
}

export interface ListingAnalyticsSummary {
  total_views: number;
  total_clicks: number;
  total_applications: number;
  views_delta: number;
  clicks_delta: number;
  applications_delta: number;
  daily: ListingAnalyticsPoint[];
}

// ─── Application ─────────────────────────────────────────────────────────────

// ─── User Stats ─────────────────────────────────────────────────────────────

export interface UserStats {
  total_bookings: number;
  total_earnings: number;
  avg_rating: number;
  response_time: number;
}

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

// ─── Boost ──────────────────────────────────────────────────────────────────

export type BoostStatus = 'pending' | 'active' | 'expired' | 'cancelled';

export interface Boost {
  id: string;
  listing_id: string;
  business_id: string;
  tier: 'standard' | 'premium' | 'top';
  status: BoostStatus;
  amount_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
  listing?: Listing;
}

export interface Application {
  id: string;
  listing_id: string;
  creator_id: string;
  message: string;
  status: ApplicationStatus;
  proposed_deliverables: Record<string, unknown>;
  fit_score?: number | null;
  source?: 'invite' | 'application';
  created_at: string;
  updated_at: string;
  creator?: Creator;
  listing?: Listing;
}

export type InviteStatus = 'pending' | 'accepted' | 'declined';

export interface Invite {
  id: string;
  listing_id: string;
  creator_id: string;
  business_id: string;
  message: string;
  status: InviteStatus;
  created_at: string;
  updated_at: string;
  listing?: Listing;
  business?: Business;
}
