import type { LucideIcon } from 'lucide-react-native';
import { Shield, Circle, CircleDot, Target, Crosshair } from 'lucide-react-native';

export interface Sport {
  id: string;
  name: string;
  icon: LucideIcon;
  fieldColor: string;
  fieldLineColor: string;
  accentColor: string;
}

export const SPORTS: Sport[] = [
  {
    id: 'rugby',
    name: 'Rugby',
    icon: Shield,
    fieldColor: '#2D5A27',
    fieldLineColor: 'rgba(255,255,255,0.35)',
    accentColor: '#4A8C3F',
  },
  {
    id: 'football',
    name: 'Football',
    icon: Circle,
    fieldColor: '#1B6B2A',
    fieldLineColor: 'rgba(255,255,255,0.4)',
    accentColor: '#3D9B4F',
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: CircleDot,
    fieldColor: '#8B5E3C',
    fieldLineColor: 'rgba(255,255,255,0.3)',
    accentColor: '#C4884D',
  },
  {
    id: 'tennis',
    name: 'Tennis',
    icon: Target,
    fieldColor: '#1A6B4A',
    fieldLineColor: 'rgba(255,255,255,0.4)',
    accentColor: '#2D9B6F',
  },
  {
    id: 'cricket',
    name: 'Cricket',
    icon: Crosshair,
    fieldColor: '#3A7A2E',
    fieldLineColor: 'rgba(255,255,255,0.3)',
    accentColor: '#5BA84E',
  },
];
