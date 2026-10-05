import Phaser from 'phaser';
import { Button, type ButtonVariant } from './Button';
import type { Frame } from './layout';
import { animate } from './motion';
import { textStyle } from './text';
import { PALETTE, type Theme } from './theme';

export interface ModalAction {
  label: string;
  variant: ButtonVariant;
  onClick: () => void;
}

/**
 * A centred panel over a veil that swallows input underneath.
 * Call layout(frame) after creating it and on every resize.
 */
export class Modal extends Phaser.GameObjects.Container {
  private veil: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text | null;
  private buttons: Button[];

  constructor(
    scene: Phaser.Scene,
    private readonly th: Theme,
    title: string,
    body: string | null,
    actions: ModalAction[],
  ) {
    super(scene, 0, 0);
    this.veil = scene.add.rectangle(0, 0, 10, 10, PALETTE.ivory, th.hc ? 0.96 : 0.86).setOrigin(0).setInteractive();
    this.panel = scene.add.graphics();
    this.title = scene.add.text(0, 0, title, textStyle('title', 24, th.text)).setOrigin(0.5, 0);
    this.bodyText = body ? scene.add.text(0, 0, body, textStyle('body', 15, th.textMuted, { align: 'left', lineSpacing: 6 })).setOrigin(0.5, 0) : null;
    this.buttons = actions.map((a) => new Button(scene, a.label, a.variant, th, a.onClick));
    this.add([this.veil, this.panel, this.title, ...(this.bodyText ? [this.bodyText] : []), ...this.buttons]);
    this.setDepth(1000);
    scene.add.existing(this);
    this.setAlpha(0);
    animate(scene, { targets: this, alpha: 1, duration: 160 });
  }

  layout(f: Frame): void {
    const { u } = f;
    this.veil.setSize(f.W, f.H);
    (this.veil.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setTo(0, 0, f.W, f.H);

    const pw = Math.min(f.colW - u(32), u(360));
    const pad = u(28);
    const btnH = u(52);
    const gap = u(12);
    this.title.setFontSize(f.font(24));
    if (this.bodyText) {
      this.bodyText.setFontSize(f.font(15));
      this.bodyText.setLineSpacing(f.font(15) * 0.45);
      this.bodyText.setWordWrapWidth(pw - pad * 2);
    }
    const bodyH = this.bodyText ? this.bodyText.height + u(20) : 0;
    const ph = pad + this.title.height + u(20) + bodyH + this.buttons.length * (btnH + gap) - gap + pad;
    const px = f.cx - pw / 2;
    const py = (f.top + f.bottom) / 2 - ph / 2;

    this.panel.clear();
    this.panel.fillStyle(this.th.bg, 1);
    this.panel.fillRoundedRect(px, py, pw, ph, u(20));
    this.panel.lineStyle(Math.max(1, u(1)), this.th.line, this.th.hc ? 0.9 : 0.14);
    this.panel.strokeRoundedRect(px, py, pw, ph, u(20));

    let y = py + pad;
    this.title.setPosition(f.cx, y);
    y += this.title.height + u(20);
    if (this.bodyText) {
      this.bodyText.setPosition(f.cx, y);
      y += bodyH;
    }
    for (const b of this.buttons) {
      b.place(f.cx, y + btnH / 2, pw - pad * 2, btnH, f.font(14));
      y += btnH + gap;
    }
  }

  close(): void {
    animate(this.scene, { targets: this, alpha: 0, duration: 120, onComplete: () => this.destroy() });
  }
}
