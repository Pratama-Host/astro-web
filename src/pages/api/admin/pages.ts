import type { APIRoute } from 'astro';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import { cleanText, isPlainRecord, isValidOptionalMediaRef, readRequestBytes, validMediaRef } from '../../../lib/cms-admin';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { DEVELOPER_DEFAULTS } from '../../../data/developer-defaults';
import { DEVELOPER_LEGACY_STORIES, DEVELOPER_LEGACY_TIMELINE } from '../../../data/developer-legacy-stories';

export const prerender = false;
const ALLOWED_SLUGS = new Set(['/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang']);

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const { data, error } = await db.from('site_pages').select('*').order('slug');
  if (error) return Response.json({ error: 'Metadata halaman gagal dibaca. Pastikan supabase/migrations/20261106000100_baseline.sql sudah dijalankan.' }, { status: 500 });
  const pages = [...(data || [])];
  const existingIndex = pages.findIndex((page) => page.slug === '/pengembang');
  const fallbackDeveloper = {
    ...DEVELOPER_DEFAULTS,
    stories: DEVELOPER_LEGACY_STORIES,
    legacyTimeline: DEVELOPER_LEGACY_TIMELINE,
  };
  if (existingIndex >= 0) {
    const current = pages[existingIndex];
    const currentContent = isPlainRecord(current.content) ? current.content : {};
    const currentDeveloper = isPlainRecord(currentContent.developer) ? currentContent.developer : {};
    const currentProfile = isPlainRecord(currentDeveloper.profile) ? currentDeveloper.profile : {};
    const currentTheme = isPlainRecord(currentDeveloper.theme) ? currentDeveloper.theme : {};
    const currentThemeColors = isPlainRecord(currentTheme.colors) ? currentTheme.colors : {};
    const mergedDeveloper = { ...fallbackDeveloper, ...currentDeveloper,
      profile: { ...DEVELOPER_DEFAULTS.profile, ...currentProfile },
      theme: { ...DEVELOPER_DEFAULTS.theme, ...currentTheme, colors: { ...DEVELOPER_DEFAULTS.theme.colors, ...currentThemeColors } },
      stories: Array.isArray(currentDeveloper.stories) && currentDeveloper.stories.length ? currentDeveloper.stories : DEVELOPER_LEGACY_STORIES,
      legacyTimeline: Array.isArray(currentDeveloper.legacyTimeline) && currentDeveloper.legacyTimeline.length ? currentDeveloper.legacyTimeline : DEVELOPER_LEGACY_TIMELINE,
    };
    pages[existingIndex] = { ...current, content: { ...currentContent, developer: mergedDeveloper } };
  } else {
    pages.push({ slug: '/pengembang', title: 'Portofolio Pengembang — Alfredo Pratama', description: 'Profil, karya, perjalanan belajar, prinsip, dan catatan pengembang.', og_image: null, noindex: false, content: { developer: fallbackDeveloper } });
  }
  return Response.json({ data: pages }, { headers: { 'Cache-Control': 'no-store' } });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });

  const bodyBytes = await readRequestBytes(request, 128 * 1024);
  if (bodyBytes.tooLarge || !bodyBytes.bytes) return Response.json({ error: 'Permintaan metadata maksimum 128 KB.' }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bodyBytes.bytes)); }
  catch { return Response.json({ error: 'JSON tidak valid.' }, { status: 400 }); }
  if (!isPlainRecord(body)) return Response.json({ error: 'Format metadata tidak valid.' }, { status: 400 });

  const slug = cleanText(body.slug, 100);
  if (!ALLOWED_SLUGS.has(slug)) return Response.json({ error: 'Halaman tidak dikenali.' }, { status: 400 });
  if (body.content !== undefined && !isPlainRecord(body.content)) return Response.json({ error: 'Konten halaman harus berupa JSON object.' }, { status: 400 });
  if (body.noindex !== undefined && typeof body.noindex !== 'boolean') return Response.json({ error: 'Field noindex harus berupa boolean.' }, { status: 400 });
  for (const key of ['title', 'description', 'og_image'] as const) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== 'string') {
      return Response.json({ error: `Field ${key} harus berupa teks.` }, { status: 400 });
    }
  }

  const rawOgImage = cleanText(body.og_image, 1000);
  if (!isValidOptionalMediaRef(rawOgImage)) {
    return Response.json({ error: 'og_image harus berupa URL HTTP/HTTPS atau referensi storage:// yang valid.' }, { status: 400 });
  }

  let content = body.content;
  if (content === undefined) {
    const { data: current, error: readError } = await db.from('site_pages').select('content').eq('slug', slug).maybeSingle();
    if (readError) return Response.json({ error: 'Konten halaman sebelumnya gagal dibaca.' }, { status: 500 });
    content = current?.content && isPlainRecord(current.content) ? current.content : {};
  }
  if (JSON.stringify(content).length > 100_000) return Response.json({ error: 'Konten halaman maksimum 100 KB.' }, { status: 413 });

  const { data, error } = await db.rpc('save_tkj_cms_page', {
    p_slug: slug,
    p_title: cleanText(body.title, 180) || null,
    p_description: cleanText(body.description, 320) || null,
    p_og_image: rawOgImage ? validMediaRef(rawOgImage) : null,
    p_noindex: body.noindex === true,
    p_content: content,
  });
  if (error) return Response.json({ error: 'Metadata halaman gagal disimpan secara konsisten. Pastikan supabase/migrations/20261106000100_baseline.sql sudah diterapkan.', detail: error.message }, { status: 500 });
  return Response.json({ ok: true, data: data?.data || data, revision_version: data?.revision_version }, { headers: { 'Cache-Control': 'no-store' } });
};
