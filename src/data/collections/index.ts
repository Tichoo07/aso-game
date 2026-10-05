import { ADIRE } from './adire';
import type { CollectionDef } from './types';
import { ASO_OKE, EASTERN, LAGOS, NORTHERN } from './upcoming';

export type { CollectionDef, MotifPainter, MotifSpec } from './types';

/** Journal order. Add new collections here. */
export const COLLECTIONS: readonly CollectionDef[] = [ADIRE, ASO_OKE, LAGOS, EASTERN, NORTHERN];

export const DEFAULT_COLLECTION_ID = ADIRE.id;

export function getCollection(id: string): CollectionDef {
  return COLLECTIONS.find((c) => c.id === id) ?? ADIRE;
}

/** The collection a player can actually play; falls back to the default. */
export function playableCollection(id: string): CollectionDef {
  const c = getCollection(id);
  return c.status === 'available' && c.motifs.length > 0 && c.patterns.length > 0 ? c : ADIRE;
}
