import Phaser from 'phaser';
import type { PatternDef } from '../game/patterns';
import { hashString } from '../utils/rng';
import { clothKey } from './textiles/textures';
import type { Theme } from './theme';

export interface PreviewOptions {
  collectionId: string;
  motifCount: number;
  locked?: boolean;
}

/**
 * Draws a pattern objective as a small grid, centred on the container.
 *   woven  cloth cell (or an outline when locked)
 *   resist an empty cell marked with a small ring: "keep this empty"
 *   free   a faint dot
 */
export class PatternPreview extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private pool: Phaser.GameObjects.Image[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly th: Theme,
  ) {
    super(scene, 0, 0);
    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    scene.add.existing(this);
  }

  /**
   * Largest cell pitch that fits the pattern in a box of height boxH and
   * width boxW, never larger than a 3x3 grid would get.
   */
  static pitchFor(def: PatternDef, boxH: number, boxW: number = boxH): number {
    return Math.min(boxH / def.grid.length, boxW / def.grid[0].length, boxH / 3);
  }

  draw(def: PatternDef, pitch: number, opts: PreviewOptions): this {
    const { gfx, th } = this;
    gfx.clear();
    for (const img of this.pool) img.setVisible(false);

    const rows = def.grid.length;
    const cols = def.grid[0].length;
    const size = pitch * 0.88;
    const radius = size * 0.14;
    const motif = 1 + (hashString(def.id) % Math.max(1, opts.motifCount));
    const lw = Math.max(1, pitch * (th.hc ? 0.07 : 0.045));
    let used = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = def.grid[r][c];
        const x = (c - (cols - 1) / 2) * pitch;
        const y = (r - (rows - 1) / 2) * pitch;
        if (ch === '#') {
          if (opts.locked) {
            gfx.lineStyle(lw, th.line, th.hc ? 0.8 : 0.28);
            gfx.strokeRoundedRect(x - size / 2, y - size / 2, size, size, radius);
          } else {
            let img = this.pool[used];
            if (!img) {
              img = this.scene.add.image(0, 0, clothKey(opts.collectionId, motif, th.hc));
              this.pool.push(img);
              this.add(img);
            }
            img.setTexture(clothKey(opts.collectionId, motif, th.hc)).setPosition(x, y).setDisplaySize(size, size).setVisible(true);
            used++;
          }
        } else if (ch === 'o') {
          gfx.fillStyle(th.surface, 1);
          gfx.fillRoundedRect(x - size / 2, y - size / 2, size, size, radius);
          gfx.lineStyle(lw, th.line, th.hc ? 0.7 : 0.14);
          gfx.strokeRoundedRect(x - size / 2, y - size / 2, size, size, radius);
          gfx.lineStyle(lw, opts.locked ? th.line : th.accent, opts.locked ? 0.3 : th.hc ? 1 : 0.9);
          gfx.strokeCircle(x, y, size * 0.2);
        } else {
          gfx.fillStyle(th.line, th.hc ? 0.5 : 0.18);
          gfx.fillCircle(x, y, Math.max(1, pitch * 0.05));
        }
      }
    }
    // Keep the image pool above the graphics
    this.bringToTop(this.gfx);
    for (const img of this.pool) this.bringToTop(img);
    return this;
  }
}
