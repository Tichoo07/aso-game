import type { StringKey } from './i18n';

/** One scripted drag: tray slot to top-left board position, with a caption. */
export interface DemoMove {
  slot: number;
  row: number;
  col: number;
  caption: StringKey;
  /** Smaller line shown between the board and the tray. */
  hint?: StringKey;
  /** Draw attention to the motif above the board. */
  highlightObjective?: boolean;
  /** How long to linger after the move has fully played out, in ms. */
  linger: number;
}

export interface DemoScript {
  /** Starting board, ASCII rows: '.' empty, '1'-'6' a motif. */
  board: readonly string[];
  /** The three tray pieces: [shape id, motif]. */
  tray: readonly (readonly [string, number])[];
  objectiveId: string;
  /** Fixed seed so the pieces dealt at the end are always the same. */
  seed: number;
  moves: readonly DemoMove[];
}

/**
 * The how-to-play demo, played on a real board through the real rules.
 * tests/demo.test.ts replays it, so an edit that breaks it fails the tests.
 *
 *   1. place a piece (nothing clears)
 *   2. fill row 5 to clear it
 *   3. complete the Running Stitch motif in row 2 ("##o##")
 */
export const DEMO: DemoScript = {
  board: [
    '.......',
    '.......',
    '42.....',
    '.......',
    '.......',
    '36...51',
    '.4.....',
  ],
  tray: [
    ['corner-a', 2],
    ['trio-h', 5],
    ['duo-h', 1],
  ],
  objectiveId: 'adire.stitch',
  seed: 20261005,
  moves: [
    { slot: 0, row: 0, col: 4, caption: 'demoDrag', hint: 'demoDragHint', linger: 700 },
    { slot: 1, row: 5, col: 2, caption: 'demoClear', linger: 900 },
    { slot: 2, row: 2, col: 3, caption: 'demoWeave', hint: 'demoWeaveHint', highlightObjective: true, linger: 1700 },
  ],
};
