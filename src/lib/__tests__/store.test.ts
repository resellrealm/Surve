jest.mock('../supabase', () => ({ supabase: {} }));
jest.mock('../moderation', () => ({ moderateText: jest.fn() }));
jest.mock('../api', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  getListings: jest.fn(),
  getBookings: jest.fn(),
  getConversations: jest.fn(),
  getAssuranceLevel: jest.fn(),
  listMfaFactors: jest.fn(),
}));

import { useStore, type AppStore } from '../store';
import type { Listing, Booking, Conversation, User, Session } from '../../types';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  email: 'test@test.com',
  full_name: 'Test',
  avatar_url: null,
  role: 'creator',
  onboarding_completed_at: null,
  email_verified_at: null,
  accepted_terms_at: null,
  terms_version: null,
  milestones: {},
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...overrides,
});

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  access_token: 'tok',
  refresh_token: 'ref',
  expires_at: 999999,
  user: makeUser(),
  ...overrides,
});

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 'l1',
  business_id: 'b1',
  business: {} as any,
  title: 'Test Listing',
  description: '',
  platform: 'instagram',
  category: 'hotel',
  pay_min: 100,
  pay_max: 500,
  content_type: 'reel',
  min_followers: 0,
  min_engagement_rate: 0,
  deadline: '2026-06-01',
  location: '',
  image_url: '',
  status: 'active',
  applicants_count: 0,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...overrides,
});

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'bk1',
  listing_id: 'l1',
  listing: {} as any,
  creator_id: 'c1',
  creator: {} as any,
  business_id: 'b1',
  business: {} as any,
  status: 'pending',
  pay_agreed: 300,
  notes: null,
  deadline: '2026-06-01',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  completed_at: null,
  proof_url: null,
  proof_screenshots: null,
  proof_note: null,
  proof_submitted_at: null,
  auto_approve_at: null,
  ...overrides,
});

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv1',
  participant_ids: ['u1', 'u2'],
  participant_name: 'Other',
  participant_avatar: null,
  participant_role: 'business',
  last_message: 'Hi',
  last_message_at: '2026-01-01',
  unread_count: 0,
  listing_title: null,
  ...overrides,
});

function resetStore() {
  useStore.setState({
    user: null,
    session: null,
    loading: true,
    initialized: false,
    lastActivityAt: Date.now(),
    listings: [],
    selectedListing: null,
    filters: {
      platform: 'all',
      category: 'all',
      pay_min: null,
      pay_max: null,
      sort_by: 'newest',
      search_query: '',
    },
    listingsLoading: false,
    listingsError: null,
    bookings: [],
    bookingsLoading: false,
    bookingsError: null,
    conversations: [],
    messagesLoading: false,
    messagesError: null,
    businessDraft: {
      business_name: '',
      category: '',
      location: '',
      hours: {},
      description: '',
      website: '',
      phone: '',
      coverPhotoUri: '',
      galleryUris: [],
    },
    creatorDraft: {
      full_name: '',
      bio: '',
      location: '',
      instagram_handle: '',
      tiktok_handle: '',
      instagram_followers: '',
      tiktok_followers: '',
      engagement_rate: '',
      avg_views: '',
      categories: [],
      portfolio_uris: [],
    },
    onboardingRole: null,
    themePreference: 'system',
  });
}

beforeEach(resetStore);

// ─── Auth Slice ──────────────────────────────────────────────────────────────

describe('Auth slice', () => {
  it('login sets user, session, loading=false', () => {
    const session = makeSession();
    useStore.getState().login(session);
    const s = useStore.getState();
    expect(s.user).toEqual(session.user);
    expect(s.session).toEqual(session);
    expect(s.loading).toBe(false);
  });

  it('logout clears auth and related state', () => {
    useStore.getState().login(makeSession());
    useStore.getState().setBookings([makeBooking()]);
    useStore.getState().setConversations([makeConversation()]);
    useStore.getState().logout();
    const s = useStore.getState();
    expect(s.user).toBeNull();
    expect(s.session).toBeNull();
    expect(s.bookings).toEqual([]);
    expect(s.conversations).toEqual([]);
  });

  it('setUser / setSession update individually', () => {
    const user = makeUser({ id: 'u99' });
    useStore.getState().setUser(user);
    expect(useStore.getState().user?.id).toBe('u99');

    const session = makeSession();
    useStore.getState().setSession(session);
    expect(useStore.getState().session).toEqual(session);
  });

  it('touchActivity updates lastActivityAt', () => {
    const before = useStore.getState().lastActivityAt;
    useStore.getState().touchActivity();
    expect(useStore.getState().lastActivityAt).toBeGreaterThanOrEqual(before);
  });

  it('loginAsDemo populates listings, bookings, conversations', () => {
    useStore.getState().loginAsDemo('creator');
    const s = useStore.getState();
    expect(s.user).not.toBeNull();
    expect(s.session).not.toBeNull();
    expect(s.initialized).toBe(true);
    expect(s.loading).toBe(false);
    expect(s.listings.length).toBeGreaterThan(0);
    expect(s.bookings.length).toBeGreaterThan(0);
    expect(s.conversations.length).toBeGreaterThan(0);
  });
});

// ─── Listings Slice ──────────────────────────────────────────────────────────

describe('Listings slice', () => {
  it('setListings replaces listings', () => {
    const listings = [makeListing({ id: 'l1' }), makeListing({ id: 'l2' })];
    useStore.getState().setListings(listings);
    expect(useStore.getState().listings).toHaveLength(2);
  });

  it('addListing prepends', () => {
    useStore.getState().setListings([makeListing({ id: 'l1' })]);
    useStore.getState().addListing(makeListing({ id: 'l2' }));
    expect(useStore.getState().listings[0].id).toBe('l2');
    expect(useStore.getState().listings).toHaveLength(2);
  });

  it('updateListing merges updates', () => {
    useStore.getState().setListings([makeListing({ id: 'l1', title: 'Old' })]);
    useStore.getState().updateListing('l1', { title: 'New' });
    expect(useStore.getState().listings[0].title).toBe('New');
  });

  it('updateListing also updates selectedListing if matching', () => {
    const listing = makeListing({ id: 'l1', title: 'Old' });
    useStore.getState().setListings([listing]);
    useStore.getState().setSelectedListing(listing);
    useStore.getState().updateListing('l1', { title: 'New' });
    expect(useStore.getState().selectedListing?.title).toBe('New');
  });

  it('removeListing removes by id', () => {
    useStore.getState().setListings([makeListing({ id: 'l1' }), makeListing({ id: 'l2' })]);
    useStore.getState().removeListing('l1');
    expect(useStore.getState().listings).toHaveLength(1);
    expect(useStore.getState().listings[0].id).toBe('l2');
  });

  it('removeListing clears selectedListing if matching', () => {
    const listing = makeListing({ id: 'l1' });
    useStore.getState().setListings([listing]);
    useStore.getState().setSelectedListing(listing);
    useStore.getState().removeListing('l1');
    expect(useStore.getState().selectedListing).toBeNull();
  });

  it('setFilters merges partial filters', () => {
    useStore.getState().setFilters({ category: 'bar', pay_min: 50 });
    const f = useStore.getState().filters;
    expect(f.category).toBe('bar');
    expect(f.pay_min).toBe(50);
    expect(f.platform).toBe('all');
  });

  it('resetFilters restores defaults', () => {
    useStore.getState().setFilters({ category: 'bar', pay_min: 50 });
    useStore.getState().resetFilters();
    const f = useStore.getState().filters;
    expect(f.category).toBe('all');
    expect(f.pay_min).toBeNull();
  });

  it('fetchListings calls api and sets listings', async () => {
    const api = require('../api');
    const listings = [makeListing({ id: 'l1' })];
    (api.getListings as jest.Mock).mockResolvedValue(listings);
    await useStore.getState().fetchListings();
    expect(useStore.getState().listings).toEqual(listings);
    expect(useStore.getState().listingsLoading).toBe(false);
  });

  it('fetchListings sets error on failure', async () => {
    const api = require('../api');
    (api.getListings as jest.Mock).mockRejectedValue(new Error('Network fail'));
    await useStore.getState().fetchListings();
    expect(useStore.getState().listingsError).toBe('Network fail');
    expect(useStore.getState().listingsLoading).toBe(false);
  });
});

// ─── Bookings Slice ──────────────────────────────────────────────────────────

describe('Bookings slice', () => {
  it('addBooking prepends', () => {
    useStore.getState().setBookings([makeBooking({ id: 'bk1' })]);
    useStore.getState().addBooking(makeBooking({ id: 'bk2' }));
    expect(useStore.getState().bookings[0].id).toBe('bk2');
  });

  it('updateBooking merges updates', () => {
    useStore.getState().setBookings([makeBooking({ id: 'bk1', status: 'pending' })]);
    useStore.getState().updateBooking('bk1', { status: 'active' });
    expect(useStore.getState().bookings[0].status).toBe('active');
  });

  it('removeBooking removes by id', () => {
    useStore.getState().setBookings([makeBooking({ id: 'bk1' }), makeBooking({ id: 'bk2' })]);
    useStore.getState().removeBooking('bk1');
    expect(useStore.getState().bookings).toHaveLength(1);
  });

  it('getBookingsByStatus filters correctly', () => {
    useStore.getState().setBookings([
      makeBooking({ id: 'bk1', status: 'pending' }),
      makeBooking({ id: 'bk2', status: 'active' }),
      makeBooking({ id: 'bk3', status: 'pending' }),
    ]);
    const pending = useStore.getState().getBookingsByStatus('pending');
    expect(pending).toHaveLength(2);
    expect(pending.every((b) => b.status === 'pending')).toBe(true);
  });

  it('fetchBookings requires a logged-in user', async () => {
    await useStore.getState().fetchBookings();
    expect(useStore.getState().bookings).toEqual([]);
  });

  it('fetchBookings calls api when user exists', async () => {
    const api = require('../api');
    useStore.getState().login(makeSession());
    const bookings = [makeBooking()];
    (api.getBookings as jest.Mock).mockResolvedValue(bookings);
    await useStore.getState().fetchBookings();
    expect(useStore.getState().bookings).toEqual(bookings);
  });
});

// ─── Messages Slice ──────────────────────────────────────────────────────────

describe('Messages slice', () => {
  it('setConversations replaces conversations', () => {
    useStore.getState().setConversations([makeConversation({ id: 'c1' }), makeConversation({ id: 'c2' })]);
    expect(useStore.getState().conversations).toHaveLength(2);
  });

  it('updateConversation merges', () => {
    useStore.getState().setConversations([makeConversation({ id: 'c1', last_message: 'old' })]);
    useStore.getState().updateConversation('c1', { last_message: 'new' });
    expect(useStore.getState().conversations[0].last_message).toBe('new');
  });

  it('getUnreadCount sums across conversations', () => {
    useStore.getState().setConversations([
      makeConversation({ id: 'c1', unread_count: 3 }),
      makeConversation({ id: 'c2', unread_count: 5 }),
    ]);
    expect(useStore.getState().getUnreadCount()).toBe(8);
  });

  it('getUnreadCount returns 0 when empty', () => {
    expect(useStore.getState().getUnreadCount()).toBe(0);
  });
});

// ─── Onboarding Slice ────────────────────────────────────────────────────────

describe('Onboarding slice', () => {
  it('updateBusinessDraft merges partial updates', () => {
    useStore.getState().updateBusinessDraft({ business_name: 'My Hotel' });
    expect(useStore.getState().businessDraft.business_name).toBe('My Hotel');
  });

  it('clearBusinessDraft resets', () => {
    useStore.getState().updateBusinessDraft({ business_name: 'My Hotel' });
    useStore.getState().clearBusinessDraft();
    expect(useStore.getState().businessDraft.business_name).toBe('');
  });

  it('updateCreatorDraft merges partial updates', () => {
    useStore.getState().updateCreatorDraft({ full_name: 'Jane', categories: ['hotel'] });
    expect(useStore.getState().creatorDraft.full_name).toBe('Jane');
    expect(useStore.getState().creatorDraft.categories).toEqual(['hotel']);
  });

  it('clearCreatorDraft resets', () => {
    useStore.getState().updateCreatorDraft({ full_name: 'Jane' });
    useStore.getState().clearCreatorDraft();
    expect(useStore.getState().creatorDraft.full_name).toBe('');
  });

  it('setOnboardingRole sets role', () => {
    useStore.getState().setOnboardingRole('creator');
    expect(useStore.getState().onboardingRole).toBe('creator');
    useStore.getState().setOnboardingRole(null);
    expect(useStore.getState().onboardingRole).toBeNull();
  });
});

// ─── UI Slice ────────────────────────────────────────────────────────────────

describe('UI slice', () => {
  it('setThemePreference updates preference', () => {
    useStore.getState().setThemePreference('dark');
    expect(useStore.getState().themePreference).toBe('dark');
    useStore.getState().setThemePreference('system');
    expect(useStore.getState().themePreference).toBe('system');
  });
});
