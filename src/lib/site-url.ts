import process from 'node:process';

function normalizeOrigin(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * SITE_ORIGIN dapat diisi pada build/runtime environment Cloudflare.
 * Jika belum diisi, route SSR menggunakan origin request yang sedang dilayani,
 * sehingga tidak ada canonical/sitemap yang menunjuk ke domain placeholder.
 */
export const SITE_ORIGIN = normalizeOrigin(process.env.SITE_ORIGIN) || '';

export function getSiteOrigin(requestOrigin?: string): string {
  return SITE_ORIGIN || normalizeOrigin(requestOrigin) || 'https://example.invalid';
}
