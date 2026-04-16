/**
 * Lightweight client-side moderation for DMs.
 *
 * Intentionally small — it's a first-line nudge, not a guarantee. Server-side
 * moderation + admin review of `reports` is the backstop.
 *
 * We flag:
 *  - common English profanity (rough list, not exhaustive)
 *  - off-platform contact swaps (phone numbers, bank details, external
 *    payment apps) — these are the #1 scam vector in marketplaces
 */

const PROFANITY = [
  // A very small starter list. Not shipping an exhaustive one here — real
  // deployments should swap in a maintained wordlist.
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'cunt',
  'dick',
  'pussy',
  'nigger',
  'faggot',
];

const PHONE_RE = /(?:\+?\d[\s().-]?){7,}/; // 7+ digit sequences, allowing spaces/dashes
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const OFF_PLATFORM_RE =
  /\b(venmo|cashapp|cash\s?app|zelle|paypal|revolut|wise|whatsapp|telegram|signal|iban|sort\s?code|routing\s?number)\b/i;

import type { ModerationFlag } from '../types';
export type { ModerationFlag } from '../types';

export function moderateText(input: string): ModerationFlag[] {
  const flags: ModerationFlag[] = [];
  const lower = input.toLowerCase();

  for (const word of PROFANITY) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    const m = lower.match(re);
    if (m) {
      flags.push({ kind: 'profanity', match: m[0] });
      break; // one profanity flag is enough
    }
  }

  const phoneMatch = input.match(PHONE_RE);
  if (phoneMatch) flags.push({ kind: 'phone_number', match: phoneMatch[0] });

  const emailMatch = input.match(EMAIL_RE);
  if (emailMatch) flags.push({ kind: 'email', match: emailMatch[0] });

  const offMatch = input.match(OFF_PLATFORM_RE);
  if (offMatch) flags.push({ kind: 'off_platform', match: offMatch[0] });

  return flags;
}

export function friendlyFlagReason(flags: ModerationFlag[]): string {
  const kinds = new Set(flags.map((f) => f.kind));
  if (kinds.has('off_platform') || kinds.has('phone_number') || kinds.has('email')) {
    return "Heads up — don't take payments or conversations off Surve. Deals off-platform aren't protected by escrow and can't be refunded.";
  }
  if (kinds.has('profanity')) {
    return "Please keep it civil — profanity violates the Community Guidelines.";
  }
  return 'Please review your message.';
}
