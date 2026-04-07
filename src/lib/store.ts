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
} from '../types';
import type { ColorScheme } from '../hooks/useTheme';
import * as api from './api';

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
}

// ─── Listings Slice ──────────────────────────────────────────────────────────

interface ListingsState {
  listings: Listing[];
  selectedListing: Listing | null;
  filters: ListingFilters;
  listingsLoading: boolean;
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
}

interface MessagesActions {
  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  setMessagesLoading: (loading: boolean) => void;
  getUnreadCount: () => number;
  fetchConversations: () => Promise<void>;
}

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

type StoreState = AuthState & ListingsState & BookingsState & MessagesState & UIState;
type StoreActions = AuthActions &
  ListingsActions &
  BookingsActions &
  MessagesActions &
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

  // Listings state
  listings: [],
  selectedListing: null,
  filters: defaultFilters,
  listingsLoading: false,

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
    set({ listingsLoading: true });
    const listings = await api.getListings();
    set({ listings, listingsLoading: false });
  },

  // Bookings state
  bookings: [],
  bookingsLoading: false,

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
    set({ bookingsLoading: true });
    const bookings = await api.getBookings(userId);
    set({ bookings, bookingsLoading: false });
  },

  // Messages state
  conversations: [],
  messagesLoading: false,

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
    set({ messagesLoading: true });
    const conversations = await api.getConversations(userId);
    set({ conversations, messagesLoading: false });
  },

  // UI state
  themePreference: 'system',

  // UI actions
  setThemePreference: (preference) => set({ themePreference: preference }),
}));
