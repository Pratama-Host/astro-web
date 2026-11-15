import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesDir = new URL('../src/styles/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const styles = readdirSync(stylesDir)
  .filter((name) => name.endsWith('.css'))
  .map((name) => ({ name, css: stripComments(readFileSync(new URL(name, stylesDir), 'utf8')) }));

/**
 * Ratchet: jumlah `!important` per file tidak boleh naik. Saat sebuah file dibersihkan,
 * turunkan angkanya di sini supaya kemajuan tidak mundur lagi.
 */
const IMPORTANT_BASELINE: Record<string, number> = {
  'admin.css': 7, 'anggota.css': 49, 'animasi.css': 56, 'dasar.css': 19, 'developer-portfolio.css': 31,
  'formulir.css': 21, 'modal.css': 5, 'struktur.css': 2, 'tata-letak.css': 21, 'tombol.css': 53, 'ui.css': 61,
};

describe('css quality guardrails', () => {
  it('does not add new !important declarations', () => {
    const over = styles
      .map(({ name, css }) => ({ name, count: css.split('!important').length - 1, max: IMPORTANT_BASELINE[name] ?? 0 }))
      .filter(({ count, max }) => count > max)
      .map(({ name, count, max }) => `${name}: ${count} > ${max}`);
    expect(over).toEqual([]);
  });

  it('keeps every font-size at or above 12px (0.75rem)', () => {
    const tooSmall: string[] = [];
    for (const { name, css } of styles) {
      for (const match of css.matchAll(/font-size:\s*([0-9.]+)(px|rem)/g)) {
        const px = match[2] === 'rem' ? Number(match[1]) * 16 : Number(match[1]);
        if (px < 12) tooSmall.push(`${name}: ${match[0]}`);
      }
    }
    expect(tooSmall).toEqual([]);
  });

  it('uses --accent-text (not raw accent) for accent-colored text', () => {
    const raw: string[] = [];
    for (const { name, css } of styles) {
      for (const match of css.matchAll(/(?<![-\w])color:\s*var\(--(?:accent|accent-2|primary)\)/g)) raw.push(`${name}: ${match[0]}`);
    }
    expect(raw).toEqual([]);
  });

  it('keeps the primary button text on the contrast-checked token', () => {
    const buttons = styles.find(({ name }) => name === 'tombol.css')?.css ?? '';
    const rule = buttons.slice(buttons.indexOf('.tombol-utama {'), buttons.indexOf('}', buttons.indexOf('.tombol-utama {')));
    expect(rule).toContain('var(--on-accent');
    expect(rule).toContain('var(--btn-end');
  });
});

describe('ui structure guardrails', () => {
  it('emits contrast tokens for every theme from the layout', () => {
    const layout = read('../src/layouts/Layout.astro');
    expect(layout).toContain('--accent-text:');
    expect(layout).toContain('--on-accent:');
    expect(layout).toContain('--btn-end:');
  });

  it('renders the header logo as a real button, not an image with a button role', () => {
    const header = read('../src/components/Header.astro');
    expect(header).toContain('<button type="button" id="brand-logo"');
    expect(header).not.toContain('role="button"');
  });

  it('mirrors canvas and audio controls inside the mobile menu', () => {
    const menu = read('../src/components/HamburgerMenu.astro');
    expect(menu).toContain('data-proxy-for="tombol-kanvas"');
    expect(menu).toContain('data-proxy-for="tombol-audio"');
  });
});
