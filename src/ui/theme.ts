import { settings } from '../services';

/** Brand palette. Everything else derives from these six. */
export const PALETTE = {
  ink: 0x17151c,
  ivory: 0xf7f2e8,
  indigo: 0x243b63,
  clay: 0xb9654b,
  ochre: 0xc29a52,
  forest: 0x40584a,
} as const;

export const css = (hex: number): string => `#${hex.toString(16).padStart(6, '0')}`;

export const FONTS = {
  display: '"Fraunces", Georgia, "Times New Roman", serif',
  ui: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
} as const;

export interface Theme {
  hc: boolean;
  bg: number;
  /** Raised surfaces: cards, the loom. */
  surface: number;
  surfaceLine: number;
  surfaceLineAlpha: number;
  text: string;
  textMuted: string;
  textFaint: string;
  textOnPrimary: string;
  primary: number;
  accent: number;
  accentCss: string;
  line: number;
  lineAlpha: number;
  /** Outline drawn round the drop preview. */
  ghostLine: number;
  ghostLineWidth: number;
}

/** Current theme, honouring the high-contrast setting. Read at scene creation. */
export function theme(): Theme {
  const hc = settings().highContrast;
  return hc
    ? {
        hc,
        bg: PALETTE.ivory,
        surface: 0xece3d2,
        surfaceLine: PALETTE.ink,
        surfaceLineAlpha: 0.6,
        text: css(PALETTE.ink),
        textMuted: '#2a2730',
        textFaint: '#3d3a44',
        textOnPrimary: '#ffffff',
        primary: 0x162845,
        accent: 0x8a5d14,
        accentCss: '#7a5210',
        line: PALETTE.ink,
        lineAlpha: 0.8,
        ghostLine: PALETTE.ink,
        ghostLineWidth: 3,
      }
    : {
        hc,
        bg: PALETTE.ivory,
        surface: 0xf0e9dc,
        surfaceLine: PALETTE.ink,
        surfaceLineAlpha: 0.1,
        text: css(PALETTE.ink),
        textMuted: 'rgba(23,21,28,0.64)',
        textFaint: 'rgba(23,21,28,0.42)',
        textOnPrimary: css(PALETTE.ivory),
        primary: PALETTE.indigo,
        accent: PALETTE.ochre,
        accentCss: '#9c7633',
        line: PALETTE.ink,
        lineAlpha: 0.22,
        ghostLine: PALETTE.ochre,
        ghostLineWidth: 2,
      };
}
