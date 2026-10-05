import { BOARD_SIZE } from './constants';
import type { Board, Coord, LineSet, Shape } from './types';

export const EMPTY = 0;

export function createBoard(size: number = BOARD_SIZE): Board {
  return { size, cells: new Array<number>(size * size).fill(EMPTY) };
}

/**
 * Build a board from ASCII rows: '.' is empty, '#' is motif 1, '1'-'9' are
 * motifs. Handy for tests and hand-authored starting boards.
 */
export function boardFromRows(rows: readonly string[]): Board {
  const size = rows.length;
  const cells: number[] = [];
  for (const row of rows) {
    if (row.length !== size) throw new Error(`Board rows must be ${size} characters wide`);
    for (const ch of row) cells.push(ch === '.' ? EMPTY : ch === '#' ? 1 : Number(ch));
  }
  return { size, cells };
}

export function cellIndex(board: Board, row: number, col: number): number {
  return row * board.size + col;
}

/** Every cell of the shape lands on the board, and none of them is occupied. */
export function canPlace(board: Board, shape: Shape, row: number, col: number): boolean {
  const { size, cells } = board;
  if (row < 0 || col < 0 || row + shape.height > size || col + shape.width > size) return false;
  for (const [dr, dc] of shape.cells) {
    if (cells[(row + dr) * size + col + dc] !== EMPTY) return false;
  }
  return true;
}

export function shapeCellIndices(board: Board, shape: Shape, row: number, col: number): number[] {
  return shape.cells.map(([dr, dc]) => (row + dr) * board.size + col + dc);
}

/** Returns a new board with the shape placed. Throws on an illegal placement. */
export function placeShape(board: Board, shape: Shape, row: number, col: number, value: number): Board {
  if (value <= EMPTY) throw new Error('placeShape: value must be a motif index > 0');
  if (!canPlace(board, shape, row, col)) {
    throw new Error(`placeShape: "${shape.id}" does not fit at ${row},${col}`);
  }
  const cells = board.cells.slice();
  for (const i of shapeCellIndices(board, shape, row, col)) cells[i] = value;
  return { size: board.size, cells };
}

export function findCompletedLines(board: Board): LineSet {
  const { size, cells } = board;
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < size; r++) {
    let full = true;
    for (let c = 0; c < size && full; c++) full = cells[r * size + c] !== EMPTY;
    if (full) rows.push(r);
  }
  for (let c = 0; c < size; c++) {
    let full = true;
    for (let r = 0; r < size && full; r++) full = cells[r * size + c] !== EMPTY;
    if (full) cols.push(c);
  }
  return { rows, cols };
}

/** Unique, sorted cell indices covered by the given rows and columns. */
export function lineCellIndices(board: Board, lines: LineSet): number[] {
  const { size } = board;
  const set = new Set<number>();
  for (const r of lines.rows) for (let c = 0; c < size; c++) set.add(r * size + c);
  for (const c of lines.cols) for (let r = 0; r < size; r++) set.add(r * size + c);
  return [...set].sort((a, b) => a - b);
}

export function clearCells(board: Board, indices: Iterable<number>): Board {
  const cells = board.cells.slice();
  for (const i of indices) cells[i] = EMPTY;
  return { size: board.size, cells };
}

export function countFilled(board: Board): number {
  let n = 0;
  for (const v of board.cells) if (v !== EMPTY) n++;
  return n;
}

export function fillRatio(board: Board): number {
  return countFilled(board) / board.cells.length;
}

/**
 * Calls visit(row, col) for every legal placement, in row-major order.
 * Stops early and returns true as soon as visit returns true.
 */
export function forEachPlacement(
  board: Board,
  shape: Shape,
  visit: (row: number, col: number) => boolean | void,
): boolean {
  const maxRow = board.size - shape.height;
  const maxCol = board.size - shape.width;
  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c <= maxCol; c++) {
      if (canPlace(board, shape, r, c) && visit(r, c) === true) return true;
    }
  }
  return false;
}

export function canPlaceAnywhere(board: Board, shape: Shape): boolean {
  return forEachPlacement(board, shape, () => true);
}

export function validPlacements(board: Board, shape: Shape): Coord[] {
  const out: Coord[] = [];
  forEachPlacement(board, shape, (r, c) => {
    out.push([r, c]);
  });
  return out;
}
