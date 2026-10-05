import { EMPTY } from './board';
import { BOARD_SIZE } from './constants';
import type { Board, Coord } from './types';

/**
 * Optional sourced context for a pattern. The journal only shows it when it
 * exists; never fill it in without a verifiable source.
 */
export interface PatternProvenance {
  note: string;
  source: string;
}

/**
 * Authoring format for a pattern objective (see src/data/collections).
 *
 * Grid characters:
 *   '#'  woven:  the cell must hold cloth
 *   'o'  resist: the cell must stay empty (the space the dye never reached)
 *   '.'  free:   anything
 */
export interface PatternDef {
  id: string;
  name: string;
  grid: readonly string[];
  /** Also accept the 90°, 180° and 270° turns of the grid. */
  rotations?: boolean;
  provenance?: PatternProvenance;
}

export interface PatternVariant {
  width: number;
  height: number;
  woven: readonly Coord[];
  resist: readonly Coord[];
}

export interface CompiledPattern {
  id: string;
  name: string;
  def: PatternDef;
  variants: readonly PatternVariant[];
}

export interface PatternMatch {
  patternId: string;
  row: number;
  col: number;
  variant: number;
  /** Woven cells (the ones that clear). */
  cells: number[];
  /** Resist cells (already empty). */
  resist: number[];
}

const PATTERN_CHARS = new Set(['#', 'o', '.']);

export function validatePatternDef(def: PatternDef, boardSize: number = BOARD_SIZE): string[] {
  const errors: string[] = [];
  if (!def.id) errors.push('missing id');
  if (!def.name) errors.push('missing name');
  if (def.grid.length === 0) {
    errors.push('empty grid');
    return errors;
  }
  const width = def.grid[0].length;
  if (def.grid.some((row) => row.length !== width)) errors.push('rows must all be the same width');
  if (def.grid.some((row) => [...row].some((ch) => !PATTERN_CHARS.has(ch)))) {
    errors.push(`only these characters are allowed: ${[...PATTERN_CHARS].join(' ')}`);
  }
  if (!def.grid.some((row) => row.includes('#'))) errors.push('needs at least one woven (#) cell');
  if (width > boardSize || def.grid.length > boardSize) errors.push(`larger than the ${boardSize}x${boardSize} board`);
  return errors;
}

/** Rotate an ASCII grid 90° clockwise. */
export function rotateGrid(grid: readonly string[]): string[] {
  const h = grid.length;
  const w = grid[0].length;
  const out: string[] = [];
  for (let r = 0; r < w; r++) {
    let line = '';
    for (let c = 0; c < h; c++) line += grid[h - 1 - c][r];
    out.push(line);
  }
  return out;
}

function variantFromGrid(grid: readonly string[]): PatternVariant {
  const woven: Coord[] = [];
  const resist: Coord[] = [];
  grid.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '#') woven.push([r, c]);
      else if (row[c] === 'o') resist.push([r, c]);
    }
  });
  return { width: grid[0].length, height: grid.length, woven, resist };
}

export function compilePattern(def: PatternDef, boardSize: number = BOARD_SIZE): CompiledPattern {
  const errors = validatePatternDef(def, boardSize);
  if (errors.length) throw new Error(`Pattern "${def.id}": ${errors.join('; ')}`);

  const grids: string[][] = [[...def.grid]];
  if (def.rotations) {
    let g = [...def.grid];
    for (let i = 0; i < 3; i++) {
      g = rotateGrid(g);
      grids.push(g);
    }
  }
  const seen = new Set<string>();
  const variants: PatternVariant[] = [];
  for (const g of grids) {
    const key = g.join('/');
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push(variantFromGrid(g));
  }
  return { id: def.id, name: def.name, def, variants };
}

export function matchesAt(board: Board, variant: PatternVariant, row: number, col: number): boolean {
  const { size, cells } = board;
  if (row < 0 || col < 0 || row + variant.height > size || col + variant.width > size) return false;
  for (const [dr, dc] of variant.woven) {
    if (cells[(row + dr) * size + col + dc] === EMPTY) return false;
  }
  for (const [dr, dc] of variant.resist) {
    if (cells[(row + dr) * size + col + dc] !== EMPTY) return false;
  }
  return true;
}

/**
 * First match of the pattern on the board, scanning variants then rows then
 * columns. With mustInclude, a match only counts if at least one of its woven
 * cells is in that list, so a weave is always caused by the piece just placed.
 */
export function findPattern(
  board: Board,
  pattern: CompiledPattern,
  mustInclude?: readonly number[],
): PatternMatch | null {
  const must = mustInclude && mustInclude.length ? new Set(mustInclude) : null;
  const { size } = board;
  for (let vi = 0; vi < pattern.variants.length; vi++) {
    const v = pattern.variants[vi];
    for (let r = 0; r + v.height <= size; r++) {
      for (let c = 0; c + v.width <= size; c++) {
        if (!matchesAt(board, v, r, c)) continue;
        const cells = v.woven.map(([dr, dc]) => (r + dr) * size + c + dc);
        if (must && !cells.some((i) => must.has(i))) continue;
        const resist = v.resist.map(([dr, dc]) => (r + dr) * size + c + dc);
        return { patternId: pattern.id, row: r, col: c, variant: vi, cells, resist };
      }
    }
  }
  return null;
}
