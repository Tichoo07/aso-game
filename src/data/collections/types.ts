import type { PatternDef } from '../../game/patterns';

/**
 * Procedural cloth painters, implemented in src/ui/textiles/painters.ts.
 * A new collection can reuse these or register new ones there.
 */
export type MotifPainter = 'rings' | 'stitches' | 'lattice' | 'stripes' | 'chevron' | 'petals';

/** One kind of cloth a piece can be made of. */
export interface MotifSpec {
  painter: MotifPainter;
  /** Dyed ground colour (CSS hex). */
  ground: string;
  /** Resist / thread colour (CSS hex). */
  dye: string;
}

export type CollectionStatus = 'available' | 'coming-soon';

export interface CollectionDef {
  id: string;
  name: string;
  /** Short line under the name, e.g. the technique. */
  subtitle: string;
  /** One or two factual sentences. Keep claims modest and verifiable. */
  description: string;
  status: CollectionStatus;
  /** Swatch colours shown in the journal. */
  palette: readonly string[];
  /** Pieces are dealt in these cloths. Board cells store a 1-based index into this list. */
  motifs: readonly MotifSpec[];
  /** Objectives, in the order the player meets them. */
  patterns: readonly PatternDef[];
}
