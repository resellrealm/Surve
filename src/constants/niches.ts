import { Ionicons } from '@expo/vector-icons';

export interface Niche {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const NICHES: readonly Niche[] = [
  { key: 'food', label: 'Food', icon: 'restaurant-outline', color: '#E74C3C' },
  { key: 'travel', label: 'Travel', icon: 'airplane-outline', color: '#3498DB' },
  { key: 'lifestyle', label: 'Lifestyle', icon: 'sunny-outline', color: '#F39C12' },
  { key: 'fashion', label: 'Fashion', icon: 'shirt-outline', color: '#9B59B6' },
  { key: 'fitness', label: 'Fitness', icon: 'barbell-outline', color: '#27AE60' },
  { key: 'tech', label: 'Tech', icon: 'hardware-chip-outline', color: '#2C3E50' },
  { key: 'beauty', label: 'Beauty', icon: 'sparkles-outline', color: '#E91E63' },
  { key: 'gaming', label: 'Gaming', icon: 'game-controller-outline', color: '#8E44AD' },
  { key: 'music', label: 'Music', icon: 'musical-notes-outline', color: '#1ABC9C' },
  { key: 'comedy', label: 'Comedy', icon: 'happy-outline', color: '#FF9800' },
  { key: 'pets', label: 'Pets', icon: 'paw-outline', color: '#795548' },
  { key: 'family', label: 'Family', icon: 'people-outline', color: '#607D8B' },
] as const;

/** Look up a niche by key. Returns undefined if not found. */
export function getNicheByKey(key: string): Niche | undefined {
  return NICHES.find((n) => n.key === key);
}
