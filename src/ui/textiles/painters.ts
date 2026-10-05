/**
 * Procedural cloth, painted with Canvas 2D at load time. No image assets.
 *
 * Each cell is built in layers, loosely following how resist-dyed cloth
 * looks: a mottled indigo ground, a cream motif with slightly wandering
 * lines, fine crackle where dye crept through the resist, a soft bleed at the
 * motif edge, and a faint warp/weft grain over everything.
 *
 * The motifs are simple geometry (rings, stitch rows, lattices, stripes,
 * chevrons, arcs). They are inspired by the visual language of adire and do
 * not reproduce or name specific traditional motifs.
 */
import type { MotifPainter, MotifSpec } from '../../data/collections';
import { createRng, type Rng } from '../../utils/rng';

type Ctx = CanvasRenderingContext2D;
type PaintFn = (ctx: Ctx, size: number, rng: Rng) => void;

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A line that wanders a little, like one drawn by hand in starch. */
function wobblyLine(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, rng: Rng, amp: number, segments = 10): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const p1 = rng.next() * Math.PI * 2;
  const p2 = rng.next() * Math.PI * 2;
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const off = amp * (Math.sin(t * Math.PI * 2 + p1) * 0.6 + Math.sin(t * Math.PI * 5 + p2) * 0.4);
    const x = x1 + dx * t + nx * off;
    const y = y1 + dy * t + ny * off;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function wobblyRing(ctx: Ctx, cx: number, cy: number, r: number, rng: Rng, amp: number, steps = 56): void {
  const p1 = rng.next() * Math.PI * 2;
  const p2 = rng.next() * Math.PI * 2;
  const p3 = rng.next() * Math.PI * 2;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r + amp * (Math.sin(3 * a + p1) * 0.5 + Math.sin(5 * a + p2) * 0.3 + Math.sin(2 * a + p3) * 0.2);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function dot(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

const jitter = (rng: Rng, S: number, f: number) => (rng.next() - 0.5) * S * f;

const PAINTERS: Record<MotifPainter, PaintFn> = {
  /** Concentric rings, as left by binding cloth before dyeing. */
  rings(ctx, S, rng) {
    const cx = S * 0.5 + jitter(rng, S, 0.04);
    const cy = S * 0.5 + jitter(rng, S, 0.04);
    ctx.lineCap = 'round';
    for (const [r, w] of [
      [0.37, 0.05],
      [0.26, 0.042],
      [0.155, 0.038],
    ]) {
      ctx.lineWidth = w * S;
      wobblyRing(ctx, cx, cy, r * S, rng, S * 0.014);
    }
    dot(ctx, cx, cy, S * 0.055);
  },

  /** Offset rows of short running stitches. */
  stitches(ctx, S, rng) {
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.05;
    for (let r = 0; r < 4; r++) {
      const y = S * (0.16 + r * 0.227);
      const offset = r % 2 ? S * 0.12 : 0;
      for (let x = S * 0.08 + offset; x < S * 0.9; x += S * 0.24) {
        const len = S * (0.1 + rng.next() * 0.035);
        const y0 = y + jitter(rng, S, 0.025);
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x + len, y0 + jitter(rng, S, 0.02));
        ctx.stroke();
      }
    }
  },

  /** A hand-drawn grid with a dot in each outer square. */
  lattice(ctx, S, rng) {
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.042;
    for (const f of [0.34, 0.66]) {
      wobblyLine(ctx, S * 0.04, S * f, S * 0.96, S * f, rng, S * 0.012);
      wobblyLine(ctx, S * f, S * 0.04, S * f, S * 0.96, rng, S * 0.012);
    }
    for (const [fx, fy] of [
      [0.17, 0.17],
      [0.83, 0.17],
      [0.17, 0.83],
      [0.83, 0.83],
    ]) {
      dot(ctx, S * fx + jitter(rng, S, 0.02), S * fy + jitter(rng, S, 0.02), S * 0.045);
    }
    ctx.lineWidth = S * 0.03;
    wobblyRing(ctx, S * 0.5, S * 0.5, S * 0.07, rng, S * 0.006, 24);
  },

  /** Diagonal bands, alternating weight. */
  stripes(ctx, S, rng) {
    ctx.lineCap = 'round';
    let i = 0;
    for (let k = S * 0.1; k < S * 2.1; k += S * 0.2, i++) {
      ctx.lineWidth = S * (i % 2 ? 0.024 : 0.052);
      wobblyLine(ctx, k + S * 0.05, -S * 0.05, k - S * 1.05, S * 1.05, rng, S * 0.01);
    }
  },

  /** Three stacked zigzags. */
  chevron(ctx, S, rng) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = S * 0.044;
    const teeth = 3;
    for (const fy of [0.24, 0.5, 0.76]) {
      ctx.beginPath();
      for (let i = 0; i <= teeth * 2; i++) {
        const x = S * 0.04 + (i * S * 0.92) / (teeth * 2);
        const y = S * fy + (i % 2 ? -1 : 1) * S * 0.07 + jitter(rng, S, 0.02);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },

  /** Quarter arcs from each corner meeting at the edges, with a centre dot. */
  petals(ctx, S, rng) {
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.044;
    const corners: [number, number, number][] = [
      [0, 0, 0],
      [S, 0, Math.PI / 2],
      [S, S, Math.PI],
      [0, S, (3 * Math.PI) / 2],
    ];
    for (const [x, y, a0] of corners) {
      ctx.beginPath();
      ctx.arc(x, y, S * (0.47 + rng.next() * 0.03), a0, a0 + Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, S * 0.2, a0, a0 + Math.PI / 2);
      ctx.stroke();
    }
    dot(ctx, S * 0.5, S * 0.5, S * 0.06);
  },
};

function mottle(ctx: Ctx, S: number, rng: Rng): void {
  for (let i = 0; i < 18; i++) {
    const x = rng.next() * S;
    const y = rng.next() * S;
    const r = S * (0.18 + rng.next() * 0.5);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rng.next() < 0.6;
    g.addColorStop(0, dark ? `rgba(8,16,38,${0.08 + rng.next() * 0.12})` : `rgba(90,120,170,${0.05 + rng.next() * 0.08})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
}

/** Fine cracks and specks where dye crept through the resist. */
function crackle(ctx: Ctx, S: number, rng: Rng): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = Math.max(1, S * 0.006);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.35 + rng.next() * 0.35})`;
    let x = rng.next() * S;
    let y = rng.next() * S;
    let a = rng.next() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      a += (rng.next() - 0.5) * 1.4;
      const len = S * (0.03 + rng.next() * 0.06);
      x += Math.cos(a) * len;
      y += Math.sin(a) * len;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.15 + rng.next() * 0.35})`;
    dot(ctx, rng.next() * S, rng.next() * S, S * (0.003 + rng.next() * 0.008));
  }
  ctx.restore();
}

/** Warp and weft: faint light rows, faint dark columns. */
function grain(ctx: Ctx, S: number, rng: Rng, strength = 1): void {
  const step = Math.max(2, Math.round(S / 64));
  const w = Math.max(1, Math.round(step / 2));
  for (let y = 0; y < S; y += step) {
    ctx.fillStyle = `rgba(255,255,255,${(0.015 + rng.next() * 0.03) * strength})`;
    ctx.fillRect(0, y, S, w);
  }
  for (let x = 0; x < S; x += step) {
    ctx.fillStyle = `rgba(0,0,12,${(0.02 + rng.next() * 0.03) * strength})`;
    ctx.fillRect(x, 0, w, S);
  }
}

function vignette(ctx: Ctx, S: number, alpha: number): void {
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
  g.addColorStop(0, 'rgba(5,10,25,0)');
  g.addColorStop(1, `rgba(5,10,25,${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
}

function canvas(size: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  return [c, ctx];
}

export const CELL_RADIUS = 0.07;

/** One cell of cloth. High contrast trades texture for crisp, strong edges. */
export function paintCloth(size: number, spec: MotifSpec, seed: number, highContrast: boolean): HTMLCanvasElement {
  const S = size;
  const rng = createRng(seed);
  const [out, ctx] = canvas(S);

  ctx.save();
  roundRectPath(ctx, 0, 0, S, S, S * CELL_RADIUS);
  ctx.clip();
  ctx.fillStyle = highContrast ? '#13213b' : spec.ground;
  ctx.fillRect(0, 0, S, S);
  if (!highContrast) mottle(ctx, S, rng);

  const [motif, mctx] = canvas(S);
  mctx.fillStyle = mctx.strokeStyle = highContrast ? '#fffdf7' : spec.dye;
  PAINTERS[spec.painter](mctx, S, rng);
  if (!highContrast) {
    crackle(mctx, S, rng);
    // Dye bleed: a soft halo first, then the crisp motif on top
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.shadowColor = spec.dye;
    ctx.shadowBlur = S * 0.05;
    ctx.drawImage(motif, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = highContrast ? 1 : 0.92;
  ctx.drawImage(motif, 0, 0);
  ctx.globalAlpha = 1;

  grain(ctx, S, rng, highContrast ? 0.4 : 1);
  vignette(ctx, S, highContrast ? 0.1 : 0.3);
  ctx.restore();

  if (highContrast) {
    ctx.strokeStyle = '#fffdf7';
    ctx.lineWidth = S * 0.035;
    roundRectPath(ctx, S * 0.04, S * 0.04, S * 0.92, S * 0.92, S * CELL_RADIUS * 0.7);
    ctx.stroke();
  }
  return out;
}

/** An empty place on the loom: bare cloth with a faint thread grid. */
export function paintSlot(size: number, highContrast: boolean): HTMLCanvasElement {
  const S = size;
  const [out, ctx] = canvas(S);
  ctx.save();
  roundRectPath(ctx, 0, 0, S, S, S * CELL_RADIUS);
  ctx.clip();
  ctx.fillStyle = highContrast ? '#e5dbc9' : '#ede5d6';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = highContrast ? 'rgba(23,21,28,0.06)' : 'rgba(23,21,28,0.035)';
  const step = S / 8;
  for (let i = 1; i < 8; i++) {
    ctx.fillRect(i * step, 0, Math.max(1, S * 0.006), S);
    ctx.fillRect(0, i * step, S, Math.max(1, S * 0.006));
  }
  const g = ctx.createLinearGradient(0, 0, 0, S * 0.2);
  g.addColorStop(0, 'rgba(23,21,28,0.06)');
  g.addColorStop(1, 'rgba(23,21,28,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S * 0.2);
  ctx.restore();
  ctx.strokeStyle = highContrast ? 'rgba(23,21,28,0.6)' : 'rgba(23,21,28,0.08)';
  ctx.lineWidth = S * (highContrast ? 0.03 : 0.016);
  roundRectPath(ctx, ctx.lineWidth / 2, ctx.lineWidth / 2, S - ctx.lineWidth, S - ctx.lineWidth, S * CELL_RADIUS);
  ctx.stroke();
  return out;
}

/** Outline used to preview where a piece lands and what it completes. */
export function paintGlow(size: number, color: string, weight: number): HTMLCanvasElement {
  const S = size;
  const [out, ctx] = canvas(S);
  const lw = S * weight;
  roundRectPath(ctx, lw / 2, lw / 2, S - lw, S - lw, S * CELL_RADIUS);
  ctx.fillStyle = 'rgba(247,242,232,0.3)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
  return out;
}

/** Seamless ivory paper with faint fibres, for scene backgrounds. */
export function paintPaper(size: number, seed: number): HTMLCanvasElement {
  const S = size;
  const rng = createRng(seed);
  const [out, ctx] = canvas(S);
  ctx.fillStyle = '#f7f2e8';
  ctx.fillRect(0, 0, S, S);
  const wrapped = (x: number, y: number, draw: (x: number, y: number) => void) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) draw(x + ox, y + oy);
  };
  for (let i = 0; i < 26; i++) {
    const x = rng.next() * S;
    const y = rng.next() * S;
    const r = S * (0.08 + rng.next() * 0.2);
    wrapped(x, y, (px, py) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(194,154,82,${0.015 + rng.next() * 0.02})`);
      g.addColorStop(1, 'rgba(194,154,82,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    });
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 1100; i++) {
    const x = rng.next() * S;
    const y = rng.next() * S;
    const len = S * (0.006 + rng.next() * 0.022);
    const a = rng.next() * Math.PI;
    const warm = rng.next() < 0.35;
    ctx.strokeStyle = warm ? `rgba(150,110,50,${0.03 + rng.next() * 0.04})` : `rgba(23,21,28,${0.018 + rng.next() * 0.03})`;
    ctx.lineWidth = Math.max(1, S * 0.0018);
    wrapped(x, y, (px, py) => {
      if (px < -len || py < -len || px > S + len || py > S + len) return;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
      ctx.stroke();
    });
  }
  return out;
}
