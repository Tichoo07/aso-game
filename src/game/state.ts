import {
  canPlace,
  clearCells,
  createBoard,

  findCompletedLines,
  lineCellIndices,
  placeShape,
  shapeCellIndices,
} from './board';
import { hasAnyMove } from './gameOver';
import { findPattern, type CompiledPattern, type PatternMatch } from './patterns';
import { generateTray } from './pieces';
import { advanceCombo, NO_SCORE, scoreMove, type ScoreBreakdown } from './scoring';
import type { Board, Piece, Shape } from './types';
import { createRng, type Rng } from '../utils/rng';

/**
 * classic: endless, scored, ends when nothing fits.
 * slow:    no score, never ends; the cloth loosens when it gets stuck.
 * daily:   classic rules from a date-seeded starting cloth and motif.
 */
export type GameMode = 'classic' | 'slow' | 'daily';

/** Everything the rules need that is not part of the run itself. */
export interface GameConfig {
  shapes: readonly Shape[];
  /** Objective patterns, in the order the player should meet them. */
  patterns: readonly CompiledPattern[];
  motifCount: number;
  /** Pattern ids the player had already woven before this run. */
  unlocked: ReadonlySet<string>;
  boardSize?: number;
}

export interface RunStats {
  placements: number;
  lines: number;
  lineScore: number;
  patternScore: number;
  comboScore: number;
  bestStreak: number;
  /** Pattern ids woven during this run, in order. */
  woven: string[];
}

export interface DailyInfo {
  key: string;
  objectiveId: string;
  completed: boolean;
}

/** Plain, serialisable data. Never mutated; every move returns a new one. */
export interface GameState {
  mode: GameMode;
  board: Board;
  tray: (Piece | null)[];
  score: number;
  streak: number;
  movesSinceClear: number;
  objectiveId: string | null;
  rngState: number;
  nextUid: number;
  turn: number;
  over: boolean;
  stats: RunStats;
  daily: DailyInfo | null;
}

export interface MovePreview {
  placed: number[];
  rows: number[];
  cols: number[];
  lineCells: number[];
  pattern: PatternMatch | null;
}

export interface MoveResult extends MovePreview {
  slot: number;
  piece: Piece;
  row: number;
  col: number;
  /** Union of line and pattern cells. */
  cleared: number[];
  /** Points earned by this move (all zero in Slow Weave). */
  score: ScoreBreakdown;
  streak: number;
  refilled: boolean;
  /** Slow Weave only: cells loosened so play can carry on. */
  loosened: number[];
  dailyCompleted: boolean;
  gameOver: boolean;
}

export interface NewGameOptions {
  mode: GameMode;
  seed: number;
  board?: Board;
  /** Omit to pick automatically; null for no objective. */
  objectiveId?: string | null;
  daily?: DailyInfo | null;
}

export function emptyStats(): RunStats {
  return { placements: 0, lines: 0, lineScore: 0, patternScore: 0, comboScore: 0, bestStreak: 0, woven: [] };
}

/** Score-driven difficulty for piece dealing. Slow Weave stays gentle. */
export function difficultyFor(mode: GameMode, score: number): number {
  return mode === 'slow' ? 0 : Math.min(1, score / 8000);
}

export function getPattern(config: GameConfig, id: string | null): CompiledPattern | undefined {
  return id ? config.patterns.find((p) => p.id === id) : undefined;
}

/** Next objective: the first pattern not yet woven, else any other one. */
export function chooseObjective(
  config: GameConfig,
  wovenThisRun: readonly string[],
  current: string | null,
  rng: Rng,
): string | null {
  if (config.patterns.length === 0) return null;
  const done = (id: string) => config.unlocked.has(id) || wovenThisRun.includes(id);
  const fresh = config.patterns.find((p) => !done(p.id));
  if (fresh) return fresh.id;
  const pool = config.patterns.filter((p) => p.id !== current);
  return (pool.length ? rng.pick(pool) : config.patterns[0]).id;
}

export function createGame(config: GameConfig, opts: NewGameOptions): GameState {
  const rng = createRng(opts.seed);
  const board = opts.board ?? createBoard(config.boardSize);
  const objectiveId = opts.objectiveId !== undefined ? opts.objectiveId : chooseObjective(config, [], null, rng);
  const { pieces, nextUid } = generateTray({
    board,
    rng,
    shapes: config.shapes,
    motifCount: config.motifCount,
    nextUid: 1,
    difficulty: 0,
  });
  return {
    mode: opts.mode,
    board,
    tray: pieces,
    score: 0,
    streak: 0,
    movesSinceClear: 0,
    objectiveId,
    rngState: rng.state,
    nextUid,
    turn: 0,
    over: false,
    stats: emptyStats(),
    daily: opts.daily ?? null,
  };
}

/** What would happen if this piece went here? Null if it does not fit. */
export function previewMove(config: GameConfig, state: GameState, slot: number, row: number, col: number): MovePreview | null {
  const piece = state.tray[slot];
  if (!piece || !canPlace(state.board, piece.shape, row, col)) return null;
  const placedBoard = placeShape(state.board, piece.shape, row, col, piece.motif);
  const placed = shapeCellIndices(state.board, piece.shape, row, col);
  const lines = findCompletedLines(placedBoard);
  const objective = getPattern(config, state.objectiveId);
  return {
    placed,
    rows: lines.rows,
    cols: lines.cols,
    lineCells: lineCellIndices(placedBoard, lines),
    pattern: objective ? findPattern(placedBoard, objective, placed) : null,
  };
}

/** Clear the fullest row and column. Used by Slow Weave instead of ending. */
export function loosenBoard(board: Board): { board: Board; cells: number[] } {
  const { size, cells } = board;
  let bestRow = 0;
  let bestCol = 0;
  let rowCount = -1;
  let colCount = -1;
  for (let i = 0; i < size; i++) {
    let r = 0;
    let c = 0;
    for (let j = 0; j < size; j++) {
      if (cells[i * size + j]) r++;
      if (cells[j * size + i]) c++;
    }
    if (r > rowCount) [rowCount, bestRow] = [r, i];
    if (c > colCount) [colCount, bestCol] = [c, i];
  }
  const loosened = lineCellIndices(board, { rows: [bestRow], cols: [bestCol] }).filter((i) => cells[i] !== 0);
  return { board: clearCells(board, loosened), cells: loosened };
}

/**
 * Place tray[slot] with its top-left at (row, col), then resolve lines,
 * the objective pattern, scoring, refills and game over, in that order.
 * Returns null for an illegal move.
 */
export function applyMove(
  config: GameConfig,
  state: GameState,
  slot: number,
  row: number,
  col: number,
): { state: GameState; result: MoveResult } | null {
  if (state.over) return null;
  const preview = previewMove(config, state, slot, row, col);
  const piece = state.tray[slot];
  if (!preview || !piece) return null;

  const rng = createRng(state.rngState);

  // 1. place  2-4. detect lines and the objective pattern
  let board = placeShape(state.board, piece.shape, row, col, piece.motif);
  const { pattern } = preview;
  const cleared = [...new Set([...preview.lineCells, ...(pattern?.cells ?? [])])].sort((a, b) => a - b);

  // 5-6. remove completed cells
  if (cleared.length) board = clearCells(board, cleared);

  // 7. score
  const lineCount = preview.rows.length + preview.cols.length;
  const combo = advanceCombo({ streak: state.streak, movesSinceClear: state.movesSinceClear }, cleared.length > 0);
  const earned = state.mode === 'slow' ? NO_SCORE : scoreMove(lineCount, pattern ? 1 : 0, combo.streak);
  const score = state.score + earned.total;

  // Objective bookkeeping
  const woven = pattern ? [...state.stats.woven, pattern.patternId] : state.stats.woven;
  let objectiveId = state.objectiveId;
  let daily = state.daily;
  let dailyCompleted = false;
  if (pattern) {
    if (daily && !daily.completed && pattern.patternId === daily.objectiveId) {
      daily = { ...daily, completed: true };
      dailyCompleted = true;
    }
    objectiveId = chooseObjective(config, woven, pattern.patternId, rng);
  }

  // 8. replacement pieces once the tray is empty
  let tray = state.tray.slice();
  tray[slot] = null;
  let nextUid = state.nextUid;
  let refilled = false;
  const deal = (b: Board) => {
    const dealt = generateTray({
      board: b,
      rng,
      shapes: config.shapes,
      motifCount: config.motifCount,
      nextUid,
      difficulty: difficultyFor(state.mode, score),
    });
    tray = dealt.pieces;
    nextUid = dealt.nextUid;
    refilled = true;
  };
  if (tray.every((p) => p === null)) deal(board);

  // Game over, or in Slow Weave a gentle way out
  let over = false;
  const loosened: number[] = [];
  if (!hasAnyMove(board, tray)) {
    if (state.mode === 'slow') {
      // Loosen the fullest row and column, then deal fresh pieces
      for (let guard = 0; guard < 8 && !hasAnyMove(board, tray); guard++) {
        const out = loosenBoard(board);
        board = out.board;
        loosened.push(...out.cells);
        deal(board);
      }
    } else {
      over = true;
    }
  }

  const next: GameState = {
    ...state,
    board,
    tray,
    score,
    streak: combo.streak,
    movesSinceClear: combo.movesSinceClear,
    objectiveId,
    rngState: rng.state,
    nextUid,
    turn: state.turn + 1,
    over,
    daily,
    stats: {
      placements: state.stats.placements + 1,
      lines: state.stats.lines + lineCount,
      lineScore: state.stats.lineScore + earned.lines,
      patternScore: state.stats.patternScore + earned.patterns,
      comboScore: state.stats.comboScore + earned.combo,
      bestStreak: Math.max(state.stats.bestStreak, combo.streak),
      woven,
    },
  };

  return {
    state: next,
    result: {
      ...preview,
      slot,
      piece,
      row,
      col,
      cleared,
      score: earned,
      streak: combo.streak,
      refilled,
      loosened,
      dailyCompleted,
      gameOver: over,
    },
  };
}
