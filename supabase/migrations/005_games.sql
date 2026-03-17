-- Migration: Games table
-- Central game table for multiplayer games with sport-specific scoring state

CREATE TABLE public.games (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport           TEXT NOT NULL CHECK (sport IN (
    'rugby', 'football', 'basketball', 'tennis', 'cricket',
    'table_tennis', 'badminton', 'volleyball', 'baseball',
    'american_football', 'general'
  )),
  team_a_name     TEXT NOT NULL,
  team_b_name     TEXT NOT NULL,
  team_a_score    INTEGER NOT NULL DEFAULT 0,
  team_b_score    INTEGER NOT NULL DEFAULT 0,
  team_a_user_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_b_user_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  winner          TEXT CHECK (winner IN ('team_a', 'team_b', 'draw', NULL)),
  scoring_state   JSONB NOT NULL DEFAULT '{}',
  started_at      TIMESTAMPTZ DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_games_team_a_user ON public.games(team_a_user_id);
CREATE INDEX idx_games_team_b_user ON public.games(team_b_user_id);
CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_games_sport ON public.games(sport);
CREATE INDEX idx_games_created_by ON public.games(created_by);
CREATE INDEX idx_games_created_at ON public.games(created_at DESC);

-- For "active games for user" query
CREATE INDEX idx_games_active_user_a
  ON public.games(team_a_user_id) WHERE status = 'active';
CREATE INDEX idx_games_active_user_b
  ON public.games(team_b_user_id) WHERE status = 'active';

-- RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game participants can view games"
  ON public.games FOR SELECT
  USING (auth.uid() IN (team_a_user_id, team_b_user_id, created_by));

CREATE POLICY "Authenticated users can create games"
  ON public.games FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Participants can update games"
  ON public.games FOR UPDATE
  USING (auth.uid() IN (team_a_user_id, team_b_user_id));

CREATE POLICY "Creator can delete games"
  ON public.games FOR DELETE
  USING (auth.uid() = created_by);

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
