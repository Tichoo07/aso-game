import type Phaser from 'phaser';
import { settings } from '../services';

export function reducedMotion(): boolean {
  return settings().reduceMotion;
}

const TWEEN_OPTION_KEYS = new Set([
  'targets', 'duration', 'delay', 'ease', 'repeat', 'yoyo', 'hold', 'repeatDelay', 'paused',
  'onComplete', 'onStart', 'onUpdate', 'onYoyo', 'onRepeat', 'callbackScope', 'persist',
]);

/**
 * Like scene.tweens.add, but with reduce motion on it jumps straight to the
 * end values and fires onComplete. Only use plain numeric end values.
 */
export function animate(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig): void {
  if (!reducedMotion()) {
    scene.tweens.add(config);
    return;
  }
  const targets = (Array.isArray(config.targets) ? config.targets : [config.targets]) as Record<string, unknown>[];
  for (const [key, value] of Object.entries(config)) {
    if (TWEEN_OPTION_KEYS.has(key) || typeof value !== 'number') continue;
    for (const t of targets) t[key] = value;
  }
  const done = config.onComplete as (() => void) | undefined;
  if (done) done();
}

/** Duration helper: scales with pace, zero when reduce motion is on. */
export function ms(base: number, pace = 1): number {
  return reducedMotion() ? 0 : base * pace;
}
