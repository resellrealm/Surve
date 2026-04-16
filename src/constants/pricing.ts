/** Platform fee applied to every booking transaction */
export const PLATFORM_FEE_RATE = 0.05;

/** Boost tier definitions */
export const BOOST_TIERS = {
  standard: {
    label: 'Standard',
    durationDays: 1,
    priceGBP: 5_00, // pence
    priceDisplay: '£5',
  },
  premium: {
    label: 'Premium',
    durationDays: 7,
    priceGBP: 25_00,
    priceDisplay: '£25',
  },
  top: {
    label: 'Top',
    durationDays: 30,
    priceGBP: 80_00,
    priceDisplay: '£80',
  },
} as const;

export type BoostTierKey = keyof typeof BOOST_TIERS;
