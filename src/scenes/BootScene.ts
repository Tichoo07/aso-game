import Phaser from 'phaser';
import { COLLECTIONS } from '../data/collections';
import { generateTextures } from '../ui/textiles/textures';

/** Paints every procedural texture, then hands over to the splash. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateTextures(this, COLLECTIONS);
    document.getElementById('boot')?.remove();
    this.scene.start('Splash');
  }
}
