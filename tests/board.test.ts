import { describe, expect, it } from 'vitest';
import {
  boardFromRows,
  canPlace,
  canPlaceAnywhere,
  clearCells,
  createBoard,
  findCompletedLines,
  lineCellIndices,
  placeShape,
  validPlacements,
} from '../src/game/board';
import { rows, shape } from './helpers';

describe('placement validation', () => {
  const empty = createBoard();

  it('accepts a piece fully inside an empty board', () => {
    expect(canPlace(empty, shape('square'), 0, 0)).toBe(true);
    expect(canPlace(empty, shape('square'), 5, 5)).toBe(true);
  });

  it('rejects pieces that hang off any edge', () => {
    expect(canPlace(empty, shape('square'), 6, 0)).toBe(false);
    expect(canPlace(empty, shape('square'), 0, 6)).toBe(false);
    expect(canPlace(empty, shape('quad-h'), 0, 4)).toBe(false);
    expect(canPlace(empty, shape('quad-v'), 4, 0)).toBe(false);
    expect(canPlace(empty, shape('single'), -1, 0)).toBe(false);
    expect(canPlace(empty, shape('single'), 0, -1)).toBe(false);
  });

  it('rejects overlap with occupied cells', () => {
    const b = boardFromRows([
      '.......',
      '.#.....',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ]);
    expect(canPlace(b, shape('square'), 0, 0)).toBe(false);
    expect(canPlace(b, shape('square'), 0, 2)).toBe(true);
  });

  it('only checks the occupied cells of a shape, not its bounding box', () => {
    const b = boardFromRows([
      '.#.....',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ]);
    // corner-a is "#." / "##": its top-right is empty space
    expect(canPlace(b, shape('corner-a'), 0, 0)).toBe(true);
  });

  it('places without mutating the original board', () => {
    const b = createBoard();
    const placed = placeShape(b, shape('t'), 2, 2, 3);
    expect(b.cells.every((v) => v === 0)).toBe(true);
    expect(rows(placed)[2]).toBe('..###..');
    expect(rows(placed)[3]).toBe('...#...');
    expect(placed.cells[2 * 7 + 2]).toBe(3);
  });

  it('throws on an illegal placement', () => {
    expect(() => placeShape(createBoard(), shape('quad-h'), 0, 5, 1)).toThrow();
  });

  it('lists every valid placement', () => {
    expect(validPlacements(createBoard(), shape('single'))).toHaveLength(49);
    expect(validPlacements(createBoard(), shape('square'))).toHaveLength(36);
    expect(validPlacements(createBoard(), shape('quad-h'))).toHaveLength(28);
  });

  it('knows when a shape fits nowhere', () => {
    const checker = boardFromRows([
      '#.#.#.#',
      '.#.#.#.',
      '#.#.#.#',
      '.#.#.#.',
      '#.#.#.#',
      '.#.#.#.',
      '#.#.#.#',
    ]);
    expect(canPlaceAnywhere(checker, shape('single'))).toBe(true);
    expect(canPlaceAnywhere(checker, shape('duo-h'))).toBe(false);
    expect(canPlaceAnywhere(checker, shape('duo-v'))).toBe(false);
  });
});

describe('line detection', () => {
  it('finds nothing on an empty board', () => {
    expect(findCompletedLines(createBoard())).toEqual({ rows: [], cols: [] });
  });

  it('finds a completed row', () => {
    const b = boardFromRows([
      '.......',
      '#######',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ]);
    expect(findCompletedLines(b)).toEqual({ rows: [1], cols: [] });
  });

  it('finds a completed column', () => {
    const b = boardFromRows([
      '......#',
      '......#',
      '......#',
      '......#',
      '......#',
      '......#',
      '......#',
    ]);
    expect(findCompletedLines(b)).toEqual({ rows: [], cols: [6] });
  });

  it('finds rows and columns together, sharing cells', () => {
    const b = boardFromRows([
      '#######',
      '#######',
      '#......',
      '#......',
      '#......',
      '#......',
      '#......',
    ]);
    const lines = findCompletedLines(b);
    expect(lines).toEqual({ rows: [0, 1], cols: [0] });
    // 14 cells in two rows + 5 more in the column
    expect(lineCellIndices(b, lines)).toHaveLength(19);
  });

  it('ignores an almost-complete line', () => {
    const b = boardFromRows([
      '######.',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ]);
    expect(findCompletedLines(b)).toEqual({ rows: [], cols: [] });
  });

  it('clears cells', () => {
    const b = boardFromRows([
      '#######',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
    ]);
    const cleared = clearCells(b, lineCellIndices(b, findCompletedLines(b)));
    expect(cleared.cells.every((v) => v === 0)).toBe(true);
  });
});
