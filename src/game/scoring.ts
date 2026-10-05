export const SCORING = {
  /** Points by number of lines cleared in one placement (index = lines). */
  lines: [0, 100, 250, 450] as readonly number[],
  /** Each line beyond the table above adds this much. */
  extraLine: 300,
  pattern: 300,
  /** Combo bonus per step beyond the first clear in a streak. */
  comboStep: 50,
  comboCap: 500,
  /** A streak survives this many placements in a row without a clear. */
  comboGrace: 3,
} as const;

export function lineScore(lines: number): number {
  if (lines <= 0) return 0;
  const table = SCORING.lines;
  if (lines < table.length) return table[lines];
  return table[table.length - 1] + (lines - (table.length - 1)) * SCORING.extraLine;
}

export function patternScore(patterns: number): number {
  return Math.max(0, patterns) * SCORING.pattern;
}

/** Streak 1 is a plain clear; each clear after that adds a step. */
export function comboBonus(streak: number): number {
  if (streak < 2) return 0;
  return Math.min(SCORING.comboCap, (streak - 1) * SCORING.comboStep);
}

export interface ComboState {
  streak: number;
  movesSinceClear: number;
}

/**
 * Clearing extends the streak. Placing without clearing is forgiven
 * comboGrace - 1 times; the next miss ends the streak.
 */
export function advanceCombo(prev: ComboState, cleared: boolean): ComboState {
  if (cleared) return { streak: prev.streak + 1, movesSinceClear: 0 };
  const moves = prev.movesSinceClear + 1;
  return { streak: moves >= SCORING.comboGrace ? 0 : prev.streak, movesSinceClear: moves };
}

export interface ScoreBreakdown {
  lines: number;
  patterns: number;
  combo: number;
  total: number;
}

export const NO_SCORE: ScoreBreakdown = Object.freeze({ lines: 0, patterns: 0, combo: 0, total: 0 });

export function scoreMove(lines: number, patterns: number, streak: number): ScoreBreakdown {
  const l = lineScore(lines);
  const p = patternScore(patterns);
  const c = lines + patterns > 0 ? comboBonus(streak) : 0;
  return { lines: l, patterns: p, combo: c, total: l + p + c };
}
