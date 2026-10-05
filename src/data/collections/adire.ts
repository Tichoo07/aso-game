import type { CollectionDef } from './types';

const INDIGO = '#243B63';
const INDIGO_DEEP = '#1D3155';
const INDIGO_SOFT = '#2B4670';
const CREAM = '#F3EBDC';

/**
 * Adire: indigo resist-dyed cloth.
 *
 * Pattern names below are plain descriptions of their geometry. They are
 * not traditional motif names and carry no claimed meaning. If you add a
 * traditional name or meaning, put it in `provenance` with a source.
 *
 * Grid key: '#' woven (must be filled), 'o' resist (must be empty),
 * '.' free. Set `rotations: true` to also accept quarter turns.
 */
export const ADIRE: CollectionDef = {
  id: 'adire',
  name: 'Adire',
  subtitle: 'Indigo resist',
  description:
    'Indigo cloth patterned by resisting the dye: tying, stitching or painting starch onto the cloth before it meets the vat.',
  status: 'available',
  palette: [INDIGO, INDIGO_DEEP, CREAM, '#C29A52'],
  motifs: [
    { painter: 'rings', ground: INDIGO, dye: CREAM },
    { painter: 'stitches', ground: INDIGO_DEEP, dye: CREAM },
    { painter: 'lattice', ground: INDIGO_SOFT, dye: CREAM },
    { painter: 'stripes', ground: INDIGO, dye: CREAM },
    { painter: 'chevron', ground: INDIGO_DEEP, dye: CREAM },
    { painter: 'petals', ground: INDIGO_SOFT, dye: CREAM },
  ],
  patterns: [
    {
      id: 'adire.stitch',
      name: 'Running Stitch',
      rotations: true,
      grid: ['##o##'],
    },
    {
      id: 'adire.cross',
      name: 'Crossing',
      grid: [
        'o#o',
        '###',
        'o#o',
      ],
    },
    {
      id: 'adire.ring',
      name: 'Ring',
      grid: [
        '###',
        '#o#',
        '###',
      ],
    },
    {
      id: 'adire.steps',
      name: 'Steps',
      rotations: true,
      grid: [
        '#oo',
        '##o',
        '###',
      ],
    },
    {
      id: 'adire.bands',
      name: 'Twin Bands',
      rotations: true,
      grid: [
        '####',
        'oooo',
        '####',
      ],
    },
    {
      id: 'adire.lattice',
      name: 'Lattice',
      rotations: true,
      grid: [
        '#o#',
        '###',
        '#o#',
      ],
    },
    {
      id: 'adire.diamond',
      name: 'Diamond',
      grid: [
        'o#o',
        '#o#',
        'o#o',
      ],
    },
    {
      id: 'adire.bloom',
      name: 'Bloom',
      grid: [
        'o##o',
        '####',
        '####',
        'o##o',
      ],
    },
  ],
};
