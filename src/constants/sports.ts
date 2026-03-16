import type { LucideIcon } from 'lucide-react-native';
import { Shield, Trophy, Dribbble, Target, Crosshair } from 'lucide-react-native';

export interface Sport {
  id: string;
  name: string;
  icon: LucideIcon;
  fieldColor: string;
  fieldLineColor: string;
  accentColor: string;
  scoreLabel: { home: string; away: string };
  pointName: string;
}

export const SPORTS: Sport[] = [
  {
    id: 'rugby',
    name: 'Rugby',
    icon: Shield,
    fieldColor: '#2D5A27',
    fieldLineColor: 'rgba(255,255,255,0.35)',
    accentColor: '#4A8C3F',
    scoreLabel: { home: 'Home', away: 'Away' },
    pointName: 'pts',
  },
  {
    id: 'football',
    name: 'Football',
    icon: Trophy,
    fieldColor: '#1B6B2A',
    fieldLineColor: 'rgba(255,255,255,0.4)',
    accentColor: '#3D9B4F',
    scoreLabel: { home: 'Home', away: 'Away' },
    pointName: 'goals',
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
  },
];
