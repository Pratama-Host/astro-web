import { describe, expect, it } from 'vitest';
import { createTtlCache } from '../src/lib/ttl-cache';

describe('createTtlCache', () => {
  it('shares one in-flight load between concurrent callers', async () => {
    const cache = createTtlCache<number>(1000, () => 0);
    let calls = 0;
    const loader = async () => { calls += 1; return { value: 7, cacheable: true }; };
    const [a, b] = await Promise.all([cache.get('k', loader), cache.get('k', loader)]);
    expect(a).toBe(7);
    expect(b).toBe(7);
    expect(calls).toBe(1);
  });

  it('serves from cache until the TTL expires, then reloads', async () => {
    let clock = 0;
    const cache = createTtlCache<number>(1000, () => clock);
    let calls = 0;
    const loader = async () => { calls += 1; return { value: calls, cacheable: true }; };
    expect(await cache.get('k', loader)).toBe(1);
    clock = 999;
    expect(await cache.get('k', loader)).toBe(1);
    clock = 1001;
    expect(await cache.get('k', loader)).toBe(2);
  });

  it('does not keep results flagged as not cacheable (fallbacks)', async () => {
    const cache = createTtlCache<string>(1000, () => 0);
    let calls = 0;
    const loader = async () => { calls += 1; return { value: 'fallback', cacheable: false }; };
    await cache.get('k', loader);
    await cache.get('k', loader);
    expect(calls).toBe(2);
  });

  it('does not cache rejected loads and clear() resets everything', async () => {
    const cache = createTtlCache<number>(1000, () => 0);
    let calls = 0;
    const failing = async (): Promise<{ value: number; cacheable: boolean }> => { calls += 1; throw new Error('boom'); };
    let failed = 0;
    try { await cache.get('k', failing); } catch { failed += 1; }
    try { await cache.get('k', failing); } catch { failed += 1; }
    expect(failed).toBe(2);
    expect(calls).toBe(2);
    await cache.get('x', async () => ({ value: 1, cacheable: true }));
    cache.clear();
    expect(await cache.get('x', async () => ({ value: 2, cacheable: true }))).toBe(2);
  });
});
