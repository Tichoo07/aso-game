import type { StringKey } from './en';

/**
 * Yorùbá (beta). Deliberately partial: only short labels are translated, and
 * everything else falls back to English. Have a native speaker review and
 * extend this before treating it as complete.
 */
export const yo: Partial<Record<StringKey, string>> = {
  play: 'ṢERÉ',
  home: 'ILÉ',
  playAgain: 'TÚN ṢERÉ',
  settings: 'Ètò',
  sound: 'Ohùn',
  music: 'Orin',
  language: 'Èdè',
  about: 'Nípa',
};
