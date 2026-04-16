import { create } from 'zustand';
import type {
  User,
  Session,
  Listing,
  Booking,
  Conversation,
  ListingFilters,
  BookingStatus,
  UserRole,
  Category,
} from '../types';
import type { AppNotification } from './mockData';
import type { ColorScheme } from '../hooks/useTheme';
import { toast } from './toast';
import { storage } from './storage';
import * as api from './api';
import {
  mockCreatorSession,
  mockBusinessSession,
  mockListings,
  mockBookings,
  mockConversations,
  mockNotifications,
} from './mockData';

// ─── Auth Slice ──────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  lastActivityAt: number;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  login: (session: Session) => void;
  logout: () => void;
  signIn: (
    email: string,
    password: string
  ) => Promise<
    | { ok: true; mfaRequired: false }
    | { ok: true; mfaRequired: true; factorId: string }
    | { ok: false }
  >;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<boolean>;
  restoreSession: () => Promise<void>;
  loginAsDemo: (role: UserRole) => void;
  touchActivity: () => void;
}

// ─── Listings Slice ──────────────────────────────────────────────────────────

interface ListingsState {
  listings: Listing[];
  selectedListing: Listing | null;
  filters: ListingFilters;
  listingsLoading: boolean;
  listingsError: string | null;
}

interface ListingsActions {
  setListings: (listings: Listing[]) => void;
  addListing: (listing: Listing) => void;
  updateListing: (id: string, updates: Partial<Listing>) => void;
  removeListing: (id: string) => void;
  setSelectedListing: (listing: Listing | null) => void;
  setFilters: (filters: Partial<ListingFilters>) => void;
  resetFilters: () => void;
  setListingsLoading: (loading: boolean) => void;
  fetchListings: () => Promise<void>;
}

// ─── Bookings Slice ──────────────────────────────────────────────────────────

interface BookingsState {
  bookings: Booking[];
  bookingsLoading: boolean;
  bookingsError: string | null;
}

interface BookingsActions {
  setBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  removeBooking: (id: string) => void;
  setBookingsLoading: (loading: boolean) => void;
  getBookingsByStatus: (status: BookingStatus) => Booking[];
  fetchBookings: () => Promise<void>;
}

// ─── Messages Slice ──────────────────────────────────────────────────────────

interface MessagesState {
  conversations: Conversation[];
  messagesLoading: boolean;
  messagesError: string | null;
}

interface MessagesActions {
  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  setMessagesLoading: (loading: boolean) => void;
  getUnreadCount: () => number;
  fetchConversations: () => Promise<void>;
  markConversationRead: (conversationId: string) => void;
}

// ─── Notifications Slice ────────────────────────────────────────────────────

interface NotificationsState {
  notifications: AppNotification[];
  notificationsLoading: boolean;
}

interface NotificationsActions {
  setNotifications: (notifications: AppNotification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  fetchNotifications: () => Promise<void>;
}

// ─── Onboarding Draft Slice ─────────────────────────────────────────────────

export interface BusinessDraft {
  business_name: string;
  category: Category | '';
  location: string;
  hours: Record<string, { open: string; close: string; closed: boolean }>;
  description: string;
  website: string;
  phone: string;
  coverPhotoUri: string;
  galleryUris: string[];
}

export interface CreatorDraft {
  full_name: string;
  bio: string;
  location: string;
  instagram_handle: string;
  tiktok_handle: string;
  instagram_followers: string;
  tiktok_followers: string;
  engagement_rate: string;
  avg_views: string;
  categories: Category[];
  portfolio_uris: string[];
}

const defaultCreatorDraft: CreatorDraft = {
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
};

interface OnboardingState {
  businessDraft: BusinessDraft;
  creatorDraft: CreatorDraft;
  onboardingRole: 'creator' | 'business' | null;
}

interface OnboardingActions {
  updateBusinessDraft: (updates: Partial<BusinessDraft>) => void;
  clearBusinessDraft: () => void;
  updateCreatorDraft: (updates: Partial<CreatorDraft>) => void;
  clearCreatorDraft: () => void;
  setOnboardingRole: (role: 'creator' | 'business' | null) => void;
}

const defaultBusinessDraft: BusinessDraft = {
  business_name: '',
  category: '',
  location: '',
  hours: {
    Monday: { open: '09:00', close: '17:00', closed: false },
    Tuesday: { open: '09:00', close: '17:00', closed: false },
    Wednesday: { open: '09:00', close: '17:00', closed: false },
    Thursday: { open: '09:00', close: '17:00', closed: false },
    Friday: { open: '09:00', close: '17:00', closed: false },
    Saturday: { open: '10:00', close: '15:00', closed: false },
    Sunday: { open: '10:00', close: '15:00', closed: true },
  },
  description: '',
  website: '',
  phone: '',
  coverPhotoUri: '',
  galleryUris: [],
};

// ─── Favorites Slice ────────────────────────────────────────────────────────

interface FavoritesState {
  savedListings: string[];
  followedCreators: string[];
}

interface FavoritesActions {
  toggleSavedListing: (listingId: string) => void;
  toggleFollowedCreator: (creatorId: string) => void;
  isListingSaved: (listingId: string) => boolean;
  isCreatorFollowed: (creatorId: string) => boolean;
  fetchFavorites: () => Promise<void>;
}

// ─── UI Slice ────────────────────────────────────────────────────────────────

export type ScrollScreenKey = 'home' | 'search';

export interface SearchFiltersSession {
  query: string;
  platform: string;
  category: string;
  followerRange: string;
  engagement: string;
  sortBy: string;
  mode: 'listings' | 'creators';
}

export const defaultSearchFilters: SearchFiltersSession = {
  query: '',
  platform: 'all',
  category: 'all',
  followerRange: 'all',
  engagement: 'all',
  sortBy: 'newest',
  mode: 'listings',
};

const SOUND_ENABLED_KEY = 'surve.soundEnabled';

interface UIState {
  themePreference: ColorScheme | 'system';
  unreadNotificationsCount: number;
  isOffline: boolean;
  scrollPositions: Record<ScrollScreenKey, number>;
  searchFilters: SearchFiltersSession;
  soundEnabled: boolean;
}

interface UIActions {
  setThemePreference: (preference: ColorScheme | 'system') => void;
  setUnreadNotificationsCount: (count: number) => void;
  setIsOffline: (offline: boolean) => void;
  setScrollPosition: (screen: ScrollScreenKey, y: number) => void;
  setSearchFilters: (updates: Partial<SearchFiltersSession>) => void;
  resetSearchFilters: () => void;
  setSoundEnabled: (enabled: boolean) => void;
}

// ─── Default Filters ─────────────────────────────────────────────────────────

const defaultFilters: ListingFilters = {
  platform: 'all',
  category: 'all',
  pay_min: null,
  pay_max: null,
  sort_by: 'newest',
  search_query: '',
};

// ─── Combined Store ──────────────────────────────────────────────────────────

type StoreState = AuthState & ListingsState & BookingsState & MessagesState & OnboardingState & FavoritesState & NotificationsState & UIState;
type StoreActions = AuthActions &
  ListingsActions &
  BookingsActions &
  MessagesActions &
  OnboardingActions &
  FavoritesActions &
  NotificationsActions &
  UIActions;
export type AppStore = StoreState & StoreActions;

export const useStore = create<AppStore>((set, get) => ({
  // Auth state
  user: null,
  session: null,
  loading: true,
  initialized: false,
  lastActivityAt: Date.now(),

  // Auth actions
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setAuthLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  touchActivity: () => set({ lastActivityAt: Date.now() }),
  login: (session) =>
    set({
      session,
      user: session.user,
      loading: false,
      lastActivityAt: Date.now(),
    }),
  logout: () => {
    api.signOut();
    set({
      user: null,
      session: null,
      selectedListing: null,
      bookings: [],
      conversations: [],
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const result = await api.signIn(email, password);
    if (!result) {
      set({ loading: false });
      return { ok: false };
    }
    const aal = await api.getAssuranceLevel();
    if (aal.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
      const factors = await api.listMfaFactors();
      const totp = factors.find((f) => f.type === 'totp' && f.status === 'verified');
      if (totp) {
        set({ loading: false });
        return { ok: true, mfaRequired: true, factorId: totp.id };
      }
    }
    set({
      user: result.user,
      session: result.session,
      loading: false,
      lastActivityAt: Date.now(),
    });
    get().fetchFavorites();
    return { ok: true, mfaRequired: false };
  },

  signUp: async (email, password, fullName, role) => {
    set({ loading: true });
    const result = await api.signUp(email, password, fullName, role);
    if (result) {
      set({
        user: result.user,
        session: result.session,
        loading: false,
        lastActivityAt: Date.now(),
      });
      return true;
    }
    set({ loading: false });
    return false;
  },

  restoreSession: async () => {
    set({ loading: true });
    const result = await api.getSession();
    if (result) {
      set({
        user: result.user,
        session: result.session,
        loading: false,
        initialized: true,
      });
      get().fetchFavorites();
    } else {
      set({ loading: false, initialized: true });
    }
  },

  // Instantly populate the app with curated demo content — for screenshots
  // and previewing without needing a live Supabase account.
  loginAsDemo: (role) => {
    const session = role === 'creator' ? mockCreatorSession : mockBusinessSession;
    set({
      user: session.user,
      session,
      loading: false,
      initialized: true,
      lastActivityAt: Date.now(),
      listings: mockListings,
      bookings: mockBookings,
      conversations: mockConversations,
    });
  },

  // Listings state
  listings: [],
  selectedListing: null,
  filters: defaultFilters,
  listingsLoading: false,
  listingsError: null,

  // Listings actions
  setListings: (listings) => set({ listings }),
  addListing: (listing) =>
    set((state) => ({ listings: [listing, ...state.listings] })),
  updateListing: (id, updates) =>
    set((state) => ({
      listings: state.listings.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
      selectedListing:
        state.selectedListing?.id === id
          ? { ...state.selectedListing, ...updates }
          : state.selectedListing,
    })),
  removeListing: (id) =>
    set((state) => ({
      listings: state.listings.filter((l) => l.id !== id),
      selectedListing:
        state.selectedListing?.id === id ? null : state.selectedListing,
    })),
  setSelectedListing: (listing) => set({ selectedListing: listing }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters }),
  setListingsLoading: (loading) => set({ listingsLoading: loading }),

  fetchListings: async () => {
    set({ listingsLoading: true, listingsError: null });
    try {
      const listings = await api.getListings();
      set({ listings, listingsLoading: false });
    } catch (e: any) {
      set({ listingsLoading: false, listingsError: e?.message ?? 'Failed to load listings' });
    }
  },

  // Bookings state
  bookings: [],
  bookingsLoading: false,
  bookingsError: null,

  // Bookings actions
  setBookings: (bookings) => set({ bookings }),
  addBooking: (booking) =>
    set((state) => ({ bookings: [booking, ...state.bookings] })),
  updateBooking: (id, updates) =>
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    })),
  removeBooking: (id) =>
    set((state) => ({
      bookings: state.bookings.filter((b) => b.id !== id),
    })),
  setBookingsLoading: (loading) => set({ bookingsLoading: loading }),
  getBookingsByStatus: (status) => {
    return get().bookings.filter((b) => b.status === status);
  },

  fetchBookings: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    set({ bookingsLoading: true, bookingsError: null });
    try {
      const bookings = await api.getBookings(userId);
      set({ bookings, bookingsLoading: false });
    } catch (e: any) {
      set({ bookingsLoading: false, bookingsError: e?.message ?? 'Failed to load bookings' });
    }
  },

  // Messages state
  conversations: [],
  messagesLoading: false,
  messagesError: null,

  // Messages actions
  setConversations: (conversations) => set({ conversations }),
  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    })),
  setMessagesLoading: (loading) => set({ messagesLoading: loading }),
  getUnreadCount: () => {
    return get().conversations.reduce((sum, c) => sum + c.unread_count, 0);
  },

  fetchConversations: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    set({ messagesLoading: true, messagesError: null });
    try {
      const conversations = await api.getConversations(userId);
      set({ conversations, messagesLoading: false });
    } catch (e: any) {
      set({ messagesLoading: false, messagesError: e?.message ?? 'Failed to load messages' });
    }
  },

  markConversationRead: (conversationId) => {
    const prev = get().conversations;
    const convo = prev.find((c) => c.id === conversationId);
    if (!convo || convo.unread_count === 0) return;
    set({
      conversations: prev.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
    });
    const userId = get().user?.id;
    if (userId) {
      api.markConversationRead(userId, conversationId).then((ok) => {
        if (!ok) {
          set({ conversations: prev });
          toast.error('Failed to sync read status');
        }
      });
    }
  },

  // Onboarding state
  businessDraft: defaultBusinessDraft,
  creatorDraft: defaultCreatorDraft,
  onboardingRole: null,

  // Onboarding actions
  updateBusinessDraft: (updates) =>
    set((state) => ({
      businessDraft: { ...state.businessDraft, ...updates },
    })),
  clearBusinessDraft: () => set({ businessDraft: defaultBusinessDraft }),
  updateCreatorDraft: (updates) =>
    set((state) => ({
      creatorDraft: { ...state.creatorDraft, ...updates },
    })),
  clearCreatorDraft: () => set({ creatorDraft: defaultCreatorDraft }),
  setOnboardingRole: (role) => set({ onboardingRole: role }),

  // Favorites state
  savedListings: [],
  followedCreators: [],

  // Favorites actions — optimistic with server sync + rollback
  toggleSavedListing: (listingId) => {
    const prev = get().savedListings;
    const wasSaved = prev.includes(listingId);
    const next = wasSaved
      ? prev.filter((id) => id !== listingId)
      : [...prev, listingId];
    set({ savedListings: next });

    const userId = get().user?.id;
    if (userId) {
      const request = wasSaved
        ? api.unsaveListing(userId, listingId)
        : api.saveListing(userId, listingId);
      request.then((ok) => {
        if (!ok) {
          set({ savedListings: prev });
          toast.error(wasSaved ? 'Failed to unsave listing' : 'Failed to save listing');
        }
      });
    }
  },
  toggleFollowedCreator: (creatorId) => {
    const prev = get().followedCreators;
    const wasFollowed = prev.includes(creatorId);
    const next = wasFollowed
      ? prev.filter((id) => id !== creatorId)
      : [...prev, creatorId];
    set({ followedCreators: next });

    const userId = get().user?.id;
    if (userId) {
      const request = wasFollowed
        ? api.unfollowCreator(userId, creatorId)
        : api.followCreator(userId, creatorId);
      request.then((ok) => {
        if (!ok) {
          set({ followedCreators: prev });
          toast.error(wasFollowed ? 'Failed to unfollow creator' : 'Failed to follow creator');
        }
      });
    }
  },
  isListingSaved: (listingId) => get().savedListings.includes(listingId),
  isCreatorFollowed: (creatorId) => get().followedCreators.includes(creatorId),

  fetchFavorites: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    const [savedIds, followedIds] = await Promise.all([
      api.getSavedListingIds(userId),
      api.getFollowedCreatorIds(userId),
    ]);
    set({ savedListings: savedIds, followedCreators: followedIds });
  },

  // Notifications state
  notifications: mockNotifications,
  notificationsLoading: false,

  // Notifications actions — optimistic with server sync + rollback
  setNotifications: (notifications) => set({ notifications }),

  markNotificationRead: (id) => {
    const prev = get().notifications;
    const target = prev.find((n) => n.id === id);
    if (!target || target.read) return;
    const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
    set({
      notifications: next,
      unreadNotificationsCount: next.filter((n) => !n.read).length,
    });
    api.markNotificationRead(id).then((ok) => {
      if (!ok) {
        set({
          notifications: prev,
          unreadNotificationsCount: prev.filter((n) => !n.read).length,
        });
        toast.error('Failed to mark notification as read');
      }
    });
  },

  markAllNotificationsRead: () => {
    const prev = get().notifications;
    if (prev.every((n) => n.read)) return;
    set({
      notifications: prev.map((n) => ({ ...n, read: true })),
      unreadNotificationsCount: 0,
    });
    const userId = get().user?.id;
    if (userId) {
      api.markAllNotificationsRead(userId).then((ok) => {
        if (!ok) {
          set({
            notifications: prev,
            unreadNotificationsCount: prev.filter((n) => !n.read).length,
          });
          toast.error('Failed to mark notifications as read');
        }
      });
    }
  },

  fetchNotifications: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    set({ notificationsLoading: true });
    try {
      const raw = await api.getNotifications(userId);
      const mapped: AppNotification[] = raw.map((n) => ({
        id: n.id,
        type: n.type as AppNotification['type'],
        title: n.title,
        body: n.body,
        read: n.read,
        created_at: n.created_at,
      }));
      set({
        notifications: mapped,
        notificationsLoading: false,
        unreadNotificationsCount: mapped.filter((n) => !n.read).length,
      });
    } catch {
      set({ notificationsLoading: false });
    }
  },

  // UI state
  themePreference: 'system',
  unreadNotificationsCount: mockNotifications.filter((n) => !n.read).length,
  isOffline: false,
  scrollPositions: { home: 0, search: 0 },
  searchFilters: defaultSearchFilters,
  soundEnabled: storage.getBoolean(SOUND_ENABLED_KEY) ?? false,

  // UI actions
  setThemePreference: (preference) => set({ themePreference: preference }),
  setUnreadNotificationsCount: (count) => set({ unreadNotificationsCount: count }),
  setIsOffline: (offline) => set({ isOffline: offline }),
  setScrollPosition: (screen, y) =>
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [screen]: y },
    })),
  setSearchFilters: (updates) =>
    set((state) => ({ searchFilters: { ...state.searchFilters, ...updates } })),
  resetSearchFilters: () => set({ searchFilters: defaultSearchFilters }),
  setSoundEnabled: (enabled) => {
    storage.set(SOUND_ENABLED_KEY, enabled);
    set({ soundEnabled: enabled });
  },
}));
