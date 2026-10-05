import type Phaser from 'phaser';

/** Design column, in design units. Every scene lays out inside this. */
const DESIGN_W = 400;
const DESIGN_H = 760;
/** Text never renders smaller than this many CSS pixels. */
const MIN_FONT_CSS = 11;

export function devicePixelRatio(): number {
  return Math.min(3, Math.max(1, window.devicePixelRatio || 1));
}

let probe: HTMLDivElement | null = null;

/** Safe-area insets (notches, home indicator) in CSS px. */
function safeInsets(): { top: number; bottom: number } {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);';
    document.body.appendChild(probe);
  }
  const style = getComputedStyle(probe);
  return { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 };
}

/**
 * Screen geometry for the current size, in game pixels. The canvas backing
 * store is device pixels (see main.ts), so 1 game pixel = 1 device pixel.
 *
 *   s       game pixels per design unit
 *   u(n)    n design units in game pixels
 *   font(n) font size in px, never below MIN_FONT_CSS on screen
 */
export interface Frame {
  W: number;
  H: number;
  s: number;
  cx: number;
  /** Column left edge and width (portrait-first, centred on wide screens). */
  colX: number;
  colW: number;
  top: number;
  bottom: number;
  u(n: number): number;
  font(n: number): number;
}

export function frame(scene: Phaser.Scene): Frame {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const dpr = devicePixelRatio();
  const safe = safeInsets();
  const top = safe.top * dpr;
  const bottom = H - safe.bottom * dpr;
  const s = Math.min(W / DESIGN_W, (bottom - top) / DESIGN_H);
  const colW = Math.min(W, DESIGN_W * s * 1.08);
  return {
    W,
    H,
    s,
    cx: W / 2,
    colX: (W - colW) / 2,
    colW,
    top,
    bottom,
    u: (n) => n * s,
    font: (n) => Math.round(Math.max(n * s, MIN_FONT_CSS * dpr)),
  };
}
