import Phaser from 'phaser';
import type { DemoMove, DemoScript } from '../data/demo';
import { t } from '../data/i18n';
import { Button } from '../ui/Button';
import type { Frame } from '../ui/layout';
import { Modal } from '../ui/Modal';
import { reducedMotion } from '../ui/motion';
import { fitText, textStyle } from '../ui/text';
import { PALETTE, type Theme } from '../ui/theme';

type Point = { x: number; y: number };

/** What the game screen lends the demo. Drags go through the real input path. */
export interface DemoHost {
  frame(): Frame;
  readonly theme: Theme;
  /** Vertical centre of the top bar. */
  barY(): number;
  /** Where the small hint line goes (between board and tray). */
  hintY(): number;
  pitch(): number;
  slotCenter(slot: number): Point;
  /** Pointer position that drops the piece in `slot` with its top-left at (row, col). */
  dropPoint(slot: number, row: number, col: number): Point;
  objectiveBounds(): Phaser.Geom.Rectangle;
  pointer(phase: 'down' | 'move' | 'up', p: Point, slot?: number): void;
  /** True once a move and all its animations are done. */
  settled(): boolean;
  finish(): void;
  replay(): void;
}

/**
 * Plays the how-to-play script: captions, a finger dot dragging real pieces,
 * then a "Your turn" card. Skippable at any point.
 */
export class DemoDirector {
  /** 'steps' while playing, 'end' once the closing card is up, 'done' after. */
  phase: 'steps' | 'end' | 'done' = 'steps';
  private label: Phaser.GameObjects.Text;
  private caption: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private hand: Phaser.GameObjects.Graphics;
  private ring: Phaser.GameObjects.Graphics;
  private skip: Button;
  private modal: Modal | null = null;
  private step = 0;
  private alive = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: DemoHost,
    private readonly script: DemoScript,
  ) {
    const th = host.theme;
    this.label = scene.add.text(0, 0, '', textStyle('label', 11, th.textMuted)).setOrigin(0.5).setDepth(70);
    this.caption = scene.add.text(0, 0, '', textStyle('title', 22, th.text)).setOrigin(0.5).setDepth(70);
    this.hint = scene.add
      .text(0, 0, '', textStyle('title', 15, th.textMuted, { fontStyle: 'italic 400' }))
      .setOrigin(0.5)
      .setDepth(70)
      .setAlpha(0);
    this.ring = scene.add.graphics().setDepth(70).setAlpha(0);
    this.hand = scene.add.graphics().setDepth(80).setVisible(false);
    this.skip = new Button(scene, t('skip'), 'link', th, () => this.end(true));
    this.skip.setDepth(90);
  }

  layout(): void {
    const f = this.host.frame();
    const { u } = f;
    const barY = this.host.barY();
    this.label.setFontSize(f.font(11)).setLetterSpacing(u(1.8)).setPosition(f.cx, barY - u(18));
    this.caption.setPosition(f.cx, barY + u(8));
    fitText(this.caption, f.font(22), f.colW - u(150));
    this.hint.setPosition(f.cx, this.host.hintY());
    fitText(this.hint, f.font(15), f.colW - u(40));
    this.skip.place(f.colX + f.colW - u(40), barY, u(72), u(44), f.font(16));
    this.drawHand();
    this.drawRing();
    this.modal?.layout(f);
  }

  destroy(): void {
    this.alive = false;
  }

  async run(): Promise<void> {
    const moves = this.script.moves;
    for (this.step = 0; this.step < moves.length; this.step++) {
      if (!this.alive) return;
      await this.showCaption(moves[this.step], moves.length);
      await this.wait(reducedMotion() ? 900 : 650);
      await this.perform(moves[this.step]);
      await this.until(() => this.host.settled());
      await this.wait(moves[this.step].linger);
    }
    if (!this.alive) return;
    this.closingCard();
  }

  // Steps ---------------------------------------------------------------------

  private async showCaption(move: DemoMove, total: number): Promise<void> {
    this.label.setText(t('demoLabel', { n: this.step + 1, total }));
    this.caption.setText(t(move.caption));
    this.hint.setText(move.hint ? t(move.hint) : '');
    this.layout();
    if (move.highlightObjective) this.pulseRing();
    if (reducedMotion()) {
      this.caption.setAlpha(1);
      this.hint.setAlpha(move.hint ? 1 : 0);
      return;
    }
    this.caption.setAlpha(0);
    this.scene.tweens.add({ targets: this.caption, alpha: 1, duration: 260 });
    if (move.hint) this.scene.tweens.add({ targets: this.hint, alpha: 1, delay: 300, duration: 260 });
    await this.wait(260);
  }

  private async perform(move: DemoMove): Promise<void> {
    if (!this.alive) return;
    const from = this.host.slotCenter(move.slot);
    const to = this.host.dropPoint(move.slot, move.row, move.col);
    const hand = this.hand;
    hand.setPosition(from.x, from.y).setScale(1).setVisible(true);

    if (reducedMotion()) {
      // No travelling: lift, place, and hold so the preview is readable
      this.host.pointer('down', from, move.slot);
      hand.setPosition(to.x, to.y);
      this.host.pointer('move', to);
      await this.wait(1100);
      this.release(to);
      return;
    }

    hand.setAlpha(0);
    await this.tween({ targets: hand, alpha: 1, duration: 180 });
    await this.wait(200);
    await this.tween({ targets: hand, scale: 0.84, duration: 120, ease: 'Sine.Out' });
    if (!this.alive) return;
    this.host.pointer('down', from, move.slot);

    // Travel along a gentle arc, as a hand would
    const arc = this.host.pitch() * 0.8;
    const path = { p: 0 };
    await this.tween({
      targets: path,
      p: 1,
      duration: 1100,
      ease: 'Sine.InOut',
      onUpdate: () => {
        const x = from.x + (to.x - from.x) * path.p;
        const y = from.y + (to.y - from.y) * path.p - Math.sin(Math.PI * path.p) * arc;
        hand.setPosition(x, y);
        if (this.alive) this.host.pointer('move', { x, y });
      },
    });
    await this.wait(450);
    this.release(to);
    await this.tween({ targets: hand, scale: 1, alpha: 0, duration: 260 });
    hand.setVisible(false);
  }

  private release(at: Point): void {
    if (!this.alive) return;
    this.host.pointer('up', at);
    this.scene.tweens.killTweensOf(this.ring);
    this.ring.setAlpha(0);
    this.scene.tweens.add({ targets: this.hint, alpha: 0, duration: reducedMotion() ? 1 : 200 });
    if (reducedMotion()) this.hand.setVisible(false);
  }

  private closingCard(): void {
    this.phase = 'end';
    for (const o of [this.label, this.caption, this.hint, this.skip]) o.setVisible(false);
    this.modal = new Modal(this.scene, this.host.theme, t('demoDoneTitle'), t('demoDoneBody'), [
      { label: t('demoStart'), variant: 'primary', onClick: () => this.end(false) },
      { label: t('demoAgain'), variant: 'secondary', onClick: () => this.again() },
    ]);
    this.modal.layout(this.host.frame());
  }

  private end(skipped: boolean): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.alive = false;
    if (skipped) this.hand.setVisible(false);
    this.host.finish();
  }

  private again(): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.alive = false;
    this.host.replay();
  }

  // Drawing -------------------------------------------------------------------

  /** A touch point: soft ink disc with an ivory ring. */
  private drawHand(): void {
    const r = this.host.pitch() * 0.42;
    const g = this.hand;
    g.clear();
    g.fillStyle(PALETTE.ink, 0.22);
    g.fillCircle(0, 0, r);
    g.lineStyle(Math.max(2, r * 0.12), PALETTE.ivory, 0.95);
    g.strokeCircle(0, 0, r);
    g.fillStyle(PALETTE.ivory, 0.9);
    g.fillCircle(0, 0, r * 0.22);
  }

  private drawRing(): void {
    const b = this.host.objectiveBounds();
    const f = this.host.frame();
    this.ring.clear();
    this.ring.lineStyle(Math.max(2, f.u(2)), this.host.theme.accent, 1);
    this.ring.strokeRoundedRect(b.x, b.y, b.width, b.height, f.u(12));
  }

  private pulseRing(): void {
    this.drawRing();
    if (reducedMotion()) {
      this.ring.setAlpha(1);
      return;
    }
    this.ring.setAlpha(0);
    this.scene.tweens.add({ targets: this.ring, alpha: 1, duration: 420, yoyo: true, repeat: 3, hold: 160 });
  }

  // Timing --------------------------------------------------------------------

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, () => resolve()));
  }

  private tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => this.scene.tweens.add({ ...config, onComplete: () => resolve() }));
  }

  private async until(done: () => boolean): Promise<void> {
    while (this.alive && !done()) await this.wait(80);
  }
}
