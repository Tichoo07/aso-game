import { describe, expect, it } from 'vitest';
import { gameConfigFor } from '../src/data';
import { ADIRE } from '../src/data/collections/adire';
import { boardFromRows, countFilled } from '../src/game/board';
import { applyMove, createGame, previewMove, type GameState } from '../src/game/state';
import { createRng } from '../src/utils/rng';
import { rows, withTray } from './helpers';

const config = gameConfigFor(ADIRE);

function game(board: string[], tray: (string | null)[], mode: GameState['mode'] = 'classic', objectiveId: string | null = null) {
  const s = createGame(config, { mode, seed: 1, board: boardFromRows(board), objectiveId });
  return withTray(s, tray);
}

describe('game state', () => {
  it('starts with an empty board, three pieces and the first unwoven objective', () => {
    const s = createGame(config, { mode: 'classic', seed: 5 });
    expect(countFilled(s.board)).toBe(0);
    expect(s.tray.filter(Boolean)).toHaveLength(3);
    expect(s.objectiveId).toBe(ADIRE.patterns[0].id);
  });

  it('skips objectives the player already unlocked', () => {
    const cfg = gameConfigFor(ADIRE, [ADIRE.patterns[0].id]);
    expect(createGame(cfg, { mode: 'classic', seed: 5 }).objectiveId).toBe(ADIRE.patterns[1].id);
  });

  it('rejects illegal moves', () => {
    const s = game(Array(7).fill('.......'), ['quad-h', 'single', 'single']);
    expect(applyMove(config, s, 0, 0, 5)).toBeNull();
    expect(applyMove(config, s, 0, -1, 0)).toBeNull();
  });

  it('places a piece and empties its slot without scoring', () => {
    const s = game(Array(7).fill('.......'), ['square', 'single', 'single']);
    const out = applyMove(config, s, 0, 0, 0)!;
    expect(out.result.placed).toEqual([0, 1, 7, 8]);
    expect(out.state.tray[0]).toBeNull();
    expect(out.state.score).toBe(0);
    expect(rows(out.state.board)[0]).toBe('##.....');
    expect(out.state.turn).toBe(1);
    // the old state is untouched
    expect(countFilled(s.board)).toBe(0);
  });

  it('clears a completed row and scores 100', () => {
    const s = game(['####...', ...Array(6).fill('.......')], ['trio-h', 'single', 'single']);
    const out = applyMove(config, s, 0, 0, 4)!;
    expect(out.result.rows).toEqual([0]);
    expect(out.result.cleared).toHaveLength(7);
    expect(out.state.score).toBe(100);
    expect(countFilled(out.state.board)).toBe(0);
  });

  it('scores two simultaneous lines at 250', () => {
    const s = game(['######.', ...Array(5).fill('......#'), '......#'], ['single', 'single', 'single']);
    // Placing at (0,6) completes row 0 and column 6
    const out = applyMove(config, s, 0, 0, 6)!;
    expect(out.result.rows).toEqual([0]);
    expect(out.result.cols).toEqual([6]);
    expect(out.result.score.lines).toBe(250);
  });

  it('weaves the objective pattern, scores 300 and picks the next objective', () => {
    const s = game(
      ['##.....', ...Array(6).fill('.......')],
      ['duo-h', 'single', 'single'],
      'classic',
      'adire.stitch',
    );
    const out = applyMove(config, s, 0, 0, 3)!;
    expect(out.result.pattern?.patternId).toBe('adire.stitch');
    expect(out.result.score.patterns).toBe(300);
    expect(out.state.score).toBe(300);
    expect(out.state.stats.woven).toEqual(['adire.stitch']);
    expect(out.state.objectiveId).toBe(ADIRE.patterns[1].id);
    expect(countFilled(out.state.board)).toBe(0);
  });

  it('previews lines and patterns without changing anything', () => {
    const s = game(['######.', ...Array(6).fill('.......')], ['single', 'single', 'single']);
    const p = previewMove(config, s, 0, 0, 6)!;
    expect(p.rows).toEqual([0]);
    expect(p.lineCells).toHaveLength(7);
    expect(previewMove(config, s, 0, 0, 0)).toBeNull();
  });

  it('adds a combo bonus on back-to-back clears', () => {
    let s = game(['######.', '######.', ...Array(5).fill('.......')], ['single', 'single', 'quad-h']);
    s = applyMove(config, s, 0, 0, 6)!.state;
    expect(s.score).toBe(100);
    const out = applyMove(config, s, 1, 1, 6)!;
    expect(out.result.streak).toBe(2);
    expect(out.result.score.combo).toBe(50);
    expect(out.state.score).toBe(250);
  });

  it('refills the tray once all three pieces are placed', () => {
    let s = game(Array(7).fill('.......'), ['single', 'single', 'single']);
    s = applyMove(config, s, 0, 0, 0)!.state;
    s = applyMove(config, s, 1, 6, 6)!.state;
    const out = applyMove(config, s, 2, 3, 3)!;
    expect(out.result.refilled).toBe(true);
    expect(out.state.tray.filter(Boolean)).toHaveLength(3);
  });

  it('ends the game when nothing left fits', () => {
    const s = game(
      ['#.#.#.#', '.#.#.#.', '#.#.#.#', '.#.#.#.', '#.#.#.#', '.#.#.#.', '#.#.#..'],
      ['single', 'square', null],
    );
    const out = applyMove(config, s, 0, 6, 6)!;
    expect(out.result.gameOver).toBe(true);
    expect(out.state.over).toBe(true);
    expect(applyMove(config, out.state, 1, 0, 1)).toBeNull();
  });

  it('never ends in Slow Weave and never scores', () => {
    const s = game(
      ['#.#.#.#', '.#.#.#.', '#.#.#.#', '.#.#.#.', '#.#.#.#', '.#.#.#.', '#.#.#..'],
      ['single', 'square', null],
      'slow',
    );
    const out = applyMove(config, s, 0, 6, 6)!;
    expect(out.result.gameOver).toBe(false);
    expect(out.state.over).toBe(false);
    expect(out.state.score).toBe(0);
    expect(out.state.tray.some((p) => p !== null)).toBe(true);
    // The fullest row and column loosen to give the player room
    expect(out.result.loosened.length).toBeGreaterThan(0);
    expect(countFilled(out.state.board)).toBeLessThan(countFilled(s.board) + 1);
  });

  it('plays a long Slow Weave session without ever getting stuck', () => {
    let s = createGame(config, { mode: 'slow', seed: 99 });
    const rng = createRng(3);
    for (let move = 0; move < 400; move++) {
      const options: [number, number, number][] = [];
      s.tray.forEach((p, slot) => {
        if (!p) return;
        for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (previewMove(config, s, slot, r, c)) options.push([slot, r, c]);
      });
      expect(options.length, `stuck at move ${move}`).toBeGreaterThan(0);
      const [slot, r, c] = rng.pick(options);
      s = applyMove(config, s, slot, r, c)!.state;
      expect(s.over).toBe(false);
    }
    expect(s.score).toBe(0);
  });

  it('random classic play always reaches a clean game over', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let s = createGame(config, { mode: 'classic', seed });
      const rng = createRng(seed);
      let guard = 0;
      while (!s.over && guard++ < 2000) {
        const options: [number, number, number][] = [];
        s.tray.forEach((p, slot) => {
          if (!p) return;
          for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (previewMove(config, s, slot, r, c)) options.push([slot, r, c]);
        });
        expect(options.length).toBeGreaterThan(0);
        s = applyMove(config, s, ...rng.pick(options))!.state;
      }
      expect(s.over).toBe(true);
      expect(s.score).toBe(s.stats.lineScore + s.stats.patternScore + s.stats.comboScore);
    }
  });
});
