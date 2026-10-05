/** A [row, col] position on the board, or an offset inside a shape. */
export type Coord = readonly [number, number];

export type ShapeTier = 'small' | 'medium' | 'large';

/** Authoring format for a piece shape (see src/data/shapes.ts). */
export interface ShapeDef {
  id: string;
  name: string;
  /** ASCII rows: '#' is a cell, '.' is empty space. */
  rows: readonly string[];
  /** Relative frequency when dealing pieces. */
  weight: number;
  /** Used by the fairness rules and the difficulty curve. */
  tier: ShapeTier;
}

/** A compiled shape: normalised cell offsets plus its bounding box. */
export interface Shape {
  id: string;
  name: string;
  cells: readonly Coord[];
  width: number;
  height: number;
  weight: number;
  tier: ShapeTier;
}

export interface Piece {
  /** Unique within a run, so views can tell when a tray slot was refilled. */
  uid: number;
  shape: Shape;
  /** 1-based index into the active collection's motif list. */
  motif: number;
}

/**
 * Row-major square grid. 0 is empty; n > 0 is the motif index of the cloth
 * occupying that cell.
 */
export interface Board {
  readonly size: number;
  readonly cells: readonly number[];
}

export interface LineSet {
  rows: number[];
  cols: number[];
}
