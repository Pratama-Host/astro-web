import type { APIRoute } from 'astro';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import { cleanText, isHexColor, isPlainRecord, isValidSiteSettingsUrls, readRequestBytes, validInternalHref } from '../../../lib/cms-admin';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getSettings } from '../../../lib/data';

export const prerender = false;

const ALLOWED = new Set([
  'namaKelas', 'jurusan', 'namaSekolah', 'tahunAjaran', 'motto', 'deskripsi', 'sloganHero',
  'ogImage', 'sosmed', 'visi', 'misi', 'stats', 'prestasi', 'waliKelas',
  'masdo', 'tkj', 'hero', 'footer', 'appearance', 'media',
]);


export const GET: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const { data, error } = await db.from('site_settings').select('updated_at').eq('key', 'site').maybeSingle();
  if (error) return Response.json({ error: 'Konten situs gagal dibaca.' }, { status: 500 });
  // Admin menerima data efektif yang sama dengan halaman publik, termasuk fallback G.json.
  return Response.json({ data: await getSettings(), updated_at: data?.updated_at || null }, { headers: { 'Cache-Control': 'no-store' } });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const bodyBytes = await readRequestBytes(request, 128 * 1024);
  if (bodyBytes.tooLarge || !bodyBytes.bytes) return Response.json({ error: 'Permintaan konten maksimum 128 KB.' }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bodyBytes.bytes)); }
  catch { return Response.json({ error: 'JSON tidak valid.' }, { status: 400 }); }
  if (!isPlainRecord(body)) return Response.json({ error: 'Format konten tidak valid.' }, { status: 400 });

  const { data: currentRow, error: readError } = await db.from('site_settings').select('value').eq('key', 'site').maybeSingle();
  if (readError) return Response.json({ error: 'Konten saat ini gagal dibaca.' }, { status: 500 });
  const current = isPlainRecord(currentRow?.value) ? currentRow.value : {};
  const next: Record<string, unknown> = { ...current };

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED.has(key)) continue;
    if (typeof value === 'string') next[key] = cleanText(value, key === 'deskripsi' || key === 'sloganHero' ? 8000 : 2000);
    else if (Array.isArray(value) || isPlainRecord(value)) {
      if (key === 'misi' && (!Array.isArray(value) || value.length > 30)) return Response.json({ error: 'Misi harus berupa daftar maksimal 30 item.' }, { status: 400 });
      if (key === 'stats' || key === 'prestasi') {
        if (!Array.isArray(value) || value.length > 100) return Response.json({ error: `${key} harus berupa daftar maksimal 100 item.` }, { status: 400 });
      }
      if (key === 'hero' && isPlainRecord(value)) {
        for (const hrefKey of ['primaryHref', 'secondaryHref']) {
          const href = value[hrefKey];
          if (href !== undefined && href !== null && String(href).trim() !== '' && (typeof href !== 'string' || !validInternalHref(href))) {
            return Response.json({ error: `Tautan ${hrefKey} harus menuju halaman website yang tersedia.` }, { status: 400 });
          }
        }
      }
      if (key === 'appearance' && isPlainRecord(value)) {
        if (value.theme !== undefined && !['dark', 'light', 'blue'].includes(String(value.theme))) return Response.json({ error: 'Tema tidak dikenal.' }, { status: 400 });
        if (value.accent_color !== undefined && !isHexColor(value.accent_color)) return Response.json({ error: 'Warna aksen harus berformat #RRGGBB.' }, { status: 400 });
        if (value.background_color !== undefined && !isHexColor(value.background_color)) return Response.json({ error: 'Warna latar harus berformat #RRGGBB.' }, { status: 400 });
        if (value.palettes !== undefined) {
          if (!isPlainRecord(value.palettes)) return Response.json({ error: 'Palet tema tidak valid.' }, { status: 400 });
          for (const [theme, palette] of Object.entries(value.palettes)) {
            if (!['dark', 'light', 'blue'].includes(theme) || !isPlainRecord(palette)) return Response.json({ error: 'Palet hanya boleh berisi tema dark, light, dan blue.' }, { status: 400 });
            if (palette.accent_color !== undefined && !isHexColor(palette.accent_color)) return Response.json({ error: `Warna aksen tema ${theme} harus berformat #RRGGBB.` }, { status: 400 });
            if (palette.background_color !== undefined && !isHexColor(palette.background_color)) return Response.json({ error: `Warna latar tema ${theme} harus berformat #RRGGBB.` }, { status: 400 });
          }
        }
      }
      if (key === 'media' && isPlainRecord(value) && value.audio_volume !== undefined) {
        const volume = Number(value.audio_volume);
        if (!Number.isFinite(volume) || volume < 0 || volume > 1) return Response.json({ error: 'Volume audio harus berada pada rentang 0 sampai 1.' }, { status: 400 });
      }
      if (key === 'footer' && isPlainRecord(value) && value.links !== undefined) {
        if (!Array.isArray(value.links) || value.links.length > 20 || value.links.some((link: any) => !isPlainRecord(link) || !cleanText(link.label, 60) || !validInternalHref(link.href))) {
          return Response.json({ error: 'Daftar tautan footer tidak valid.' }, { status: 400 });
        }
      }
      next[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) next[key] = value;
    else return Response.json({ error: `Tipe data ${key} tidak didukung.` }, { status: 400 });
  }

  // Hanya field yang dikirim request yang divalidasi. Data warisan yang tidak disentuh
  // tidak boleh menghalangi penyimpanan field lain di tab Konten.
  const touched = Object.fromEntries(
    Object.entries(next).filter(([key]) =>
      Object.prototype.hasOwnProperty.call(body, key),
    ),
  );

  if (!isValidSiteSettingsUrls(touched)) {
    return Response.json({ error: 'Tautan sosial harus HTTP/HTTPS; referensi media harus HTTP/HTTPS atau storage:// dengan path yang valid.' }, { status: 400 });
  }

  if (JSON.stringify(next).length > 100_000) return Response.json({ error: 'Pengaturan situs melebihi batas 100 KB.' }, { status: 413 });
  const { data: saved, error } = await db.rpc('save_tkj_cms_site_settings', { p_value: next });
  if (error) return Response.json({ error: 'Konten gagal disimpan secara konsisten. Pastikan migration hardening sudah dijalankan.', detail: error.message }, { status: 500 });
  return Response.json({ ok: true, data: next, updated_at: saved?.updated_at || new Date().toISOString(), revision_version: saved?.revision_version }, { headers: { 'Cache-Control': 'no-store' } });
};
