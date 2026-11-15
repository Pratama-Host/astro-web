import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

describe('service worker privacy and cache ownership', () => {
  it('keeps admin and API routes out of Cache API interception', () => {
    expect(worker).toContain("url.pathname.startsWith('/pengembang/admin')");
    expect(worker).toContain("url.pathname.startsWith('/api/')");
    expect(worker).toContain("url.searchParams.has('previewDraft')");
  });

  it('recognizes private cache headers and cookie-varying responses', () => {
    expect(worker).toContain("res.headers.get('CDN-Cache-Control')");
    expect(worker).toContain("res.headers.get('Cloudflare-CDN-Cache-Control')");
    expect(worker).toContain("res.headers.get('Surrogate-Control')");
    expect(worker).toContain("res.headers.get('Vary')");
    expect(worker).toContain("res.headers.get('X-Robots-Tag')");
  });

  it('deletes only old caches owned by this app', () => {
    expect(worker).toContain("const CACHE_PREFIX = 'tkj-xii9-'");
    expect(worker).toContain('key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME');
  });
});
