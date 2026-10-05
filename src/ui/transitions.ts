import type Phaser from 'phaser';
import { reducedMotion } from './motion';

const IVORY: [number, number, number] = [247, 242, 232];
const leaving = new WeakSet<Phaser.Scene>();

/** Fade to ivory, then start another scene. Ignores repeat taps. */
export function goTo(scene: Phaser.Scene, key: string, data?: object): void {
  if (leaving.has(scene)) return;
  leaving.add(scene);
  scene.events.once('shutdown', () => leaving.delete(scene));
  if (reducedMotion()) {
    scene.scene.start(key, data);
    return;
  }
  scene.cameras.main.fadeOut(180, ...IVORY);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

export function fadeIn(scene: Phaser.Scene): void {
  if (!reducedMotion()) scene.cameras.main.fadeIn(240, ...IVORY);
}
