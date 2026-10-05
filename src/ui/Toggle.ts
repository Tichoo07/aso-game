import Phaser from 'phaser';
import { t } from '../data/i18n';
import { PALETTE, type Theme } from './theme';
import { textStyle } from './text';

/**
 * On/off switch. State is shown three ways: knob position, track fill, and
 * the word On/Off, so it never depends on colour alone.
 */
export class Toggle extends Phaser.GameObjects.Container {
  private track: Phaser.GameObjects.Graphics;
  private word: Phaser.GameObjects.Text;
  private tw = 52;
  private th_ = 30;

  constructor(
    scene: Phaser.Scene,
    private checked: boolean,
    private readonly th: Theme,
  ) {
    super(scene, 0, 0);
    this.track = scene.add.graphics();
    this.word = scene.add.text(0, 0, '', textStyle('body', 13, th.textMuted)).setOrigin(1, 0.5);
    this.add([this.track, this.word]);
    scene.add.existing(this);
  }

  get isOn(): boolean {
    return this.checked;
  }

  set(value: boolean): void {
    this.checked = value;
    this.redraw();
  }

  /** Right edge at x, vertically centred on y. */
  place(x: number, y: number, trackW: number, fontSize: number): this {
    this.setPosition(x, y);
    this.tw = trackW;
    this.th_ = trackW * 0.58;
    this.word.setFontSize(fontSize);
    this.redraw();
    return this;
  }

  private redraw(): void {
    const { track, tw, th_: h, th, checked: value } = this;
    const r = h / 2;
    const x0 = -tw;
    track.clear();
    if (value) {
      track.fillStyle(th.primary, 1);
      track.fillRoundedRect(x0, -r, tw, h, r);
    } else {
      track.fillStyle(PALETTE.ink, th.hc ? 0.25 : 0.1);
      track.fillRoundedRect(x0, -r, tw, h, r);
      track.lineStyle(Math.max(1, h * 0.05), th.line, th.hc ? 0.9 : 0.25);
      track.strokeRoundedRect(x0, -r, tw, h, r);
    }
    const kx = value ? x0 + tw - r : x0 + r;
    track.fillStyle(PALETTE.ivory, 1);
    track.fillCircle(kx, 0, r * 0.78);
    if (!value) {
      track.lineStyle(Math.max(1, h * 0.05), th.line, th.hc ? 0.9 : 0.3);
      track.strokeCircle(kx, 0, r * 0.78);
    }
    this.word.setText(value ? t('on') : t('off'));
    this.word.setPosition(x0 - h * 0.4, 0);
  }
}
