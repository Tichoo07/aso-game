import type { CollectionDef } from './types';

/**
 * Collections that are planned but not playable yet. They appear in the
 * journal as "coming soon". To make one playable: give it motifs and
 * patterns, then set status to 'available'.
 *
 * Descriptions are deliberately brief. Add detail only with sources.
 */
export const ASO_OKE: CollectionDef = {
  id: 'aso-oke',
  name: 'Aṣọ Òkè',
  subtitle: 'Hand-loomed strip cloth',
  description: 'Narrow woven strips, sewn edge to edge into a wider cloth.',
  status: 'coming-soon',
  palette: ['#C29A52', '#B9654B', '#243B63', '#F3EBDC'],
  motifs: [],
  patterns: [],
};

export const LAGOS: CollectionDef = {
  id: 'lagos',
  name: 'Lagos',
  subtitle: 'City cloth',
  description: 'In preparation.',
  status: 'coming-soon',
  palette: ['#B9654B', '#17151C', '#F3EBDC', '#C29A52'],
  motifs: [],
  patterns: [],
};

export const EASTERN: CollectionDef = {
  id: 'eastern',
  name: 'Eastern Nigeria',
  subtitle: 'Regional cloth',
  description: 'In preparation.',
  status: 'coming-soon',
  palette: ['#40584A', '#B9654B', '#F3EBDC', '#17151C'],
  motifs: [],
  patterns: [],
};

export const NORTHERN: CollectionDef = {
  id: 'northern',
  name: 'Northern Nigeria',
  subtitle: 'Regional cloth',
  description: 'In preparation.',
  status: 'coming-soon',
  palette: ['#243B63', '#40584A', '#C29A52', '#F3EBDC'],
  motifs: [],
  patterns: [],
};
