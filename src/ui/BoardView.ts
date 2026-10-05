import Phaser from 'phaser';
import type { PatternMatch } from '../game/patterns';
import type { Board } from '../game/types';
import { reducedMotion } from './motion';
import { clothKey, TEX } from './textiles/textures';
import { PALETTE, type Theme } from './theme';

export interface ClearAnimation {
  rows: number[];
  cols: number[];
  lineCells: number[];
  pattern: PatternMatch | null;
}

/**
 * The loom. Owns a fixed set of game objects (one slot, cell, glow and ghost
 * image per square, plus a few thread sprites) created once and reused, so
 * nothing is allocated while dragging or animating.
 *
 * Coordinates: gridX/gridY are the world position of the top-left square's
 * corner; pitch is the distance between square centres.
 */
export class BoardView {
  readonly root: Phaser.GameObjects.Container;
  private frameGfx: Phaser.GameObjects.Graphics;
  private weaveGfx: Phaser.GameObjects.Graphics;
  private slots: Phaser.GameObjects.Image[] = [];
  private cells: Phaser.GameObjects.Image[] = [];
  private glows: Phaser.GameObjects.Image[] = [];
  private ghosts: Phaser.GameObjects.Image[] = [];
  private threads: Phaser.GameObjects.Image[] = [];
  private cellScale = 1;
  private pad = 0;
  gridX = 0;
  gridY = 0;
  pitch = 0;
  side = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly n: number,
    private readonly collectionId: string,
    private readonly th: Theme,
    /** 1 = normal; >1 = slower, softer (Slow Weave). */
    private readonly pace = 1,
  ) {
    this.root = scene.add.container(0, 0);
    this.frameGfx = scene.add.graphics();
    this.root.add(this.frameGfx);
    const count = n * n;
    for (let i = 0; i < count; i++) this.slots.push(scene.add.image(0, 0, TEX.slot(th.hc)));
    for (let i = 0; i < count; i++) this.cells.push(scene.add.image(0, 0, clothKey(collectionId, 1, th.hc)).setVisible(false));
    for (let i = 0; i < count; i++) this.ghosts.push(scene.add.image(0, 0, clothKey(collectionId, 1, th.hc)).setVisible(false).setAlpha(0.5));
    for (let i = 0; i < count; i++) this.glows.push(scene.add.image(0, 0, TEX.glow(th.hc)).setVisible(false));
    this.root.add([...this.slots, ...this.cells, ...this.ghosts, ...this.glows]);
    for (let i = 0; i < n * 2; i++) this.threads.push(scene.add.image(0, 0, TEX.pixel).setOrigin(0, 0.5).setVisible(false));
    this.weaveGfx = scene.add.graphics();
    this.root.add([...this.threads, this.weaveGfx]);
  }

  /** Board square of side `side` with its top-left corner at (x, y). */
  layout(x: number, y: number, side: number): void {
    this.side = side;
    this.pad = side * 0.035;
    this.pitch = (side - this.pad * 2) / this.n;
    this.root.setPosition(x, y);
    this.gridX = x + this.pad;
    this.gridY = y + this.pad;
    const size = this.pitch * 0.92;
    const tex = this.scene.textures.get(TEX.slot(this.th.hc)).getSourceImage() as HTMLCanvasElement;
    this.cellScale = size / tex.width;
    for (let i = 0; i < this.n * this.n; i++) {
      const { x: cx, y: cy } = this.localCenter(i);
      for (const img of [this.slots[i], this.cells[i], this.ghosts[i], this.glows[i]]) {
        img.setPosition(cx, cy).setScale(this.cellScale);
      }
    }
    this.drawFrame();
  }

  private drawFrame(): void {
    const g = this.frameGfx;
    const { side, pitch, th } = this;
    g.clear();
    g.fillStyle(th.surface, 1);
    g.fillRoundedRect(0, 0, side, side, pitch * 0.16);
    g.lineStyle(Math.max(1, side * 0.003), th.surfaceLine, th.hc ? 0.8 : 0.12);
    g.strokeRoundedRect(0, 0, side, side, pitch * 0.16);
    // Fringe: loose warp threads at the top and bottom edges
    const len = pitch * 0.2;
    g.lineStyle(Math.max(1, pitch * 0.025), PALETTE.indigo, th.hc ? 0.7 : 0.28);
    for (let c = 0; c < this.n * 3; c++) {
      const x = this.pad + (c + 0.5) * (pitch / 3);
      const wobble = ((c * 7) % 5) / 5;
      g.lineBetween(x, -len * (0.55 + wobble * 0.45), x, -side * 0.004);
      g.lineBetween(x, side + side * 0.004, x, side + len * (0.55 + ((c * 3) % 5) / 10));
    }
  }

  private localCenter(i: number): { x: number; y: number } {
    const r = Math.floor(i / this.n);
    const c = i % this.n;
    return { x: this.pad + (c + 0.5) * this.pitch, y: this.pad + (r + 0.5) * this.pitch };
  }

  /** World-space centre of square i. */
  cellCenter(i: number): { x: number; y: number } {
    const p = this.localCenter(i);
    return { x: this.root.x + p.x, y: this.root.y + p.y };
  }

  /** Grid cell nearest to a shape's top-left corner at world (left, top). */
  snap(left: number, top: number): { row: number; col: number } {
    return {
      row: Math.round((top - this.gridY) / this.pitch),
      col: Math.round((left - this.gridX) / this.pitch),
    };
  }

  /** Show the board exactly as given, cancelling any running cell tweens. */
  render(board: Board): void {
    for (let i = 0; i < board.cells.length; i++) {
      const img = this.cells[i];
      this.scene.tweens.killTweensOf(img);
      const v = board.cells[i];
      img.setScale(this.cellScale).setAlpha(1).setAngle(0);
      if (v > 0) img.setTexture(clothKey(this.collectionId, v, this.th.hc)).setVisible(true);
      else img.setVisible(false);
    }
  }

  /** Ghost of the piece where it would land, plus outlines on everything that would clear. */
  showPreview(placed: readonly number[], motif: number, clearing: readonly number[]): void {
    this.clearPreview();
    const key = clothKey(this.collectionId, motif, this.th.hc);
    for (const i of placed) {
      this.ghosts[i].setTexture(key).setVisible(true);
      this.glows[i].setVisible(true);
    }
    for (const i of clearing) this.glows[i].setVisible(true);
  }

  clearPreview(): void {
    for (const g of this.ghosts) g.setVisible(false);
    for (const g of this.glows) g.setVisible(false);
  }

  animatePlace(indices: readonly number[]): void {
    if (reducedMotion()) return;
    const s = this.cellScale;
    for (const i of indices) {
      const img = this.cells[i];
      img.setScale(s * 0.84).setAlpha(0.7);
      this.scene.tweens.add({
        targets: img,
        scale: s,
        alpha: 1,
        duration: 150 * this.pace,
        ease: this.pace > 1 ? 'Sine.Out' : 'Back.Out',
      });
    }
  }

  /** Lines unravel along their length; patterns weave, then dissolve. Calls done once. */
  animateClear(clear: ClearAnimation, done: () => void): void {
    if (reducedMotion()) {
      // No movement: a brief fade so the change is still noticeable
      const targets = [...new Set([...clear.lineCells, ...(clear.pattern?.cells ?? [])])].map((i) => this.cells[i]);
      this.scene.tweens.add({ targets, alpha: 0, duration: 140, onComplete: done });
      return;
    }
    let total = 0;
    if (clear.lineCells.length) total = Math.max(total, this.unravelLines(clear));
    if (clear.pattern) total = Math.max(total, this.weavePattern(clear.pattern));
    this.scene.time.delayedCall(total, done);
  }

  /** Slow Weave relief: cells drift away softly. */
  animateLoosen(cells: readonly number[], done: () => void): void {
    if (reducedMotion() || cells.length === 0) {
      done();
      return;
    }
    cells.forEach((i, k) => {
      this.scene.tweens.add({
        targets: this.cells[i],
        alpha: 0,
        scale: this.cellScale * 0.9,
        delay: k * 30,
        duration: 600,
        ease: 'Sine.InOut',
      });
    });
    this.scene.time.delayedCall(cells.length * 30 + 650, done);
  }

  private unravelLines(clear: ClearAnimation): number {
    const { pitch, pad, n } = this;
    const span = pitch * n;
    const thick = pitch * 0.07;
    const sweep = 240 * this.pace;
    const step = 26 * this.pace;
    let t = 0;
    const lines: { horizontal: boolean; at: number }[] = [
      ...clear.rows.map((r) => ({ horizontal: true, at: r })),
      ...clear.cols.map((c) => ({ horizontal: false, at: c })),
    ];
    lines.forEach((line, k) => {
      const thread = this.threads[k % this.threads.length];
      this.scene.tweens.killTweensOf(thread);
      thread.setTint(this.th.hc ? PALETTE.ink : PALETTE.ochre).setAlpha(0.95).setVisible(true);
      if (line.horizontal) {
        thread.setPosition(pad, pad + (line.at + 0.5) * pitch).setAngle(0);
      } else {
        thread.setPosition(pad + (line.at + 0.5) * pitch, pad).setAngle(90);
      }
      thread.setDisplaySize(1, thick);
      this.scene.tweens.add({ targets: thread, displayWidth: span, duration: sweep, ease: 'Sine.InOut' });
      this.scene.tweens.add({
        targets: thread,
        alpha: 0,
        delay: sweep + 80,
        duration: 200,
        onComplete: () => thread.setVisible(false),
      });
    });
    // Each cell lets go when the thread passes it
    const delays = new Map<number, number>();
    for (const r of clear.rows) for (let c = 0; c < n; c++) delays.set(r * n + c, Math.min(delays.get(r * n + c) ?? Infinity, c * step));
    for (const c of clear.cols) for (let r = 0; r < n; r++) delays.set(r * n + c, Math.min(delays.get(r * n + c) ?? Infinity, r * step));
    for (const [i, d] of delays) {
      this.scene.tweens.add({
        targets: this.cells[i],
        scale: this.cellScale * 0.25,
        alpha: 0,
        angle: (i % 2 ? 1 : -1) * 8,
        delay: d + 60,
        duration: 240 * this.pace,
        ease: 'Sine.In',
      });
      t = Math.max(t, d + 60 + 240 * this.pace);
    }
    return Math.max(t, sweep + 280);
  }

  /** Warp and weft threads cross over and under the motif, then it lifts away. */
  private weavePattern(match: PatternMatch): number {
    const { n, pitch, pad } = this;
    const rows = new Set<number>();
    const cols = new Set<number>();
    for (const i of match.cells) {
      rows.add(Math.floor(i / n));
      cols.add(i % n);
    }
    const r0 = Math.min(...rows);
    const r1 = Math.max(...rows);
    const c0 = Math.min(...cols);
    const c1 = Math.max(...cols);
    const ys = Array.from({ length: r1 - r0 + 1 }, (_, k) => pad + (r0 + k + 0.5) * pitch);
    const xs = Array.from({ length: c1 - c0 + 1 }, (_, k) => pad + (c0 + k + 0.5) * pitch);
    const left = pad + c0 * pitch - pitch * 0.18;
    const top = pad + r0 * pitch - pitch * 0.18;
    const width = (c1 - c0 + 1) * pitch + pitch * 0.36;
    const height = (r1 - r0 + 1) * pitch + pitch * 0.36;
    const th = pitch * 0.075;
    const weft = this.th.hc ? PALETTE.ink : PALETTE.ochre;
    const warp = this.th.hc ? 0xffffff : PALETTE.ivory;
    const g = this.weaveGfx;
    const weaveTime = 950 * this.pace;
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    g.setAlpha(1);
    const draw = (p: number) => {
      g.clear();
      ys.forEach((y, i) => {
        const k = clamp01((p - i * 0.05) / 0.45);
        if (k <= 0) return;
        g.fillStyle(PALETTE.ink, 0.22);
        g.fillRect(left, y - th / 2 - 1.5, width * k, th + 3);
        g.fillStyle(weft, 1);
        g.fillRect(left, y - th / 2, width * k, th);
      });
      xs.forEach((x, j) => {
        const k = clamp01((p - 0.3 - j * 0.05) / 0.45);
        if (k <= 0) return;
        const end = top + height * k;
        let cursor = top;
        const segment = (from: number, to: number) => {
          if (to <= from) return;
          g.fillStyle(PALETTE.ink, 0.22);
          g.fillRect(x - th / 2 - 1.5, from, th + 3, to - from);
          g.fillStyle(warp, 1);
          g.fillRect(x - th / 2, from, th, to - from);
        };
        // Alternate over/under at each crossing
        ys.forEach((y, i) => {
          if ((i + j) % 2 === 0) return;
          const gapTop = y - th * 1.3;
          if (gapTop > cursor) segment(cursor, Math.min(gapTop, end));
          cursor = Math.max(cursor, y + th * 1.3);
        });
        segment(cursor, end);
      });
    };

    const counter = { p: 0 };
    this.scene.tweens.add({
      targets: counter,
      p: 1,
      duration: weaveTime,
      ease: 'Sine.InOut',
      onUpdate: () => draw(counter.p),
    });

    // Then the motif lifts off from its centre outwards
    const cy = (ys[0] + ys[ys.length - 1]) / 2;
    const cx = (xs[0] + xs[xs.length - 1]) / 2;
    let end = weaveTime;
    for (const i of match.cells) {
      const p = this.localCenter(i);
      const d = (Math.hypot(p.x - cx, p.y - cy) / pitch) * 45 * this.pace;
      this.scene.tweens.add({
        targets: this.cells[i],
        alpha: 0,
        scale: this.cellScale * 1.12,
        delay: weaveTime + d,
        duration: 320 * this.pace,
        ease: 'Sine.Out',
      });
      end = Math.max(end, weaveTime + d + 320 * this.pace);
    }
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      delay: weaveTime + 120,
      duration: 360 * this.pace,
      onComplete: () => g.clear(),
    });
    return Math.max(end, weaveTime + 480 * this.pace);
  }
}
