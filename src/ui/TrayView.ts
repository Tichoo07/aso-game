import Phaser from 'phaser';
import type { Piece } from '../game/types';
import { animate } from './motion';
import { PieceSprite } from './PieceSprite';

interface Slot {
  zone: Phaser.GameObjects.Zone;
  sprite: PieceSprite;
  cx: number;
  cy: number;
  placeable: boolean;
}

/**
 * The three waiting pieces. Each slot's touch target is the whole third of
 * the tray, far larger than the piece itself.
 */
export class TrayView {
  private slots: Slot[] = [];
  pitch = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    count: number,
    collectionId: string,
    hc: boolean,
    onPress: (slot: number, pointer: Phaser.Input.Pointer) => void,
  ) {
    for (let i = 0; i < count; i++) {
      const zone = scene.add.zone(0, 0, 10, 10).setOrigin(0.5).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => onPress(i, p));
      this.slots.push({ zone, sprite: new PieceSprite(scene, collectionId, hc), cx: 0, cy: 0, placeable: true });
    }
  }

  /** Tray area with top-left (x, y), size w x h. Board pitch sets the piece scale. */
  layout(x: number, y: number, w: number, h: number, boardPitch: number): void {
    const slotW = w / this.slots.length;
    this.pitch = Math.min(boardPitch * 0.64, slotW / 4.25, h / 4.4);
    this.slots.forEach((s, i) => {
      s.cx = x + slotW * (i + 0.5);
      s.cy = y + h / 2;
      s.zone.setPosition(s.cx, s.cy).setSize(slotW, h);
      (s.zone.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setTo(0, 0, slotW, h);
      // A running entrance tween would drag the piece back to stale coordinates
      this.scene.tweens.killTweensOf(s.sprite);
      s.sprite
        .setPosition(s.cx, s.cy)
        .setAlpha(s.placeable ? 1 : 0.32)
        .show(s.sprite.piece, this.pitch);
    });
  }

  slotCenter(i: number): { x: number; y: number } {
    return { x: this.slots[i].cx, y: this.slots[i].cy };
  }

  setPieces(tray: readonly (Piece | null)[], animateIn: boolean): void {
    tray.forEach((p, i) => {
      const s = this.slots[i];
      s.sprite.show(p, this.pitch).setVisible(true).setAlpha(s.placeable ? 1 : 0.32);
      if (animateIn && p) {
        const ty = s.cy;
        s.sprite.setY(ty + this.pitch * 1.2).setAlpha(0);
        animate(this.scene, {
          targets: s.sprite,
          y: ty,
          alpha: s.placeable ? 1 : 0.32,
          delay: i * 70,
          duration: 280,
          ease: 'Cubic.Out',
        });
      }
    });
  }

  /** Dim pieces that fit nowhere on the board. */
  setPlaceable(flags: readonly boolean[]): void {
    flags.forEach((ok, i) => {
      const s = this.slots[i];
      s.placeable = ok;
      if (s.sprite.visible) s.sprite.setAlpha(ok ? 1 : 0.32);
    });
  }

  hide(i: number): void {
    this.slots[i].sprite.setVisible(false);
  }

  show(i: number): void {
    const s = this.slots[i];
    s.sprite.setVisible(true).setPosition(s.cx, s.cy).setScale(1).setAlpha(s.placeable ? 1 : 0.32);
  }

  clear(i: number): void {
    this.slots[i].sprite.show(null, this.pitch);
  }
}
