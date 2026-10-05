import Phaser from 'phaser';
import { formatNumber, t } from '../data/i18n';
import { BOARD_SIZE } from '../game/constants';
import type { DailyInfo, GameMode, RunStats } from '../game/state';
import { Button } from '../ui/Button';
import { reducedMotion } from '../ui/motion';
import { clothKey, TEX } from '../ui/textiles/textures';
import { textStyle } from '../ui/text';
import { PALETTE } from '../ui/theme';
import { goTo } from '../ui/transitions';
import { shortDateLabel } from '../utils/date';
import { BaseScene } from './BaseScene';

export interface ResultData {
  mode: GameMode;
  score: number;
  best: number;
  isNewBest: boolean;
  stats: RunStats;
  /** The final board, shown as the finished cloth. */
  cells: number[];
  collectionId: string;
  daily: DailyInfo | null;
}

/** End of a run: the cloth you made, what it earned, and where to go next. */
export class ResultScene extends BaseScene {
  private data_!: ResultData;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private clothFrame!: Phaser.GameObjects.Graphics;
  private clothCells: Phaser.GameObjects.Image[] = [];
  private gainedLabel!: Phaser.GameObjects.Text;
  private gained!: Phaser.GameObjects.Text;
  private finalLabel!: Phaser.GameObjects.Text;
  private finalScore!: Phaser.GameObjects.Text;
  private bestLine!: Phaser.GameObjects.Text;
  private newBest!: Phaser.GameObjects.Text;
  private newBestFrame!: Phaser.GameObjects.Graphics;
  private again!: Button;
  private home!: Button;

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.data_ = data;
    this.clothCells = [];
  }

  protected build(): void {
    const { th } = this;
    const d = this.data_;
    this.title = this.add.text(0, 0, t('weaveComplete'), textStyle('display', 28, th.text)).setOrigin(0.5);
    const sub =
      d.mode === 'daily' && d.daily
        ? `${t('todaysWeave').toUpperCase()} · ${shortDateLabel(d.daily.key).toUpperCase()} · ${d.daily.completed ? t('dailyMotifWoven') : t('dailyMotifMissed')}`
        : '';
    this.subtitle = this.add.text(0, 0, sub, textStyle('label', 11, d.daily?.completed ? th.accentCss : th.textMuted)).setOrigin(0.5);

    this.clothFrame = this.add.graphics();
    for (let i = 0; i < d.cells.length; i++) {
      const v = d.cells[i];
      this.clothCells.push(this.add.image(0, 0, v > 0 ? clothKey(d.collectionId, v, th.hc) : TEX.slot(th.hc)));
    }

    this.gainedLabel = this.add.text(0, 0, t('scoreGained'), textStyle('label', 11, th.textMuted)).setOrigin(0.5);
    const parts = [
      t('linesPart', { n: formatNumber(d.stats.lineScore) }),
      t('motifsPart', { n: formatNumber(d.stats.patternScore) }),
      t('combosPart', { n: formatNumber(d.stats.comboScore) }),
    ];
    this.gained = this.add.text(0, 0, parts.join('  ·  '), textStyle('body', 14, th.text)).setOrigin(0.5);
    this.finalLabel = this.add.text(0, 0, t('finalScore'), textStyle('label', 11, th.textMuted)).setOrigin(0.5);
    this.finalScore = this.add.text(0, 0, '0', textStyle('number', 60, th.text)).setOrigin(0.5);
    this.bestLine = this.add
      .text(0, 0, `${t('bestScore')}  ${formatNumber(d.best)}`, textStyle('label', 12, th.textMuted))
      .setOrigin(0.5);
    this.newBestFrame = this.add.graphics().setVisible(d.isNewBest);
    this.newBest = this.add
      .text(0, 0, t('newBest'), textStyle('title', 15, th.accentCss, { fontStyle: 'italic 500' }))
      .setOrigin(0.5)
      .setVisible(d.isNewBest);

    this.again = new Button(this, t('playAgain'), 'primary', th, () => goTo(this, 'Game', { mode: d.mode }));
    this.home = new Button(this, t('home'), 'secondary', th, () => goTo(this, 'Home'));

    if (reducedMotion() || d.score === 0) {
      this.finalScore.setText(formatNumber(d.score));
    } else {
      this.tweens.addCounter({
        from: 0,
        to: d.score,
        delay: 300,
        duration: 900,
        ease: 'Cubic.Out',
        onUpdate: (tw) => this.finalScore.setText(formatNumber(Math.round(tw.getValue() ?? d.score))),
      });
    }
  }

  protected layout(): void {
    const { f, th } = this;
    const { u } = f;
    let y = f.top + Math.max(u(64), (f.bottom - f.top) * 0.08);
    this.title.setFontSize(f.font(28)).setLetterSpacing(u(4)).setPosition(f.cx, y);
    y += u(32);
    this.subtitle.setFontSize(f.font(11)).setLetterSpacing(u(1.4)).setPosition(f.cx, y);

    // The finished cloth
    y += u(22);
    const side = Math.min(f.colW * 0.56, u(214));
    const pad = side * 0.04;
    const pitch = (side - pad * 2) / BOARD_SIZE;
    const left = f.cx - side / 2;
    const g = this.clothFrame;
    g.clear();
    g.fillStyle(th.surface, 1);
    g.fillRoundedRect(left, y, side, side, pitch * 0.2);
    g.lineStyle(Math.max(1, pitch * 0.04), PALETTE.indigo, th.hc ? 0.8 : 0.3);
    for (let x = left + pad + pitch / 6; x < left + side - pad; x += pitch / 3) {
      g.lineBetween(x, y - pitch * 0.05, x, y - pitch * (0.22 + ((x * 7) % 3) * 0.05));
      g.lineBetween(x, y + side + pitch * 0.05, x, y + side + pitch * (0.22 + ((x * 5) % 3) * 0.05));
    }
    this.clothCells.forEach((img, i) => {
      const r = Math.floor(i / BOARD_SIZE);
      const c = i % BOARD_SIZE;
      img.setPosition(left + pad + (c + 0.5) * pitch, y + pad + (r + 0.5) * pitch).setDisplaySize(pitch * 0.92, pitch * 0.92);
    });
    y += side + u(42);

    this.gainedLabel.setFontSize(f.font(11)).setLetterSpacing(u(1.8)).setPosition(f.cx, y);
    y += u(24);
    this.gained.setFontSize(f.font(14)).setPosition(f.cx, y);
    y += u(42);
    this.finalLabel.setFontSize(f.font(11)).setLetterSpacing(u(1.8)).setPosition(f.cx, y);
    y += u(40);
    this.finalScore.setFontSize(f.font(60)).setPosition(f.cx, y);
    y += u(48);
    this.bestLine.setFontSize(f.font(12)).setLetterSpacing(u(1.4)).setPosition(f.cx, y);
    y += u(28);
    this.newBest.setFontSize(f.font(15)).setPosition(f.cx, y);
    const nb = this.newBestFrame;
    nb.clear();
    nb.lineStyle(Math.max(1, u(1.2)), th.accent, 0.9);
    nb.strokeRoundedRect(f.cx - this.newBest.width / 2 - u(14), y - u(14), this.newBest.width + u(28), u(28), u(14));

    const btnW = Math.min(f.colW - u(48), u(300));
    const btnH = u(56);
    const bottomY = Math.max(y + u(60), f.bottom - u(40) - btnH * 1.5 - u(14));
    this.again.place(f.cx, bottomY, btnW, btnH, f.font(14));
    this.home.place(f.cx, bottomY + btnH + u(14), btnW, btnH, f.font(14));
  }
}
