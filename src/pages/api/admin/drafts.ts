import type { APIRoute } from 'astro';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import { cleanText, isPlainRecord, isValidOptionalMediaRef, logCmsAction, readRequestBytes, validMediaRef } from '../../../lib/cms-admin';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;
const ALLOWED_SLUGS = new Set(['/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang']);
const MAX_DRAFT_BODY_BYTES = 128 * 1024;

async function readJson(request: Request, maxBytes = MAX_DRAFT_BODY_BYTES): Promise<{ body: unknown | null; error: string | null; tooLarge: boolean }> {
  const result = await readRequestBytes(request, maxBytes);
  if (result.tooLarge || !result.bytes) return { body: null, error: null, tooLarge: true };
  try { return { body: JSON.parse(new TextDecoder().decode(result.bytes)), error: null, tooLarge: false }; }
  catch { return { body: null, error: 'JSON tidak valid.', tooLarge: false }; }
}

export const GET: APIRoute = async ({ request, url }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const slug = cleanText(url.searchParams.get('slug'), 100);
  if (!ALLOWED_SLUGS.has(slug)) return Response.json({ error: 'Halaman tidak dikenali.' }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const { data, error } = await db.from('site_page_drafts').select('*').eq('slug', slug).maybeSingle();
  if (error) return Response.json({ error: 'Draft belum tersedia. Jalankan supabase/migrations/20261106000100_baseline.sql.' }, { status: 503 });
  return Response.json({ data: data || null }, { headers: { 'Cache-Control': 'no-store' } });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const parsed = await readJson(request);
  if (parsed.tooLarge) return Response.json({ error: 'Ukuran draft maksimum 128 KB.' }, { status: 413 });
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
  if (!isPlainRecord(parsed.body)) return Response.json({ error: 'Format draft tidak valid.' }, { status: 400 });
  const body = parsed.body;

  const slug = cleanText(body.slug, 100);
  if (!ALLOWED_SLUGS.has(slug)) return Response.json({ error: 'Halaman tidak dikenali.' }, { status: 400 });
  if (!isPlainRecord(body.content)) return Response.json({ error: 'Konten draft harus berupa JSON object.' }, { status: 400 });
  if (JSON.stringify(body.content).length > 100_000) return Response.json({ error: 'Konten draft melebihi batas 100 KB.' }, { status: 413 });
  for (const key of ['title', 'description', 'og_image'] as const) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== 'string') {
      return Response.json({ error: `Field ${key} harus berupa teks.` }, { status: 400 });
    }
  }
  if (body.noindex !== undefined && typeof body.noindex !== 'boolean') {
    return Response.json({ error: 'Field noindex harus berupa boolean.' }, { status: 400 });
  }

  const rawOgImage = cleanText(body.og_image, 1000);
  if (!isValidOptionalMediaRef(rawOgImage)) return Response.json({ error: 'OG image harus URL HTTP/HTTPS atau storage:// yang valid.' }, { status: 400 });
  const seo = {
    title: cleanText(body.title, 180) || null,
    description: cleanText(body.description, 320) || null,
    og_image: rawOgImage ? validMediaRef(rawOgImage) : null,
    noindex: body.noindex === true,
  };
  const now = new Date().toISOString();
  const { data, error } = await db.from('site_page_drafts').upsert({ slug, ...seo, content: body.content, updated_at: now }, { onConflict: 'slug' }).select().single();
  if (error) return Response.json({ error: 'Draft gagal disimpan. Pastikan supabase/migrations/20261106000100_baseline.sql sudah diterapkan.' }, { status: 500 });
  await logCmsAction(db, 'save-draft', 'site_page_drafts', slug, `Draft ${slug} disimpan`);
  return Response.json({ ok: true, data, message: 'Draft tersimpan. Halaman publik belum berubah.' }, { headers: { 'Cache-Control': 'no-store' } });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const parsed = await readJson(request, 8 * 1024);
  if (parsed.tooLarge) return Response.json({ error: 'Permintaan terlalu besar.' }, { status: 413 });
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
  if (!isPlainRecord(parsed.body)) return Response.json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
  const body = parsed.body;
  const slug = cleanText(body.slug, 100);
  if (!ALLOWED_SLUGS.has(slug)) return Response.json({ error: 'Halaman tidak dikenali.' }, { status: 400 });

  if (body.action === 'discard') {
    const { error } = await db.from('site_page_drafts').delete().eq('slug', slug);
    if (error) return Response.json({ error: 'Draft gagal dibuang.' }, { status: 500 });
    await logCmsAction(db, 'discard-draft', 'site_page_drafts', slug, `Draft ${slug} dibuang`);
    return Response.json({ ok: true, message: 'Draft dibuang.' }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (body.action !== 'publish') return Response.json({ error: 'Aksi tidak dikenal.' }, { status: 400 });
  const { data, error } = await db.rpc('publish_tkj_cms_draft', { p_slug: slug });
  if (error) {
    const status = error.code === 'P0002' ? 404 : error.code === '22023' ? 400 : 500;
    return Response.json({ error: status === 404 ? 'Draft untuk halaman ini tidak ditemukan.' : 'Publikasi gagal; draft dan halaman publik tidak diubah.', detail: error.message }, { status });
  }
  return Response.json({ ok: true, data, message: 'Draft berhasil dipublikasikan dan snapshot riwayat dibuat dalam satu transaksi.' }, { headers: { 'Cache-Control': 'no-store' } });
};
