import { canPlaceAnywhere } from './board';
import type { Board, Piece } from './types';

export function hasAnyMove(board: Board, tray: readonly (Piece | null)[]): boolean {
  return tray.some((p) => p !== null && canPlaceAnywhere(board, p.shape));
}

/** Game over: at least one piece is waiting, and none of them fit anywhere. */
export function isGameOver(board: Board, tray: readonly (Piece | null)[]): boolean {
  return tray.some((p) => p !== null) && !hasAnyMove(board, tray);
}

/** Per slot: does this piece fit somewhere? Empty slots report false. */
export function placeableSlots(board: Board, tray: readonly (Piece | null)[]): boolean[] {
  return tray.map((p) => p !== null && canPlaceAnywhere(board, p.shape));
}
