import { SHAPES } from '../src/data';
import type { GameState } from '../src/game/state';
import type { Board, Piece, Shape } from '../src/game/types';

export function shape(id: string): Shape {
  const s = SHAPES.find((x) => x.id === id);
  if (!s) throw new Error(`no shape ${id}`);
  return s;
}

export function piece(id: string, uid = 1, motif = 1): Piece {
  return { uid, shape: shape(id), motif };
}

/** Render a board as ASCII rows for readable assertions. */
export function rows(board: Board): string[] {
  const out: string[] = [];
  for (let r = 0; r < board.size; r++) {
    let line = '';
    for (let c = 0; c < board.size; c++) line += board.cells[r * board.size + c] ? '#' : '.';
    out.push(line);
  }
  return out;
}

export function withTray(state: GameState, ids: (string | null)[]): GameState {
  return { ...state, tray: ids.map((id, i) => (id ? piece(id, 1000 + i) : null)) };
}
