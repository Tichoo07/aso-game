import type { Coord, Shape, ShapeDef } from './types';

/** Turn an ASCII shape definition into normalised cell offsets. */
export function compileShape(def: ShapeDef): Shape {
  const raw: Coord[] = [];
  def.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '#') raw.push([r, c]);
      else if (ch !== '.') throw new Error(`Shape "${def.id}": unexpected character "${ch}"`);
    }
  });
  if (raw.length === 0) throw new Error(`Shape "${def.id}" has no cells`);
  if (def.weight <= 0) throw new Error(`Shape "${def.id}" needs a positive weight`);

  const minR = Math.min(...raw.map(([r]) => r));
  const minC = Math.min(...raw.map(([, c]) => c));
  const cells = raw.map(([r, c]) => [r - minR, c - minC] as const);
  return {
    id: def.id,
    name: def.name,
    cells,
    height: Math.max(...cells.map(([r]) => r)) + 1,
    width: Math.max(...cells.map(([, c]) => c)) + 1,
    weight: def.weight,
    tier: def.tier,
  };
}

export function compileShapes(defs: readonly ShapeDef[]): Shape[] {
  const seen = new Set<string>();
  return defs.map((def) => {
    if (seen.has(def.id)) throw new Error(`Duplicate shape id "${def.id}"`);
    seen.add(def.id);
    return compileShape(def);
  });
}
