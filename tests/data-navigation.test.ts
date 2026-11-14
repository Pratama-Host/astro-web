import { describe, expect, it } from 'vitest';
import { ensureAnnouncementsNavigation, getNavigation, getSections } from '../src/lib/data';

describe('navigation and site sections fallback', () => {
  it('returns default navigation items when Supabase client is unconfigured or offline', async () => {
    const nav = await getNavigation();
    expect(Array.isArray(nav)).toBe(true);
    expect(nav.length).toBeGreaterThan(0);
    expect(nav[0]).toHaveProperty('href', '/');
    expect(nav.map(n => n.href)).toContain('/anggota');
    expect(nav.map(n => n.href)).toContain('/pengembang');
    expect(nav.map(n => n.href)).toContain('/pengumuman');
  });

  it('adds the announcements menu when a configured database menu does not contain it', () => {
    const nav = ensureAnnouncementsNavigation([
      { id: 'home', label: 'Home', href: '/', icon: 'fa-house', sort_order: 0, enabled: true },
      { id: 'members', label: 'Anggota', href: '/anggota', icon: 'fa-users', sort_order: 1, enabled: true },
    ]);
    expect(nav.map(item => item.href)).toContain('/pengumuman');
    expect(nav.find(item => item.href === '/pengumuman')?.label).toBe('Pengumuman');
  });

  it('does not re-enable an announcements menu explicitly disabled in CMS', () => {
    const nav = ensureAnnouncementsNavigation([
      { id: 'home', label: 'Home', href: '/', icon: 'fa-house', sort_order: 0, enabled: true },
      { id: 'pengumuman', label: 'Pengumuman', href: '/pengumuman', icon: 'fa-bullhorn', sort_order: 1, enabled: false },
    ]);
    expect(nav.map(item => item.href)).not.toContain('/pengumuman');
  });

  it('does not duplicate an announcements menu already configured in CMS', () => {
    const nav = ensureAnnouncementsNavigation([
      { id: 'pengumuman', label: 'Info kelas', href: '/pengumuman', icon: 'fa-bell', sort_order: 4, enabled: true },
    ]);
    expect(nav.filter(item => item.href === '/pengumuman')).toHaveLength(1);
    expect(nav.find(item => item.href === '/pengumuman')?.label).toBe('Info kelas');
  });

  it('returns empty array safely for sections when client is unconfigured', async () => {
    const sections = await getSections('home');
    expect(Array.isArray(sections)).toBe(true);
  });
});
