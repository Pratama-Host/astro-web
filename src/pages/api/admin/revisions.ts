import type { APIRoute } from 'astro';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import { cleanText, readRequestBytes } from '../../../lib/cms-admin';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const slug = cleanText(url.searchParams.get('slug') || 'site-settings', 100);
  const { data, error } = await db.from('content_revisions').select('id,page_slug,version,seo,created_at').eq('page_slug', slug).order('version', { ascending: false }).limit(30);
  if (error) return Response.json({ error: 'Riwayat versi belum tersedia. Jalankan migration CMS.' }, { status: 500 });
  return Response.json({ data: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });

  const bodyBytes = await readRequestBytes(request, 8 * 1024);
  if (bodyBytes.tooLarge || !bodyBytes.bytes) return Response.json({ error: 'Permintaan terlalu besar.' }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bodyBytes.bytes)); }
  catch { return Response.json({ error: 'JSON tidak valid.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
  const payload = body as Record<string, unknown>;
  const id = cleanText(payload.id, 80);
  if (!id || payload.confirm !== true) return Response.json({ error: 'Pemulihan versi memerlukan konfirmasi.' }, { status: 400 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: 'ID versi tidak valid.' }, { status: 400 });

  const { data, error } = await db.rpc('restore_tkj_cms_revision', { p_id: id });
  if (error) {
    const status = error.code === 'P0002' ? 404 : error.code === '22023' ? 400 : 500;
    return Response.json({ error: 'Versi gagal dipulihkan. Perubahan database dibatalkan.', detail: error.message }, { status });
  }
  return Response.json({ ok: true, data, message: 'Versi dipulihkan; keadaan sebelumnya disimpan sebagai snapshot baru.' }, { headers: { 'Cache-Control': 'no-store' } });
};
