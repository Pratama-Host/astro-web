import type { APIRoute } from 'astro';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import { cleanText, purgePublicSiteCache, validInternalHref, readJsonRequest, isPlainRecord } from '../../../lib/cms-admin';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const { data, error } = await db.from('site_navigation').select('*').order('sort_order');
  if (error) return Response.json({ error: 'Navigasi gagal dibaca. Jalankan migrations/0001_baseline.sql.' }, { status: 500 });
  return Response.json({ data: data || [], snapshot: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const parsedBody = await readJsonRequest(request, 32768);
  if (parsedBody.error === 'too_large') return Response.json({ error: 'Ukuran JSON melebihi batas yang diizinkan.' }, { status: 413 });
  if (parsedBody.error || !isPlainRecord(parsedBody.data)) return Response.json({ error: 'JSON tidak valid.' }, { status: 400 });
  const body = parsedBody.data as any;
  if (!Array.isArray(body?.items) || body.items.length > 15) return Response.json({ error: 'Daftar menu tidak valid (maksimal 15).' }, { status: 400 });
  const items: any[] = [];
  const seenIds = new Set<string>();
  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    if (!isPlainRecord(item) || (item.enabled !== undefined && typeof item.enabled !== 'boolean')) return Response.json({ error: `Data menu urutan ${i + 1} tidak valid.` }, { status: 400 });
    const id = cleanText(item.id, 50).toLowerCase();
    const href = validInternalHref(item.href);
    const label = cleanText(item.label, 60);
    if (!/^[a-z0-9-]{1,50}$/.test(id) || !href || !label) return Response.json({ error: `Data menu urutan ${i + 1} tidak valid.` }, { status: 400 });
    if (seenIds.has(id)) return Response.json({ error: `ID menu '${id}' muncul lebih dari sekali.` }, { status: 400 });
    seenIds.add(id);
    items.push({ id, label, href, icon: cleanText(item.icon, 50), sort_order: i, enabled: item.enabled ?? true, updated_at: new Date().toISOString() });
  }
  if (!Array.isArray(body.expectedSnapshot)) return Response.json({ error: 'Snapshot navigasi tidak tersedia. Muat ulang menu.' }, { status: 409 });
  const expectedSnapshot = body.expectedSnapshot;
  if (expectedSnapshot.some((row: any) => !row || typeof row.id !== 'string')) return Response.json({ error: 'Snapshot navigasi tidak valid. Muat ulang menu.' }, { status: 409 });
  const keep = new Set(items.map((item) => item.id));
  const removed = expectedSnapshot.filter((row: any) => !keep.has(row.id)).map((row: any) => row.id);
  if (removed.length && body.confirmDelete !== true) {
    return Response.json({ error: `Ada ${removed.length} menu yang akan dihapus. Konfirmasi diperlukan.`, removed }, { status: 409 });
  }
  const { error: replaceError } = await db.rpc('replace_tkj_cms_navigation', {
    p_items: items,
    p_allow_delete: body.confirmDelete === true,
    p_expected_snapshot: expectedSnapshot,
  });
  if (replaceError) {
    if (replaceError.code === '22023' || replaceError.code === '40001') return Response.json({ error: 'Navigasi berubah sejak data dimuat atau payload ditolak. Muat ulang data dan ulangi konfirmasi.' }, { status: 409 });
    return Response.json({ error: 'Navigasi gagal disimpan secara atomik.' }, { status: 500 });
  }
  await purgePublicSiteCache();
  return Response.json({ ok: true, data: items });
};
