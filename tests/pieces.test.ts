import { describe, expect, it } from 'vitest';
import { SHAPES } from '../src/data';
import { boardFromRows, canPlaceAnywhere, createBoard, placeShape, validPlacements } from '../src/game/board';
import { canPlaceAll, generateTray, isBalancedSet } from '../src/game/pieces';
import type { Board } from '../src/game/types';
import { createRng } from '../src/utils/rng';
import { shape } from './helpers';

const REQUIRED = [
  'single', 'duo-h', 'duo-v', 'trio-h', 'trio-v', 'l', 'l-rev', 't', 'square', 'z', 'z-rev', 'corner-a',
];

/** A messy, partly filled board built from random placements. */
function randomBoard(seed: number, pieces: number): Board {
  const rng = createRng(seed);
  let b = createBoard();
  for (let i = 0; i < pieces; i++) {
    const s = rng.pick(SHAPES);
    const spots = validPlacements(b, s);
    if (!spots.length) continue;
    const [r, c] = rng.pick(spots);
    b = placeShape(b, s, r, c, 1);
  }
  return b;
}

describe('shape catalogue', () => {
  it('includes every required shape', () => {
    const ids = SHAPES.map((s) => s.id);
    for (const id of REQUIRED) expect(ids).toContain(id);
    expect(SHAPES.length).toBeGreaterThanOrEqual(12);
  });

  it('keeps every shape small enough for a 7x7 board', () => {
    for (const s of SHAPES) {
      expect(s.cells.length).toBeLessThanOrEqual(4);
      expect(canPlaceAnywhere(createBoard(), s)).toBe(true);
    }
  });

  it('normalises cell offsets', () => {
    expect(shape('corner-d').cells).toEqual([[0, 1], [1, 0], [1, 1]]);
    expect(shape('t').width).toBe(3);
    expect(shape('t').height).toBe(2);
  });
});

describe('piece generation', () => {
  const base = { shapes: SHAPES, motifCount: 6, nextUid: 1 };

  it('deals three pieces with unique uids and valid motifs', () => {
    const { pieces, nextUid } = generateTray({ ...base, board: createBoard(), rng: createRng(1) });
    expect(pieces).toHaveLength(3);
    expect(new Set(pieces.map((p) => p.uid)).size).toBe(3);
    expect(nextUid).toBe(4);
    for (const p of pieces) {
      expect(p.motif).toBeGreaterThanOrEqual(1);
      expect(p.motif).toBeLessThanOrEqual(6);
    }
  });

  it('is deterministic for a seed', () => {
    const a = generateTray({ ...base, board: createBoard(), rng: createRng(42) });
    const b = generateTray({ ...base, board: createBoard(), rng: createRng(42) });
    expect(a.pieces.map((p) => [p.shape.id, p.motif])).toEqual(b.pieces.map((p) => [p.shape.id, p.motif]));
  });

  it('never deals three identical shapes or three large shapes', () => {
    const rng = createRng(7);
    for (let i = 0; i < 400; i++) {
      const { pieces } = generateTray({ ...base, board: createBoard(), rng });
      expect(isBalancedSet(pieces.map((p) => p.shape))).toBe(true);
    }
  });

  it('always deals at least one piece that fits when any shape could', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const board = randomBoard(seed, 4 + (seed % 10));
      const { pieces } = generateTray({ ...base, board, rng: createRng(seed * 31) });
      const shapes = pieces.map((p) => p.shape);
      const anyFits = SHAPES.some((s) => canPlaceAnywhere(board, s));
      if (!anyFits) continue;
      // At minimum one piece must always fit when any shape could
      expect(shapes.some((s) => canPlaceAnywhere(board, s)), `seed ${seed}`).toBe(true);
    }
  });

  it('rescues a crowded board with a piece that fits', () => {
    // Only isolated single holes remain
    let board = createBoard();
    const single = shape('single');
    for (let i = 0; i < 49; i++) {
      const r = Math.floor(i / 7);
      const c = i % 7;
      if ((r + c) % 2 === 0) board = placeShape(board, single, r, c, 1);
    }
    for (let seed = 0; seed < 30; seed++) {
      const { pieces } = generateTray({ ...base, board, rng: createRng(seed) });
      expect(pieces.some((p) => canPlaceAnywhere(board, p.shape))).toBe(true);
    }
  });

  it('searches placement orders, including clears in between', () => {
    // One 1x4 gap in row 0; every other hole is isolated, and no line is full.
    const board = boardFromRows([
      '###....',
      '#.#####',
      '####.##',
      '.######',
      '###.###',
      '#####.#',
      '##.####',
    ]);
    expect(canPlaceAnywhere(board, shape('square'))).toBe(false);
    // The bar only fits if the long bar goes first and clears row 0
    expect(canPlaceAll(board, [shape('trio-h'), shape('quad-h')])).toBe(true);
    // A second long bar only fits after the first one clears the row
    expect(canPlaceAll(board, [shape('quad-h'), shape('quad-h')])).toBe(true);
    // Clearing row 0 still leaves no 2x2 space
    expect(canPlaceAll(board, [shape('quad-h'), shape('square')])).toBe(false);
  });

  it('deals a fully placeable set on lightly filled boards', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const board = randomBoard(seed, 3);
      const { pieces } = generateTray({ ...base, board, rng: createRng(seed) });
      expect(canPlaceAll(board, pieces.map((p) => p.shape)), `seed ${seed}`).toBe(true);
    }
  });
});
