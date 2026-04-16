import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let initialised = false;

export function initSentry() {
  if (initialised || !DSN) return;
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    // Don't capture anything in __DEV__ unless EXPO_PUBLIC_SENTRY_DEBUG=1
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_DEBUG === '1',
  });
  initialised = true;
}

export function captureError(e: unknown, context?: Record<string, unknown>) {
  if (!DSN) return;
  Sentry.captureException(e, context ? { extra: context } : undefined);
}

export function setSentryUser(user: { id: string; email?: string } | null) {
  if (!DSN) return;
  Sentry.setUser(user ? { id: user.id, email: user.email } : null);
}

export function addNavigationBreadcrumb(
  to: string,
  trigger: 'user' | 'redirect' | 'deeplink' | 'push_notification' | 'timeout' = 'user',
  extra?: Record<string, unknown>,
) {
  if (!DSN) return;
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: to,
    data: { trigger, ...extra },
    level: 'info',
  });
}

export { Sentry };
