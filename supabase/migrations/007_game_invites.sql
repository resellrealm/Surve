-- Migration: Game Invites table
-- Challenge friends to games with expiration

CREATE TABLE public.game_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sport         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  game_id       UUID REFERENCES public.games(id) ON DELETE SET NULL,
  message       TEXT,
  expires_at    TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_game_invites_to_user ON public.game_invites(to_user_id);
CREATE INDEX idx_game_invites_from_user ON public.game_invites(from_user_id);
CREATE INDEX idx_game_invites_pending ON public.game_invites(to_user_id) WHERE status = 'pending';

-- RLS
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites"
  ON public.game_invites FOR SELECT
  USING (auth.uid() IN (from_user_id, to_user_id));

CREATE POLICY "Users can send invites"
  ON public.game_invites FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Invite recipients can update"
  ON public.game_invites FOR UPDATE
  USING (auth.uid() IN (from_user_id, to_user_id));

CREATE TRIGGER update_game_invites_updated_at
  BEFORE UPDATE ON public.game_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
