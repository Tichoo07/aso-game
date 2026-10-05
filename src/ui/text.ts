import type Phaser from 'phaser';
import { FONTS } from './theme';

export type TextRole = 'display' | 'title' | 'body' | 'label' | 'number';

/**
 * Text styles. Sizes are in px (pass frame.font(n)). Labels are small caps
 * style: uppercase strings with tracking applied via setLetterSpacing.
 */
export function textStyle(
  role: TextRole,
  size: number,
  color: string,
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  const base: Record<TextRole, Phaser.Types.GameObjects.Text.TextStyle> = {
    display: { fontFamily: FONTS.display, fontStyle: '600' },
    title: { fontFamily: FONTS.display, fontStyle: '500' },
    number: { fontFamily: FONTS.display, fontStyle: '500' },
    body: { fontFamily: FONTS.ui, fontStyle: '400' },
    label: { fontFamily: FONTS.ui, fontStyle: '600' },
  };
  return { ...base[role], fontSize: `${size}px`, color, ...extra };
}

/** Set the font size, shrinking it (down to minSize) if the text is wider than maxWidth. */
export function fitText(text: Phaser.GameObjects.Text, size: number, maxWidth: number, minSize = size * 0.6): void {
  text.setFontSize(size);
  if (text.width > maxWidth) text.setFontSize(Math.max(minSize, Math.floor((size * maxWidth) / text.width)));
}
