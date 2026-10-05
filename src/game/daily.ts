import { createBoard, findCompletedLines, placeShape, validPlacements } from './board';
import { findPattern } from './patterns';
import { createGame, type GameConfig, type GameState } from './state';
import type { Board } from './types';
import { createRng, hashString } from '../utils/rng';

/**
 * Bump this to reshuffle every future daily (e.g. after changing the
 * generator). Past dates will also change, so do it sparingly.
 */
export const DAILY_VERSION = 1;

export interface DailyChallenge {
  key: string;
  objectiveId: string;
  /** The starting cloth: a few threads already in place. */
  board: Board;
  /** Seed for the run's piece dealing. */
  seed: number;
}

export function dailySeed(dateKey: string): number {
  return hashString(`aso/daily/v${DAILY_VERSION}/${dateKey}`);
}

/**
 * Same date in, same challenge out, on every device, with no server. The
 * config's pattern list must be the full collection list (not filtered by the
 * player's unlocks) so everyone gets the same motif.
 */
export function createDailyChallenge(config: GameConfig, dateKey: string): DailyChallenge {
  if (config.patterns.length === 0) throw new Error('createDailyChallenge: collection has no patterns');
  const rng = createRng(dailySeed(dateKey));
  const objective = rng.pick(config.patterns);

  // Scatter a few small and medium pieces as a starting cloth, never
  // completing a line or the motif itself.
  const starters = config.shapes.filter((s) => s.tier !== 'large');
  const target = 3 + rng.int(3);
  let board = createBoard(config.boardSize);
  let placed = 0;
  for (let attempt = 0; attempt < 80 && placed < target; attempt++) {
    const shape = rng.pick(starters);
    const spots = validPlacements(board, shape);
    if (spots.length === 0) continue;
    const [r, c] = rng.pick(spots);
    const next = placeShape(board, shape, r, c, 1 + rng.int(Math.max(1, config.motifCount)));
    const lines = findCompletedLines(next);
    if (lines.rows.length || lines.cols.length) continue;
    if (findPattern(next, objective)) continue;
    board = next;
    placed++;
  }

  return { key: dateKey, objectiveId: objective.id, board, seed: hashString(`${dateKey}/pieces/${rng.state}`) };
}

export function createDailyGame(config: GameConfig, dateKey: string): GameState {
  const challenge = createDailyChallenge(config, dateKey);
  return createGame(config, {
    mode: 'daily',
    seed: challenge.seed,
    board: challenge.board,
    objectiveId: challenge.objectiveId,
    daily: { key: dateKey, objectiveId: challenge.objectiveId, completed: false },
  });
}
