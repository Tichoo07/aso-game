import {
  canPlace,
  canPlaceAnywhere,
  clearCells,
  fillRatio,
  findCompletedLines,
  lineCellIndices,
  placeShape,
} from './board';
import { TRAY_SIZE } from './constants';
import type { Board, Piece, Shape } from './types';
import type { Rng } from '../utils/rng';

/** How many candidate sets to try before falling back. */
const MAX_ATTEMPTS = 24;
/** Placement budget for the "can all three be placed?" search. */
const SEARCH_BUDGET = 12_000;

export interface TrayOptions {
  board: Board;
  rng: Rng;
  shapes: readonly Shape[];
  motifCount: number;
  nextUid: number;
  /** 0..1. Raises the share of large pieces as a run goes on. */
  difficulty?: number;
  /** Guarantee the set is playable when the board allows it. */
  fair?: boolean;
  size?: number;
}

export interface TrayResult {
  pieces: Piece[];
  nextUid: number;
}

/** Large pieces get likelier with difficulty; small ones when the cloth is crowded. */
export function shapeWeight(shape: Shape, difficulty: number, fill: number): number {
  let w = shape.weight;
  if (shape.tier === 'large') w *= 1 + 0.8 * difficulty;
  if (shape.tier === 'small') w *= 1 + 2 * Math.max(0, fill - 0.4);
  return w;
}

/** No shape more than twice, and at most two large pieces in one set. */
export function isBalancedSet(shapes: readonly Shape[]): boolean {
  const counts = new Map<string, number>();
  let large = 0;
  for (const s of shapes) {
    counts.set(s.id, (counts.get(s.id) ?? 0) + 1);
    if (s.tier === 'large') large++;
  }
  return large <= 2 && [...counts.values()].every((n) => n <= 2);
}

/**
 * Is there some order and some positions in which every shape can be placed,
 * clearing completed lines in between?
 *
 * Returns null when the search budget ran out before an answer was found.
 */
export function canPlaceAll(board: Board, shapes: readonly Shape[], budget: number = SEARCH_BUDGET): boolean | null {
  let nodes = 0;
  let exhausted = false;

  const search = (b: Board, remaining: readonly Shape[]): boolean => {
    if (remaining.length === 0) return true;
    const tried = new Set<string>();
    for (let i = 0; i < remaining.length; i++) {
      const shape = remaining[i];
      if (tried.has(shape.id)) continue;
      tried.add(shape.id);
      const rest = remaining.filter((_, j) => j !== i);
      for (let r = 0; r + shape.height <= b.size; r++) {
        for (let c = 0; c + shape.width <= b.size; c++) {
          if (!canPlace(b, shape, r, c)) continue;
          if (++nodes > budget) {
            exhausted = true;
            return false;
          }
          let next = placeShape(b, shape, r, c, 1);
          const lines = findCompletedLines(next);
          if (lines.rows.length || lines.cols.length) next = clearCells(next, lineCellIndices(next, lines));
          if (search(next, rest)) return true;
          if (exhausted) return false;
        }
      }
    }
    return false;
  };

  if (search(board, shapes)) return true;
  return exhausted ? null : false;
}

/**
 * Deal a fresh tray. With fair on (the default) the set is chosen so that all
 * of it can be placed in some order whenever the board allows it, and at
 * least one piece fits whenever any piece could.
 */
export function generateTray(opts: TrayOptions): TrayResult {
  const { board, rng, shapes, motifCount, difficulty = 0, fair = true, size = TRAY_SIZE } = opts;
  if (shapes.length === 0) throw new Error('generateTray: no shapes');
  const fill = fillRatio(board);
  const pickSet = (): Shape[] =>
    Array.from({ length: size }, () => rng.weighted(shapes, (s) => shapeWeight(s, difficulty, fill)));

  let chosen: Shape[] | null = null;
  let fallback: Shape[] | null = null;
  let fallbackFits = -1;

  for (let attempt = 0; attempt < MAX_ATTEMPTS && !chosen; attempt++) {
    const set = pickSet();
    if (!isBalancedSet(set)) continue;
    if (!fair) {
      chosen = set;
      break;
    }
    const fits = set.filter((s) => canPlaceAnywhere(board, s)).length;
    if (fits > fallbackFits) {
      fallback = set;
      fallbackFits = fits;
    }
    if (fits === 0) continue;
    const all = canPlaceAll(board, set);
    if (all === true || (all === null && fits === set.length)) chosen = set;
  }

  if (!chosen) {
    chosen = fallback ?? pickSet();
    if (fair && !chosen.some((s) => canPlaceAnywhere(board, s))) {
      // Last resort: swap one piece for the smallest shape that still fits.
      const rescue = [...shapes].sort((a, b) => a.cells.length - b.cells.length).find((s) => canPlaceAnywhere(board, s));
      if (rescue) {
        chosen = chosen.slice();
        chosen[rng.int(chosen.length)] = rescue;
      }
    }
  }

  let uid = opts.nextUid;
  const pieces = chosen.map((shape) => ({ uid: uid++, shape, motif: 1 + rng.int(Math.max(1, motifCount)) }));
  return { pieces, nextUid: uid };
}
