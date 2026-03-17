-- Migration: Database functions for stats, friend management, and game lifecycle

-- ============================================
-- UPDATE GAME STATS TRIGGER
-- Updates profile win/loss/draw counts after game completion
-- ============================================
CREATE OR REPLACE FUNCTION public.update_game_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'active' THEN
    -- Update team_a user stats
    IF NEW.team_a_user_id IS NOT NULL THEN
      UPDATE public.profiles SET
        total_wins   = total_wins   + CASE WHEN NEW.winner = 'team_a' THEN 1 ELSE 0 END,
        total_losses = total_losses + CASE WHEN NEW.winner = 'team_b' THEN 1 ELSE 0 END,
        total_draws  = total_draws  + CASE WHEN NEW.winner = 'draw'   THEN 1 ELSE 0 END
      WHERE id = NEW.team_a_user_id;
    END IF;
    -- Update team_b user stats
    IF NEW.team_b_user_id IS NOT NULL THEN
      UPDATE public.profiles SET
        total_wins   = total_wins   + CASE WHEN NEW.winner = 'team_b' THEN 1 ELSE 0 END,
        total_losses = total_losses + CASE WHEN NEW.winner = 'team_a' THEN 1 ELSE 0 END,
        total_draws  = total_draws  + CASE WHEN NEW.winner = 'draw'   THEN 1 ELSE 0 END
      WHERE id = NEW.team_b_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_game_completed
  AFTER UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_game_stats();

-- ============================================
-- HEAD-TO-HEAD STATS RPC
-- Returns total games, wins, losses, draws, streak between two users
-- Optionally filtered by sport. Includes per-sport breakdown.
-- ============================================
CREATE OR REPLACE FUNCTION public.head_to_head(
  p_user_id UUID,
  p_opponent_id UUID,
  p_sport TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_games   BIGINT,
  user_wins     BIGINT,
  opponent_wins BIGINT,
  draws         BIGINT,
  current_streak INTEGER,
  streak_holder  TEXT
) AS $$
WITH games AS (
  SELECT
    g.id,
    g.winner,
    g.ended_at,
    CASE WHEN g.team_a_user_id = p_user_id THEN 'team_a' ELSE 'team_b' END AS user_team
  FROM public.games g
  WHERE g.status = 'completed'
    AND (
      (g.team_a_user_id = p_user_id AND g.team_b_user_id = p_opponent_id)
      OR
      (g.team_a_user_id = p_opponent_id AND g.team_b_user_id = p_user_id)
    )
    AND (p_sport IS NULL OR g.sport = p_sport)
  ORDER BY g.ended_at DESC
),
stats AS (
  SELECT
    COUNT(*) AS total_games,
    COUNT(*) FILTER (WHERE winner = user_team) AS user_wins,
    COUNT(*) FILTER (WHERE winner <> user_team AND winner <> 'draw') AS opponent_wins,
    COUNT(*) FILTER (WHERE winner = 'draw') AS draws
  FROM games
),
streak AS (
  SELECT
    COUNT(*) AS current_streak,
    CASE
      WHEN (SELECT winner FROM games LIMIT 1) =
           (SELECT user_team FROM games LIMIT 1) THEN 'user'
      WHEN (SELECT winner FROM games LIMIT 1) = 'draw' THEN 'draw'
      ELSE 'opponent'
    END AS streak_holder
  FROM (
    SELECT winner, user_team,
      ROW_NUMBER() OVER (ORDER BY ended_at DESC) AS rn
    FROM games
  ) ranked
  WHERE rn = 1 OR winner = (SELECT winner FROM games ORDER BY ended_at DESC LIMIT 1)
)
SELECT
  s.total_games,
  s.user_wins,
  s.opponent_wins,
  s.draws,
  COALESCE(k.current_streak, 0)::INTEGER,
  COALESCE(k.streak_holder, 'none')
FROM stats s
LEFT JOIN streak k ON TRUE;
$$ LANGUAGE sql STABLE;

-- ============================================
-- HEAD-TO-HEAD PER-SPORT BREAKDOWN
-- Returns per-sport stats for two users
-- ============================================
CREATE OR REPLACE FUNCTION public.head_to_head_by_sport(
  p_user_id UUID,
  p_opponent_id UUID
)
RETURNS TABLE (
  sport         TEXT,
  total_games   BIGINT,
  user_wins     BIGINT,
  opponent_wins BIGINT,
  draws         BIGINT,
  last_played   TIMESTAMPTZ
) AS $$
  SELECT
    g.sport,
    COUNT(*) AS total_games,
    COUNT(*) FILTER (WHERE g.winner = CASE WHEN g.team_a_user_id = p_user_id THEN 'team_a' ELSE 'team_b' END) AS user_wins,
    COUNT(*) FILTER (WHERE g.winner = CASE WHEN g.team_a_user_id = p_user_id THEN 'team_b' ELSE 'team_a' END) AS opponent_wins,
    COUNT(*) FILTER (WHERE g.winner = 'draw') AS draws,
    MAX(g.ended_at) AS last_played
  FROM public.games g
  WHERE g.status = 'completed'
    AND (
      (g.team_a_user_id = p_user_id AND g.team_b_user_id = p_opponent_id)
      OR
      (g.team_a_user_id = p_opponent_id AND g.team_b_user_id = p_user_id)
    )
  GROUP BY g.sport
  ORDER BY last_played DESC;
$$ LANGUAGE sql STABLE;

-- ============================================
-- ACCEPT FRIEND REQUEST
-- Updates friendship status and handles the transition
-- ============================================
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_friendship_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.friendships
  SET status = 'accepted', updated_at = now()
  WHERE id = p_friendship_id
    AND addressee_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- END GAME
-- Sets game to completed, determines winner, sets ended_at
-- ============================================
CREATE OR REPLACE FUNCTION public.end_game(
  p_game_id UUID,
  p_winner TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_game public.games;
BEGIN
  SELECT * INTO v_game FROM public.games WHERE id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF auth.uid() NOT IN (v_game.team_a_user_id, v_game.team_b_user_id) THEN
    RAISE EXCEPTION 'Only participants can end a game';
  END IF;

  IF v_game.status <> 'active' THEN
    RAISE EXCEPTION 'Game is not active';
  END IF;

  -- Auto-determine winner if not provided
  UPDATE public.games
  SET
    status = 'completed',
    ended_at = now(),
    winner = COALESCE(
      p_winner,
      CASE
        WHEN team_a_score > team_b_score THEN 'team_a'
        WHEN team_b_score > team_a_score THEN 'team_b'
        ELSE 'draw'
      END
    )
  WHERE id = p_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USER STREAK DATA
-- Returns current win/loss streak for a user
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id UUID)
RETURNS TABLE (
  streak_count  INTEGER,
  streak_type   TEXT,
  last_game_at  TIMESTAMPTZ
) AS $$
WITH recent_games AS (
  SELECT
    g.id,
    g.winner,
    g.ended_at,
    CASE WHEN g.team_a_user_id = p_user_id THEN 'team_a' ELSE 'team_b' END AS user_team
  FROM public.games g
  WHERE g.status = 'completed'
    AND p_user_id IN (g.team_a_user_id, g.team_b_user_id)
  ORDER BY g.ended_at DESC
),
first_result AS (
  SELECT
    CASE
      WHEN winner = user_team THEN 'win'
      WHEN winner = 'draw' THEN 'draw'
      ELSE 'loss'
    END AS result_type
  FROM recent_games
  LIMIT 1
),
streak_games AS (
  SELECT
    rg.*,
    CASE
      WHEN rg.winner = rg.user_team THEN 'win'
      WHEN rg.winner = 'draw' THEN 'draw'
      ELSE 'loss'
    END AS result_type,
    ROW_NUMBER() OVER (ORDER BY rg.ended_at DESC) AS rn
  FROM recent_games rg
)
SELECT
  COUNT(*)::INTEGER AS streak_count,
  COALESCE((SELECT result_type FROM first_result), 'none') AS streak_type,
  (SELECT ended_at FROM recent_games LIMIT 1) AS last_game_at
FROM streak_games sg
CROSS JOIN first_result fr
WHERE sg.result_type = fr.result_type
  AND sg.rn <= (
    SELECT COALESCE(MIN(rn) - 1, COUNT(*))
    FROM streak_games
    WHERE result_type <> fr.result_type
  );
$$ LANGUAGE sql STABLE;

-- ============================================
-- GAME SCORE SUMMARY VIEW (for Apple Watch)
-- Lightweight view with just current scores
-- ============================================
CREATE OR REPLACE VIEW public.game_score_summary AS
SELECT
  g.id AS game_id,
  g.sport,
  g.team_a_name,
  g.team_a_score,
  g.team_b_name,
  g.team_b_score,
  g.status,
  g.winner,
  g.started_at,
  g.updated_at
FROM public.games g
WHERE g.status IN ('active', 'paused');

-- ============================================
-- FREQUENTLY USED TEAM NAMES (auto-suggest)
-- Returns team names a user has used, ordered by frequency
-- ============================================
CREATE OR REPLACE FUNCTION public.get_frequent_team_names(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  team_name TEXT,
  usage_count BIGINT
) AS $$
  SELECT name, COUNT(*) AS usage_count
  FROM (
    SELECT team_a_name AS name FROM public.games WHERE created_by = p_user_id
    UNION ALL
    SELECT team_b_name AS name FROM public.games WHERE created_by = p_user_id
  ) names
  GROUP BY name
  ORDER BY usage_count DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;
