import { describe, expect, it } from 'vitest';
import { gameConfigFor, SHAPES } from '../src/data';
import { ADIRE } from '../src/data/collections/adire';
import { DEMO } from '../src/data/demo';
import { en } from '../src/data/i18n/en';
import { boardFromRows } from '../src/game/board';
import { applyMove, createGame, type GameState } from '../src/game/state';

function start(): GameState {
  const config = gameConfigFor(ADIRE);
  const s = createGame(config, { mode: 'classic', seed: DEMO.seed, board: boardFromRows(DEMO.board), objectiveId: DEMO.objectiveId });
  return {
    ...s,
    tray: DEMO.tray.map(([id, motif], i) => ({ uid: 9000 + i, shape: SHAPES.find((x) => x.id === id)!, motif })),
  };
}

describe('how-to-play demo script', () => {
  const config = gameConfigFor(ADIRE);

  it('uses real shapes, a real objective and real strings', () => {
    for (const [id] of DEMO.tray) expect(SHAPES.some((s) => s.id === id), id).toBe(true);
    expect(ADIRE.patterns.some((p) => p.id === DEMO.objectiveId)).toBe(true);
    for (const m of DEMO.moves) {
      expect(en[m.caption]).toBeTruthy();
      if (m.hint) expect(en[m.hint]).toBeTruthy();
    }
  });

  it('teaches placing, clearing a line and weaving, in that order', () => {
    let s = start();
    const results = DEMO.moves.map((m) => {
      const out = applyMove(config, s, m.slot, m.row, m.col);
      expect(out, `move into slot ${m.slot} at ${m.row},${m.col} must be legal`).not.toBeNull();
      s = out!.state;
      return out!.result;
    });

    const [place, clear, weave] = results;
    expect(place.cleared).toHaveLength(0);
    expect(clear.rows.length + clear.cols.length).toBe(1);
    expect(clear.pattern).toBeNull();
    expect(weave.pattern?.patternId).toBe(DEMO.objectiveId);
    expect(weave.rows.length + weave.cols.length).toBe(0);
    expect(s.over).toBe(false);
  });

  it('is identical every time it plays', () => {
    const play = () => {
      let s = start();
      for (const m of DEMO.moves) s = applyMove(config, s, m.slot, m.row, m.col)!.state;
      return s;
    };
    expect(play()).toEqual(play());
  });
});
