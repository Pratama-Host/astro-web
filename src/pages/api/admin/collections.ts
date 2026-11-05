import type { APIRoute } from 'astro';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import { cleanText, purgePublicSiteCache, readJsonRequest, isPlainRecord } from '../../../lib/cms-admin';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;
type Kind = 'guru' | 'skills';
const tableFor = (kind: Kind) => kind === 'guru' ? 'guru' : 'skills';

export const GET: APIRoute = async ({ request, url }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const kind = url.searchParams.get('type') as Kind;
  if (!['guru', 'skills'].includes(kind)) return Response.json({ error: 'Jenis koleksi tidak dikenal.' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const { data, error } = await db.from(tableFor(kind)).select('*').order('urutan');
  if (error) return Response.json({ error: 'Koleksi gagal dibaca.' }, { status: 500 });
  return Response.json({ data: data || [], snapshot: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
};

export const PUT: APIRoute = async ({ request, url }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const kind = url.searchParams.get('type') as Kind;
  if (!['guru', 'skills'].includes(kind)) return Response.json({ error: 'Jenis koleksi tidak dikenal.' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const parsedBody = await readJsonRequest(request, 262144);
  if (parsedBody.error === 'too_large') return Response.json({ error: 'Ukuran JSON melebihi batas yang diizinkan.' }, { status: 413 });
  if (parsedBody.error || !isPlainRecord(parsedBody.data)) return Response.json({ error: 'JSON tidak valid.' }, { status: 400 });
  const body = parsedBody.data as any;
  if (!Array.isArray(body?.items) || body.items.length > 100 || body.items.some((item: unknown) => !isPlainRecord(item))) return Response.json({ error: 'Data koleksi harus berupa daftar maksimal 100 object.' }, { status: 400 });
  const isGuru = kind === 'guru';
  if (isGuru && body.items.some((item: any) => item.expertise !== undefined && (
    !Array.isArray(item.expertise) ||
    item.expertise.length > 20 ||
    item.expertise.some((entry: unknown) =>
      !isPlainRecord(entry) ||
      typeof entry.label !== 'string' ||
      !cleanText(entry.label, 160) ||
      typeof entry.level !== 'number' ||
      !Number.isFinite(entry.level) ||
      entry.level < 0 ||
      entry.level > 100
    )
  ))) return Response.json({ error: 'Expertise guru harus berupa daftar maksimal 20 objek label/level dengan level 0–100.' }, { status: 400 });
  if (!isGuru && body.items.some((item: any) => item.level !== undefined && (typeof item.level !== 'number' && !(typeof item.level === 'string' && item.level.trim() !== '') || !Number.isFinite(Number(item.level))))) return Response.json({ error: 'Level keahlian harus berupa angka yang valid.' }, { status: 400 });
  const normalized = body.items.map((item: any, index: number) => isGuru ? ({
    nama: cleanText(item.nama, 160), mapel: cleanText(item.mapel, 180), peran: cleanText(item.peran, 180),
    quote: cleanText(item.quote, 1000), expertise: Array.isArray(item.expertise) ? item.expertise.slice(0, 20).map((entry: Record<string, unknown>) => ({ ...entry, label: cleanText(entry.label, 160) })) : [], urutan: index,
    updated_at: new Date().toISOString(),
  }) : ({
    nama: cleanText(item.nama, 160), level: Math.round(Math.max(0, Math.min(100, Number(item.level) || 0))), icon: cleanText(item.icon, 80),
    deskripsi: cleanText(item.deskripsi ?? item.desc, 1000), urutan: index, updated_at: new Date().toISOString(),
  }));
  if (normalized.some((item: any) => !item.nama)) return Response.json({ error: 'Setiap item wajib memiliki nama.' }, { status: 400 });
  const uniqueNames = new Set(normalized.map((item: any) => item.nama));
  if (uniqueNames.size !== normalized.length) return Response.json({ error: 'Nama item koleksi tidak boleh duplikat.' }, { status: 400 });
  if (!Array.isArray(body.expectedSnapshot)) return Response.json({ error: 'Snapshot data awal tidak tersedia. Muat ulang koleksi.' }, { status: 409 });
  const expectedSnapshot = body.expectedSnapshot;
  const expectedNames = expectedSnapshot.map((row: any) => row?.nama).filter((name: unknown): name is string => typeof name === 'string');
  if (expectedNames.length !== expectedSnapshot.length) return Response.json({ error: 'Snapshot data awal tidak valid. Muat ulang koleksi.' }, { status: 409 });
  const keep = new Set(normalized.map((item: any) => item.nama));
  const removed = expectedSnapshot.filter((row: any) => !keep.has(row.nama)).map((row: any) => row.nama);
  if (removed.length && body.confirmReplace !== true) {
    return Response.json({ error: `Penyimpanan ini akan menghapus ${removed.length} item lama. Konfirmasi penggantian diperlukan.`, removed }, { status: 409 });
  }

  const { error: replaceError } = await db.rpc('replace_tkj_cms_collection', {
    p_kind: kind,
    p_items: normalized,
    p_allow_delete: body.confirmReplace === true,
    p_expected_snapshot: expectedSnapshot,
  });
  if (replaceError) {
    if (replaceError.code === '22023' || replaceError.code === '40001') return Response.json({ error: 'Koleksi berubah sejak data dimuat atau payload ditolak. Muat ulang data dan ulangi konfirmasi.' }, { status: 409 });
    return Response.json({ error: 'Koleksi gagal disimpan secara atomik.' }, { status: 500 });
  }
  await purgePublicSiteCache();
  return Response.json({ ok: true, data: normalized });
};
