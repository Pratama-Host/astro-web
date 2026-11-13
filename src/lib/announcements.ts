import { getSupabasePublic } from './supabase';

export type ContentStatus = 'draft' | 'published' | 'archived';
export const STATUSES: readonly ContentStatus[] = ['draft', 'published', 'archived'];

export interface Announcement {
  id: string; title: string; body: string; category: string; status: ContentStatus;
  pinned: boolean; publish_at: string | null; expires_at: string | null; link_url: string | null;
}
export interface AgendaEvent {
  id: string; title: string; description: string; category: string; status: ContentStatus;
  starts_at: string; ends_at: string | null; location: string | null;
}

export const ANNOUNCEMENT_COLUMNS = 'id, title, body, category, status, pinned, publish_at, expires_at, link_url';
export const AGENDA_COLUMNS = 'id, title, description, category, status, starts_at, ends_at, location';

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isoOrNull = (v: unknown): string | null | undefined => {
  if (v === null || v === '' || v === undefined) return null;
  if (typeof v !== 'string') return undefined;
  const t = Date.parse(v);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
};
const httpUrl = (v: unknown): string | null | undefined => {
  if (v === null || v === '' || v === undefined) return null;
  if (typeof v !== 'string') return undefined;
  try { const u = new URL(v.trim()); return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined; } catch { return undefined; }
};

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateAnnouncement(input: Record<string, unknown>): Validated<Omit<Announcement, 'id'>> {
  const title = text(input.title, 160);
  if (!title) return { ok: false, error: 'Judul wajib diisi.' };
  const status = input.status === undefined ? 'draft' : input.status;
  if (!STATUSES.includes(status as ContentStatus)) return { ok: false, error: 'Status tidak valid.' };
  const publish_at = isoOrNull(input.publish_at);
  const expires_at = isoOrNull(input.expires_at);
  if (publish_at === undefined || expires_at === undefined) return { ok: false, error: 'Format tanggal tidak valid.' };
  if (publish_at && expires_at && expires_at <= publish_at) return { ok: false, error: 'Tanggal kedaluwarsa harus setelah tanggal terbit.' };
  const link_url = httpUrl(input.link_url);
  if (link_url === undefined) return { ok: false, error: 'Tautan harus berupa URL http(s).' };
  return { ok: true, value: {
    title, body: text(input.body, 5000), category: text(input.category, 60) || 'Kelas',
    status: status as ContentStatus, pinned: input.pinned === true, publish_at, expires_at, link_url,
  } };
}

export function validateAgendaEvent(input: Record<string, unknown>): Validated<Omit<AgendaEvent, 'id'>> {
  const title = text(input.title, 160);
  if (!title) return { ok: false, error: 'Judul wajib diisi.' };
  const status = input.status === undefined ? 'draft' : input.status;
  if (!STATUSES.includes(status as ContentStatus)) return { ok: false, error: 'Status tidak valid.' };
  const starts_at = isoOrNull(input.starts_at);
  const ends_at = isoOrNull(input.ends_at);
  if (!starts_at) return { ok: false, error: 'Waktu mulai wajib diisi dengan format tanggal yang valid.' };
  if (ends_at === undefined) return { ok: false, error: 'Format waktu selesai tidak valid.' };
  if (ends_at && ends_at < starts_at) return { ok: false, error: 'Waktu selesai tidak boleh sebelum waktu mulai.' };
  return { ok: true, value: {
    title, description: text(input.description, 3000), category: text(input.category, 60) || 'Kelas',
    status: status as ContentStatus, starts_at, ends_at, location: text(input.location, 160) || null,
  } };
}

/** Aturan tampil publik; cermin dari kebijakan RLS sehingga fallback/preview konsisten. */
export function isAnnouncementLive(item: Pick<Announcement, 'status' | 'publish_at' | 'expires_at'>, now = new Date()): boolean {
  if (item.status !== 'published') return false;
  if (item.publish_at && Date.parse(item.publish_at) > now.getTime()) return false;
  if (item.expires_at && Date.parse(item.expires_at) <= now.getTime()) return false;
  return true;
}

export function sortAnnouncements<T extends Pick<Announcement, 'pinned' | 'publish_at'>>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    Number(b.pinned) - Number(a.pinned) || (Date.parse(b.publish_at || '') || 0) - (Date.parse(a.publish_at || '') || 0));
}

/** Pisahkan agenda mendatang/berlangsung dari yang sudah lewat, berdasarkan waktu server (UTC). */
export function splitAgenda(events: AgendaEvent[], now = new Date()) {
  const t = now.getTime();
  const endOf = (e: AgendaEvent) => Date.parse(e.ends_at || e.starts_at);
  const published = events.filter((e) => e.status === 'published');
  return {
    upcoming: published.filter((e) => endOf(e) >= t).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)),
    past: published.filter((e) => endOf(e) < t).sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at)).slice(0, 10),
  };
}

/** Baca konten publik. Gagal/tabel belum ada → daftar kosong (fallback aman), error tercatat di log. */
export async function getPublicAnnouncements(): Promise<{ announcements: Announcement[]; agenda: AgendaEvent[] }> {
  const client = getSupabasePublic();
  if (!client) return { announcements: [], agenda: [] };
  try {
    const [a, g] = await Promise.all([
      client.from('announcements').select(ANNOUNCEMENT_COLUMNS).limit(50),
      client.from('agenda_events').select(AGENDA_COLUMNS).order('starts_at', { ascending: true }).limit(100),
    ]);
    if (a.error) console.error('[data:announcements]', a.error.message);
    if (g.error) console.error('[data:agenda]', g.error.message);
    return {
      announcements: sortAnnouncements(((a.data as unknown as Announcement[]) || []).filter((x) => isAnnouncementLive(x))),
      agenda: (g.data as unknown as AgendaEvent[]) || [],
    };
  } catch (error) {
    console.error('[data:announcements]', error instanceof Error ? error.message : 'unknown error');
    return { announcements: [], agenda: [] };
  }
}
