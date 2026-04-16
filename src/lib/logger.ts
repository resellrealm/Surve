/**
 * Dev-only console helpers.
 * In production builds (__DEV__ === false) these are silent no-ops;
 * errors are forwarded to Sentry via `captureError`.
 */
import { captureError } from './sentry';

/* eslint-disable no-console */

export function devLog(...args: unknown[]) {
  if (__DEV__) console.log(...args);
}

export function devWarn(...args: unknown[]) {
  if (__DEV__) console.warn(...args);
}

/**
 * Log an error to Sentry (all builds) **and** to the console (dev only).
 * Pass an optional `context` bag for Sentry extras.
 */
export function logError(
  label: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  if (__DEV__) console.error(label, error);
  captureError(error instanceof Error ? error : new Error(String(error)), {
    label,
    ...context,
  });
}
