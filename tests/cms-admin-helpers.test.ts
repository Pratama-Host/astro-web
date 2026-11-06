import { describe, expect, it } from 'vitest';
import { cleanText, isPlainRecord, readRequestBytes } from '../src/lib/cms-admin';

describe('CMS admin utility helpers', () => {
  it('normalizes and caps text without changing internal characters', () => {
    expect(cleanText('  TKJ XII-9  ', 20)).toBe('TKJ XII-9');
    expect(cleanText('  abcdef  ', 4)).toBe('abcd');
    expect(cleanText(null)).toBe('');
  });

  it('recognizes plain object-shaped request data', () => {
    expect(isPlainRecord({ title: 'Beranda' })).toBe(true);
    expect(isPlainRecord([])).toBe(false);
    expect(isPlainRecord(null)).toBe(false);
    expect(isPlainRecord('string')).toBe(false);
  });

  it('reads a bounded request body as bytes', async () => {
    const request = new Request('https://site.example/api/test', {
      method: 'POST',
      body: 'data',
    });
    const result = await readRequestBytes(request, 8);
    expect(result.tooLarge).toBe(false);
    expect(new TextDecoder().decode(result.bytes)).toBe('data');
  });

  it('rejects an oversized content-length before reading the body', async () => {
    const request = new Request('https://site.example/api/test', {
      method: 'POST',
      headers: { 'content-length': '20' },
      body: 'data',
    });
    const result = await readRequestBytes(request, 4);
    expect(result.tooLarge).toBe(true);
    expect(result.bytes).toBeNull();
  });
});
