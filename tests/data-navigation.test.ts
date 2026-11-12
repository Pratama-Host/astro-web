import { describe, expect, it } from 'vitest';
import { getNavigation, getSections } from '../src/lib/data';

describe('navigation and site sections fallback', () => {
  it('returns default navigation items when Supabase client is unconfigured or offline', async () => {
    const nav = await getNavigation();
    expect(Array.isArray(nav)).toBe(true);
    expect(nav.length).toBeGreaterThan(0);
    expect(nav[0]).toHaveProperty('href', '/');
    expect(nav.map(n => n.href)).toContain('/anggota');
    expect(nav.map(n => n.href)).toContain('/pengembang');
  });

  it('returns empty array safely for sections when client is unconfigured', async () => {
    const sections = await getSections('home');
    expect(Array.isArray(sections)).toBe(true);
  });
});
