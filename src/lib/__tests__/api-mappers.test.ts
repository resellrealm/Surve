jest.mock('../supabase', () => ({ supabase: {} }));
jest.mock('../moderation', () => ({ moderateText: jest.fn() }));
jest.mock('../sentry', () => ({ captureError: jest.fn(), setSentryUser: jest.fn(), initSentry: jest.fn(), addNavigationBreadcrumb: jest.fn() }));
jest.mock('@sentry/react-native', () => ({ init: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn(), setUser: jest.fn(), addBreadcrumb: jest.fn() }));
jest.mock('../toast', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

import {
  mapUser,
  mapCreator,
  mapBusiness,
  mapListing,
  mapBooking,
  mapConversation,
  mapMessage,
  mapReview,
} from '../api';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const userRow = {
  id: 'u1',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: 'https://img.test/avatar.jpg',
  role: 'creator',
  onboarding_completed_at: '2026-01-01T00:00:00Z',
  email_verified_at: '2026-01-01T00:00:00Z',
  phone: '+1234567890',
  phone_verified_at: '2026-01-01T00:00:00Z',
  username: 'testuser',
  bio: 'Hello',
  location: 'NYC',
  accepted_terms_at: '2026-01-01T00:00:00Z',
  terms_version: 'v1.0.0',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const businessRow = {
  id: 'b1',
  user_id: 'u2',
  user: userRow,
  business_name: 'Test Hotel',
  category: 'hotel',
  description: 'Luxury hotel',
  location: 'LA',
  website: 'https://test.com',
  image_url: 'https://img.test/hotel.jpg',
  rating: 4.5,
  total_reviews: 10,
  total_listings: 3,
  verified: true,
  created_at: '2026-01-01T00:00:00Z',
};

const creatorRow = {
  id: 'c1',
  user_id: 'u1',
  user: userRow,
  bio: 'Content creator',
  instagram_handle: '@test',
  tiktok_handle: '@test',
  instagram_followers: 50000,
  tiktok_followers: 80000,
  engagement_rate: '4.5',
  avg_views: 10000,
  categories: ['hotel', 'restaurant'],
  portfolio_urls: ['https://img.test/1.jpg'],
  rating: 4.8,
  total_reviews: 5,
  total_bookings: 12,
  location: 'NYC',
  verified: true,
  stripe_account_id: 'acct_123',
  stripe_onboarding_complete: true,
  created_at: '2026-01-01T00:00:00Z',
};

const listingRow = {
  id: 'l1',
  business_id: 'b1',
  business_profiles: businessRow,
  title: 'Hotel Review',
  description: 'Review our hotel',
  platform: 'instagram',
  category: 'hotel',
  pay_min: 200,
  pay_max: 500,
  content_type: 'reel',
  min_followers: 1000,
  min_engagement_rate: '2.0',
  deadline: '2026-06-01',
  location: 'LA',
  image_url: 'https://img.test/listing.jpg',
  status: 'active',
  applicants_count: 5,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

// ─── mapUser ─────────────────────────────────────────────────────────────────

describe('mapUser', () => {
  it('maps a complete row', () => {
    const user = mapUser(userRow);
    expect(user).toEqual({
      id: 'u1',
      email: 'test@example.com',
      full_name: 'Test User',
      avatar_url: 'https://img.test/avatar.jpg',
      avatar_blurhash: null,
      role: 'creator',
      onboarding_completed_at: '2026-01-01T00:00:00Z',
      email_verified_at: '2026-01-01T00:00:00Z',
      phone: '+1234567890',
      phone_verified_at: '2026-01-01T00:00:00Z',
      username: 'testuser',
      bio: 'Hello',
      location: 'NYC',
      accepted_terms_at: '2026-01-01T00:00:00Z',
      terms_version: 'v1.0.0',
      milestones: {},
      show_reviews_publicly: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
  });

  it('defaults missing optional fields to null or empty string', () => {
    const user = mapUser({ id: 'u2', full_name: 'Min', avatar_url: null, role: 'business', created_at: 'x', updated_at: 'x' });
    expect(user.email).toBe('');
    expect(user.onboarding_completed_at).toBeNull();
    expect(user.email_verified_at).toBeNull();
    expect(user.phone).toBeNull();
    expect(user.phone_verified_at).toBeNull();
    expect(user.username).toBeNull();
    expect(user.bio).toBeNull();
    expect(user.location).toBeNull();
    expect(user.accepted_terms_at).toBeNull();
    expect(user.terms_version).toBeNull();
  });
});

// ─── mapCreator ──────────────────────────────────────────────────────────────

describe('mapCreator', () => {
  it('maps a complete row', () => {
    const creator = mapCreator(creatorRow);
    expect(creator.id).toBe('c1');
    expect(creator.user.id).toBe('u1');
    expect(creator.engagement_rate).toBe(4.5);
    expect(creator.categories).toEqual(['hotel', 'restaurant']);
    expect(creator.stripe_account_id).toBe('acct_123');
  });

  it('defaults missing numeric fields to 0', () => {
    const creator = mapCreator({ id: 'c2', user_id: 'u1', user: userRow, created_at: 'x' });
    expect(creator.instagram_followers).toBe(0);
    expect(creator.tiktok_followers).toBe(0);
    expect(creator.engagement_rate).toBe(0);
    expect(creator.avg_views).toBe(0);
    expect(creator.rating).toBe(0);
    expect(creator.total_reviews).toBe(0);
    expect(creator.total_bookings).toBe(0);
  });

  it('falls back to row.users if row.user is missing', () => {
    const row = { ...creatorRow, user: undefined, users: userRow };
    const creator = mapCreator(row);
    expect(creator.user.id).toBe('u1');
  });
});

// ─── mapBusiness ─────────────────────────────────────────────────────────────

describe('mapBusiness', () => {
  it('maps a complete row', () => {
    const biz = mapBusiness(businessRow);
    expect(biz.id).toBe('b1');
    expect(biz.business_name).toBe('Test Hotel');
    expect(biz.rating).toBe(4.5);
    expect(biz.verified).toBe(true);
  });

  it('defaults missing fields', () => {
    const biz = mapBusiness({ id: 'b2', user_id: 'u1', user: userRow, created_at: 'x' });
    expect(biz.business_name).toBe('');
    expect(biz.description).toBe('');
    expect(biz.location).toBe('');
    expect(biz.image_url).toBe('');
    expect(biz.rating).toBe(0);
    expect(biz.total_reviews).toBe(0);
    expect(biz.total_listings).toBe(0);
    expect(biz.verified).toBe(false);
  });
});

// ─── mapListing ──────────────────────────────────────────────────────────────

describe('mapListing', () => {
  it('maps a complete row', () => {
    const listing = mapListing(listingRow);
    expect(listing.id).toBe('l1');
    expect(listing.title).toBe('Hotel Review');
    expect(listing.business.id).toBe('b1');
    expect(listing.pay_min).toBe(200);
    expect(listing.pay_max).toBe(500);
    expect(listing.min_engagement_rate).toBe(2.0);
    expect(listing.status).toBe('active');
  });

  it('defaults missing numeric/string fields', () => {
    const listing = mapListing({
      id: 'l2',
      business_id: 'b1',
      title: 'X',
      platform: 'tiktok',
      category: 'bar',
      deadline: 'x',
      status: 'draft',
      created_at: 'x',
      updated_at: 'x',
    });
    expect(listing.pay_min).toBe(0);
    expect(listing.pay_max).toBe(0);
    expect(listing.description).toBe('');
    expect(listing.content_type).toBe('');
    expect(listing.min_followers).toBe(0);
    expect(listing.min_engagement_rate).toBe(0);
    expect(listing.location).toBe('');
    expect(listing.image_url).toBe('');
    expect(listing.applicants_count).toBe(0);
  });
});

// ─── mapBooking ──────────────────────────────────────────────────────────────

describe('mapBooking', () => {
  it('maps a complete row', () => {
    const booking = mapBooking({
      id: 'bk1',
      listing_id: 'l1',
      listings: listingRow,
      creator_id: 'c1',
      creator_profiles: creatorRow,
      business_id: 'b1',
      business_profiles: businessRow,
      status: 'active',
      pay_agreed: 350,
      notes: 'Great',
      deadline: '2026-06-01',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      completed_at: null,
      proof_url: 'https://proof.test',
      proof_screenshots: ['https://s1.test'],
      proof_note: 'Done',
      proof_submitted_at: '2026-05-01T00:00:00Z',
      auto_approve_at: '2026-05-05T00:00:00Z',
    });
    expect(booking.id).toBe('bk1');
    expect(booking.status).toBe('active');
    expect(booking.pay_agreed).toBe(350);
    expect(booking.listing.id).toBe('l1');
    expect(booking.creator.id).toBe('c1');
    expect(booking.business.id).toBe('b1');
    expect(booking.proof_url).toBe('https://proof.test');
  });

  it('defaults missing proof fields to null', () => {
    const booking = mapBooking({
      id: 'bk2',
      listing_id: 'l1',
      creator_id: 'c1',
      business_id: 'b1',
      status: 'pending',
      deadline: 'x',
      created_at: 'x',
      updated_at: 'x',
    });
    expect(booking.proof_url).toBeNull();
    expect(booking.proof_screenshots).toBeNull();
    expect(booking.proof_note).toBeNull();
    expect(booking.proof_submitted_at).toBeNull();
    expect(booking.auto_approve_at).toBeNull();
    expect(booking.pay_agreed).toBe(0);
  });
});

// ─── mapConversation ─────────────────────────────────────────────────────────

describe('mapConversation', () => {
  it('maps a row with participant info', () => {
    const conv = mapConversation(
      {
        id: 'conv1',
        participant_ids: ['u1', 'u2'],
        _other_name: 'Other User',
        _other_avatar: 'https://img.test/other.jpg',
        _other_role: 'business',
        last_message: 'Hello!',
        updated_at: '2026-01-01T00:00:00Z',
        _unread_count: 3,
        _listing_title: 'Hotel Review',
      },
      'u1'
    );
    expect(conv.id).toBe('conv1');
    expect(conv.participant_name).toBe('Other User');
    expect(conv.participant_role).toBe('business');
    expect(conv.unread_count).toBe(3);
    expect(conv.listing_title).toBe('Hotel Review');
  });

  it('defaults missing fields', () => {
    const conv = mapConversation({ id: 'conv2', updated_at: 'x' }, 'u1');
    expect(conv.participant_ids).toEqual([]);
    expect(conv.participant_name).toBe('Unknown');
    expect(conv.participant_avatar).toBeNull();
    expect(conv.participant_role).toBe('creator');
    expect(conv.last_message).toBe('');
    expect(conv.unread_count).toBe(0);
    expect(conv.listing_title).toBeNull();
  });
});

// ─── mapMessage ──────────────────────────────────────────────────────────────

describe('mapMessage', () => {
  it('maps a complete message row', () => {
    const msg = mapMessage({
      id: 'm1',
      conversation_id: 'conv1',
      sender_id: 'u1',
      text: 'Hey',
      read: true,
      reactions: { '👍': ['u2'] },
      moderation_flags: [{ kind: 'profanity', match: 'test' }],
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(msg.id).toBe('m1');
    expect(msg.text).toBe('Hey');
    expect(msg.read).toBe(true);
    expect(msg.reactions).toEqual({ '👍': ['u2'] });
    expect(msg.moderation_flags).toHaveLength(1);
  });

  it('defaults read to false and reactions/flags to empty', () => {
    const msg = mapMessage({ id: 'm2', conversation_id: 'c', sender_id: 's', text: 'Hi', created_at: 'x' });
    expect(msg.read).toBe(false);
    expect(msg.reactions).toEqual({});
    expect(msg.moderation_flags).toEqual([]);
  });
});

// ─── mapReview ───────────────────────────────────────────────────────────────

describe('mapReview', () => {
  it('maps a complete review row', () => {
    const review = mapReview({
      id: 'r1',
      reviewer_id: 'u1',
      _reviewer_name: 'Test User',
      _reviewer_avatar: 'https://img.test/avatar.jpg',
      target_id: 'c1',
      rating: 5,
      comment: 'Excellent!',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(review.id).toBe('r1');
    expect(review.reviewer_name).toBe('Test User');
    expect(review.rating).toBe(5);
    expect(review.comment).toBe('Excellent!');
  });

  it('defaults reviewer info', () => {
    const review = mapReview({ id: 'r2', reviewer_id: 'u1', target_id: 'c1', rating: 3, created_at: 'x' });
    expect(review.reviewer_name).toBe('Unknown');
    expect(review.reviewer_avatar).toBeNull();
    expect(review.comment).toBe('');
  });
});
