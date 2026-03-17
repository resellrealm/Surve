// Scoring engine for sport-specific game state management

// ─── Tennis ─────────────────────────────────────────────────────────────────

export interface TennisState {
  sets: { home: number; away: number }[];
  currentSet: number;
  games: { home: number; away: number };
  points: { home: number; away: number };
  isTiebreak: boolean;
  isDeuce: boolean;
  advantage: 'home' | 'away' | null;
  winner: 'home' | 'away' | null;
  bestOfSets: number;
}

const TENNIS_POINTS = [0, 15, 30, 40] as const;

export function createTennisState(bestOfSets = 3): TennisState {
  return {
    sets: [{ home: 0, away: 0 }],
    currentSet: 0,
    games: { home: 0, away: 0 },
    points: { home: 0, away: 0 },
    isTiebreak: false,
    isDeuce: false,
    advantage: null,
    winner: null,
    bestOfSets,
  };
}

export function tennisPointDisplay(state: TennisState, team: 'home' | 'away'): string {
  if (state.isTiebreak) return String(state.points[team]);
  if (state.isDeuce) {
    if (state.advantage === team) return 'AD';
    if (state.advantage !== null) return '40';
    return '40';
  }
  const idx = state.points[team];
  if (idx >= 3) return '40';
  return String(TENNIS_POINTS[idx]);
}

export function tennisScorePoint(state: TennisState, team: 'home' | 'away'): TennisState {
  const s = JSON.parse(JSON.stringify(state)) as TennisState;
  if (s.winner) return s;
  const other = team === 'home' ? 'away' : 'home';

  if (s.isTiebreak) {
    s.points[team]++;
    const totalPoints = s.points.home + s.points.away;
    // Tiebreak win: first to 7 with 2+ lead
    if (s.points[team] >= 7 && s.points[team] - s.points[other] >= 2) {
      return winGame(s, team);
    }
    // Change serve every 2 points (after first point)
    return s;
  }

  // Regular game scoring
  if (s.isDeuce) {
    if (s.advantage === team) {
      // Win game
      return winGame(s, team);
    } else if (s.advantage === other) {
      s.advantage = null;
      return s;
    } else {
      s.advantage = team;
      return s;
    }
  }

  s.points[team]++;

  // Check for deuce
  if (s.points.home >= 3 && s.points.away >= 3) {
    s.isDeuce = true;
    s.advantage = null;
    if (s.points[team] > s.points[other]) {
      s.advantage = team;
    }
    return s;
  }

  // Win game at 4 points (index >= 4 means past 40)
  if (s.points[team] >= 4) {
    return winGame(s, team);
  }

  return s;
}

function winGame(state: TennisState, team: 'home' | 'away'): TennisState {
  const other = team === 'home' ? 'away' : 'home';
  state.games[team]++;
  state.points = { home: 0, away: 0 };
  state.isDeuce = false;
  state.advantage = null;
  state.isTiebreak = false;

  // Check set win (6 games with 2+ lead, or tiebreak at 7)
  if (
    (state.games[team] >= 6 && state.games[team] - state.games[other] >= 2) ||
    state.games[team] >= 7
  ) {
    return winSet(state, team);
  }

  // Check for tiebreak (6-6)
  if (state.games.home === 6 && state.games.away === 6) {
    state.isTiebreak = true;
  }

  return state;
}

function winSet(state: TennisState, team: 'home' | 'away'): TennisState {
  state.sets[state.currentSet] = { ...state.games };
  const setsWon = { home: 0, away: 0 };
  for (const set of state.sets) {
    if (set.home > set.away) setsWon.home++;
    else if (set.away > set.home) setsWon.away++;
  }

  const setsToWin = Math.ceil(state.bestOfSets / 2);
  if (setsWon[team] >= setsToWin) {
    state.winner = team;
    return state;
  }

  // New set
  state.currentSet++;
  state.sets.push({ home: 0, away: 0 });
  state.games = { home: 0, away: 0 };
  return state;
}

// ─── Cricket ────────────────────────────────────────────────────────────────

export interface CricketState {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: { wides: number; noBalls: number };
  runRate: number;
  innings: number;
  firstInningsScore: number | null;
  target: number | null;
  winner: 'home' | 'away' | null;
}

export function createCricketState(): CricketState {
  return {
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { wides: 0, noBalls: 0 },
    runRate: 0,
    innings: 1,
    firstInningsScore: null,
    target: null,
    winner: null,
  };
}

export function cricketAddRuns(state: CricketState, runs: number, isLegalDelivery = true): CricketState {
  const s = { ...state, extras: { ...state.extras } };
  s.runs += runs;
  if (isLegalDelivery) {
    s.balls++;
    if (s.balls >= 6) {
      s.overs++;
      s.balls = 0;
    }
  }
  const totalBalls = s.overs * 6 + s.balls;
  s.runRate = totalBalls > 0 ? (s.runs / totalBalls) * 6 : 0;

  // Check if target reached
  if (s.target !== null && s.runs >= s.target) {
    s.winner = s.innings === 2 ? 'away' : 'home';
  }

  return s;
}

export function cricketWicket(state: CricketState): CricketState {
  const s = { ...state, extras: { ...state.extras } };
  s.wickets++;
  s.balls++;
  if (s.balls >= 6) {
    s.overs++;
    s.balls = 0;
  }
  // All out at 10 wickets
  if (s.wickets >= 10) {
    if (s.innings === 1) {
      s.firstInningsScore = s.runs;
      s.target = s.runs + 1;
    }
  }
  return s;
}

export function cricketWide(state: CricketState): CricketState {
  const s = { ...state, extras: { ...state.extras } };
  s.runs += 1;
  s.extras.wides++;
  // Wide doesn't count as a ball
  return s;
}

export function cricketNoBall(state: CricketState): CricketState {
  const s = { ...state, extras: { ...state.extras } };
  s.runs += 1;
  s.extras.noBalls++;
  // No ball doesn't count as legal delivery
  return s;
}

export function formatOvers(state: CricketState): string {
  return `${state.overs}.${state.balls}`;
}

// ─── Set-based Sports (Volleyball, Table Tennis, Badminton) ─────────────────

export interface SetBasedState {
  sets: { home: number; away: number }[];
  currentSet: number;
  setsWon: { home: number; away: number };
  points: { home: number; away: number };
  serving: 'home' | 'away';
  winner: 'home' | 'away' | null;
  pointsToWin: number;
  decidingSetPoints: number;
  bestOfSets: number;
  serveChangeInterval: number; // 0 = on point win (badminton/volleyball), 2 = every 2 points (table tennis)
}

export function createSetBasedState(
  sportId: string,
): SetBasedState {
  const configs: Record<string, { pointsToWin: number; decidingSetPoints: number; bestOfSets: number; serveChangeInterval: number }> = {
    volleyball: { pointsToWin: 25, decidingSetPoints: 15, bestOfSets: 5, serveChangeInterval: 0 },
    table_tennis: { pointsToWin: 11, decidingSetPoints: 11, bestOfSets: 7, serveChangeInterval: 2 },
    badminton: { pointsToWin: 21, decidingSetPoints: 21, bestOfSets: 3, serveChangeInterval: 0 },
  };

  const config = configs[sportId] ?? configs.volleyball;
  return {
    sets: [{ home: 0, away: 0 }],
    currentSet: 0,
    setsWon: { home: 0, away: 0 },
    points: { home: 0, away: 0 },
    serving: 'home',
    winner: null,
    ...config,
  };
}

export function setBasedScorePoint(state: SetBasedState, team: 'home' | 'away'): SetBasedState {
  const s = JSON.parse(JSON.stringify(state)) as SetBasedState;
  if (s.winner) return s;
  const other = team === 'home' ? 'away' : 'home';

  s.points[team]++;

  // Update serve
  if (s.serveChangeInterval === 0) {
    // Serve changes on every point win (rally point - serve goes to winner)
    s.serving = team;
  } else {
    // Serve changes every N points
    const totalPoints = s.points.home + s.points.away;
    if (totalPoints % s.serveChangeInterval === 0) {
      s.serving = s.serving === 'home' ? 'away' : 'home';
    }
    // At deuce (both >= pointsToWin-1), serve changes every point
    if (s.points.home >= s.pointsToWin - 1 && s.points.away >= s.pointsToWin - 1) {
      s.serving = s.serving === 'home' ? 'away' : 'home';
    }
  }

  const setsToWin = Math.ceil(s.bestOfSets / 2);
  const isDecidingSet = s.setsWon.home === setsToWin - 1 && s.setsWon.away === setsToWin - 1;
  const target = isDecidingSet ? s.decidingSetPoints : s.pointsToWin;

  // Check set win (need 2-point lead)
  if (s.points[team] >= target && s.points[team] - s.points[other] >= 2) {
    s.sets[s.currentSet] = { ...s.points };
    s.setsWon[team]++;

    if (s.setsWon[team] >= setsToWin) {
      s.winner = team;
      return s;
    }

    // New set
    s.currentSet++;
    s.sets.push({ home: 0, away: 0 });
    s.points = { home: 0, away: 0 };
  }

  return s;
}

// ─── Baseball ───────────────────────────────────────────────────────────────

export interface BaseballState {
  innings: { home: number; away: number }[];
  currentInning: number;
  isTopOfInning: boolean;
  outs: number;
  bases: [boolean, boolean, boolean]; // 1st, 2nd, 3rd
  totalScore: { home: number; away: number };
  winner: 'home' | 'away' | null;
}

export function createBaseballState(): BaseballState {
  return {
    innings: [{ home: 0, away: 0 }],
    currentInning: 0,
    isTopOfInning: true,
    outs: 0,
    bases: [false, false, false],
    totalScore: { home: 0, away: 0 },
    winner: null,
  };
}

export function baseballAddRun(state: BaseballState): BaseballState {
  const s = JSON.parse(JSON.stringify(state)) as BaseballState;
  if (s.winner) return s;

  const team = s.isTopOfInning ? 'away' : 'home';
  s.innings[s.currentInning][team]++;
  s.totalScore[team]++;
  return s;
}

export function baseballAddOut(state: BaseballState): BaseballState {
  const s = JSON.parse(JSON.stringify(state)) as BaseballState;
  if (s.winner) return s;

  s.outs++;
  if (s.outs >= 3) {
    s.outs = 0;
    s.bases = [false, false, false];

    if (s.isTopOfInning) {
      s.isTopOfInning = false;
    } else {
      // End of full inning
      if (s.currentInning >= 8) {
        // End of 9th inning (or later)
        if (s.totalScore.home !== s.totalScore.away) {
          s.winner = s.totalScore.home > s.totalScore.away ? 'home' : 'away';
          return s;
        }
        // Extra innings
      }
      s.currentInning++;
      s.innings.push({ home: 0, away: 0 });
      s.isTopOfInning = true;
    }
  }
  return s;
}

// ─── Game Events (for history/undo) ─────────────────────────────────────────

export interface GameEvent {
  id: string;
  type: 'score' | 'undo' | 'action' | 'period_end';
  team: 'home' | 'away';
  points: number;
  label: string;
  timestamp: number;
}

export function createGameEvent(
  type: GameEvent['type'],
  team: 'home' | 'away',
  points: number,
  label: string,
): GameEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    team,
    points,
    label,
    timestamp: Date.now(),
  };
}
