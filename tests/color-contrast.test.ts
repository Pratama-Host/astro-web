import { describe, expect, it } from 'vitest';
import {
  DARK_ON_ACCENT,
  LIGHT_ON_ACCENT,
  WCAG_AA_TEXT,
  accentButtonEnd,
  accentForText,
  contrastRatio,
  onAccentColor,
} from '../src/lib/color-contrast';

describe('color contrast helpers', () => {
  it('computes known WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('keeps an accent that already passes unchanged', () => {
    expect(accentForText('#0f766e', '#f8fafc')).toBe('#0f766e');
  });

  it.each([
    ['#dc2626', '#0a0505'],
    ['#2563eb', '#020617'],
    ['#0d9488', '#f8fafc'],
    ['#14b8a6', '#ffffff'],
    ['#facc15', '#f8fafc'],
    ['#1e1b4b', '#0a0505'],
  ])('makes accent %s readable as text on %s', (accent, background) => {
    expect(contrastRatio(accentForText(accent, background), background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });

  it('chooses a readable text color on any accent fill', () => {
    for (const accent of ['#dc2626', '#0d9488', '#2563eb', '#facc15', '#16a34a', '#a855f7', '#f97316', '#00ffff']) {
      const text = onAccentColor(accent);
      expect([LIGHT_ON_ACCENT, DARK_ON_ACCENT]).toContain(text);
      expect(contrastRatio(text, accent)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    }
  });

  it('keeps button gradient end readable with the chosen text color', () => {
    for (const accent of ['#dc2626', '#0f766e', '#2563eb', '#facc15']) {
      const text = onAccentColor(accent);
      expect(contrastRatio(text, accentButtonEnd(accent, text))).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    }
  });
});
