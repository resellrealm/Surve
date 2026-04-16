import { getLocales } from 'expo-localization';

function getDeviceLocale(): string {
  const locales = getLocales();
  return locales[0]?.languageTag ?? 'en-US';
}

/**
 * Format a money amount using Intl.NumberFormat.
 *
 * - Dollars in (default): pass `{ amount: 1234.56 }` -> "$1,234.56"
 * - Cents in: pass `{ cents: 123456 }` -> "$1,234.56"
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  options?: { fromCents?: boolean; minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const amount = options?.fromCents ? value / 100 : value;
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;

  try {
    return new Intl.NumberFormat(getDeviceLocale(), {
      style: 'currency',
      currency,
      minimumFractionDigits:
        options?.minimumFractionDigits ?? fractionDigits,
      maximumFractionDigits:
        options?.maximumFractionDigits ?? Math.max(fractionDigits, 2),
    }).format(amount);
  } catch {
    // Fallback if currency code is unsupported
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: Math.max(fractionDigits, 2),
    })}`;
  }
}

export function formatCurrencyCents(cents: number, currency: string = 'USD'): string {
  return formatCurrency(cents, currency, { fromCents: true });
}

/** Range helper used in listings (e.g. "$500 – $1,000"). */
export function formatCurrencyRange(
  min: number,
  max: number,
  currency: string = 'USD'
): string {
  if (min === max) return formatCurrency(min, currency);
  return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
}
