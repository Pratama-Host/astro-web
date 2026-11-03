import { describe, expect, it } from 'vitest';
import { validPublicUrl, validMediaRef, validInternalHref, isHexColor, isValidSocialLinks, isValidSiteSettingsUrls, readJsonRequest, containsAnyReference } from '../src/lib/cms-admin';

describe('validPublicUrl', () => {
  it('accepts canonical http and https URLs', () => {
    expect(validPublicUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(validPublicUrl('http://example.com')).toBe('http://example.com/');
  });
  it.each(['javascript:alert(1)', 'data:text/html,foo', '//example.com', 'https://user:pass@example.com', 'https://exa mple.com'])('rejects unsafe URL %s', (value) => {
    expect(validPublicUrl(value)).toBeNull();
  });
});

describe('media references', () => {
  it('accepts storage references without traversal', () => {
    expect(validMediaRef('storage://galeri/foto.webp')).toBe('storage://galeri/foto.webp');
    expect(validMediaRef('storage://galeri/../secret.webp')).toBeNull();
    expect(validMediaRef('storage://galeri//foto.webp')).toBeNull();
  });
  it('accepts optional media references when empty', () => {
    expect(isValidSiteSettingsUrls({ media: { logo_url: '' } })).toBe(true);
    expect(isValidSiteSettingsUrls({ media: { logo_url: 'javascript:alert(1)' } })).toBe(false);
  });
});

describe('social and internal links', () => {
  it('only accepts known social platforms with http(s) URLs', () => {
    expect(isValidSocialLinks({ instagram: 'https://instagram.com/example' })).toBe(true);
    expect(isValidSocialLinks({ website: 'https://example.com' })).toBe(true);
    expect(isValidSocialLinks({ unknown: 'https://example.com' })).toBe(false);
    expect(isValidSocialLinks({ instagram: 'javascript:alert(1)' })).toBe(false);
  });
  it('blocks administrative or external internal paths', () => {
    expect(validInternalHref('/anggota')).toBe('/anggota');
    expect(validInternalHref('//evil.example')).toBeNull();
    expect(validInternalHref('/pengembang/admin')).toBeNull();
    expect(validInternalHref('/api/admin/login')).toBeNull();
  });
  it('validates six-digit hex colors', () => {
    expect(isHexColor('#abcdef')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
  });
});


describe('bounded request parsing', () => {
  it('accepts valid JSON below the byte limit', async () => {
    const result = await readJsonRequest(new Request('https://test.invalid', { method: 'POST', body: JSON.stringify({ ok: true }) }), 64);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ ok: true });
  });
  it('rejects a body that exceeds the byte limit', async () => {
    const result = await readJsonRequest(new Request('https://test.invalid', { method: 'POST', body: '123456789' }), 4);
    expect(result.error).toBe('too_large');
  });
  it('rejects malformed and empty JSON', async () => {
    const malformed = await readJsonRequest(new Request('https://test.invalid', { method: 'POST', body: '{bad' }), 20);
    const empty = await readJsonRequest(new Request('https://test.invalid', { method: 'POST' }), 20);
    expect(malformed.error).toBe('invalid_json');
    expect(empty.error).toBe('invalid_json');
  });
});

describe('nested media reference detection', () => {
  it('finds exact references recursively in arrays and objects', () => {
    const refs = new Set(['storage://galeri/foto.webp']);
    expect(containsAnyReference({ page: [{ image: 'storage://galeri/foto.webp' }] }, refs)).toBe(true);
    expect(containsAnyReference({ page: [{ image: 'storage://galeri/other.webp' }] }, refs)).toBe(false);
  });
});
