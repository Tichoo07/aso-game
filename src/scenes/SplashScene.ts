import Phaser from 'phaser';
import { t } from '../data/i18n';
import { reducedMotion } from '../ui/motion';
import { textStyle } from '../ui/text';
import { PALETTE } from '../ui/theme';
import { goTo } from '../ui/transitions';
import { BaseScene } from './BaseScene';

/** The name, a single thread drawn beneath it, then home. Tap to skip. */
export class SplashScene extends BaseScene {
  private title!: Phaser.GameObjects.Text;
  private line!: Phaser.GameObjects.Text;
  private thread!: Phaser.GameObjects.Graphics;
  private progress = { p: 0 };

  constructor() {
    super('Splash');
  }

  protected build(): void {
    this.title = this.add.text(0, 0, t('appName'), textStyle('display', 72, this.th.text)).setOrigin(0.5);
    this.line = this.add.text(0, 0, t('splashLine').toUpperCase(), textStyle('label', 12, this.th.textMuted)).setOrigin(0.5);
    this.thread = this.add.graphics();

    const quick = reducedMotion();
    this.title.setAlpha(quick ? 1 : 0);
    this.line.setAlpha(quick ? 1 : 0);
    this.progress.p = quick ? 1 : 0;
    if (!quick) {
      this.tweens.add({ targets: this.title, alpha: 1, duration: 700, ease: 'Sine.Out' });
      this.tweens.add({
        targets: this.progress,
        p: 1,
        delay: 300,
        duration: 900,
        ease: 'Sine.InOut',
        onUpdate: () => this.drawThread(),
      });
      this.tweens.add({ targets: this.line, alpha: 1, delay: 900, duration: 500 });
    }
    const next = () => goTo(this, 'Home');
    this.time.delayedCall(quick ? 700 : 2100, next);
    this.input.once('pointerdown', next);
  }

  protected layout(): void {
    const { f } = this;
    const cy = (f.top + f.bottom) / 2 - f.u(20);
    this.title.setFontSize(f.font(84)).setLetterSpacing(f.u(6)).setPosition(f.cx, cy);
    this.line.setFontSize(f.font(12)).setLetterSpacing(f.u(4)).setPosition(f.cx, cy + f.u(96));
    this.drawThread();
  }

  private drawThread(): void {
    const { f } = this;
    const g = this.thread;
    const w = f.u(140) * this.progress.p;
    const y = (f.top + f.bottom) / 2 - f.u(20) + f.u(62);
    g.clear();
    g.fillStyle(this.th.hc ? PALETTE.ink : PALETTE.indigo, 1);
    g.fillRect(f.cx - w / 2, y - f.u(1.5), w, f.u(3));
  }
}
