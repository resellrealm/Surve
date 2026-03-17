-- Migration: Game Events table
-- Immutable log of every scoring action for undo, replay, and timeline views

CREATE TABLE public.game_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'score', 'undo', 'timeout', 'period_end', 'period_start',
    'set_end', 'game_start', 'game_end'
  )),
  team        TEXT NOT NULL CHECK (team IN ('team_a', 'team_b', 'none')),
  points      INTEGER DEFAULT 1,
  label       TEXT,           -- e.g. 'try', 'three_pointer', 'ace'
  scored_by   UUID REFERENCES public.profiles(id),
  snapshot    JSONB,          -- scoring_state snapshot at this point
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_game_events_game_id ON public.game_events(game_id);
CREATE INDEX idx_game_events_game_time ON public.game_events(game_id, created_at);

-- RLS (inherits game access — if you can see the game, you can see its events)
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game event access follows game access"
  ON public.game_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_id
        AND auth.uid() IN (g.team_a_user_id, g.team_b_user_id, g.created_by)
    )
  );

CREATE POLICY "Participants can insert events"
  ON public.game_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_id
        AND auth.uid() IN (g.team_a_user_id, g.team_b_user_id)
    )
  );
