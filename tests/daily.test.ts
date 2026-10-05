import { describe, expect, it } from 'vitest';
import { gameConfigFor } from '../src/data';
import { ADIRE } from '../src/data/collections/adire';
import { countFilled, findCompletedLines } from '../src/game/board';
import { createDailyChallenge, createDailyGame, dailySeed } from '../src/game/daily';
import { findPattern } from '../src/game/patterns';
import { applyMove, previewMove } from '../src/game/state';
import { localDateKey } from '../src/utils/date';

describe('daily weave', () => {
  const config = gameConfigFor(ADIRE);

  it('gives the same challenge for the same date', () => {
    const a = createDailyChallenge(config, '2026-10-05');
    const b = createDailyChallenge(config, '2026-10-05');
    expect(a).toEqual(b);
    expect(createDailyGame(config, '2026-10-05')).toEqual(createDailyGame(config, '2026-10-05'));
  });

  it('is independent of what the player has unlocked', () => {
    const unlocked = gameConfigFor(ADIRE, ADIRE.patterns.map((p) => p.id));
    expect(createDailyChallenge(unlocked, '2026-10-05')).toEqual(createDailyChallenge(config, '2026-10-05'));
  });

  it('varies from day to day', () => {
    const seeds = new Set<number>();
    const boards = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const key = `2026-02-${String(d).padStart(2, '0')}`;
      seeds.add(dailySeed(key));
      boards.add(createDailyChallenge(config, key).board.cells.join(''));
    }
    expect(seeds.size).toBe(28);
    expect(boards.size).toBeGreaterThan(20);
  });

  it('starts from a light cloth with no finished lines and the motif not already present', () => {
    for (let d = 1; d <= 60; d++) {
      const key = localDateKey(new Date(2026, 0, d));
      const c = createDailyChallenge(config, key);
      const lines = findCompletedLines(c.board);
      expect(lines.rows.length + lines.cols.length).toBe(0);
      expect(countFilled(c.board)).toBeGreaterThan(0);
      expect(countFilled(c.board)).toBeLessThanOrEqual(20);
      const objective = config.patterns.find((p) => p.id === c.objectiveId)!;
      expect(findPattern(c.board, objective)).toBeNull();
    }
  });

  it('replays identically for the same moves', () => {
    const play = () => {
      let s = createDailyGame(config, '2026-10-05');
      for (let i = 0; i < 12 && !s.over; i++) {
        let moved = false;
        for (let slot = 0; slot < 3 && !moved; slot++) {
          for (let r = 0; r < 7 && !moved; r++) {
            for (let c = 0; c < 7 && !moved; c++) {
              if (previewMove(config, s, slot, r, c)) {
                s = applyMove(config, s, slot, r, c)!.state;
                moved = true;
              }
            }
          }
        }
      }
      return s;
    };
    expect(play()).toEqual(play());
  });

  it('marks the daily complete when its motif is woven', () => {
    const s = createDailyGame(config, '2026-10-05');
    expect(s.daily?.completed).toBe(false);
    expect(s.objectiveId).toBe(s.daily?.objectiveId);
  });

  it('formats local date keys', () => {
    expect(localDateKey(new Date(2026, 9, 5))).toBe('2026-10-05');
  });
});
