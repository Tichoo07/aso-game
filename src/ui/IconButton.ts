import Phaser from 'phaser';
import { feedback } from '../services';
import type { Theme } from './theme';

export type IconName = 'back' | 'pause' | 'settings' | 'close' | 'prev' | 'next';

/** A line icon drawn with Graphics, inside a generous square hit area. */
export class IconButton extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private hitSize = 48;
  private pressed = false;

  constructor(
    scene: Phaser.Scene,
    private readonly icon: IconName,
    private readonly th: Theme,
    onClick: () => void,
  ) {
    super(scene, 0, 0);
    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    this.setSize(this.hitSize, this.hitSize);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, this.hitSize, this.hitSize),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.on('pointerdown', () => {
      this.pressed = true;
      this.gfx.setAlpha(0.5);
    });
    this.on('pointerout', () => {
      this.pressed = false;
      this.gfx.setAlpha(1);
    });
    this.on('pointerup', () => {
      if (!this.pressed) return;
      this.pressed = false;
      this.gfx.setAlpha(1);
      feedback('button_press');
      onClick();
    });
    scene.add.existing(this);
  }

  /** Centre at (x, y); size is the hit area, the glyph is drawn at ~45%. */
  place(x: number, y: number, size: number): this {
    this.setPosition(x, y);
    this.hitSize = size;
    this.setSize(size, size);
    (this.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setTo(0, 0, size, size);
    this.draw(size * 0.45);
    return this;
  }

  private draw(g: number): void {
    const { gfx, th } = this;
    const lw = Math.max(1.5, g * 0.09);
    const h = g / 2;
    gfx.clear();
    gfx.lineStyle(lw, th.line, th.hc ? 1 : 0.85);
    gfx.fillStyle(th.line, th.hc ? 1 : 0.85);
    switch (this.icon) {
      case 'back':
      case 'prev':
        gfx.beginPath();
        gfx.moveTo(h * 0.35, -h * 0.8);
        gfx.lineTo(-h * 0.45, 0);
        gfx.lineTo(h * 0.35, h * 0.8);
        gfx.strokePath();
        break;
      case 'next':
        gfx.beginPath();
        gfx.moveTo(-h * 0.35, -h * 0.8);
        gfx.lineTo(h * 0.45, 0);
        gfx.lineTo(-h * 0.35, h * 0.8);
        gfx.strokePath();
        break;
      case 'pause':
        gfx.lineBetween(-h * 0.35, -h * 0.65, -h * 0.35, h * 0.65);
        gfx.lineBetween(h * 0.35, -h * 0.65, h * 0.35, h * 0.65);
        break;
      case 'close':
        gfx.lineBetween(-h * 0.6, -h * 0.6, h * 0.6, h * 0.6);
        gfx.lineBetween(h * 0.6, -h * 0.6, -h * 0.6, h * 0.6);
        break;
      case 'settings':
        // Three slider rails with knobs
        for (const [y, kx] of [
          [-h * 0.6, h * 0.35],
          [0, -h * 0.4],
          [h * 0.6, h * 0.1],
        ]) {
          gfx.lineBetween(-h, y, h, y);
          gfx.fillCircle(kx, y, lw * 1.9);
        }
        break;
    }
  }
}
