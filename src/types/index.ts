// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Survey ──────────────────────────────────────────────────────────────────

export type SurveyStatus = 'draft' | 'active' | 'paused' | 'closed';

export interface Survey {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  questions: Question[];
  settings: SurveySettings;
  response_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  closed_at: string | null;
}

export interface SurveySettings {
  allow_anonymous: boolean;
  require_all_questions: boolean;
  show_progress_bar: boolean;
  randomize_questions: boolean;
  max_responses: number | null;
  expires_at: string | null;
  thank_you_message: string | null;
  brand_color: string | null;
}

// ─── Questions ───────────────────────────────────────────────────────────────

export type QuestionType =
  | 'multiple_choice'
  | 'rating'
  | 'text'
  | 'nps'
  | 'yes_no';

export interface QuestionBase {
  id: string;
  survey_id: string;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  order: number;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'multiple_choice';
  options: MultipleChoiceOption[];
  allow_multiple: boolean;
  allow_other: boolean;
}

export interface MultipleChoiceOption {
  id: string;
  label: string;
  order: number;
}

export interface RatingQuestion extends QuestionBase {
  type: 'rating';
  min_value: number;
  max_value: number;
  min_label: string | null;
  max_label: string | null;
  icon: 'star' | 'heart' | 'number';
}

export interface TextQuestion extends QuestionBase {
  type: 'text';
  multiline: boolean;
  max_length: number | null;
  placeholder: string | null;
}

export interface NPSQuestion extends QuestionBase {
  type: 'nps';
  low_label: string;
  mid_label: string;
  high_label: string;
}

export interface YesNoQuestion extends QuestionBase {
  type: 'yes_no';
  yes_label: string;
  no_label: string;
}

export type Question =
  | MultipleChoiceQuestion
  | RatingQuestion
  | TextQuestion
  | NPSQuestion
  | YesNoQuestion;

// ─── Survey Teams ────────────────────────────────────────────────────────────

export interface SurveyTeam {
  id: string;
  survey_id: string;
  name: string;
  created_at: string;
}

// ─── Response ────────────────────────────────────────────────────────────────

export interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_id: string | null;
  team_id: string | null;
  answers: Answer[];
  started_at: string;
  completed_at: string | null;
  is_complete: boolean;
  metadata: ResponseMetadata | null;
}

export interface Answer {
  question_id: string;
  value: string | number | boolean | string[];
}

export interface ResponseMetadata {
  device: string | null;
  platform: string | null;
  ip_country: string | null;
  duration_seconds: number | null;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface SurveyAnalytics {
  survey_id: string;
  total_responses: number;
  completion_rate: number;
  average_duration_seconds: number;
  responses_by_day: DailyResponseCount[];
  question_analytics: QuestionAnalytics[];
}

export interface DailyResponseCount {
  date: string;
  count: number;
}

export interface QuestionAnalytics {
  question_id: string;
  question_title: string;
  question_type: QuestionType;
  response_count: number;
  skip_count: number;
  data: MultipleChoiceAnalytics | RatingAnalytics | TextAnalytics | NPSAnalytics | YesNoAnalytics;
}

export interface MultipleChoiceAnalytics {
  type: 'multiple_choice';
  option_counts: { option_id: string; label: string; count: number; percentage: number }[];
}

export interface RatingAnalytics {
  type: 'rating';
  average: number;
  distribution: { value: number; count: number; percentage: number }[];
}

export interface TextAnalytics {
  type: 'text';
  average_length: number;
  sample_responses: string[];
}

export interface NPSAnalytics {
  type: 'nps';
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
}

export interface YesNoAnalytics {
  type: 'yes_no';
  yes_count: number;
  no_count: number;
  yes_percentage: number;
}

// ─── Sport Scores ───────────────────────────────────────────────────────────

export type SportType =
  | 'rugby'
  | 'football'
  | 'basketball'
  | 'tennis'
  | 'cricket'
  | 'table_tennis'
  | 'badminton'
  | 'volleyball'
  | 'baseball'
  | 'american_football'
  | 'general';

export type ScoreStatus = 'in_progress' | 'completed' | 'paused';

export interface SportScore {
  id: string;
  user_id: string;
  sport_type: SportType;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: ScoreStatus;
  started_at: string;
  completed_at: string | null;
  metadata: SportScoreMetadata;
  created_at: string;
  updated_at: string;
}

export interface SportScoreMetadata {
  current_period?: number;
  total_periods?: number;
  period_scores?: { period: number; home: number; away: number }[];
  sets?: { set: number; home: number; away: number }[];
  innings?: { inning: number; home: number; away: number }[];
  [key: string]: unknown;
}

// ─── Profile (Gaming/Social Layer) ──────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  favorite_sports: string[];
  total_wins: number;
  total_losses: number;
  total_draws: number;
  created_at: string;
  updated_at: string;
}

// ─── Friendships ────────────────────────────────────────────────────────────

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked' | 'declined';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

// ─── Games ──────────────────────────────────────────────────────────────────

export type GameStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type GameWinner = 'team_a' | 'team_b' | 'draw' | null;

export interface Game {
  id: string;
  sport: SportType;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number;
  team_b_score: number;
  team_a_user_id: string | null;
  team_b_user_id: string | null;
  status: GameStatus;
  winner: GameWinner;
  scoring_state: Record<string, unknown>;
  started_at: string;
  ended_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Game Events ────────────────────────────────────────────────────────────

export type GameEventType =
  | 'score'
  | 'undo'
  | 'timeout'
  | 'period_end'
  | 'period_start'
  | 'set_end'
  | 'game_start'
  | 'game_end';

export type GameEventTeam = 'team_a' | 'team_b' | 'none';

export interface GameEvent {
  id: string;
  game_id: string;
  event_type: GameEventType;
  team: GameEventTeam;
  points: number;
  label: string | null;
  scored_by: string | null;
  snapshot: Record<string, unknown> | null;
  created_at: string;
}

// ─── Game Invites ───────────────────────────────────────────────────────────

export type GameInviteStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface GameInvite {
  id: string;
  from_user_id: string;
  to_user_id: string;
  sport: string;
  status: GameInviteStatus;
  game_id: string | null;
  message: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface HeadToHeadStats {
  total_games: number;
  user_wins: number;
  opponent_wins: number;
  draws: number;
  current_streak: number;
  streak_holder: 'user' | 'opponent' | 'draw' | 'none';
}

export interface HeadToHeadBySport {
  sport: string;
  total_games: number;
  user_wins: number;
  opponent_wins: number;
  draws: number;
  last_played: string | null;
}

export interface UserStreak {
  streak_count: number;
  streak_type: 'win' | 'loss' | 'draw' | 'none';
  last_game_at: string | null;
}

export interface GameScoreSummary {
  game_id: string;
  sport: SportType;
  team_a_name: string;
  team_a_score: number;
  team_b_name: string;
  team_b_score: number;
  status: GameStatus;
  winner: GameWinner;
  started_at: string;
  updated_at: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}
