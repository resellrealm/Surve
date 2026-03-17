# Surve — Architecture Document

> Major Feature Build: Friends System, Sport-Specific Scoring, Apple Watch, Real-time Sync, Game History

---

## Table of Contents

1. [Database Schema (Supabase SQL)](#1-database-schema)
2. [Scoring Engine Architecture](#2-scoring-engine-architecture)
3. [Component Architecture](#3-component-architecture)
4. [Data Flow & Real-time Sync](#4-data-flow--real-time-sync)
5. [Apple Watch Architecture](#5-apple-watch-architecture)
6. [File Structure](#6-file-structure)
7. [Migration Plan](#7-migration-plan)

---

## 1. Database Schema

All new tables live in the `public` schema alongside existing `users`, `sport_scores`, `surveys`, etc.

### 1.1 Profiles

Extends `auth.users` with social/gaming identity. Separate from the existing `users` table to keep concerns clean — `users` is for survey/account data, `profiles` is for the gaming/social layer.

```sql
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url  TEXT,
  favorite_sports TEXT[] DEFAULT '{}',
  total_wins    INTEGER DEFAULT 0,
  total_losses  INTEGER DEFAULT 0,
  total_draws   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Fast username search for friend discovery
CREATE UNIQUE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_display_name ON public.profiles USING gin(display_name gin_trgm_ops);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    'user_' || substr(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Player')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### 1.2 Friendships

Bidirectional friendship with a single row per relationship. Requester initiates; addressee accepts/declines.

```sql
CREATE TABLE public.friendships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique UNIQUE (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
  )
);

CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);

-- Composite for "get my accepted friends" query
CREATE INDEX idx_friendships_accepted_requester
  ON public.friendships(requester_id) WHERE status = 'accepted';
CREATE INDEX idx_friendships_accepted_addressee
  ON public.friendships(addressee_id) WHERE status = 'accepted';

-- RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they are part of"
  ON public.friendships FOR UPDATE
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE POLICY "Users can delete own friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### 1.3 Games

Central game table replacing `sport_scores` for multiplayer games. Solo games still use `sport_scores`; multiplayer games use `games`. The `scoring_state` JSONB field holds the full sport-specific scoring state (see Section 2).

```sql
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
```

### 1.4 Game Events

Immutable log of every scoring action. Enables undo, replay, and timeline views.

```sql
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
```

### 1.5 Game Invites

```sql
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
```

### 1.6 Stat Aggregation Functions

Server-side functions for efficient stat queries.

```sql
-- Update profile win/loss/draw counts after game completion
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

-- Head-to-head stats RPC
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
```

### 1.7 Realtime Publication

```sql
-- Enable realtime for multiplayer tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
```

---

## 2. Scoring Engine Architecture

The scoring engine is a pure TypeScript module. Each sport implements a `ScoringEngine` interface. The engine runs on the client (for instant UI) and the canonical state is stored in `games.scoring_state` JSONB.

### 2.1 Core Interface

```typescript
// src/engines/types.ts

export type SportId =
  | 'football' | 'basketball' | 'tennis' | 'cricket'
  | 'table_tennis' | 'badminton' | 'rugby' | 'volleyball'
  | 'baseball' | 'american_football' | 'general';

export interface ScoreAction {
  type: string;        // Sport-specific: 'goal', 'three_pointer', 'try', etc.
  team: 'team_a' | 'team_b';
  points: number;
  label: string;       // Human-readable label for the event
  timestamp: number;
}

export interface ScoringState {
  teamAScore: number;
  teamBScore: number;
  period: string;      // "1st Half", "Q3", "Set 2", etc.
  isComplete: boolean;
  winner: 'team_a' | 'team_b' | 'draw' | null;
  detail: Record<string, unknown>;  // Sport-specific nested state
}

export interface ScoringEngine {
  sportId: SportId;
  initialState(): ScoringState;
  getActions(state: ScoringState, team: 'team_a' | 'team_b'): ScoreAction[];
  applyAction(state: ScoringState, action: ScoreAction): ScoringState;
  undo(state: ScoringState, lastAction: ScoreAction): ScoringState;
  formatScore(state: ScoringState): { teamA: string; teamB: string };
  isGameOver(state: ScoringState): boolean;
}
```

### 2.2 Sport Implementations

Each sport gets its own engine file. All are pure functions — no side effects.

#### Football (Soccer)
```typescript
// src/engines/football.ts
// Actions: goal (+1)
// Periods: 1st Half, 2nd Half, Extra Time 1, Extra Time 2, Penalties
// State.detail: { half: 1|2, extraTime: boolean }
// Simple: team score = count of goals
```

#### Basketball
```typescript
// src/engines/basketball.ts
// Actions: free_throw (+1), field_goal (+2), three_pointer (+3)
// Periods: Q1, Q2, Q3, Q4, OT1, OT2...
// State.detail: { quarter: number, fouls: { team_a: number, team_b: number } }
```

#### Tennis
```typescript
// src/engines/tennis.ts
// Most complex engine.
// Actions: point (+1 point in current game)
// State.detail: {
//   sets: [{ gamesA: number, gamesB: number }],
//   currentGame: { pointsA: number, pointsB: number },
//   tiebreak: boolean,
//   bestOf: 3 | 5
// }
// Score display: "40-30" / "Deuce" / "Ad-In" / "Ad-Out"
// Point mapping: 0→0, 1→15, 2→30, 3→40
// Deuce at 3-3, advantage at 4-3 / 3-4, game won at 4+ with 2-point lead
// Game won → increment set games; set won at 6 with 2-game lead (or tiebreak at 6-6)
// Tiebreak: first to 7 with 2-point lead, points count as 1,2,3,4...
```

#### Cricket
```typescript
// src/engines/cricket.ts
// Actions: single (+1), double (+2), triple (+3), four (+4), six (+6),
//          wide (+1 extras), no_ball (+1 extras), wicket (0 runs, +1 wicket), dot (0)
// State.detail: {
//   overs: number,
//   ballsInOver: number,
//   wickets: number,
//   extras: number,
//   runRate: number,
//   innings: 1 | 2,
//   battingTeam: 'team_a' | 'team_b'
// }
// Over complete after 6 legal deliveries (wides/no-balls don't count)
// All out at 10 wickets → innings change
```

#### Table Tennis
```typescript
// src/engines/table_tennis.ts
// Actions: point (+1)
// State.detail: {
//   games: [{ a: number, b: number }],
//   currentGame: { a: number, b: number },
//   bestOf: 5 | 7,
//   serving: 'team_a' | 'team_b',
//   serveCount: number
// }
// Game to 11, win by 2. Serve switches every 2 points (every 1 in deuce).
```

#### Badminton
```typescript
// src/engines/badminton.ts
// Actions: point (+1)
// State.detail: {
//   games: [{ a: number, b: number }],
//   currentGame: { a: number, b: number },
//   bestOf: 3,
//   serving: 'team_a' | 'team_b'
// }
// Game to 21, win by 2 (cap at 30). Serve goes to point winner.
```

#### Rugby
```typescript
// src/engines/rugby.ts
// Actions: try (+5), conversion (+2), penalty_goal (+3), drop_goal (+3)
// State.detail: { half: 1 | 2, pendingConversion: boolean, lastTryTeam: 'team_a' | 'team_b' | null }
// After a try, the conversion action becomes available for that team only.
```

#### Volleyball
```typescript
// src/engines/volleyball.ts
// Actions: point (+1)
// State.detail: {
//   sets: [{ a: number, b: number }],
//   currentSet: { a: number, b: number },
//   bestOf: 3 | 5,
//   serving: 'team_a' | 'team_b'
// }
// Sets 1-4 to 25, deciding set to 15. Win by 2.
```

#### Baseball
```typescript
// src/engines/baseball.ts
// Actions: run (+1)
// State.detail: {
//   innings: [{ top: number, bottom: number }],
//   currentInning: number,
//   half: 'top' | 'bottom',
//   outs: number,
//   totalInnings: 9
// }
// 3 outs switches half. 9 innings, extras if tied.
```

#### American Football
```typescript
// src/engines/american_football.ts
// Actions: touchdown (+6), extra_point (+1), two_point (+2),
//          field_goal (+3), safety (+2 to other team)
// State.detail: {
//   quarter: 1 | 2 | 3 | 4 | 'OT',
//   pendingPAT: boolean,
//   lastTDTeam: 'team_a' | 'team_b' | null
// }
// After a TD, PAT options become available.
```

#### General
```typescript
// src/engines/general.ts
// Actions: increment (+1), decrement (-1), custom (+N user-defined)
// No period tracking. Simple tally. Never auto-completes.
```

### 2.3 Engine Registry

```typescript
// src/engines/index.ts

import { footballEngine } from './football';
import { basketballEngine } from './basketball';
// ... all imports

const engines: Record<SportId, ScoringEngine> = {
  football: footballEngine,
  basketball: basketballEngine,
  tennis: tennisEngine,
  cricket: cricketEngine,
  table_tennis: tableTennisEngine,
  badminton: badmintonEngine,
  rugby: rugbyEngine,
  volleyball: volleyballEngine,
  baseball: baseballEngine,
  american_football: americanFootballEngine,
  general: generalEngine,
};

export function getEngine(sport: SportId): ScoringEngine {
  return engines[sport];
}
```

### 2.4 Scoring UI Mapping

Each sport maps to a layout variant in the scoring screen:

| Sport | Layout | Action Buttons |
|---|---|---|
| Football | Classic two-column | Goal |
| Basketball | Two-column + action bar | +1, +2, +3 |
| Tennis | Sets grid + game score | Point (auto-advances) |
| Cricket | Runs + extras bar | 1, 2, 3, 4, 6, W, Wd, Nb, Dot |
| Table Tennis | Two-column + serve indicator | Point |
| Badminton | Two-column + serve indicator | Point |
| Rugby | Two-column + action bar | Try, Conv, Pen, Drop |
| Volleyball | Sets grid + score | Point |
| Baseball | Innings grid + score | Run |
| American Football | Two-column + action bar | TD, XP, 2PT, FG, Safety |
| General | Two-column + configurable | +1, -1, +Custom |

---

## 3. Component Architecture

### 3.1 New Screens

```
(tabs)/
  friends.tsx            — Friends list, pending requests, search

(game)/
  _layout.tsx            — Stack navigator for game flow
  new.tsx                — New game: pick sport → pick opponent → name teams → start
  [id].tsx               — Active game: scoring UI (uses engine)
  [id]/summary.tsx       — Game over summary, stats, rematch
  [id]/history.tsx       — Event timeline for completed game

(profile)/
  [userId].tsx           — View friend's profile, head-to-head stats
  edit.tsx               — Edit own profile (username, avatar, display name)

(friends)/
  search.tsx             — Search users by username
  requests.tsx           — Pending incoming/outgoing requests
```

### 3.2 New Components

```
components/
  game/
    ScoreDisplay.tsx       — Universal score display (uses engine.formatScore)
    ActionBar.tsx          — Sport-specific action buttons (uses engine.getActions)
    GameCard.tsx           — Game preview card for lists
    EventTimeline.tsx      — Scrollable event list for a game
    PeriodIndicator.tsx    — Shows current period/quarter/set/inning
    ServeIndicator.tsx     — Shows who is serving (tennis, TT, badminton, volleyball)
  friends/
    FriendCard.tsx         — Friend list item with avatar, stats
    FriendRequestCard.tsx  — Accept/decline UI
    InviteCard.tsx         — Game invite with accept/decline
    HeadToHead.tsx         — H2H stats display between two users
    SearchResult.tsx       — User search result item
  profile/
    AvatarPicker.tsx       — Avatar selection/upload
    StatsBadge.tsx         — Win/Loss/Draw display
    StreakBadge.tsx         — Current streak indicator
```

### 3.3 Zustand Store Extensions

Add three new slices to the existing combined store:

```typescript
// Friends Slice
interface FriendsState {
  friends: Profile[];
  pendingRequests: Friendship[];
  friendsLoading: boolean;
}

// Games Slice (multiplayer)
interface GamesState {
  activeGames: Game[];
  gameHistory: Game[];
  currentGame: Game | null;
  gamesLoading: boolean;
}

// Invites Slice
interface InvitesState {
  pendingInvites: GameInvite[];
  invitesLoading: boolean;
}
```

---

## 4. Data Flow & Real-time Sync

### 4.1 Two-Player Scoring Flow

```
Player A taps "+3"
  │
  ├─→ 1. Engine computes new state locally (optimistic update)
  ├─→ 2. UI updates instantly
  ├─→ 3. INSERT game_event row
  └─→ 4. UPDATE games SET scoring_state, team_a_score, team_b_score
              │
              ├─→ Supabase Realtime broadcasts UPDATE to games channel
              │      │
              │      └─→ Player B receives new scoring_state
              │            ├─→ Replace local state with server state
              │            └─→ UI updates
              │
              └─→ Supabase Realtime broadcasts INSERT to game_events channel
                     └─→ Both players see new event in timeline
```

### 4.2 Conflict Resolution

Since scoring is sequential (one tap at a time), true conflicts are rare. Strategy:

1. **Optimistic updates**: Apply action locally, send to server.
2. **Server is source of truth**: On receiving a realtime update, replace local `scoring_state` with server version.
3. **Event ordering**: `game_events.created_at` (server timestamp) is canonical order.
4. **Concurrent taps**: If both players tap within the same Supabase transaction window, both events are recorded. The `scoring_state` on `games` is updated via a Supabase edge function that applies events sequentially:

```typescript
// Supabase Edge Function: apply-score
// Called by client after inserting a game_event
// Reads all events for the game, replays through engine, updates games.scoring_state
// This ensures consistency even if two events arrive simultaneously.
```

For v1, we use client-side optimistic updates with server reconciliation (simpler, <1s latency for most cases). The edge function replay is a v2 enhancement if conflicts are observed in production.

### 4.3 Subscription Architecture

```typescript
// src/lib/gameSync.ts

export function subscribeToGame(gameId: string, callbacks: {
  onStateUpdate: (game: Game) => void;
  onNewEvent: (event: GameEvent) => void;
}) {
  const channel = supabase
    .channel(`game:${gameId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'games',
      filter: `id=eq.${gameId}`,
    }, (payload) => callbacks.onStateUpdate(payload.new as Game))
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'game_events',
      filter: `game_id=eq.${gameId}`,
    }, (payload) => callbacks.onNewEvent(payload.new as GameEvent))
    .subscribe();

  return () => supabase.removeChannel(channel);
}
```

### 4.4 Invite Flow

```
Player A → "Challenge Dave to Basketball"
  │
  ├─→ INSERT INTO game_invites (from=A, to=Dave, sport=basketball, status=pending)
  │      └─→ Realtime broadcast to Dave
  │
  └─→ Dave sees invite notification
        │
        ├─→ Accept:
        │     ├─→ UPDATE game_invites SET status='accepted'
        │     ├─→ INSERT INTO games (sport, team_a_user=A, team_b_user=Dave)
        │     ├─→ UPDATE game_invites SET game_id=new_game_id
        │     └─→ Both players navigate to game screen
        │
        └─→ Decline:
              └─→ UPDATE game_invites SET status='declined'
```

---

## 5. Apple Watch Architecture

### 5.1 Overview

The Apple Watch app is a native SwiftUI watchOS app. It cannot be built with Expo/React Native — it requires a separate Xcode project embedded in the iOS app. The watch app communicates with the phone via WatchConnectivity and can also connect directly to Supabase for independent operation.

### 5.2 Project Structure

```
ios/
  Surve/                          — Main iOS app (generated by Expo)
  SurveWatch/                     — watchOS app target
    SurveWatchApp.swift           — App entry point
    ContentView.swift             — Tab/navigation root
    Views/
      ActiveGameView.swift        — Main scoring screen
      GameListView.swift          — List of active/recent games
      NewGameView.swift           — Quick-start game creation
      GameSummaryView.swift       — Post-game results
    ViewModels/
      GameViewModel.swift         — Game state + scoring logic
      SyncViewModel.swift         — WatchConnectivity + Supabase sync
    Models/
      WatchGame.swift             — Local game model
      WatchScoreAction.swift      — Score action model
    Services/
      WatchConnectivityService.swift  — Phone ↔ Watch messaging
      SupabaseWatchClient.swift       — Direct Supabase REST calls
      OfflineQueueService.swift       — Queue actions when offline
    Complications/
      ScoreComplication.swift     — Watch face complication
    Extensions/
      HapticManager.swift         — Watch haptic feedback
```

### 5.3 Sync Strategy (Dual-Mode)

**Primary: WatchConnectivity** (Phone ↔ Watch direct link)
- Used when phone is reachable (Bluetooth/WiFi)
- Phone is the hub: receives watch actions, applies to engine, syncs to Supabase, sends updated state back
- Low latency (<200ms round trip)
- Messages: `startGame`, `scoreAction`, `endGame`, `syncState`

**Fallback: Direct Supabase** (Watch independent)
- Used when phone is not reachable
- Watch makes direct REST API calls to Supabase
- Requires auth token transfer from phone to watch (done once during setup via `WCSession.transferUserInfo`)
- Higher latency but fully independent

**Offline Queue:**
- When neither phone nor internet is available, actions are queued locally on watch
- Queue stored in `UserDefaults` (watchOS)
- On reconnection, queue is replayed in order
- Each queued action includes a client-generated UUID to prevent duplicate application

### 5.4 Watch UI Specifications

**ActiveGameView (Main Screen)**
```
┌────────────────────────┐
│      ⚽ Football       │  ← Sport icon + name
├────────────────────────┤
│  HOME    │    AWAY     │  ← Team names (truncated to fit)
│          │             │
│   12     │     9       │  ← Large scores (SF Pro Rounded, 48pt)
│          │             │
│   [+]    │    [+]      │  ← Full-width tap targets (each half of screen)
├────────────────────────┤
│  1st Half  ⏱ 45:22    │  ← Period + elapsed time
└────────────────────────┘
```

- Tap left half → score team A. Tap right half → score team B.
- For multi-action sports (basketball, rugby): tap opens a brief action picker that auto-dismisses.
- Digital Crown: scroll through recent events.
- Force press / long press: game actions menu (end game, pause, undo last).

**Haptics:**
- Score tap: `.success` haptic
- Undo: `.warning` haptic
- Game end: `.notification` sequence

**Complications:**
- Circular: team A score – team B score
- Rectangular: "Football: Home 3 - Away 1"
- Updates via `CLKComplicationServer` timeline entries, pushed from phone via WatchConnectivity

### 5.5 Watch Size Adaptation

Use SwiftUI's adaptive layout:
- `@Environment(\.watchSize)` for conditional sizing
- Minimum tap target: 44x44pt (Apple HIG)
- Score font: 48pt on 45mm+, 38pt on 41mm, 32pt on 38mm
- Team names: 14pt, single line, truncated with `...`
- Use `.ignoresSafeArea()` to maximize screen usage

---

## 6. File Structure

Complete new/modified file listing:

```
src/
  engines/                        ★ NEW — Pure scoring logic
    types.ts                        Engine interfaces
    football.ts
    basketball.ts
    tennis.ts
    cricket.ts
    table_tennis.ts
    badminton.ts
    rugby.ts
    volleyball.ts
    baseball.ts
    american_football.ts
    general.ts
    index.ts                        Registry + getEngine()

  app/
    (tabs)/
      friends.tsx                 ★ NEW — Friends tab
      sports.tsx                  ★ MODIFIED — Use engines, add new sports
      _layout.tsx                 ★ MODIFIED — Add friends tab
    (game)/                       ★ NEW — Game flow screens
      _layout.tsx
      new.tsx
      [id].tsx
      [id]/summary.tsx
      [id]/history.tsx
    (friends)/                    ★ NEW — Friend management screens
      search.tsx
      requests.tsx
    (profile)/                    ★ NEW — Profile screens
      [userId].tsx
      edit.tsx

  components/
    game/                         ★ NEW
      ScoreDisplay.tsx
      ActionBar.tsx
      GameCard.tsx
      EventTimeline.tsx
      PeriodIndicator.tsx
      ServeIndicator.tsx
    friends/                      ★ NEW
      FriendCard.tsx
      FriendRequestCard.tsx
      InviteCard.tsx
      HeadToHead.tsx
      SearchResult.tsx
    profile/                      ★ NEW
      AvatarPicker.tsx
      StatsBadge.tsx
      StreakBadge.tsx
    sport/
      FieldBackground.tsx         ★ MODIFIED — Add 6 new sport backgrounds

  constants/
    sports.ts                     ★ MODIFIED — Add 6 new sports config

  lib/
    store.ts                      ★ MODIFIED — Add friends, games, invites slices
    sportScores.ts                  (Existing — untouched, still used for solo mode)
    gameSync.ts                   ★ NEW — Multiplayer game subscriptions
    friends.ts                    ★ NEW — Friend CRUD + search
    gameInvites.ts                ★ NEW — Invite CRUD + subscriptions
    games.ts                      ★ NEW — Game CRUD operations

  types/
    index.ts                      ★ MODIFIED — Add Profile, Friendship, Game,
                                    GameEvent, GameInvite, ScoringState types

supabase/
  migrations/
    003_profiles.sql              ★ NEW
    004_friendships.sql           ★ NEW
    005_games.sql                 ★ NEW
    006_game_events.sql           ★ NEW
    007_game_invites.sql          ★ NEW
    008_stats_functions.sql       ★ NEW
    009_realtime_publication.sql  ★ NEW

ios/
  SurveWatch/                     ★ NEW — Entire watchOS app (see Section 5)

ARCHITECTURE.md                   ★ THIS FILE
```

---

## 7. Migration Plan

### Phase 1: Schema + Engine (Backend Lead + CTO)
1. Apply migrations 003–009
2. Implement all 11 scoring engines with unit tests
3. Create `getEngine()` registry

### Phase 2: Friends + Profile (Backend Lead)
1. `lib/friends.ts` — CRUD, search, realtime subscriptions
2. `lib/gameInvites.ts` — Invite lifecycle
3. Profile creation trigger verified
4. Test RLS policies

### Phase 3: Game UI (Frontend Lead) — Parallel with Phase 2
1. Sport selection expanded to 11 sports
2. `ActionBar` + `ScoreDisplay` components using engines
3. Game flow screens: new → active → summary
4. `FieldBackground` additions for 6 new sports

### Phase 4: Friends UI (Frontend Lead)
1. Friends tab, search, requests screens
2. Profile view + edit screens
3. Invite send/receive flow
4. Head-to-head stats display

### Phase 5: Real-time Multiplayer (Backend + Frontend)
1. `gameSync.ts` subscription layer
2. Optimistic update + server reconciliation
3. Two-player scoring tested end-to-end

### Phase 6: Apple Watch (Requires Xcode)
1. Create watchOS target in Xcode
2. Implement SwiftUI views
3. WatchConnectivity service
4. Direct Supabase fallback
5. Offline queue
6. Complications

---

*Architecture designed for Surve v2.0 — the friends and multiplayer update.*
