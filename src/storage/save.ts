import type { GameMode } from '../game/state';

export type LocaleId = 'en' | 'yo';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  language: LocaleId;
}

export interface DailyRecord {
  completed: boolean;
  bestScore: number;
}

export interface CollectionProgress {
  /** Total motifs woven in this collection, repeats included. */
  weaves: number;
}

export interface Lifetime {
  games: number;
  lines: number;
  weaves: number;
}

export const SAVE_VERSION = 1;
export const STORAGE_KEY = 'aso.save';
/** How many daily records to keep. */
const DAILY_HISTORY = 60;

export interface SaveData {
  version: typeof SAVE_VERSION;
  bestScore: number;
  settings: Settings;
  /** Pattern ids the player has woven at least once. */
  unlockedPatterns: string[];
  activeCollection: string;
  collections: Record<string, CollectionProgress>;
  /** Keyed by local date, YYYY-MM-DD. */
  daily: Record<string, DailyRecord>;
  lifetime: Lifetime;
}

export const LOCALES: readonly LocaleId[] = ['en', 'yo'];

export function defaultSettings(prefersReducedMotion = false): Settings {
  return {
    sound: true,
    music: true,
    haptics: true,
    reduceMotion: prefersReducedMotion,
    highContrast: false,
    language: 'en',
  };
}

export function defaultSave(prefersReducedMotion = false): SaveData {
  return {
    version: SAVE_VERSION,
    bestScore: 0,
    settings: defaultSettings(prefersReducedMotion),
    unlockedPatterns: [],
    activeCollection: 'adire',
    collections: {},
    daily: {},
    lifetime: { games: 0, lines: 0, weaves: 0 },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

/** Accepts anything (old saves, corrupt JSON) and returns a valid SaveData. */
export function migrateSave(raw: unknown, fallback: SaveData = defaultSave()): SaveData {
  if (!isObj(raw)) return fallback;
  const s = isObj(raw.settings) ? raw.settings : {};
  const d = fallback.settings;
  const settings: Settings = {
    sound: bool(s.sound, d.sound),
    music: bool(s.music, d.music),
    haptics: bool(s.haptics, d.haptics),
    reduceMotion: bool(s.reduceMotion, d.reduceMotion),
    highContrast: bool(s.highContrast, d.highContrast),
    language: LOCALES.includes(s.language as LocaleId) ? (s.language as LocaleId) : d.language,
  };

  const unlocked = Array.isArray(raw.unlockedPatterns)
    ? [...new Set(raw.unlockedPatterns.filter((x): x is string => typeof x === 'string'))]
    : [];

  const collections: Record<string, CollectionProgress> = {};
  if (isObj(raw.collections)) {
    for (const [id, v] of Object.entries(raw.collections)) {
      if (isObj(v)) collections[id] = { weaves: num(v.weaves, 0) };
    }
  }

  const daily: Record<string, DailyRecord> = {};
  if (isObj(raw.daily)) {
    for (const [key, v] of Object.entries(raw.daily)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && isObj(v)) {
        daily[key] = { completed: bool(v.completed, false), bestScore: num(v.bestScore, 0) };
      }
    }
  }

  const life = isObj(raw.lifetime) ? raw.lifetime : {};
  return {
    version: SAVE_VERSION,
    bestScore: num(raw.bestScore, 0),
    settings,
    unlockedPatterns: unlocked,
    activeCollection: typeof raw.activeCollection === 'string' ? raw.activeCollection : fallback.activeCollection,
    collections,
    daily: pruneDaily(daily),
    lifetime: { games: num(life.games, 0), lines: num(life.lines, 0), weaves: num(life.weaves, 0) },
  };
}

/** Keep only the most recent daily records. */
export function pruneDaily(daily: Record<string, DailyRecord>, keep = DAILY_HISTORY): Record<string, DailyRecord> {
  const keys = Object.keys(daily).sort().slice(-keep);
  return Object.fromEntries(keys.map((k) => [k, daily[k]]));
}

export function withSettings(save: SaveData, patch: Partial<Settings>): SaveData {
  return { ...save, settings: { ...save.settings, ...patch } };
}

/** Record a woven motif: unlocks it and counts it toward its collection. */
export function withWeave(save: SaveData, collectionId: string, patternId: string): SaveData {
  const prev = save.collections[collectionId] ?? { weaves: 0 };
  return {
    ...save,
    unlockedPatterns: save.unlockedPatterns.includes(patternId) ? save.unlockedPatterns : [...save.unlockedPatterns, patternId],
    collections: { ...save.collections, [collectionId]: { weaves: prev.weaves + 1 } },
    lifetime: { ...save.lifetime, weaves: save.lifetime.weaves + 1 },
  };
}

export function withDaily(save: SaveData, key: string, patch: { score?: number; completed?: boolean }): SaveData {
  const prev = save.daily[key] ?? { completed: false, bestScore: 0 };
  const next: DailyRecord = {
    completed: prev.completed || Boolean(patch.completed),
    bestScore: Math.max(prev.bestScore, patch.score ?? 0),
  };
  return { ...save, daily: pruneDaily({ ...save.daily, [key]: next }) };
}

export interface RunSummary {
  mode: GameMode;
  score: number;
  lines: number;
  dailyKey?: string;
  dailyCompleted?: boolean;
}

/** Fold a finished run into the save. isNewBest compares against the mode's own best. */
export function withRunRecorded(save: SaveData, run: RunSummary): { save: SaveData; isNewBest: boolean; best: number } {
  let next: SaveData = {
    ...save,
    lifetime: { ...save.lifetime, games: save.lifetime.games + 1, lines: save.lifetime.lines + run.lines },
  };
  if (run.mode === 'daily' && run.dailyKey) {
    const prevBest = save.daily[run.dailyKey]?.bestScore ?? 0;
    next = withDaily(next, run.dailyKey, { score: run.score, completed: run.dailyCompleted });
    return { save: next, isNewBest: run.score > prevBest, best: Math.max(prevBest, run.score) };
  }
  if (run.mode === 'classic') {
    const isNewBest = run.score > save.bestScore;
    if (isNewBest) next = { ...next, bestScore: run.score };
    return { save: next, isNewBest, best: next.bestScore };
  }
  return { save: next, isNewBest: false, best: save.bestScore };
}

/** The subset of the Web Storage API we use. Lets tests run without a browser. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Owns the current save and writes through to storage on every change. */
export class SaveStore {
  private current: SaveData;

  constructor(
    private readonly storage: KeyValueStore | null,
    prefersReducedMotion = false,
    private readonly key = STORAGE_KEY,
  ) {
    const fallback = defaultSave(prefersReducedMotion);
    let raw: unknown = null;
    try {
      const text = storage?.getItem(key);
      raw = text ? JSON.parse(text) : null;
    } catch {
      raw = null;
    }
    this.current = raw ? migrateSave(raw, fallback) : fallback;
  }

  get data(): SaveData {
    return this.current;
  }

  update(change: (save: SaveData) => SaveData): SaveData {
    this.current = change(this.current);
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.current));
    } catch {
      // Private mode or full storage: keep playing with in-memory data.
    }
    return this.current;
  }
}
