import Phaser from 'phaser';
import { devicePixelRatio, frame, type Frame } from '../ui/layout';
import { TEX } from '../ui/textiles/textures';
import { theme, type Theme } from '../ui/theme';
import { fadeIn } from '../ui/transitions';

/**
 * Shared scene plumbing: paper background, theme, layout frame, and
 * re-layout on resize. Subclasses build their objects once in build() and
 * position them in layout(), which runs again on every resize.
 */
export abstract class BaseScene extends Phaser.Scene {
  protected f!: Frame;
  protected th!: Theme;
  private paper!: Phaser.GameObjects.TileSprite;

  create(): void {
    this.th = theme();
    this.f = frame(this);
    this.cameras.main.setBackgroundColor(this.th.bg);
    this.paper = this.add.tileSprite(0, 0, this.f.W, this.f.H, TEX.paper).setOrigin(0).setDepth(-100);
    this.paper.setTileScale(devicePixelRatio() / 2);
    this.build();
    this.layout();
    this.enter();
    this.scale.on('resize', this.handleResize, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.handleResize, this);
      this.teardown();
    });
    fadeIn(this);
  }

  private handleResize(): void {
    this.f = frame(this);
    this.cameras.main.setSize(this.f.W, this.f.H);
    this.paper.setSize(this.f.W, this.f.H);
    this.layout();
  }

  protected abstract build(): void;
  protected abstract layout(): void;
  /** Runs once after the first layout: start entrance animations here. */
  protected enter(): void {}
  /** Release timers, listeners, audio. */
  protected teardown(): void {}
}
