/**
 * Utilitas kontras WCAG 2.x untuk warna tema yang bisa diubah dari CMS.
 * Semua fungsi murni (tanpa DOM) agar bisa diuji dan dipakai di server.
 */

export const WCAG_AA_TEXT = 4.5;
export const LIGHT_ON_ACCENT = '#ffffff';
export const DARK_ON_ACCENT = '#0b1220';

type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16)) as Rgb;
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Campur warna `from` ke arah `to` sebesar `amount` (0..1). */
export function mix(from: string, to: string, amount: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex(a.map((channel, i) => channel + (b[i] - channel) * amount) as Rgb);
}

/**
 * Warna teks yang terbaca di atas isian aksen: putih atau hampir-hitam,
 * mana yang kontrasnya lebih tinggi. Rasio terburuk antara keduanya selalu >= ~4.6.
 */
export function onAccentColor(accent: string): string {
  return contrastRatio(LIGHT_ON_ACCENT, accent) >= contrastRatio(DARK_ON_ACCENT, accent)
    ? LIGHT_ON_ACCENT
    : DARK_ON_ACCENT;
}

/**
 * Versi aksen yang aman dipakai sebagai warna TEKS di atas `background`.
 * Aksen digeser ke putih (latar gelap) atau hitam (latar terang) sampai
 * mencapai `minRatio`; hue dipertahankan semaksimal mungkin.
 */
export function accentForText(accent: string, background: string, minRatio = WCAG_AA_TEXT): string {
  if (contrastRatio(accent, background) >= minRatio) return accent;
  const target = relativeLuminance(background) < 0.5 ? '#ffffff' : '#000000';
  for (let step = 1; step <= 100; step += 1) {
    const candidate = mix(accent, target, step / 100);
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
  }
  return target;
}

/** Pasangan warna kedua untuk gradien tombol utama yang tetap menjaga kontras teks. */
export function accentButtonEnd(accent: string, onAccent: string): string {
  return onAccent === LIGHT_ON_ACCENT ? mix(accent, '#000000', 0.2) : mix(accent, '#ffffff', 0.15);
}
