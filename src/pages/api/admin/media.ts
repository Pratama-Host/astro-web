import type { APIRoute } from 'astro';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import { cleanText, containsAnyReference, logCmsAction, readRequestBytes, readJsonRequest, isPlainRecord } from '../../../lib/cms-admin';
import { inspectMediaFile, isVerifiedWebpThumbnail } from '../../../lib/media-validation';
import { getSupabaseAdmin, getStorageBucket } from '../../../lib/supabase';

export const prerender = false;

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BODY_BYTES = 22 * 1024 * 1024;
const MAX_LISTED_MEDIA = 10_000;
const PAGE_SIZE = 1000;
const ALLOWED_CATEGORIES = new Set(['anggota', 'galeri', 'assets-global', 'background', 'icons', 'documents', 'assets']);
const GLOBAL_TYPES = new Set(['logo', 'alternate_logo', 'favicon', 'audio', 'background', 'og']);
const safeFilename = (name: string) => name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(-120);
const getExtension = (name: string) => name.split('.').pop()?.toLowerCase() || '';

function isSafeObjectPath(path: string): boolean {
  return Boolean(
    path && path.length <= 500 &&
    !path.startsWith('/') && !path.includes('\\') &&
    !/[\u0000-\u001f\u007f]/.test(path) &&
    !path.split('/').some((part) => !part || part === '.' || part === '..') &&
    !path.split('/').includes('_thumbnails')
  );
}

function isSafeThumbnailPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length > 500 || path.startsWith('/') || path.includes('\\') || /[\u0000-\u001f\u007f]/.test(path)) return false;
  const parts = path.split('/');
  const thumbnailIndexes = parts.flatMap((part, index) => part === '_thumbnails' ? [index] : []);
  return parts.every((part) => part && part !== '.' && part !== '..') &&
    thumbnailIndexes.length === 1 && thumbnailIndexes[0] === parts.length - 2 &&
    /\.webp$/i.test(parts[parts.length - 1]);
}

async function readPagedRows(db: any, table: string, columns: string, orderColumn: string, maxRows = 100_000) {
  const rows: any[] = [];
  for (let offset = 0; offset <= maxRows; offset += PAGE_SIZE) {
    const { data, error } = await db.from(table).select(columns)
      .order(orderColumn, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) return { rows: [], error, truncated: false };
    const page = data || [];
    if (rows.length + page.length > maxRows) return { rows: [], error: null, truncated: true };
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { rows, error: null, truncated: false };
  }
  return { rows: [], error: null, truncated: true };
}

export const GET: APIRoute = async ({ request, url }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });

  const indexedResult = await readPagedRows(db, 'media_assets', '*', 'object_path', MAX_LISTED_MEDIA);
  const indexedRows = indexedResult.error ? [] : indexedResult.rows;
  const warnings: string[] = [];
  if (indexedResult.error) warnings.push('Tabel indeks media belum tersedia; daftar ditampilkan langsung dari Supabase Storage.');
  if (indexedResult.truncated) warnings.push(`Indeks media dibatasi ${MAX_LISTED_MEDIA.toLocaleString('id-ID')} item.`);

  const indexedPaths = new Set(indexedRows.map((item) => item.object_path));
  const storage = db.storage.from(getStorageBucket());
  const storageFiles: any[] = [];
  let storageTruncated = false;
  let scannedStorageEntries = 0;
  const walk = async (prefix = '', depth = 0): Promise<void> => {
    if (depth > 4 || storageFiles.length >= MAX_LISTED_MEDIA || scannedStorageEntries >= MAX_LISTED_MEDIA) {
      storageTruncated = true;
      return;
    }
    for (let offset = 0; offset < MAX_LISTED_MEDIA && storageFiles.length < MAX_LISTED_MEDIA; offset += PAGE_SIZE) {
      const { data, error: listError } = await storage.list(prefix, {
        limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' },
      });
      if (listError || !data) {
        if (listError) warnings.push(`Folder Storage '${prefix || '/'}' gagal dibaca.`);
        return;
      }
      for (const item of data) {
        scannedStorageEntries++;
        if (scannedStorageEntries > MAX_LISTED_MEDIA) { storageTruncated = true; break; }
        const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (objectPath.split('/').includes('_thumbnails')) continue;
        if (!item.id || !item.metadata) {
          await walk(objectPath, depth + 1);
          continue;
        }
        if (indexedPaths.has(objectPath)) continue;
        const { data: publicData } = storage.getPublicUrl(objectPath);
        storageFiles.push({
          id: `storage:${objectPath}`, object_path: objectPath, public_url: publicData.publicUrl,
          filename: item.name, title: item.name, alt_text: '',
          category: objectPath.split('/')[0] || 'assets', mime_type: item.metadata.mimetype || 'application/octet-stream',
          size_bytes: item.metadata.size || 0, created_at: item.created_at || item.updated_at || null,
          updated_at: item.updated_at || null, indexed: false,
        });
        if (storageFiles.length >= MAX_LISTED_MEDIA) {
          storageTruncated = true;
          break;
        }
      }
      if (data.length < PAGE_SIZE) break;
    }
  };
  await walk();
  if (storageTruncated) warnings.push(`Daftar Storage dibatasi ${MAX_LISTED_MEDIA.toLocaleString('id-ID')} file.`);

  let results = [
    ...indexedRows.map((item) => ({ ...item, thumbnail_url: item.metadata?.thumbnail_url || null, indexed: true })),
    ...storageFiles,
  ];
  const category = url.searchParams.get('category');
  const search = cleanText(url.searchParams.get('q'), 100).toLowerCase();
  if (category) results = results.filter((item) => item.category === category || (category === 'assets-global' && String(item.category).startsWith('global-')));
  if (search) results = results.filter((item) => `${item.filename} ${item.title || ''} ${item.alt_text || ''}`.toLowerCase().includes(search));
  results.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return Response.json({ data: results, warnings: [...new Set(warnings)], truncated: indexedResult.truncated || storageTruncated }, { headers: { 'Cache-Control': 'no-store' } });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });

  const bodyResult = await readRequestBytes(request, MAX_UPLOAD_BODY_BYTES);
  if (bodyResult.tooLarge || !bodyResult.bytes) return Response.json({ error: 'Ukuran total upload maksimum 22 MB (termasuk thumbnail).' }, { status: 413 });
  let form: FormData;
  try {
    const parsedRequest = new Request(request.url, { method: 'POST', headers: request.headers, body: bodyResult.bytes });
    form = await parsedRequest.formData();
  } catch {
    return Response.json({ error: 'Form upload tidak valid.' }, { status: 400 });
  }

  const file = form.get('file');
  const rawThumbnail = form.get('thumbnail');
  const category = String(form.get('category') || 'assets');
  const globalType = String(form.get('global_type') || '');
  const galleryCaption = cleanText(form.get('caption'), 240);
  const memberNis = cleanText(form.get('member_nis'), 40);
  const replacePath = cleanText(form.get('replace_path'), 500);

  if (replacePath && !isSafeObjectPath(replacePath)) return Response.json({ error: 'Path media untuk penggantian tidak valid.' }, { status: 400 });
  if (!(file instanceof File) || file.size <= 0) return Response.json({ error: 'Pilih file terlebih dahulu.' }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return Response.json({ error: 'Ukuran maksimum file asli adalah 20 MB.' }, { status: 413 });
  if (!ALLOWED_CATEGORIES.has(category)) return Response.json({ error: 'Kategori upload tidak dikenal.' }, { status: 400 });

  const filename = safeFilename(file.name);
  if (!filename || filename === '.' || filename === '..') return Response.json({ error: 'Nama file tidak valid.' }, { status: 400 });
  const inspected = await inspectMediaFile(file);
  if (!inspected) return Response.json({ error: 'Format file tidak didukung atau signature file tidak cocok dengan ekstensi. SVG/HTML/script tidak diizinkan.' }, { status: 415 });

  const pathGlobalType = replacePath.startsWith('assets-global/') ? replacePath.split('/')[1] : '';
  if (replacePath && category === 'assets-global' && globalType && globalType !== pathGlobalType) return Response.json({ error: 'Jenis aset global tidak cocok dengan path file yang diganti.' }, { status: 400 });
  const effectiveGlobalType = pathGlobalType || globalType;
  if (category === 'assets-global' && !GLOBAL_TYPES.has(effectiveGlobalType)) return Response.json({ error: 'Jenis aset global tidak dikenal.' }, { status: 400 });
  if (replacePath) {
    const expectedRoot = category === 'assets-global' ? 'assets-global' : category;
    if (!replacePath.startsWith(`${expectedRoot}/`)) return Response.json({ error: 'File pengganti harus berada pada kategori Storage yang sama.' }, { status: 400 });
    const oldExtension = getExtension(replacePath.split('/').pop() || '');
    if (oldExtension !== inspected.extension) return Response.json({ error: 'Format file pengganti harus memiliki ekstensi yang sama agar referensi tetap konsisten.' }, { status: 400 });
  }

  const needsImage = ['anggota', 'galeri', 'icons', 'background'].includes(category) ||
    (category === 'assets-global' && ['logo', 'alternate_logo', 'favicon', 'background', 'og'].includes(effectiveGlobalType));
  if (needsImage && inspected.kind !== 'image') return Response.json({ error: 'Kategori ini hanya menerima file gambar yang signature-nya valid.' }, { status: 415 });
  if (category === 'assets-global' && effectiveGlobalType === 'audio' && inspected.kind !== 'audio') {
    return Response.json({ error: 'Aset audio harus berupa file audio yang signature-nya valid.' }, { status: 415 });
  }
  if (category === 'documents' && inspected.kind !== 'document') return Response.json({ error: 'Dokumen yang didukung saat ini hanya PDF valid.' }, { status: 415 });
  if (category === 'anggota' && !memberNis && !replacePath) return Response.json({ error: 'NIS anggota diperlukan untuk memasang foto profil.' }, { status: 400 });

  let thumbnail: File | null = null;
  if (rawThumbnail !== null) {
    if (!(rawThumbnail instanceof File) || !(await isVerifiedWebpThumbnail(rawThumbnail))) {
      return Response.json({ error: 'Thumbnail harus berupa WebP valid dengan ukuran maksimum 1,5 MB.' }, { status: 415 });
    }
    if (inspected.kind === 'image' && !['gif'].includes(inspected.extension)) thumbnail = rawThumbnail;
  }

  const prefix = category === 'assets-global' ? `assets-global/${effectiveGlobalType}` : category;
  const objectPath = replacePath || `${prefix}/${Date.now()}-${randomUUID().slice(0, 8)}-${filename}`;
  const storage = db.storage.from(getStorageBucket());

  let existingAsset: any = null;
  if (replacePath) {
    const { data, error } = await db.from('media_assets').select('*').eq('object_path', objectPath).maybeSingle();
    if (error) return Response.json({ error: 'Metadata media yang akan diganti gagal dibaca.' }, { status: 500 });
    existingAsset = data;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadResult = replacePath
    ? await storage.update(objectPath, bytes, { contentType: inspected.mimeType, cacheControl: '0' })
    : await storage.upload(objectPath, bytes, { upsert: false, contentType: inspected.mimeType, cacheControl: '31536000' });
  if (uploadResult.error) return Response.json({ error: 'Upload ke Storage gagal.' }, { status: 400 });

  const publicUrl = storage.getPublicUrl(objectPath).data.publicUrl;
  let thumbnailPath: string | null = null;
  let thumbnailUrl: string | null = null;
  let thumbnailWarning = '';
  if (thumbnail) {
    const parent = objectPath.split('/').slice(0, -1).join('/');
    const leaf = objectPath.split('/').pop() || filename;
    const version = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    thumbnailPath = `${parent ? `${parent}/` : ''}_thumbnails/${leaf}.${version}.webp`;
    const thumbBytes = Buffer.from(await thumbnail.arrayBuffer());
    const thumbResult = await storage.upload(thumbnailPath, thumbBytes, {
      upsert: false, contentType: 'image/webp', cacheControl: '31536000',
    });
    if (thumbResult.error) {
      thumbnailWarning = 'Thumbnail baru gagal disimpan; pratinjau admin akan memakai file asli.';
      thumbnailPath = null;
    } else {
      thumbnailUrl = storage.getPublicUrl(thumbnailPath).data.publicUrl;
    }
  }

  if (category === 'assets-global' && !replacePath) {
    const { error } = await db.rpc('set_tkj_cms_global_asset', {
      p_asset_type: effectiveGlobalType,
      p_public_url: publicUrl,
    });
    if (error) {
      await storage.remove([objectPath, ...(thumbnailPath ? [thumbnailPath] : [])]);
      return Response.json({ error: 'Aset terunggah, tetapi pengaturan global gagal diperbarui secara transaksional. Pastikan supabase/migrations/20261106000100_baseline.sql sudah dijalankan.' }, { status: 500 });
    }
  }

  if (category === 'galeri' && !replacePath) {
    const { data: last, error: lastError } = await db.from('galeri').select('urutan').order('urutan', { ascending: false }).limit(1).maybeSingle();
    if (lastError) {
      await storage.remove([objectPath, ...(thumbnailPath ? [thumbnailPath] : [])]);
      return Response.json({ error: 'Urutan galeri gagal dibaca; file baru dibersihkan dari Storage.' }, { status: 500 });
    }
    const nextOrder = Number(last?.urutan ?? -1) + 1;
    let galleryInsert = await db.from('galeri').insert({
      src: publicUrl, caption: galleryCaption, title: galleryCaption || filename, alt_text: galleryCaption || filename,
      category: 'Kegiatan', urutan: nextOrder, visible: true, updated_at: new Date().toISOString(),
    });
    const missingCmsColumn = Boolean(galleryInsert.error && /column .* does not exist|could not find the .* column|schema cache/i.test(galleryInsert.error.message || ''));
    if (missingCmsColumn) galleryInsert = await db.from('galeri').insert({ src: publicUrl, caption: galleryCaption, urutan: nextOrder });
    if (galleryInsert.error) {
      await storage.remove([objectPath, ...(thumbnailPath ? [thumbnailPath] : [])]);
      return Response.json({ error: 'Baris galeri gagal dibuat; file baru dibersihkan dari Storage. Periksa struktur tabel galeri.' }, { status: 500 });
    }
  }

  if (category === 'anggota' && !replacePath) {
    const { data: updatedMember, error } = await db.from('anggota').update({ foto_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('nis', memberNis).select('nis').maybeSingle();
    if (error || !updatedMember) {
      await storage.remove([objectPath, ...(thumbnailPath ? [thumbnailPath] : [])]);
      return Response.json({ error: 'Foto anggota gagal dipasang (NIS tidak ditemukan atau query gagal); file baru dibersihkan dari Storage.' }, { status: 500 });
    }
  }

  let asset: any;
  let metadataError: any;
  let previousThumbnailPath: string | null = null;
  if (replacePath) {
    if (existingAsset) {
      const nextMetadata = { ...(existingAsset.metadata || {}) };
      previousThumbnailPath = isSafeThumbnailPath(nextMetadata.thumbnail_path) ? nextMetadata.thumbnail_path : null;
      delete nextMetadata.thumbnail_path;
      delete nextMetadata.thumbnail_url;
      if (thumbnailPath && thumbnailUrl) {
        nextMetadata.thumbnail_path = thumbnailPath;
        nextMetadata.thumbnail_url = thumbnailUrl;
      }
      const updated = await db.from('media_assets').update({
        filename, mime_type: inspected.mimeType, size_bytes: file.size,
        metadata: nextMetadata, updated_at: new Date().toISOString(),
      }).eq('object_path', objectPath).select().single();
      asset = updated.data;
      metadataError = updated.error;
    } else {
      const inserted = await db.from('media_assets').insert({
        object_path: objectPath, public_url: publicUrl, filename, title: filename,
        category, mime_type: inspected.mimeType, size_bytes: file.size,
        metadata: { replaced_legacy_storage_object: true, ...(thumbnailPath && thumbnailUrl ? { thumbnail_path: thumbnailPath, thumbnail_url: thumbnailUrl } : {}) },
      }).select().single();
      asset = inserted.data;
      metadataError = inserted.error;
    }
  } else {
    const inserted = await db.from('media_assets').insert({
      object_path: objectPath, public_url: publicUrl, filename, title: filename,
      category, mime_type: inspected.mimeType, size_bytes: file.size,
      metadata: { linked_member_nis: memberNis || null, caption: galleryCaption || null, global_type: effectiveGlobalType || null, ...(thumbnailPath && thumbnailUrl ? { thumbnail_path: thumbnailPath, thumbnail_url: thumbnailUrl } : {}) },
    }).select().single();
    asset = inserted.data;
    metadataError = inserted.error;
  }

  if (metadataError) {
    if (thumbnailPath) await storage.remove([thumbnailPath]);
    return Response.json({ ok: true, warning: 'File tersimpan, tetapi indeks media library belum tersimpan. File asli tetap tersedia; periksa metadata media.', publicUrl, objectPath, category }, { status: 201 });
  }

  if (previousThumbnailPath && previousThumbnailPath !== thumbnailPath) {
    const cleanup = await storage.remove([previousThumbnailPath]);
    if (cleanup.error) thumbnailWarning = [thumbnailWarning, 'Thumbnail lama tidak berhasil dibersihkan dari Storage.'].filter(Boolean).join(' ');
  }
  await logCmsAction(db, replacePath ? 'replace' : 'upload', 'media_assets', asset.id, `Media ${filename} ${replacePath ? 'diganti' : 'diunggah'}`);
  return Response.json({ ok: true, replaced: Boolean(replacePath), publicUrl, objectPath, category, asset, warning: thumbnailWarning || undefined }, { status: 201 });
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const parsedBody = await readJsonRequest(request, 8192);
  if (parsedBody.error === 'too_large') return Response.json({ error: 'Ukuran JSON melebihi batas yang diizinkan.' }, { status: 413 });
  if (parsedBody.error || !isPlainRecord(parsedBody.data)) return Response.json({ error: 'JSON tidak valid.' }, { status: 400 });
  const body = parsedBody.data as any;
  const id = cleanText(body?.id, 80);
  if (!id) return Response.json({ error: 'ID media wajib diisi.' }, { status: 400 });
  const nextCategory = cleanText(body.category, 60) || 'assets';
  if (!ALLOWED_CATEGORIES.has(nextCategory)) return Response.json({ error: 'Kategori media tidak dikenal.' }, { status: 400 });
  const patch = {
    title: cleanText(body.title, 180) || null,
    alt_text: cleanText(body.alt_text, 240) || null,
    category: nextCategory,
    updated_at: new Date().toISOString(),
  };
  let data: any;
  let error: any;
  if (id.startsWith('storage:')) {
    const objectPath = cleanText(body.object_path, 500);
    if (!isSafeObjectPath(objectPath) || id !== `storage:${objectPath}`) return Response.json({ error: 'Path file tidak valid.' }, { status: 400 });
    const { data: publicData } = db.storage.from(getStorageBucket()).getPublicUrl(objectPath);
    const { data: inserted, error: insertError } = await db.from('media_assets').insert({
      object_path: objectPath, public_url: publicData.publicUrl, filename: objectPath.split('/').pop() || 'file',
      ...patch, mime_type: cleanText(body.mime_type, 120) || 'application/octet-stream', size_bytes: Math.max(0, Number(body.size_bytes) || 0),
    }).select().single();
    data = inserted; error = insertError;
  } else {
    const result = await db.from('media_assets').update(patch).eq('id', id).select().single();
    data = result.data; error = result.error;
  }
  if (error) return Response.json({ error: 'Metadata media gagal diperbarui.' }, { status: 500 });
  await logCmsAction(db, 'update', 'media_assets', id, `Metadata media ${data.filename} diperbarui`);
  return Response.json({ ok: true, data });
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Supabase belum tersedia.' }, { status: 503 });
  const parsedBody = await readJsonRequest(request, 8 * 1024);
  if (parsedBody.error === 'too_large') return Response.json({ error: 'Ukuran JSON melebihi batas yang diizinkan.' }, { status: 413 });
  if (parsedBody.error || !isPlainRecord(parsedBody.data)) return Response.json({ error: 'JSON tidak valid.' }, { status: 400 });
  const body = parsedBody.data as any;
  const id = cleanText(body?.id, 80);
  if (!id || body?.confirm !== true) return Response.json({ error: 'Konfirmasi penghapusan wajib diberikan.' }, { status: 400 });

  let asset: any = null;
  if (!id.startsWith('storage:')) {
    const { data, error: readError } = await db.from('media_assets').select('*').eq('id', id).maybeSingle();
    if (readError) return Response.json({ error: 'Metadata media gagal dibaca.' }, { status: 500 });
    asset = data;
  }
  if (!asset && id.startsWith('storage:')) {
    const objectPath = id.slice('storage:'.length);
    if (!isSafeObjectPath(objectPath) || (body.object_path && body.object_path !== objectPath)) {
      return Response.json({ error: 'Path file tidak valid.' }, { status: 400 });
    }
    const { data } = db.storage.from(getStorageBucket()).getPublicUrl(objectPath);
    asset = { id, object_path: objectPath, public_url: data.publicUrl, filename: objectPath.split('/').pop(), metadata: {} };
  }
  if (!asset) return Response.json({ error: 'Media tidak ditemukan.' }, { status: 404 });
  if (!isSafeObjectPath(asset.object_path)) return Response.json({ error: 'Path media pada indeks tidak valid; penghapusan dibatalkan.' }, { status: 409 });

  const [members, gallery, settings, pages, drafts, revisions] = await Promise.all([
    readPagedRows(db, 'anggota', 'nis,foto_url,audio_url,foto_audio_url', 'nis'),
    readPagedRows(db, 'galeri', 'id,src', 'id'),
    db.from('site_settings').select('value').eq('key', 'site').maybeSingle(),
    readPagedRows(db, 'site_pages', 'slug,og_image,content', 'slug'),
    readPagedRows(db, 'site_page_drafts', 'slug,og_image,content', 'slug'),
    readPagedRows(db, 'content_revisions', 'id,page_slug,content,seo', 'id'),
  ]);
  const pagedResults = [members, gallery, pages, drafts, revisions];
  const readFailed = pagedResults.some((result) => result.error || result.truncated) || Boolean(settings.error);
  if (readFailed) return Response.json({ error: 'Semua referensi media belum dapat diperiksa secara lengkap. Penghapusan dibatalkan demi keamanan.' }, { status: 503 });

  const thumbnailPath = isSafeThumbnailPath(asset.metadata?.thumbnail_path)
    ? asset.metadata.thumbnail_path : null;
  const thumbnailUrl = typeof asset.metadata?.thumbnail_url === 'string' ? asset.metadata.thumbnail_url : null;
  const referencesToCheck = [
    asset.public_url, asset.object_path, `storage://${asset.object_path}`,
    ...(thumbnailPath ? [thumbnailPath, `storage://${thumbnailPath}`] : []),
    ...(thumbnailUrl ? [thumbnailUrl] : []),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);
  const referenceSet = new Set(referencesToCheck);
  const references: string[] = [];

  for (const row of members.rows) {
    if ([row.foto_url, row.audio_url, row.foto_audio_url].some((value: unknown) => typeof value === 'string' && referenceSet.has(value))) {
      references.push(`anggota:${row.nis}`);
    }
  }
  for (const row of gallery.rows) if (typeof row.src === 'string' && referenceSet.has(row.src)) references.push(`galeri:${row.id}`);
  if (settings.data?.value && containsAnyReference(settings.data.value, referenceSet)) references.push('site_settings');
  for (const row of pages.rows) {
    if ((typeof row.og_image === 'string' && referenceSet.has(row.og_image)) || containsAnyReference(row.content, referenceSet)) references.push(`site_pages:${row.slug}`);
  }
  for (const row of drafts.rows) {
    if ((typeof row.og_image === 'string' && referenceSet.has(row.og_image)) || containsAnyReference(row.content, referenceSet)) references.push(`site_page_drafts:${row.slug}`);
  }
  for (const row of revisions.rows) {
    if (containsAnyReference(row.content, referenceSet) || containsAnyReference(row.seo, referenceSet)) references.push(`content_revisions:${row.page_slug}#${row.id}`);
  }

  if (references.length) {
    return Response.json({
      error: 'Media masih digunakan oleh konten, draft, atau riwayat versi dan tidak dapat dihapus.',
      references: references.slice(0, 50), referenceCount: references.length,
    }, { status: 409 });
  }

  const pathsToRemove = [...new Set([asset.object_path, thumbnailPath].filter((path): path is string => Boolean(path)))];
  const { error: storageError } = await db.storage.from(getStorageBucket()).remove(pathsToRemove);
  if (storageError) return Response.json({ error: 'File di Storage gagal dihapus.' }, { status: 500 });
  if (!id.startsWith('storage:')) {
    const { error } = await db.from('media_assets').delete().eq('id', id);
    if (error) return Response.json({ error: 'File terhapus dari Storage, tetapi metadata gagal dihapus. Periksa indeks media.' }, { status: 500 });
  }
  await logCmsAction(db, 'delete', 'media_assets', id, `Media ${asset.filename} dihapus`);
  return Response.json({ ok: true });
};
