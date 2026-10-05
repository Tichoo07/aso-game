import { describe, expect, it } from 'vitest';
import { boardFromRows, createBoard } from '../src/game/board';
import { BOARD_SIZE } from '../src/game/constants';
import { compilePattern, findPattern, rotateGrid, validatePatternDef } from '../src/game/patterns';
import { COLLECTIONS } from '../src/data/collections';

const ring = compilePattern({ id: 'ring', name: 'Ring', grid: ['###', '#o#', '###'] });
const stitch = compilePattern({ id: 'stitch', name: 'Stitch', grid: ['##o##'], rotations: true });

describe('pattern data', () => {
  it('every pattern in every collection is valid', () => {
    for (const col of COLLECTIONS) {
      const ids = new Set<string>();
      for (const def of col.patterns) {
        expect(validatePatternDef(def, BOARD_SIZE), `${def.id}`).toEqual([]);
        expect(ids.has(def.id), `duplicate ${def.id}`).toBe(false);
        ids.add(def.id);
        expect(() => compilePattern(def)).not.toThrow();
        // Shipped patterns carry no invented meanings
        if (def.provenance) expect(def.provenance.source).toBeTruthy();
      }
    }
  });

  it('rejects malformed definitions', () => {
    expect(validatePatternDef({ id: 'x', name: 'X', grid: ['##', '#'] })).not.toEqual([]);
    expect(validatePatternDef({ id: 'x', name: 'X', grid: ['oo'] })).not.toEqual([]);
    expect(validatePatternDef({ id: 'x', name: 'X', grid: ['#x'] })).not.toEqual([]);
    expect(validatePatternDef({ id: 'x', name: 'X', grid: ['########'] })).not.toEqual([]);
  });

  it('rotates grids clockwise', () => {
    expect(rotateGrid(['#o', '..'])).toEqual(['.#', '.o']);
    expect(rotateGrid(['##o##'])).toEqual(['#', '#', 'o', '#', '#']);
  });

  it('dedupes symmetric rotations', () => {
    expect(compilePattern({ id: 'r', name: 'R', grid: ['###', '#o#', '###'], rotations: true }).variants).toHaveLength(1);
    expect(stitch.variants).toHaveLength(2);
  });
});

describe('pattern detection', () => {
  it('matches a woven ring around an empty (resist) centre', () => {
    const b = boardFromRows([
      '.......',
      '.###...',
      '.#.#...',
      '.###...',
      '.......',
      '.......',
      '.......',
    ]);
    const m = findPattern(b, ring);
    expect(m).not.toBeNull();
    expect(m!.row).toBe(1);
    expect(m!.col).toBe(1);
    expect(m!.cells).toHaveLength(8);
    expect(m!.resist).toEqual([2 * 7 + 2]);
  });

  it('does not match when a resist cell is filled', () => {
    const b = boardFromRows([
      '.......',
      '.###...',
      '.###...',
      '.###...',
      '.......',
      '.......',
      '.......',
    ]);
    expect(findPattern(b, ring)).toBeNull();
  });

  it('does not match when a woven cell is missing', () => {
    const b = boardFromRows([
      '.......',
      '.###...',
      '.#.#...',
      '.##....',
      '.......',
      '.......',
      '.......',
    ]);
    expect(findPattern(b, ring)).toBeNull();
  });

  it('ignores cells outside the pattern grid', () => {
    const b = boardFromRows([
      '#######',
      '####...',
      '##.#...',
      '####...',
      '#......',
      '.......',
      '.......',
    ]);
    expect(findPattern(b, ring)).not.toBeNull();
  });

  it('matches rotated variants when allowed', () => {
    const b = boardFromRows([
      '.......',
      '...#...',
      '...#...',
      '.......',
      '...#...',
      '...#...',
      '.......',
    ]);
    expect(findPattern(b, stitch)).not.toBeNull();
    const fixed = compilePattern({ id: 'fixed', name: 'Fixed', grid: ['##o##'] });
    expect(findPattern(b, fixed)).toBeNull();
  });

  it('requires the match to include a just-placed cell when asked', () => {
    const b = boardFromRows([
      '.......',
      '.###...',
      '.#.#...',
      '.###...',
      '.......',
      '.......',
      '.......',
    ]);
    expect(findPattern(b, ring, [6 * 7 + 6])).toBeNull();
    expect(findPattern(b, ring, [1 * 7 + 1])).not.toBeNull();
  });

  it('finds nothing on an empty board', () => {
    expect(findPattern(createBoard(), ring)).toBeNull();
  });
});
