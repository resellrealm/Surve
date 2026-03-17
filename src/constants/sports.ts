import type { LucideIcon } from 'lucide-react-native';
import {
  Shield,
  Trophy,
  Dribbble,
  Target,
  Crosshair,
  CircleDot,
  Feather,
  Volleyball,
  Disc,
  Star,
  Gamepad2,
} from 'lucide-react-native';

export type ScoringMode =
  | 'simple'           // +1/-1 (football, general)
  | 'multi_point'      // Multiple point values (basketball, rugby, american_football)
  | 'tennis'           // Sets > Games > Points with deuce
  | 'cricket'          // Runs, wickets, overs
  | 'sets'             // Set-based (volleyball, table_tennis, badminton)
  | 'innings';         // Inning-based (baseball)

export interface ScoreAction {
  label: string;
  points: number;
  team?: 'home' | 'away' | 'both';
  type?: 'score' | 'action' | 'period';
  color?: string;
}

export interface Sport {
  id: string;
  name: string;
  icon: LucideIcon;
  fieldColor: string;
  fieldLineColor: string;
  accentColor: string;
  scoreLabel: { home: string; away: string };
  pointName: string;
  scoringMode: ScoringMode;
  scoreActions?: ScoreAction[];
  periods?: { name: string; count: number };
}

export const SPORTS: Sport[] = [
  {
    id: 'football',
    name: 'Football',
    icon: Trophy,
    fieldColor: '#1B6B2A',
    fieldLineColor: 'rgba(255,255,255,0.4)',
    accentColor: '#3D9B4F',
    scoreLabel: { home: 'Home', away: 'Away' },
    pointName: 'goals',
    scoringMode: 'simple',
    scoreActions: [
      { label: 'Goal', points: 1, type: 'score' },
      { label: 'Yellow Card', points: 0, type: 'action', color: '#EAB308' },
      { label: 'Red Card', points: 0, type: 'action', color: '#DC2626' },
    ],
    periods: { name: 'Half', count: 2 },
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: Dribbble,
    fieldColor: '#8B5E3C',
    fieldLineColor: 'rgba(255,255,255,0.3)',
    accentColor: '#C4884D',
    scoreLabel: { home: 'Home', away: 'Away' },
    pointName: 'pts',
    scoringMode: 'multi_point',
    scoreActions: [
      { label: '+1', points: 1, type: 'score' },
      { label: '+2', points: 2, type: 'score' },
      { label: '+3', points: 3, type: 'score' },
      { label: 'Foul', points: 0, type: 'action', color: '#EAB308' },
      { label: 'Timeout', points: 0, type: 'action', color: '#6B7280' },
    ],
    periods: { name: 'Quarter', count: 4 },
  },
  {
    id: 'tennis',
    name: 'Tennis',
    icon: Target,
    fieldColor: '#1A6B4A',
    fieldLineColor: 'rgba(255,255,255,0.4)',
    accentColor: '#2D9B6F',
    scoreLabel: { home: 'Player 1', away: 'Player 2' },
    pointName: 'games',
    scoringMode: 'tennis',
  },
  {
    id: 'cricket',
    name: 'Cricket',
    icon: Crosshair,
    fieldColor: '#3A7A2E',
    fieldLineColor: 'rgba(255,255,255,0.3)',
    accentColor: '#5BA84E',
    scoreLabel: { home: 'Batting', away: 'Bowling' },
    pointName: 'runs',
    scoringMode: 'cricket',
    scoreActions: [
      { label: '1', points: 1, type: 'score' },
      { label: '2', points: 2, type: 'score' },
      { label: '3', points: 3, type: 'score' },
      { label: '4', points: 4, type: 'score', color: '#3B82F6' },
      { label: '6', points: 6, type: 'score', color: '#8B5CF6' },
      { label: 'Wide', points: 1, type: 'action', color: '#EAB308' },
      { label: 'No Ball', points: 1, type: 'action', color: '#EF4444' },
      { label: 'Wicket', points: 0, type: 'action', color: '#DC2626' },
    ],
  },
  {
    id: 'rugby',
    name: 'Rugby',
    icon: Shield,
    fieldColor: '#2D5A27',
    fieldLineColor: 'rgba(255,255,255,0.35)',
    accentColor: '#4A8C3F',
    scoreLabel: { home: 'Home', away: 'Away' },
    pointName: 'pts',
    scoringMode: 'multi_point',
    scoreActions: [
      { label: 'Try', points: 5, type: 'score' },
      { label: 'Conv', points: 2, type: 'score' },
      { label: 'Pen', points: 3, type: 'score' },
      { label: 'Drop', points: 3, type: 'score' },
    ],
    periods: { name: 'Half', count: 2 },
  },
  {
    id: 'table_tennis',
    name: 'Table Tennis',
    icon: CircleDot,
    fieldColor: '#1A4A6B',
    fieldLineColor: 'rgba(255,255,255,0.3)',
    accentColor: '#2D7BB6',
    scoreLabel: { home: 'Player 1', away: 'Player 2' },
    pointName: 'pts',
    scoringMode: 'sets',
    periods: { name: 'Game', count: 7 },
  },
  {
    id: 'badminton',
    name: 'Badminton',
    icon: Feather,
    fieldColor: '#2D5A6B',
    fieldLineColor: 'rgba(255,255,255,0.35)',
    accentColor: '#4A9BB6',
    scoreLabel: { home: 'Player 1', away: 'Player 2' },
    pointName: 'pts',
    scoringMode: 'sets',
    periods: { name: 'Game', count: 3 },
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    icon: Volleyball,
    fieldColor: '#6B4A1A',
    fieldLineColor: 'rgba(255,255,255,0.3)',
    accentColor: '#B6842D',
    scoreLabel: { home: 'Home', away: 'Away' },
    pointName: 'pts',
    scoringMode: 'sets',
    periods: { name: 'Set', count: 5 },
  },
  {
    id: 'baseball',
    name: 'Baseball',
    icon: Disc,
    fieldColor: '#5A4A27',
    fieldLineColor: 'rgba(255,255,255,0.3)',
    accentColor: '#8C7A3F',
    scoreLabel: { home: 'Home', away: 'Away' },
    pointName: 'runs',
    scoringMode: 'innings',
    periods: { name: 'Inning', count: 9 },
  },
  {
    id: 'american_football',
    name: 'American Football',
    icon: Star,
    fieldColor: '#2D4A27',
    fieldLineColor: 'rgba(255,255,255,0.35)',
    accentColor: '#4A7C3F',
    scoreLabel: { home: 'Home', away: 'Away' },
    pointName: 'pts',
    scoringMode: 'multi_point',
    scoreActions: [
      { label: 'TD', points: 6, type: 'score' },
      { label: 'XP', points: 1, type: 'score' },
      { label: '2PT', points: 2, type: 'score' },
      { label: 'FG', points: 3, type: 'score' },
      { label: 'Safety', points: 2, type: 'score', color: '#EAB308' },
    ],
    periods: { name: 'Quarter', count: 4 },
  },
  {
    id: 'general',
    name: 'General',
    icon: Gamepad2,
    fieldColor: '#4A4A4A',
    fieldLineColor: 'rgba(255,255,255,0.2)',
    accentColor: '#7A7A7A',
    scoreLabel: { home: 'Team A', away: 'Team B' },
    pointName: 'pts',
    scoringMode: 'simple',
  },
];

export function getSportById(id: string): Sport | undefined {
  return SPORTS.find((s) => s.id === id);
}
