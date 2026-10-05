import { describe, expect, it } from 'vitest';
import { boardFromRows, createBoard } from '../src/game/board';
import { hasAnyMove, isGameOver, placeableSlots } from '../src/game/gameOver';
import { piece } from './helpers';

const crowded = boardFromRows([
  '#.#.#.#',
  '.#.#.#.',
  '#.#.#.#',
  '.#.#.#.',
  '#.#.#.#',
  '.#.#.#.',
  '#.#.#.#',
]);

describe('game-over detection', () => {
  it('is not over on an empty board', () => {
    expect(isGameOver(createBoard(), [piece('square'), piece('t'), piece('quad-h')])).toBe(false);
  });

  it('is over when no remaining piece fits', () => {
    expect(isGameOver(crowded, [piece('duo-h'), piece('square'), null])).toBe(true);
  });

  it('is not over while any one piece still fits', () => {
    expect(isGameOver(crowded, [piece('duo-h'), piece('single'), null])).toBe(false);
  });

  it('ignores empty slots, and an empty tray is not game over', () => {
    expect(hasAnyMove(crowded, [null, null, null])).toBe(false);
    expect(isGameOver(crowded, [null, null, null])).toBe(false);
  });

  it('reports which slots are placeable', () => {
    expect(placeableSlots(crowded, [piece('duo-h'), piece('single'), null])).toEqual([false, true, false]);
  });
});
