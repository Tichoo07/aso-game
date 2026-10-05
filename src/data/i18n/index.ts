import type { LocaleId } from '../../storage/save';
import { en, type StringKey } from './en';
import { yo } from './yo';

export type { StringKey };

const LOCALE_TABLES: Record<LocaleId, Partial<Record<StringKey, string>>> = { en, yo };

/** Shown in Settings. */
export const LOCALE_NAMES: Record<LocaleId, string> = {
  en: 'English',
  yo: 'Yorùbá (beta)',
};

let active: LocaleId = 'en';

export function setLocale(id: LocaleId): void {
  active = id;
}

export function getLocale(): LocaleId {
  return active;
}

/** Translate a key, filling {placeholders}. Missing keys fall back to English. */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  let text = LOCALE_TABLES[active][key] ?? en[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
