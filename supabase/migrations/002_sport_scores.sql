-- Sport Scores: score tracking for various sports
-- Migration for AUT-26

-- ============================================
-- SPORT_SCORES
-- ============================================
CREATE TABLE IF NOT EXISTS public.sport_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sport_type TEXT NOT NULL CHECK (sport_type IN (
    'rugby', 'football', 'basketball', 'tennis', 'cricket',
    'baseball', 'hockey', 'volleyball', 'soccer', 'badminton'
  )),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sport_scores_user_id ON public.sport_scores(user_id);
CREATE INDEX idx_sport_scores_sport_type ON public.sport_scores(sport_type);
CREATE INDEX idx_sport_scores_status ON public.sport_scores(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.sport_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sport scores" ON public.sport_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sport scores" ON public.sport_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sport scores" ON public.sport_scores
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sport scores" ON public.sport_scores
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_sport_scores_updated_at BEFORE UPDATE ON public.sport_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
