import Phaser from 'phaser';
import { LOCALE_NAMES, t, type StringKey } from '../data/i18n';
import { app, settings, updateSettings } from '../services';
import { LOCALES, type Settings } from '../storage/save';
import { Haptics } from '../utils/haptics';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { textStyle } from '../ui/text';
import { Toggle } from '../ui/Toggle';
import { goTo } from '../ui/transitions';
import { BaseScene } from './BaseScene';

type ToggleKey = 'sound' | 'music' | 'haptics' | 'reduceMotion' | 'highContrast';

interface Row {
  label: Phaser.GameObjects.Text;
  note: Phaser.GameObjects.Text | null;
  zone: Phaser.GameObjects.Zone;
  toggle: Toggle | null;
  value: Phaser.GameObjects.Text | null;
}

const TOGGLES: { key: ToggleKey; label: StringKey }[] = [
  { key: 'sound', label: 'sound' },
  { key: 'music', label: 'music' },
  { key: 'haptics', label: 'haptics' },
  { key: 'reduceMotion', label: 'reduceMotion' },
  { key: 'highContrast', label: 'highContrast' },
];

/** Settings that change how scenes are drawn restart this scene to apply. */
const RESTART_ON: (keyof Settings)[] = ['highContrast', 'language'];

export class SettingsScene extends BaseScene {
  private back!: IconButton;
  private heading!: Phaser.GameObjects.Text;
  private rows: Row[] = [];
  private lines!: Phaser.GameObjects.Graphics;
  private modal: Modal | null = null;

  constructor() {
    super('Settings');
  }

  init(): void {
    this.rows = [];
    this.modal = null;
  }

  protected build(): void {
    const { th } = this;
    this.back = new IconButton(this, 'back', th, () => goTo(this, 'Home'));
    this.heading = this.add.text(0, 0, t('settings'), textStyle('title', 22, th.text)).setOrigin(0.5);
    this.lines = this.add.graphics();

    for (const { key, label } of TOGGLES) {
      const toggle = new Toggle(this, settings()[key], th);
      const note = key === 'haptics' && !Haptics.supported ? t('hapticsUnsupported') : null;
      this.addRow(label, note, toggle, null, () => {
        const next = !settings()[key];
        updateSettings({ [key]: next } as Partial<Settings>);
        toggle.set(next);
        if (key === 'haptics' && next) app().haptics.trigger('place');
        if (RESTART_ON.includes(key)) this.scene.restart();
      });
    }

    const lang = this.add.text(0, 0, `${LOCALE_NAMES[settings().language]}  ›`, textStyle('body', 14, th.textMuted)).setOrigin(1, 0.5);
    this.addRow('language', null, null, lang, () => {
      const i = LOCALES.indexOf(settings().language);
      updateSettings({ language: LOCALES[(i + 1) % LOCALES.length] });
      this.scene.restart();
    });

    const about = this.add.text(0, 0, '›', textStyle('body', 18, th.textMuted)).setOrigin(1, 0.5);
    this.addRow('about', null, null, about, () => this.openAbout());
  }

  private addRow(
    label: StringKey,
    note: string | null,
    toggle: Toggle | null,
    value: Phaser.GameObjects.Text | null,
    onTap: () => void,
  ): void {
    const { th } = this;
    const zone = this.add.zone(0, 0, 10, 10).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (!this.modal) onTap();
    });
    this.rows.push({
      label: this.add.text(0, 0, t(label), textStyle('body', 16, th.text)).setOrigin(0, 0.5),
      note: note ? this.add.text(0, 0, note, textStyle('body', 12, th.textFaint)).setOrigin(0, 0.5) : null,
      zone,
      toggle,
      value,
    });
  }

  private openAbout(): void {
    this.modal = new Modal(this, this.th, t('aboutTitle'), t('aboutBody'), [
      {
        label: t('close'),
        variant: 'secondary',
        onClick: () => {
          this.modal?.close();
          this.modal = null;
        },
      },
    ]);
    this.modal.layout(this.f);
  }

  protected layout(): void {
    const { f, th } = this;
    const { u } = f;
    const barY = f.top + u(40);
    this.back.place(f.colX + u(32), barY, u(48));
    this.heading.setFontSize(f.font(22)).setPosition(f.cx, barY);

    const left = f.colX + u(28);
    const right = f.colX + f.colW - u(28);
    const rowH = u(62);
    let y = barY + u(60);
    this.lines.clear();
    this.lines.lineStyle(Math.max(1, u(1)), th.line, th.hc ? 0.5 : 0.1);
    for (const row of this.rows) {
      const cy = y + rowH / 2;
      row.zone.setPosition(f.colX, y).setSize(f.colW, rowH);
      row.label.setFontSize(f.font(16)).setPosition(left, row.note ? cy - u(9) : cy);
      row.note?.setFontSize(f.font(12)).setPosition(left, cy + u(12));
      row.toggle?.place(right, cy, u(50), f.font(13));
      row.value?.setFontSize(f.font(row.value.text === '›' ? 22 : 14)).setPosition(right, cy);
      y += rowH;
      this.lines.lineBetween(left, y, right, y);
    }
    this.modal?.layout(f);
  }
}
