import type { APIRoute } from 'astro';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import { isPlainRecord, logCmsAction, readJsonRequest } from '../../../lib/cms-admin';
import { AGENDA_COLUMNS, ANNOUNCEMENT_COLUMNS, validateAgendaEvent, validateAnnouncement } from '../../../lib/announcements';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = { announcements: 'announcements', agenda: 'agenda_events' } as const;
type Kind = keyof typeof KINDS;
const kindOf = (url: URL): Kind | null => { const k = url.searchParams.get('type'); return k === 'announcements' || k === 'agenda' ? k : null; };
const noStore = { 'Cache-Control': 'no-store' };

export const GET: APIRoute = async ({ request, url }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const kind = kindOf(url);
  if (!kind) return Response.json({ error: 'Jenis harus announcements atau agenda.' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const cols = kind === 'agenda' ? AGENDA_COLUMNS : ANNOUNCEMENT_COLUMNS;
  const { data, error } = await db.from(KINDS[kind]).select(cols).order('created_at', { ascending: false }).limit(200);
  if (error) return Response.json({ error: 'Data gagal dibaca.' }, { status: 500 });
  return Response.json({ data: data || [] }, { headers: noStore });
};

/** Buat (tanpa id) atau ubah (dengan id) satu item. Draft→published→archived diatur lewat field status. */
export const POST: APIRoute = async ({ request, url }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const kind = kindOf(url);
  if (!kind) return Response.json({ error: 'Jenis harus announcements atau agenda.' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const parsed = await readJsonRequest(request, 16384);
  if (parsed.error === 'too_large') return Response.json({ error: 'Ukuran JSON melebihi batas.' }, { status: 413 });
  if (parsed.error || !isPlainRecord(parsed.data)) return Response.json({ error: 'JSON tidak valid.' }, { status: 400 });
  const body = parsed.data;
  const id = body.id;
  if (id !== undefined && (typeof id !== 'string' || !UUID.test(id))) return Response.json({ error: 'ID tidak valid.' }, { status: 400 });
  const result = kind === 'agenda' ? validateAgendaEvent(body) : validateAnnouncement(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  const row = { ...result.value, updated_at: new Date().toISOString() };
  const table = KINDS[kind];
  const query = id ? db.from(table).update(row).eq('id', id).select('id').maybeSingle() : db.from(table).insert(row).select('id').maybeSingle();
  const { data, error } = await query;
  if (error) return Response.json({ error: 'Item gagal disimpan.' }, { status: 500 });
  if (!data) return Response.json({ error: 'Item tidak ditemukan.' }, { status: 404 });
  await logCmsAction(db, id ? 'update' : 'create', table, data.id, `${id ? 'Mengubah' : 'Membuat'} ${kind}: ${row.title} (${row.status})`);
  return Response.json({ ok: true, id: data.id }, { headers: noStore });
};
