import type Phaser from 'phaser';
import type { CollectionDef } from '../../data/collections';
import { hashString } from '../../utils/rng';
import { paintCloth, paintGlow, paintPaper, paintSlot } from './painters';

/** Power of two so the GPU can mipmap: tray and journal draw cells small. */
const CELL_TEXTURE = 256;
const PAPER_TEXTURE = 512;

export const TEX = {
  slot: (hc: boolean) => (hc ? 'slot-hc' : 'slot'),
  glow: (hc: boolean) => (hc ? 'glow-hc' : 'glow'),
  paper: 'paper',
  pixel: 'pixel',
} as const;

export function clothKey(collectionId: string, motif: number, hc: boolean): string {
  return `cloth:${collectionId}:${motif}:${hc ? 'hc' : 'n'}`;
}

function add(scene: Phaser.Scene, key: string, paint: () => HTMLCanvasElement): void {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, paint());
}

/** Paint every texture the game uses. Runs once at boot (tens of ms). */
export function generateTextures(scene: Phaser.Scene, collections: readonly CollectionDef[]): void {
  for (const col of collections) {
    col.motifs.forEach((spec, i) => {
      for (const hc of [false, true]) {
        const key = clothKey(col.id, i + 1, hc);
        add(scene, key, () => paintCloth(CELL_TEXTURE, spec, hashString(`${col.id}:${i}`), hc));
      }
    });
  }
  for (const hc of [false, true]) {
    add(scene, TEX.slot(hc), () => paintSlot(CELL_TEXTURE, hc));
    add(scene, TEX.glow(hc), () => paintGlow(CELL_TEXTURE, hc ? '#17151c' : '#c29a52', hc ? 0.08 : 0.06));
  }
  add(scene, TEX.paper, () => paintPaper(PAPER_TEXTURE, 7));
  add(scene, TEX.pixel, () => {
    const c = document.createElement('canvas');
    c.width = c.height = 4;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 4, 4);
    return c;
  });
}
