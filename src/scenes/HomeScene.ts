import Phaser from 'phaser';
import { compiledPatterns, gameConfigFor } from '../data';
import { playableCollection, type CollectionDef } from '../data/collections';
import { formatNumber, t } from '../data/i18n';
import { createDailyChallenge } from '../game/daily';
import type { PatternDef } from '../game/patterns';
import { app } from '../services';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { PatternPreview } from '../ui/PatternPreview';
import { clothKey } from '../ui/textiles/textures';
import { fitText, textStyle } from '../ui/text';
import { goTo } from '../ui/transitions';
import { localDateKey, shortDateLabel } from '../utils/date';
import { BaseScene } from './BaseScene';

export class HomeScene extends BaseScene {
  private title!: Phaser.GameObjects.Text;
  private tagline!: Phaser.GameObjects.Text;
  private settingsBtn!: IconButton;
  private card!: Phaser.GameObjects.Graphics;
  private cardZone!: Phaser.GameObjects.Zone;
  private cardLabel!: Phaser.GameObjects.Text;
  private cardName!: Phaser.GameObjects.Text;
  private cardStatus!: Phaser.GameObjects.Text;
  private cardPreview!: PatternPreview;
  private play!: Button;
  private slow!: Button;
  private journal!: Button;
  private best!: Phaser.GameObjects.Text;
  private band: Phaser.GameObjects.Image[] = [];
  private bandFringe!: Phaser.GameObjects.Graphics;
  private collection!: CollectionDef;
  private dailyDef!: PatternDef;

  constructor() {
    super('Home');
  }

  protected build(): void {
    const { th } = this;
    const save = app().save.data;
    const collection = playableCollection(save.activeCollection);
    this.collection = collection;
    const dailyKey = localDateKey();
    const dailyPatternId = createDailyChallenge(gameConfigFor(collection), dailyKey).objectiveId;
    const dailyDone = save.daily[dailyKey]?.completed ?? false;

    this.title = this.add.text(0, 0, t('appName'), textStyle('display', 64, th.text)).setOrigin(0.5);
    this.tagline = this.add
      .text(0, 0, t('tagline'), textStyle('title', 18, th.textMuted, { fontStyle: 'italic 400' }))
      .setOrigin(0.5);
    this.settingsBtn = new IconButton(this, 'settings', th, () => goTo(this, 'Settings'));

    // Today's Weave card
    const pattern = compiledPatterns(collection).find((p) => p.id === dailyPatternId)!;
    this.dailyDef = pattern.def;
    this.card = this.add.graphics();
    this.cardLabel = this.add
      .text(0, 0, `${t('todaysWeave').toUpperCase()} · ${shortDateLabel(dailyKey).toUpperCase()}`, textStyle('label', 11, th.textMuted))
      .setOrigin(0, 0.5);
    this.cardName = this.add.text(0, 0, pattern.name, textStyle('title', 22, th.text)).setOrigin(0, 0.5);
    this.cardStatus = this.add
      .text(0, 0, dailyDone ? t('dailyWoven') : t('dailyNotYet'), textStyle('body', 13, dailyDone ? th.accentCss : th.textMuted))
      .setOrigin(0, 0.5);
    this.cardPreview = new PatternPreview(this, th);
    this.cardZone = this.add.zone(0, 0, 10, 10).setOrigin(0).setInteractive({ useHandCursor: true });
    this.cardZone.on('pointerup', () => goTo(this, 'Game', { mode: 'daily' }));

    this.play = new Button(this, t('play'), 'primary', th, () => goTo(this, 'Game', { mode: 'classic' }));
    this.slow = new Button(this, t('slowWeave'), 'secondary', th, () => goTo(this, 'Game', { mode: 'slow' }));
    this.journal = new Button(this, `${t('journal')}  →`, 'link', th, () => goTo(this, 'Journal'));
    this.best = this.add
      .text(0, 0, save.bestScore > 0 ? t('bestLine', { score: formatNumber(save.bestScore) }) : '', textStyle('body', 13, th.textFaint))
      .setOrigin(0.5);

    // A strip of finished cloth along the bottom, with a fringe
    this.bandFringe = this.add.graphics();
    for (let i = 0; i < 14; i++) {
      this.band.push(this.add.image(0, 0, clothKey(collection.id, 1 + ((i * 5) % collection.motifs.length), th.hc)));
    }

    app().audio.startAmbient('calm');
  }

  protected layout(): void {
    const { f, th } = this;
    const { u } = f;
    const x0 = f.colX + u(24);
    const w = f.colW - u(48);

    this.settingsBtn.place(f.colX + f.colW - u(36), f.top + u(36), u(48));

    // Vertical rhythm: generous space above the title, content centred in what is left
    const titleY = f.top + Math.max(u(110), (f.bottom - f.top) * 0.18);
    this.title.setFontSize(f.font(68)).setLetterSpacing(u(5)).setPosition(f.cx, titleY);
    this.tagline.setFontSize(f.font(18)).setPosition(f.cx, titleY + u(58));

    const cardY = titleY + u(110);
    const cardH = u(104);
    const pad = u(18);
    this.card.clear();
    this.card.fillStyle(th.surface, 1);
    this.card.fillRoundedRect(x0, cardY, w, cardH, u(16));
    this.card.lineStyle(Math.max(1, u(1)), th.surfaceLine, th.surfaceLineAlpha);
    this.card.strokeRoundedRect(x0, cardY, w, cardH, u(16));
    const box = cardH - pad * 2;
    const def = this.dailyDef;
    this.cardPreview.setPosition(x0 + pad + box / 2, cardY + cardH / 2).draw(def, PatternPreview.pitchFor(def, box), {
      collectionId: this.collection.id,
      motifCount: this.collection.motifs.length,
    });
    const tx = x0 + pad * 2 + box;
    this.cardLabel.setFontSize(f.font(11)).setLetterSpacing(u(1.6)).setPosition(tx, cardY + cardH * 0.27);
    this.cardName.setPosition(tx, cardY + cardH * 0.52);
    fitText(this.cardName, f.font(22), x0 + w - tx - pad);
    this.cardStatus.setFontSize(f.font(13)).setPosition(tx, cardY + cardH * 0.76);
    this.cardZone.setPosition(x0, cardY).setSize(w, cardH);

    const btnW = Math.min(w, u(300));
    const btnH = u(56);
    let y = cardY + cardH + u(44) + btnH / 2;
    this.play.place(f.cx, y, btnW, btnH, f.font(14));
    y += btnH + u(14);
    this.slow.place(f.cx, y, btnW, btnH, f.font(14));
    y += btnH / 2 + u(40);
    this.journal.place(f.cx, y, btnW, u(48), f.font(19));
    this.best.setFontSize(f.font(13)).setPosition(f.cx, y + u(44));

    // Bottom band
    const cell = u(30);
    const count = Math.ceil(f.W / cell) + 1;
    const bandY = f.bottom - cell / 2 - u(16);
    const startX = f.cx - (count * cell) / 2 + cell / 2;
    this.band.forEach((img, i) => {
      img.setVisible(i < count);
      img.setPosition(startX + i * cell, bandY).setDisplaySize(cell * 0.94, cell * 0.94).setAlpha(0.92);
    });
    if (count > this.band.length) {
      // Wide screens: add a few more swatches once
      const col = this.collection.id;
      const motifs = this.collection.motifs.length;
      for (let i = this.band.length; i < count; i++) {
        this.band.push(
          this.add
            .image(startX + i * cell, bandY, clothKey(col, 1 + ((i * 5) % motifs), th.hc))
            .setDisplaySize(cell * 0.94, cell * 0.94)
            .setAlpha(0.92),
        );
      }
    }
    const g = this.bandFringe;
    g.clear();
    g.lineStyle(Math.max(1, u(1)), 0x243b63, th.hc ? 0.8 : 0.3);
    for (let x = startX - cell / 2; x < startX + count * cell; x += cell / 4) {
      g.lineBetween(x, bandY - cell / 2 - u(2), x, bandY - cell / 2 - u(7 + ((x * 13) % 5)));
    }
  }
}
