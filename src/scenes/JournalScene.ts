import Phaser from 'phaser';
import { COLLECTIONS, type CollectionDef } from '../data/collections';
import { t } from '../data/i18n';
import { app } from '../services';
import { IconButton } from '../ui/IconButton';
import { PatternPreview } from '../ui/PatternPreview';
import { fitText, textStyle } from '../ui/text';
import { goTo } from '../ui/transitions';
import { BaseScene } from './BaseScene';

interface Card {
  bg: Phaser.GameObjects.Graphics;
  preview: PatternPreview;
  name: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
}

/** One page per collection: what it is, how far along you are, and its motifs. */
export class JournalScene extends BaseScene {
  private page = 0;
  private back!: IconButton;
  private heading!: Phaser.GameObjects.Text;
  private prev!: IconButton;
  private next!: IconButton;
  private name!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private pageDots!: Phaser.GameObjects.Graphics;
  private description!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private soon!: Phaser.GameObjects.Text;
  private swatches!: Phaser.GameObjects.Graphics;
  private cards: Card[] = [];
  private swipeStartX: number | null = null;

  constructor() {
    super('Journal');
  }

  init(): void {
    this.cards = [];
    const active = app().save.data.activeCollection;
    this.page = Math.max(0, COLLECTIONS.findIndex((c) => c.id === active));
  }

  protected build(): void {
    const { th } = this;
    this.back = new IconButton(this, 'back', th, () => goTo(this, 'Home'));
    this.heading = this.add.text(0, 0, t('journal'), textStyle('title', 20, th.text)).setOrigin(0.5);
    this.prev = new IconButton(this, 'prev', th, () => this.turn(-1));
    this.next = new IconButton(this, 'next', th, () => this.turn(1));
    this.name = this.add.text(0, 0, '', textStyle('display', 34, th.text)).setOrigin(0.5);
    this.subtitle = this.add.text(0, 0, '', textStyle('label', 11, th.textMuted)).setOrigin(0.5);
    this.pageDots = this.add.graphics();
    this.description = this.add.text(0, 0, '', textStyle('body', 14, th.textMuted, { align: 'center' })).setOrigin(0.5, 0);
    this.progressText = this.add.text(0, 0, '', textStyle('body', 13, th.text)).setOrigin(0.5);
    this.progressBar = this.add.graphics();
    this.soon = this.add.text(0, 0, t('comingSoon'), textStyle('title', 20, th.textMuted, { fontStyle: 'italic 400' })).setOrigin(0.5);
    this.swatches = this.add.graphics();

    // Swipe left/right to turn pages
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (this.swipeStartX = p.x));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.swipeStartX === null) return;
      const dx = p.x - this.swipeStartX;
      this.swipeStartX = null;
      if (Math.abs(dx) > this.f.u(70)) this.turn(dx < 0 ? 1 : -1);
    });
  }

  private turn(dir: number): void {
    this.page = (this.page + dir + COLLECTIONS.length) % COLLECTIONS.length;
    const c = COLLECTIONS[this.page];
    if (c.status === 'available') {
      app().save.update((s) => ({ ...s, activeCollection: c.id }));
    }
    this.layout();
  }

  private card(i: number): Card {
    if (!this.cards[i]) {
      const { th } = this;
      this.cards[i] = {
        bg: this.add.graphics(),
        preview: new PatternPreview(this, th),
        name: this.add.text(0, 0, '', textStyle('title', 16, th.text)).setOrigin(0, 0.5),
        status: this.add.text(0, 0, '', textStyle('body', 12, th.textMuted)).setOrigin(0, 0.5),
      };
    }
    return this.cards[i];
  }

  protected layout(): void {
    const { f, th } = this;
    const { u } = f;
    const col: CollectionDef = COLLECTIONS[this.page];
    const unlocked = new Set(app().save.data.unlockedPatterns);
    const available = col.status === 'available';

    const barY = f.top + u(40);
    this.back.place(f.colX + u(32), barY, u(48));
    this.heading.setFontSize(f.font(20)).setPosition(f.cx, barY);

    let y = barY + u(78);
    this.prev.place(f.colX + u(36), y, u(52));
    this.next.place(f.colX + f.colW - u(36), y, u(52));
    this.name.setText(col.name).setPosition(f.cx, y);
    fitText(this.name, f.font(34), f.colW - u(140));
    y += u(34);
    this.subtitle.setText(col.subtitle.toUpperCase()).setFontSize(f.font(11)).setLetterSpacing(u(2)).setPosition(f.cx, y);

    // Page indicator: filled dot for the current page, rings for the rest
    y += u(22);
    const dots = this.pageDots;
    dots.clear();
    const gap = u(14);
    const x0 = f.cx - ((COLLECTIONS.length - 1) * gap) / 2;
    COLLECTIONS.forEach((_, i) => {
      if (i === this.page) {
        dots.fillStyle(th.line, th.hc ? 1 : 0.8);
        dots.fillCircle(x0 + i * gap, y, u(3.5));
      } else {
        dots.lineStyle(Math.max(1, u(1)), th.line, th.hc ? 0.9 : 0.35);
        dots.strokeCircle(x0 + i * gap, y, u(3));
      }
    });

    y += u(20);
    this.description
      .setText(col.description)
      .setFontSize(f.font(14))
      .setWordWrapWidth(f.colW - u(64))
      .setLineSpacing(u(4))
      .setPosition(f.cx, y);
    y += Math.max(this.description.height, u(40)) + u(22);

    // Progress, in words and as a bar
    const total = col.patterns.length;
    const done = col.patterns.filter((p) => unlocked.has(p.id)).length;
    const barW = f.colW - u(96);
    this.progressText.setVisible(available).setText(t('progress', { n: done, total })).setFontSize(f.font(13)).setPosition(f.cx, y);
    const pb = this.progressBar;
    pb.clear();
    if (available) {
      pb.fillStyle(th.line, th.hc ? 0.25 : 0.08);
      pb.fillRoundedRect(f.cx - barW / 2, y + u(16), barW, u(5), u(2.5));
      if (done > 0) {
        pb.fillStyle(th.primary, 1);
        pb.fillRoundedRect(f.cx - barW / 2, y + u(16), Math.max(u(5), (barW * done) / total), u(5), u(2.5));
      }
    }
    y += u(40);

    // Coming soon page: palette swatches instead of motifs
    this.soon.setVisible(!available).setFontSize(f.font(20)).setPosition(f.cx, y + u(30));
    const sw = this.swatches;
    sw.clear();
    if (!available) {
      const size = u(34);
      const sx = f.cx - ((col.palette.length - 1) * (size + u(10))) / 2;
      col.palette.forEach((hex, i) => {
        sw.fillStyle(parseInt(hex.slice(1), 16), 1);
        sw.fillRoundedRect(sx + i * (size + u(10)) - size / 2, y + u(70), size, size, u(6));
        sw.lineStyle(Math.max(1, u(1)), th.line, th.hc ? 0.8 : 0.18);
        sw.strokeRoundedRect(sx + i * (size + u(10)) - size / 2, y + u(70), size, size, u(6));
      });
    }

    // Motif cards: two columns, height fitted to what is left
    const cols = 2;
    const rows = Math.ceil(col.patterns.length / cols);
    const gutter = u(12);
    const cardW = (f.colW - u(40) - gutter) / cols;
    const cardH = rows ? Math.min(u(88), (f.bottom - u(16) - y - gutter * (rows - 1)) / rows) : 0;
    this.cards.forEach((c) => [c.bg, c.preview, c.name, c.status].forEach((o) => o.setVisible(false)));
    col.patterns.forEach((def, i) => {
      const c = this.card(i);
      const r = Math.floor(i / cols);
      const k = i % cols;
      const cx = f.colX + u(20) + k * (cardW + gutter);
      const cy = y + r * (cardH + gutter);
      const woven = unlocked.has(def.id);
      [c.bg, c.preview, c.name, c.status].forEach((o) => o.setVisible(true));
      c.bg.clear();
      c.bg.fillStyle(th.surface, woven ? 1 : 0.5);
      c.bg.fillRoundedRect(cx, cy, cardW, cardH, u(12));
      c.bg.lineStyle(Math.max(1, u(1)), th.surfaceLine, woven ? th.surfaceLineAlpha : th.surfaceLineAlpha * 0.6);
      c.bg.strokeRoundedRect(cx, cy, cardW, cardH, u(12));
      const box = Math.min(cardH - u(18), cardW * 0.36);
      c.preview.setPosition(cx + u(9) + box / 2, cy + cardH / 2).draw(def, PatternPreview.pitchFor(def, box), {
        collectionId: col.id,
        motifCount: col.motifs.length,
        locked: !woven,
      });
      const tx = cx + box + u(18);
      c.name
        .setText(def.name)
        .setColor(woven ? th.text : th.textMuted)
        .setPosition(tx, cy + cardH * 0.4);
      fitText(c.name, f.font(15), cx + cardW - tx - u(8));
      c.status
        .setText(woven ? t('woven') : t('locked'))
        .setColor(woven ? th.accentCss : th.textFaint)
        .setFontSize(f.font(12))
        .setPosition(tx, cy + cardH * 0.66);
    });
  }
}
