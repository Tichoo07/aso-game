import type { ShapeDef } from '../game/types';

/**
 * Every piece the game can deal. Draw each one as ASCII rows:
 * '#' is a cell, '.' is empty space.
 *
 *   weight  relative frequency (higher = more common)
 *   tier    small | medium | large. At most two large pieces are dealt
 *           together, large pieces get likelier as the score rises, and
 *           small ones get likelier when the cloth is crowded.
 *
 * Pieces never rotate in play, so add each orientation you want as its own
 * entry. Keep pieces at four cells or fewer: the board is only 7 wide.
 */
export const SHAPE_DEFS: readonly ShapeDef[] = [
  { id: 'single', name: 'Single', tier: 'small', weight: 5, rows: ['#'] },

  { id: 'duo-h', name: 'Pair', tier: 'small', weight: 8, rows: ['##'] },
  { id: 'duo-v', name: 'Pair, upright', tier: 'small', weight: 8, rows: ['#', '#'] },

  { id: 'trio-h', name: 'Bar', tier: 'medium', weight: 7, rows: ['###'] },
  { id: 'trio-v', name: 'Bar, upright', tier: 'medium', weight: 7, rows: ['#', '#', '#'] },

  { id: 'corner-a', name: 'Small corner', tier: 'small', weight: 4, rows: ['#.', '##'] },
  { id: 'corner-b', name: 'Small corner', tier: 'small', weight: 4, rows: ['##', '#.'] },
  { id: 'corner-c', name: 'Small corner', tier: 'small', weight: 4, rows: ['##', '.#'] },
  { id: 'corner-d', name: 'Small corner', tier: 'small', weight: 4, rows: ['.#', '##'] },

  { id: 'square', name: 'Square', tier: 'medium', weight: 6, rows: ['##', '##'] },

  { id: 'l', name: 'L', tier: 'large', weight: 3, rows: ['#.', '#.', '##'] },
  { id: 'l-rev', name: 'Reverse L', tier: 'large', weight: 3, rows: ['.#', '.#', '##'] },
  { id: 'l-flat', name: 'L, lying', tier: 'large', weight: 2, rows: ['###', '#..'] },
  { id: 'l-rev-flat', name: 'Reverse L, lying', tier: 'large', weight: 2, rows: ['###', '..#'] },

  { id: 't', name: 'T', tier: 'large', weight: 3, rows: ['###', '.#.'] },
  { id: 't-up', name: 'T, raised', tier: 'large', weight: 2, rows: ['.#.', '###'] },

  { id: 'z', name: 'Z', tier: 'large', weight: 2, rows: ['##.', '.##'] },
  { id: 'z-rev', name: 'Reverse Z', tier: 'large', weight: 2, rows: ['.##', '##.'] },

  { id: 'quad-h', name: 'Long bar', tier: 'large', weight: 2, rows: ['####'] },
  { id: 'quad-v', name: 'Long bar, upright', tier: 'large', weight: 2, rows: ['#', '#', '#', '#'] },
];
