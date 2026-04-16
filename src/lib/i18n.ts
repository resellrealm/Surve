/**
 * i18n scaffolding. The app is English-only right now — this just sets up the
 * plumbing so future translations don't require a refactor.
 *
 * Usage:
 *   import { t } from '@/lib/i18n';
 *   <Text>{t('common.save')}</Text>
 *
 * When we're ready to localise, add src/i18n/locales/es.json (etc.),
 * import it below, and merge into `translations`. That's it.
 */
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

import en from '../i18n/locales/en.json';

const i18n = new I18n({ en });

i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const locales = getLocales();
i18n.locale = locales[0]?.languageCode ?? 'en';

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

export function setLocale(locale: string) {
  i18n.locale = locale;
}

export function currentLocale(): string {
  return i18n.locale;
}

export default i18n;
