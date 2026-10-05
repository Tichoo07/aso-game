import Phaser from 'phaser';
import { feedback } from '../services';
import { textStyle } from './text';
import type { Theme } from './theme';
import { FONTS } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'link';

/**
 * Pill button. Primary is filled indigo, secondary is an ink outline, link
 * is italic serif text with a thin underline. The hit area always covers the
 * full button (at least 48 design units tall when laid out by scenes).
 */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private bw = 10;
  private bh = 10;
  private pressed = false;

  constructor(
    scene: Phaser.Scene,
    text: string,
    private readonly variant: ButtonVariant,
    private readonly th: Theme,
    onClick: () => void,
  ) {
    super(scene, 0, 0);
    this.bg = scene.add.graphics();
    const color = variant === 'primary' ? th.textOnPrimary : th.text;
    this.label = scene.add
      .text(0, 0, text, variant === 'link' ? textStyle('title', 16, color, { fontFamily: FONTS.display, fontStyle: 'italic 400' }) : textStyle('label', 14, color))
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(this.bw, this.bh);
    this.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, 10, 10), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });

    this.on('pointerdown', () => {
      this.pressed = true;
      this.setScale(0.97);
    });
    this.on('pointerout', () => {
      this.pressed = false;
      this.setScale(1);
    });
    this.on('pointerup', () => {
      if (!this.pressed) return;
      this.pressed = false;
      this.setScale(1);
      feedback('button_press');
      onClick();
    });
    scene.add.existing(this);
  }

  /** Centre at (x, y), size w x h, font size in px. */
  place(x: number, y: number, w: number, h: number, fontSize: number): this {
    this.setPosition(x, y);
    this.bw = w;
    this.bh = h;
    this.label.setFontSize(fontSize);
    if (this.variant !== 'link') this.label.setLetterSpacing(Math.round(fontSize * 0.16));
    this.setSize(w, h);
    // Container hit areas are relative to the top-left of its size box
    (this.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setTo(0, 0, w, h);
    this.redraw();
    return this;
  }

  setText(text: string): this {
    this.label.setText(text);
    this.redraw();
    return this;
  }

  private redraw(): void {
    const { bg, bw: w, bh: h, th } = this;
    bg.clear();
    const lw = Math.max(1.5, h * 0.028);
    if (this.variant === 'primary') {
      bg.fillStyle(th.primary, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    } else if (this.variant === 'secondary') {
      bg.lineStyle(lw, th.line, th.hc ? 1 : 0.75);
      bg.strokeRoundedRect(-w / 2 + lw / 2, -h / 2 + lw / 2, w - lw, h - lw, (h - lw) / 2);
    } else {
      const tw = this.label.width;
      bg.lineStyle(lw * 0.8, th.line, th.hc ? 0.9 : 0.4);
      const y = this.label.height * 0.42;
      bg.lineBetween(-tw / 2, y, tw / 2, y);
    }
  }
}
