// ─── Categories List ─────────────────────────────────────────────────────────

export const categories = [
  { key: 'all' as const, label: 'All' },
  { key: 'hotel' as const, label: 'Hotels' },
  { key: 'restaurant' as const, label: 'Restaurants' },
  { key: 'bar' as const, label: 'Bars' },
  { key: 'cafe' as const, label: 'Cafes' },
  { key: 'resort' as const, label: 'Resorts' },
  { key: 'spa' as const, label: 'Spas' },
];

// ─── Follower Ranges ────────────────────────────────────────────────────────

export const followerRanges = [
  { key: 'all' as const, label: 'Any', min: null, max: null },
  { key: '1k' as const, label: '1K+', min: 1000, max: null },
  { key: '10k' as const, label: '10K+', min: 10000, max: null },
  { key: '50k' as const, label: '50K+', min: 50000, max: null },
  { key: '100k' as const, label: '100K+', min: 100000, max: null },
  { key: '500k' as const, label: '500K+', min: 500000, max: null },
];

// ─── Engagement Rate Ranges ─────────────────────────────────────────────────

export const engagementRanges = [
  { key: 'all' as const, label: 'Any', min: null },
  { key: '1' as const, label: '1%+', min: 1 },
  { key: '3' as const, label: '3%+', min: 3 },
  { key: '5' as const, label: '5%+', min: 5 },
  { key: '8' as const, label: '8%+', min: 8 },
  { key: '10' as const, label: '10%+', min: 10 },
];

// ─── Audience Filter Templates ─────────────────────────────────────────────

export interface FilterTemplate {
  key: string;
  label: string;
  description: string;
  icon: string;
  minFollowers: string;
  minEngagement: string;
  platform: string;
  contentType: string;
}

export const filterTemplates: FilterTemplate[] = [
  {
    key: 'all',
    label: 'All Audiences',
    description: 'No restrictions — open to any creator',
    icon: 'globe',
    minFollowers: '',
    minEngagement: '',
    platform: 'instagram',
    contentType: '',
  },
  {
    key: 'nano',
    label: 'Nano Creators',
    description: '1K–10K followers, high authenticity',
    icon: 'sparkles',
    minFollowers: '1000',
    minEngagement: '5',
    platform: 'instagram',
    contentType: 'Reels + Stories',
  },
  {
    key: 'micro',
    label: 'Micro-Influencers',
    description: '10K–50K followers, strong niche engagement',
    icon: 'zap',
    minFollowers: '10000',
    minEngagement: '3',
    platform: 'instagram',
    contentType: 'Reels + Stories',
  },
  {
    key: 'mid',
    label: 'Mid-Tier Creators',
    description: '50K–100K followers, broad reach',
    icon: 'trending-up',
    minFollowers: '50000',
    minEngagement: '2',
    platform: 'both',
    contentType: 'Reels + TikToks',
  },
  {
    key: 'macro',
    label: 'Macro Influencers',
    description: '100K+ followers, maximum exposure',
    icon: 'star',
    minFollowers: '100000',
    minEngagement: '1',
    platform: 'both',
    contentType: 'Reels + TikToks + Stories',
  },
  {
    key: 'tiktok-first',
    label: 'TikTok First',
    description: 'Short-form video specialists on TikTok',
    icon: 'video',
    minFollowers: '10000',
    minEngagement: '3',
    platform: 'tiktok',
    contentType: 'TikToks',
  },
  {
    key: 'high-engagement',
    label: 'High Engagement',
    description: '8%+ engagement rate, any follower count',
    icon: 'heart',
    minFollowers: '',
    minEngagement: '8',
    platform: 'instagram',
    contentType: '',
  },
];

// ─── Platforms List ──────────────────────────────────────────────────────────

export const platforms = [
  { key: 'all' as const, label: 'All' },
  { key: 'instagram' as const, label: 'Instagram' },
  { key: 'tiktok' as const, label: 'TikTok' },
  { key: 'both' as const, label: 'Both' },
];
