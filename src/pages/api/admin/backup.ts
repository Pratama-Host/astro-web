import type { APIRoute } from 'astro';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import {
  isPlainRecord,
  isValidOptionalMediaRef,
  isValidSiteSettingsUrls,
  isValidSocialLinks,
  readRequestBytes,
  validInternalHref,
  validPublicUrl,
} from '../../../lib/cms-admin';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const MAX_ROWS_PER_TABLE = 100_000;
const TABLES = [
  'anggota', 'galeri', 'guru', 'skills', 'site_pages', 'site_page_drafts',
  'site_navigation', 'site_sections', 'media_assets', 'content_revisions', 'admin_audit_logs',
] as const;
function isSafeObjectPath(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 500) return false;
  const parts = value.split('/');
  return !value.startsWith('/') && !value.includes('\\') &&
    !/[\u0000-\u001f\u007f]/.test(value) &&
    !parts.some((part) => !part || part === '.' || part === '..' || part === '_thumbnails');
}

function isSafeThumbnailPath(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 500 || value.startsWith('/') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return false;
  const parts = value.split('/');
  const indexes = parts.flatMap((part, index) => part === '_thumbnails' ? [index] : []);
  return parts.every((part) => part && part !== '.' && part !== '..') &&
    indexes.length === 1 && indexes[0] === parts.length - 2 && /\.webp$/i.test(parts[parts.length - 1]);
}

function validateBackupPayload(body: Record<string, unknown>): string | null {
  if (body.format !== 'tkj-xi9-cms-backup' || body.version !== 1) return 'Format backup tidak dikenali.';
  if (body.confirm !== true) return 'Import memerlukan konfirmasi eksplisit.';

  if (!Array.isArray(body.site_settings) || body.site_settings.length > 1) return 'Bagian site_settings tidak valid.';
  if (body.site_settings.length === 1) {
    const row = body.site_settings[0];
    if (!isPlainRecord(row) || row.key !== 'site' || !isPlainRecord(row.value) || !isValidSiteSettingsUrls(row.value)) {
      return 'Data pengaturan situs tidak valid: periksa URL sosial, OG image, media, dan background.';
    }
  }

  for (const table of TABLES) {
    const rows = body[table];
    // Restore writes one new audit entry, so preserve room below the shared 100k ceiling.
    const rowLimit = table === 'admin_audit_logs' ? MAX_ROWS_PER_TABLE - 1 : MAX_ROWS_PER_TABLE;
    if (!Array.isArray(rows) || rows.length > rowLimit || rows.some((row) => !isPlainRecord(row))) {
      return `Data ${table} tidak valid atau melebihi ${rowLimit.toLocaleString('id-ID')} baris.`;
    }
  }

  const anggota = body.anggota as Record<string, unknown>[];
  if (anggota.some((row) =>
    !isValidSocialLinks(row.social) ||
    !isValidOptionalMediaRef(row.foto_url) ||
    !isValidOptionalMediaRef(row.audio_url) ||
    !isValidOptionalMediaRef(row.foto_audio_url)
  )) return 'Backup anggota mengandung tautan sosial atau referensi media yang tidak valid.';

  const galeri = body.galeri as Record<string, unknown>[];
  if (galeri.some((row) => !isValidOptionalMediaRef(row.src))) return 'Backup galeri mengandung referensi media yang tidak valid.';

  const pages = body.site_pages as Record<string, unknown>[];
  if (pages.some((row) =>
    typeof row.slug !== 'string' ||
    !['/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang'].includes(row.slug) ||
    (row.noindex !== undefined && typeof row.noindex !== 'boolean') ||
    !isValidOptionalMediaRef(row.og_image) ||
    !isPlainRecord(row.content)
  )) return 'Backup site_pages mengandung slug, noindex, OG image, atau konten yang tidak valid.';

  const drafts = body.site_page_drafts as Record<string, unknown>[];
  if (drafts.some((row) =>
    typeof row.slug !== 'string' ||
    !['/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang'].includes(row.slug) ||
    (row.noindex !== undefined && typeof row.noindex !== 'boolean') ||
    !isValidOptionalMediaRef(row.og_image) ||
    !isPlainRecord(row.content) || JSON.stringify(row.content).length > 100_000
  )) return 'Backup site_page_drafts mengandung slug, noindex, OG image, atau konten draft yang tidak valid.';

  const navigation = body.site_navigation as Record<string, unknown>[];
  if (navigation.some((row) => typeof row.id !== 'string' || !validInternalHref(row.href))) {
    return 'Backup site_navigation mengandung ID atau tautan internal yang tidak valid.';
  }

  const media = body.media_assets as Record<string, unknown>[];
  if (media.some((row) => {
    const objectPath = row.object_path;
    if (row.metadata !== undefined && !isPlainRecord(row.metadata)) return true;
    const metadata = isPlainRecord(row.metadata) ? row.metadata : {};
    return !isSafeObjectPath(objectPath) || !validPublicUrl(row.public_url) ||
      (metadata.thumbnail_path !== undefined && !isSafeThumbnailPath(metadata.thumbnail_path)) ||
      (metadata.thumbnail_url !== undefined && !validPublicUrl(metadata.thumbnail_url));
  })) return 'Backup media_assets mengandung object_path, URL, atau thumbnail yang tidak valid.';

  const revisions = body.content_revisions as Record<string, unknown>[];
  if (revisions.some((row) => {
    if (row.page_slug === 'site-settings') return !isPlainRecord(row.content) || !isValidSiteSettingsUrls(row.content);
    if (typeof row.page_slug !== 'string' || !['/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang'].includes(row.page_slug)) return true;
    if (!isPlainRecord(row.content)) return true;
    if (row.seo !== undefined && row.seo !== null && !isPlainRecord(row.seo)) return true;
    if (isPlainRecord(row.seo)) {
      if (row.seo.noindex !== undefined && typeof row.seo.noindex !== 'boolean') return true;
      if (!isValidOptionalMediaRef(row.seo.og_image)) return true;
    }
    return false;
  })) return 'Backup content_revisions mengandung slug, SEO, atau referensi URL yang tidak valid.';

  return null;
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });

  const { data, error } = await db.rpc('export_tkj_cms_backup');
  if (error || !isPlainRecord(data)) {
    return Response.json({ error: 'Ekspor backup gagal. Pastikan supabase/migrations/20261106000100_baseline.sql sudah dijalankan.' }, { status: 503 });
  }

  const serialized = JSON.stringify(data, null, 2);
  const size = new TextEncoder().encode(serialized).byteLength;
  // Sisakan ruang untuk field confirm yang ditambahkan browser sebelum mengirim import.
  if (size > MAX_BACKUP_BYTES - 1024) {
    return Response.json({ error: 'Backup melebihi batas 20 MB. Kurangi arsip log/revisi lama sebelum mengekspor.' }, { status: 413 });
  }

  return new Response(serialized, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="tkj-xi9-cms-${new Date().toISOString().slice(0, 10)}.json"`,
      'Content-Length': String(size),
      'Cache-Control': 'no-store',
    },
  });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });

  const bodyResult = await readRequestBytes(request, MAX_BACKUP_BYTES);
  if (bodyResult.tooLarge || !bodyResult.bytes) return Response.json({ error: 'File backup maksimum 20 MB.' }, { status: 413 });

  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bodyResult.bytes)); }
  catch { return Response.json({ error: 'File backup bukan JSON valid.' }, { status: 400 }); }
  if (!isPlainRecord(body)) return Response.json({ error: 'Format backup tidak valid.' }, { status: 400 });

  const validationError = validateBackupPayload(body);
  if (validationError) return Response.json({ error: validationError }, { status: 400 });

  // Satu panggilan RPC = satu transaksi PostgreSQL. Jika satu upsert gagal, semuanya rollback.
  const { data, error } = await db.rpc('restore_tkj_cms_backup', { p_bundle: body });
  if (error) {
    return Response.json({
      error: 'Pemulihan backup gagal dan seluruh perubahan database dibatalkan.',
      detail: error.message,
    }, { status: 500 });
  }
  return Response.json(data || { ok: true }, { headers: { 'Cache-Control': 'no-store' } });
};
