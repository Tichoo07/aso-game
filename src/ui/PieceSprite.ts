import Phaser from 'phaser';
import type { Piece } from '../game/types';
import { clothKey } from './textiles/textures';

/** Most cells any shape has. Pools are sized to this. */
const MAX_CELLS = 9;

/**
 * A piece drawn as cloth cells, centred on the container. Images are pooled,
 * so changing the piece never allocates.
 */
export class PieceSprite extends Phaser.GameObjects.Container {
  private imgs: Phaser.GameObjects.Image[] = [];
  piece: Piece | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly collectionId: string,
    private readonly hc: boolean,
  ) {
    super(scene, 0, 0);
    for (let i = 0; i < MAX_CELLS; i++) {
      const img = scene.add.image(0, 0, clothKey(collectionId, 1, hc)).setVisible(false);
      this.imgs.push(img);
    }
    this.add(this.imgs);
    scene.add.existing(this);
  }

  /** Draw `piece` with cells `pitch` apart. */
  show(piece: Piece | null, pitch: number): this {
    this.piece = piece;
    for (const img of this.imgs) img.setVisible(false);
    if (!piece) return this;
    const { shape } = piece;
    const key = clothKey(this.collectionId, piece.motif, this.hc);
    const size = pitch * 0.92;
    shape.cells.forEach(([r, c], k) => {
      this.imgs[k]
        .setTexture(key)
        .setPosition((c - (shape.width - 1) / 2) * pitch, (r - (shape.height - 1) / 2) * pitch)
        .setDisplaySize(size, size)
        .setVisible(true);
    });
    return this;
  }
}
