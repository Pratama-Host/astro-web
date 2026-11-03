import type { APIRoute } from 'astro';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import { cleanText } from '../../../lib/cms-admin';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;
export const GET: APIRoute = async ({ request, url }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 25));
  const offset = Math.max(0, Math.min(100_000, Number(url.searchParams.get('offset')) || 0));
  const entity = cleanText(url.searchParams.get('entity'), 60);
  const action = cleanText(url.searchParams.get('action'), 60);
  const q = cleanText(url.searchParams.get('q'), 80).replace(/[%,()]/g, ' ').trim();
  let query = db.from('admin_audit_logs').select('id,action,entity,entity_id,summary,created_at', { count: 'exact' }).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + limit - 1);
  if (entity) query = query.eq('entity', entity);
  if (action) query = query.eq('action', action);
  if (q) query = query.ilike('summary', `%${q}%`);
  const { data, error, count } = await query;
  if (error) return Response.json({ error: 'Audit log gagal dibaca. Jalankan migration CMS.' }, { status: 500 });
  return Response.json({ data: data || [], count: count || 0, limit, offset, hasMore: offset + (data?.length || 0) < (count || 0) }, { headers: { 'Cache-Control': 'no-store' } });
};
