import { compilePattern, type CompiledPattern } from '../game/patterns';
import { compileShapes } from '../game/shapes';
import type { GameConfig } from '../game/state';
import type { Shape } from '../game/types';
import type { CollectionDef } from './collections';
import { SHAPE_DEFS } from './shapes';

export const SHAPES: readonly Shape[] = compileShapes(SHAPE_DEFS);

const compiledCache = new Map<string, CompiledPattern[]>();

export function compiledPatterns(collection: CollectionDef): CompiledPattern[] {
  let list = compiledCache.get(collection.id);
  if (!list) {
    list = collection.patterns.map((p) => compilePattern(p));
    compiledCache.set(collection.id, list);
  }
  return list;
}

/** Rules config for a run in this collection, given what the player has already woven. */
export function gameConfigFor(collection: CollectionDef, unlocked: Iterable<string> = []): GameConfig {
  return {
    shapes: SHAPES,
    patterns: compiledPatterns(collection),
    motifCount: collection.motifs.length,
    unlocked: new Set(unlocked),
  };
}
