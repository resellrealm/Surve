import { getLocales } from 'expo-localization';
import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isYesterday,
  isThisYear,
  differenceInSeconds,
} from 'date-fns';

function getDeviceLocale(): string {
  const locales = getLocales();
  return locales[0]?.languageTag ?? 'en-US';
}

/**
 * Smart calendar label for lists/headers:
 *  - Today         -> "Today"
 *  - Yesterday     -> "Yesterday"
 *  - Within year   -> "Mar 12"
 *  - Older         -> "Mar 12, 2024"
 */
export function formatSmartDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisYear(d)) return format(d, 'MMM d');
  return format(d, 'MMM d, yyyy');
}

/**
 * Short relative timestamp for chat rows / notification feeds.
 *  < 30s      -> "now"
 *  < 60m      -> "5m ago"
 *  < 24h      -> "3h ago"
 *  < 7d       -> "2d ago"
 *  otherwise  -> smart date ("Mar 12" / "Mar 12, 2024")
 */
export function formatRelative(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const seconds = differenceInSeconds(new Date(), d);
  if (seconds < 30) return 'now';
  if (seconds < 7 * 86400) {
    return `${formatDistanceToNowStrict(d, { addSuffix: false })
      .replace(/ seconds?/, 's')
      .replace(/ minutes?/, 'm')
      .replace(/ hours?/, 'h')
      .replace(/ days?/, 'd')} ago`;
  }
  return formatSmartDate(d);
}

export function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(getDeviceLocale(), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(getDeviceLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateCompact(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toLocaleDateString(getDeviceLocale(), {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(getDeviceLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(getDeviceLocale(), {
    month: 'long',
    year: 'numeric',
  });
}
