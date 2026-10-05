/**
 * Small seedable PRNG (mulberry32). Same seed, same sequence, on every
 * platform, which is what the daily challenge relies on.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, max). */
  int(max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Pick one item with probability proportional to weight(item). */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** Internal state. Pass it back to createRng to resume the sequence. */
  readonly state: number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;

  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (max: number): number => Math.floor(next() * max);

  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('rng.pick: empty list');
      return items[int(items.length)];
    },
    weighted<T>(items: readonly T[], weight: (item: T) => number): T {
      if (items.length === 0) throw new Error('rng.weighted: empty list');
      let total = 0;
      for (const item of items) total += Math.max(0, weight(item));
      if (total <= 0) return items[int(items.length)];
      let roll = next() * total;
      for (const item of items) {
        roll -= Math.max(0, weight(item));
        if (roll < 0) return item;
      }
      return items[items.length - 1];
    },
    get state() {
      return a;
    },
  };
}

/** Stable 32-bit hash of a string (FNV-1a with a murmur finaliser). */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function randomSeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}
