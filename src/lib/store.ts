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
import type { ColorScheme } from '../hooks/useTheme';
import * as api from './api';
import {
  mockCreatorSession,
  mockBusinessSession,
  mockListings,
  mockBookings,
  mockConversations,
} from './mockData';

// ─── Auth Slice ──────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  login: (session: Session) => void;
  logout: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<boolean>;
  restoreSession: () => Promise<void>;
  loginAsDemo: (role: UserRole) => void;
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
  setMessagesLoading: (loading: boolean) => void;
  getUnreadCount: () => number;
  fetchConversations: () => Promise<void>;
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

// ─── UI Slice ────────────────────────────────────────────────────────────────

interface UIState {
  themePreference: ColorScheme | 'system';
}

interface UIActions {
  setThemePreference: (preference: ColorScheme | 'system') => void;
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

type StoreState = AuthState & ListingsState & BookingsState & MessagesState & OnboardingState & UIState;
type StoreActions = AuthActions &
  ListingsActions &
  BookingsActions &
  MessagesActions &
  OnboardingActions &
  UIActions;
export type AppStore = StoreState & StoreActions;

export const useStore = create<AppStore>((set, get) => ({
  // Auth state
  user: null,
  session: null,
  loading: true,
  initialized: false,

  // Auth actions
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setAuthLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  login: (session) =>
    set({
      session,
      user: session.user,
      loading: false,
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
    if (result) {
      set({
        user: result.user,
        session: result.session,
        loading: false,
      });
      return true;
    }
    set({ loading: false });
    return false;
  },

  signUp: async (email, password, fullName, role) => {
    set({ loading: true });
    const result = await api.signUp(email, password, fullName, role);
    if (result) {
      set({
        user: result.user,
        session: result.session,
        loading: false,
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

  // UI state
  themePreference: 'system',

  // UI actions
  setThemePreference: (preference) => set({ themePreference: preference }),
}));
