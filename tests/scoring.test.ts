import { describe, expect, it } from 'vitest';
import { advanceCombo, comboBonus, lineScore, patternScore, scoreMove } from '../src/game/scoring';

describe('score calculation', () => {
  it('scores lines per the table', () => {
    expect(lineScore(0)).toBe(0);
    expect(lineScore(1)).toBe(100);
    expect(lineScore(2)).toBe(250);
    expect(lineScore(3)).toBe(450);
  });

  it('keeps growing beyond three lines', () => {
    expect(lineScore(4)).toBe(750);
    expect(lineScore(5)).toBe(1050);
  });

  it('scores patterns at 300 each', () => {
    expect(patternScore(1)).toBe(300);
    expect(patternScore(0)).toBe(0);
  });

  it('gives no combo bonus for the first clear', () => {
    expect(comboBonus(0)).toBe(0);
    expect(comboBonus(1)).toBe(0);
    expect(comboBonus(2)).toBe(50);
    expect(comboBonus(4)).toBe(150);
  });

  it('caps the combo bonus', () => {
    expect(comboBonus(100)).toBe(500);
  });

  it('combines a move into one breakdown', () => {
    expect(scoreMove(2, 1, 3)).toEqual({ lines: 250, patterns: 300, combo: 100, total: 650 });
    expect(scoreMove(0, 0, 5)).toEqual({ lines: 0, patterns: 0, combo: 0, total: 0 });
  });
});

describe('combo streak', () => {
  it('builds with consecutive clears', () => {
    let s = { streak: 0, movesSinceClear: 0 };
    s = advanceCombo(s, true);
    expect(s.streak).toBe(1);
    s = advanceCombo(s, true);
    expect(s.streak).toBe(2);
  });

  it('forgives two quiet placements, ends on the third', () => {
    let s = advanceCombo({ streak: 0, movesSinceClear: 0 }, true);
    s = advanceCombo(s, false);
    s = advanceCombo(s, false);
    expect(s.streak).toBe(1);
    expect(advanceCombo(s, true).streak).toBe(2);
    s = advanceCombo(s, false);
    expect(s.streak).toBe(0);
    expect(advanceCombo(s, true).streak).toBe(1);
  });
});
