import { create } from 'zustand';
import type { User, Session, Survey, SportScore } from '../types';
import type { ColorScheme } from '../hooks/useTheme';

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
}

// ─── Survey Slice ────────────────────────────────────────────────────────────

interface SurveyState {
  surveys: Survey[];
  currentSurvey: Survey | null;
  surveysLoading: boolean;
}

interface SurveyActions {
  setSurveys: (surveys: Survey[]) => void;
  addSurvey: (survey: Survey) => void;
  updateSurvey: (id: string, updates: Partial<Survey>) => void;
  removeSurvey: (id: string) => void;
  setCurrentSurvey: (survey: Survey | null) => void;
  setSurveysLoading: (loading: boolean) => void;
}

// ─── Sport Scores Slice ─────────────────────────────────────────────────────

interface SportScoreState {
  sportScores: SportScore[];
  activeScore: SportScore | null;
  sportScoresLoading: boolean;
}

interface SportScoreActions {
  setSportScores: (scores: SportScore[]) => void;
  addSportScore: (score: SportScore) => void;
  updateSportScore: (id: string, updates: Partial<SportScore>) => void;
  removeSportScore: (id: string) => void;
  setActiveScore: (score: SportScore | null) => void;
  setSportScoresLoading: (loading: boolean) => void;
}

// ─── UI Slice ────────────────────────────────────────────────────────────────

interface UIState {
  themePreference: ColorScheme | 'system';
}

interface UIActions {
  setThemePreference: (preference: ColorScheme | 'system') => void;
}

// ─── Combined Store ──────────────────────────────────────────────────────────

type StoreState = AuthState & SurveyState & SportScoreState & UIState;
type StoreActions = AuthActions & SurveyActions & SportScoreActions & UIActions;
export type AppStore = StoreState & StoreActions;

export const useStore = create<AppStore>((set) => ({
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
  logout: () =>
    set({
      user: null,
      session: null,
      currentSurvey: null,
      sportScores: [],
      activeScore: null,
    }),

  // Survey state
  surveys: [],
  currentSurvey: null,
  surveysLoading: false,

  // Survey actions
  setSurveys: (surveys) => set({ surveys }),
  addSurvey: (survey) =>
    set((state) => ({ surveys: [survey, ...state.surveys] })),
  updateSurvey: (id, updates) =>
    set((state) => ({
      surveys: state.surveys.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      currentSurvey:
        state.currentSurvey?.id === id
          ? { ...state.currentSurvey, ...updates }
          : state.currentSurvey,
    })),
  removeSurvey: (id) =>
    set((state) => ({
      surveys: state.surveys.filter((s) => s.id !== id),
      currentSurvey:
        state.currentSurvey?.id === id ? null : state.currentSurvey,
    })),
  setCurrentSurvey: (survey) => set({ currentSurvey: survey }),
  setSurveysLoading: (loading) => set({ surveysLoading: loading }),

  // Sport Scores state
  sportScores: [],
  activeScore: null,
  sportScoresLoading: false,

  // Sport Scores actions
  setSportScores: (scores) => set({ sportScores: scores }),
  addSportScore: (score) =>
    set((state) => ({ sportScores: [score, ...state.sportScores] })),
  updateSportScore: (id, updates) =>
    set((state) => ({
      sportScores: state.sportScores.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      activeScore:
        state.activeScore?.id === id
          ? { ...state.activeScore, ...updates }
          : state.activeScore,
    })),
  removeSportScore: (id) =>
    set((state) => ({
      sportScores: state.sportScores.filter((s) => s.id !== id),
      activeScore: state.activeScore?.id === id ? null : state.activeScore,
    })),
  setActiveScore: (score) => set({ activeScore: score }),
  setSportScoresLoading: (loading) => set({ sportScoresLoading: loading }),

  // UI state
  themePreference: 'system',

  // UI actions
  setThemePreference: (preference) => set({ themePreference: preference }),
}));
