import { describe, expect, it } from 'vitest';
import { isAnnouncementLive, sortAnnouncements, splitAgenda, validateAgendaEvent, validateAnnouncement, type AgendaEvent } from '../src/lib/announcements';

const now = new Date('2026-11-13T00:00:00Z');

describe('announcement validation', () => {
  it('requires a title and defaults to draft', () => {
    expect(validateAnnouncement({ title: '  ' }).ok).toBe(false);
    const r = validateAnnouncement({ title: 'Ujian' });
    expect(r.ok && r.value.status).toBe('draft');
  });
  it('rejects bad status, dates, and non-http links', () => {
    expect(validateAnnouncement({ title: 'x', status: 'live' }).ok).toBe(false);
    expect(validateAnnouncement({ title: 'x', publish_at: 'bukan tanggal' }).ok).toBe(false);
    expect(validateAnnouncement({ title: 'x', publish_at: '2026-12-02T00:00:00Z', expires_at: '2026-12-01T00:00:00Z' }).ok).toBe(false);
    expect(validateAnnouncement({ title: 'x', link_url: 'javascript:alert(1)' }).ok).toBe(false);
  });
});

describe('announcement visibility', () => {
  it('hides drafts, scheduled and expired items', () => {
    expect(isAnnouncementLive({ status: 'draft', publish_at: null, expires_at: null }, now)).toBe(false);
    expect(isAnnouncementLive({ status: 'published', publish_at: '2026-12-01T00:00:00Z', expires_at: null }, now)).toBe(false);
    expect(isAnnouncementLive({ status: 'published', publish_at: null, expires_at: '2026-11-12T00:00:00Z' }, now)).toBe(false);
    expect(isAnnouncementLive({ status: 'published', publish_at: null, expires_at: null }, now)).toBe(true);
  });
  it('sorts pinned first, then newest', () => {
    const sorted = sortAnnouncements([
      { pinned: false, publish_at: '2026-11-10T00:00:00Z' }, { pinned: true, publish_at: '2026-01-01T00:00:00Z' },
      { pinned: false, publish_at: '2026-11-12T00:00:00Z' },
    ]);
    expect(sorted.map((x) => x.pinned)).toEqual([true, false, false]);
    expect(sorted[1].publish_at).toBe('2026-11-12T00:00:00Z');
  });
});

describe('agenda', () => {
  it('validates time range', () => {
    expect(validateAgendaEvent({ title: 'PKL' }).ok).toBe(false);
    expect(validateAgendaEvent({ title: 'PKL', starts_at: '2026-12-02T00:00:00Z', ends_at: '2026-12-01T00:00:00Z' }).ok).toBe(false);
    expect(validateAgendaEvent({ title: 'PKL', starts_at: '2026-12-01T00:00:00Z' }).ok).toBe(true);
  });
  it('splits upcoming and past, ignoring unpublished', () => {
    const mk = (id: string, starts_at: string, status: AgendaEvent['status'] = 'published'): AgendaEvent =>
      ({ id, title: id, description: '', category: 'Kelas', status, starts_at, ends_at: null, location: null });
    const { upcoming, past } = splitAgenda([mk('a', '2026-12-01T00:00:00Z'), mk('b', '2026-10-01T00:00:00Z'), mk('c', '2026-12-05T00:00:00Z', 'draft')], now);
    expect(upcoming.map((e) => e.id)).toEqual(['a']);
    expect(past.map((e) => e.id)).toEqual(['b']);
  });
});
