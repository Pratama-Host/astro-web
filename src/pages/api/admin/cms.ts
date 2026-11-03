import type { APIRoute } from 'astro';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import { getSupabaseAdmin, getStorageBucket } from '../../../lib/supabase';

export const prerender = false;

const PAGE_SIZE = 1000;
const MAX_MEDIA_ROWS = 100_000;
const MAX_STORAGE_SCAN = 10_000;

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });

  const [members, gallery, teachers, skills, pages, mediaCount, navigation, sections, logs] = await Promise.all([
    db.from('anggota').select('nis', { count: 'exact', head: true }),
    db.from('galeri').select('id', { count: 'exact', head: true }),
    db.from('guru').select('nama', { count: 'exact', head: true }),
    db.from('skills').select('nama', { count: 'exact', head: true }),
    db.from('site_pages').select('slug', { count: 'exact', head: true }),
    db.from('media_assets').select('object_path', { count: 'exact', head: true }),
    db.from('site_navigation').select('id', { count: 'exact', head: true }),
    db.from('site_sections').select('id', { count: 'exact', head: true }),
    db.from('admin_audit_logs').select('id,action,entity,entity_id,summary,created_at').order('created_at', { ascending: false }).limit(12),
  ]);

  const requiredErrors = [members.error, gallery.error, teachers.error, skills.error, pages.error, navigation.error, sections.error].filter(Boolean);
  if (requiredErrors.length) {
    return Response.json({ error: 'Schema CMS belum lengkap. Jalankan migrasi CMS pada project Supabase yang digunakan website.' }, { status: 503 });
  }

  const warnings: string[] = [];
  const mediaByPath = new Map<string, number>();
  let mediaIndexReadFailed = Boolean(mediaCount.error);
  let mediaIndexTruncated = false;
  for (let offset = 0; offset < MAX_MEDIA_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await db.from('media_assets').select('object_path,size_bytes')
      .order('object_path', { ascending: true }).range(offset, offset + PAGE_SIZE - 1);
    if (error) { mediaIndexReadFailed = true; break; }
    for (const row of data || []) mediaByPath.set(row.object_path, Number(row.size_bytes || 0));
    if (!data || data.length < PAGE_SIZE) break;
    if (offset + PAGE_SIZE >= MAX_MEDIA_ROWS) mediaIndexTruncated = true;
  }

  let storageReadFailed = false;
  let storageScanTruncated = false;
  let scannedStorageObjects = 0;
  let scannedStorageEntries = 0;
  const storage = db.storage.from(getStorageBucket());
  const scanStorage = async (prefix = '', depth = 0): Promise<void> => {
    if (depth > 4 || scannedStorageObjects >= MAX_STORAGE_SCAN || scannedStorageEntries >= MAX_STORAGE_SCAN) {
      storageScanTruncated = true;
      return;
    }
    for (let offset = 0; offset < MAX_STORAGE_SCAN && scannedStorageObjects < MAX_STORAGE_SCAN; offset += PAGE_SIZE) {
      const { data, error } = await storage.list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error || !data) { storageReadFailed = true; return; }
      for (const item of data) {
        scannedStorageEntries++;
        if (scannedStorageEntries > MAX_STORAGE_SCAN) { storageScanTruncated = true; break; }
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (!item.id || !item.metadata) {
          await scanStorage(path, depth + 1);
          continue;
        }
        if (path.split('/').includes('_thumbnails')) continue;
        scannedStorageObjects++;
        if (!mediaByPath.has(path)) mediaByPath.set(path, Number(item.metadata.size || 0));
        if (scannedStorageObjects >= MAX_STORAGE_SCAN) {
          storageScanTruncated = true;
          break;
        }
      }
      if (data.length < PAGE_SIZE) break;
      if (offset + PAGE_SIZE >= MAX_STORAGE_SCAN) storageScanTruncated = true;
    }
  };
  await scanStorage();

  if (mediaIndexReadFailed) warnings.push('Indeks media gagal dibaca seluruhnya.');
  if (mediaIndexTruncated) warnings.push(`Indeks media dibatasi ${MAX_MEDIA_ROWS.toLocaleString('id-ID')} baris.`);
  if (storageReadFailed) warnings.push('Sebagian folder Storage gagal dibaca.');
  if (storageScanTruncated) warnings.push(`Pemindaian Storage dibatasi ${MAX_STORAGE_SCAN.toLocaleString('id-ID')} objek.`);
  if (logs.error) warnings.push('Aktivitas terbaru gagal dibaca.');

  const totalBytes = [...mediaByPath.values()].reduce((sum, bytes) => sum + bytes, 0);
  const mediaFiles = mediaByPath.size || mediaCount.count || 0;
  const storageScanComplete = !mediaIndexReadFailed && !mediaIndexTruncated && !storageReadFailed && !storageScanTruncated;

  return Response.json({
    ok: true,
    status: 'connected',
    counts: {
      members: members.count || 0,
      gallery: gallery.count || 0,
      teachers: teachers.count || 0,
      skills: skills.count || 0,
      pages: pages.count || 0,
      media: mediaFiles,
      navigation: navigation.count || 0,
      sections: sections.count || 0,
      content: (pages.count || 0) + (teachers.count || 0) + (skills.count || 0),
    },
    media: { files: mediaFiles, bytes: totalBytes, storageScanComplete },
    activities: logs.data || [],
    warnings,
  }, { headers: { 'Cache-Control': 'no-store' } });
};
