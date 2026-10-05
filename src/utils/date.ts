/** Local calendar date as YYYY-MM-DD. Daily challenges are keyed by this. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "5 Oct" style label for a date key. */
export function shortDateLabel(key: string, locale = 'en-GB'): string {
  return parseDateKey(key).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
