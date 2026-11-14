import fallbackData from '../data/G.json';
import { getSupabaseAdmin, getSupabasePublic, getStorageBucket } from './supabase';
import { isAdminRequest } from './admin-auth';
import { PUBLIC_GALLERY_COLUMNS, PUBLIC_MEMBER_COLUMNS, SHOW_MEMBER_NIS, stripPrivateMemberFields } from './public-data-policy';

type JsonRecord = Record<string, any>;

/** Fallback ke data bawaan tetap berjalan, tetapi penyebabnya harus terlihat di log Cloudflare. */
function logDataError(scope: string, error: unknown) {
  console.error(`[data:${scope}] Gagal membaca Supabase, memakai fallback:`, error instanceof Error ? error.message : 'unknown error');
}

function cloneFallback(client?: NonNullable<ReturnType<typeof getSupabaseAdmin>> | null): JsonRecord {
  const copy = JSON.parse(JSON.stringify(fallbackData)) as JsonRecord;
  const resolveFallbackAssets = (value: any): any => {
    if (typeof value === 'string') {
      if (value.startsWith('/assets/')) return null;
      if (value.startsWith('storage://')) {
        if (!client) return null;
        const objectPath = value.slice('storage://'.length);
        return client.storage.from(getStorageBucket()).getPublicUrl(objectPath).data.publicUrl;
      }
      return value;
    }
    if (Array.isArray(value)) return value.map(resolveFallbackAssets);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveFallbackAssets(item)]));
    }
    return value;
  };
  const cleaned = resolveFallbackAssets(copy) as JsonRecord;
  if (Array.isArray(cleaned.namaSiswa)) cleaned.namaSiswa = cleaned.namaSiswa.map(stripPrivateMemberFields);
  if (Array.isArray(cleaned.galeri)) cleaned.galeri = cleaned.galeri.filter((item: JsonRecord) => item?.src);
  return cleaned;
}

function deepMerge(base: any, override: any): any {
  if (Array.isArray(override)) return override;
  if (override === undefined) return base;
  if (override === null || typeof override !== 'object') return override;
  const result = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(override)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(result[key], value)
      : value;
  }
  return result;
}

function resolveStorageReference(value: string | null | undefined, client: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  if (!value) return null;
  if (value.startsWith('/assets/')) return null;
  if (!value.startsWith('storage://')) return value;
  const objectPath = value.slice('storage://'.length);
  const { data } = client.storage.from(getStorageBucket()).getPublicUrl(objectPath);
  return data.publicUrl;
}

function resolveNestedStorageReferences(value: any, client: NonNullable<ReturnType<typeof getSupabaseAdmin>>): any {
  if (Array.isArray(value)) return value.map((item) => resolveNestedStorageReferences(item, client));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveNestedStorageReferences(item, client)]));
  }
  if (typeof value === 'string' && value.startsWith('storage://')) return resolveStorageReference(value, client);
  // `public/assets` has been retired. Never send stale local asset paths back to public pages.
  if (typeof value === 'string' && value.startsWith('/assets/')) return null;
  return value;
}

export function mapMember(row: JsonRecord, client: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  return {
    nama: row.nama,
    ...(SHOW_MEMBER_NIS ? { nis: row.nis } : {}),
    kelas: row.kelas,
    jabatan: row.jabatan || null,
    foto: resolveStorageReference(row.foto_url, client),
    desc: row.deskripsi || '',
    audio: resolveStorageReference(row.audio_url, client),
    namaAudio: row.audio_nama || row.nama,
    fotoAudio: resolveStorageReference(row.foto_audio_url || row.foto_url, client),
    descAudio: row.deskripsi_audio || row.deskripsi || '',
    social: row.social || {},
    skills: row.skills || [],
    visible: row.visible !== false,
    urutan: row.urutan ?? 0,
  };
}

async function readSiteSettings(client: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data, error } = await client.from('site_settings').select('value').eq('key', 'site').maybeSingle();
  if (error) return undefined;
  return (data?.value || {}) as JsonRecord;
}

export async function getSettings(): Promise<JsonRecord> {
  const client = getSupabasePublic();
  const fallback = cloneFallback(client);
  if (!client) return fallback;
  try {
    const stored = await readSiteSettings(client);
    if (stored === undefined) return fallback;
    const resolved = resolveNestedStorageReferences(stored, client);
    return deepMerge(fallback, resolved);
  } catch (error) {
    logDataError('getSettings', error);
    return fallback;
  }
}

function isAuthorizedDraftPreview(request?: Request): boolean {
  if (!request) return false;
  try {
    return new URL(request.url).searchParams.get('previewDraft') === '1' && isAdminRequest(request);
  } catch {
    return false;
  }
}

export async function getPageSEO(pathname: string, request?: Request): Promise<JsonRecord> {
  const fallback: JsonRecord = {};
  const preview = isAuthorizedDraftPreview(request);
  const client = preview ? getSupabaseAdmin() : getSupabasePublic();
  if (!client) return fallback;
  try {
    if (preview) {
      const { data: draft } = await client.from('site_page_drafts').select('title, description, og_image, noindex').eq('slug', pathname).maybeSingle();
      if (draft) {
        const seo = draft as JsonRecord;
        const resolvedImage = resolveStorageReference(seo.og_image, client);
        return { ...seo, og_image: resolvedImage || (String(seo.og_image || '').startsWith('/assets/') ? null : seo.og_image), noindex: true, draft_preview: true };
      }
    }
    const { data, error } = await client.from('site_pages').select('title, description, og_image, noindex').eq('slug', pathname).maybeSingle();
    if (error || !data) return fallback;
    const resolvedImage = resolveStorageReference(data.og_image, client);
    return { ...data, og_image: resolvedImage || (String(data.og_image || '').startsWith('/assets/') ? null : data.og_image) };
  } catch (error) {
    logDataError('getPageSEO', error);
    return fallback;
  }
}

export async function getPageContent(pathname: string, request?: Request): Promise<JsonRecord> {
  const preview = isAuthorizedDraftPreview(request);
  const client = preview ? getSupabaseAdmin() : getSupabasePublic();
  if (!client) return {};
  try {
    if (preview) {
      const { data: draft } = await client.from('site_page_drafts').select('content').eq('slug', pathname).maybeSingle();
      if (draft?.content && typeof draft.content === 'object') return resolveNestedStorageReferences(draft.content, client) || {};
    }
    const { data, error } = await client.from('site_pages').select('content').eq('slug', pathname).maybeSingle();
    if (error || !data?.content || typeof data.content !== 'object') return {};
    return resolveNestedStorageReferences(data.content, client) || {};
  } catch (error) {
    logDataError('getPageContent', error);
    return {};
  }
}

type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  sort_order: number;
  enabled: boolean;
};

const ANNOUNCEMENTS_NAVIGATION: NavigationItem = {
  id: 'pengumuman',
  label: 'Pengumuman',
  href: '/pengumuman',
  icon: 'fa-bullhorn',
  sort_order: 7,
  enabled: true,
};

const DEFAULT_NAVIGATION: NavigationItem[] = [
  { id: 'home', label: 'Home', href: '/', icon: 'fa-house', sort_order: 0, enabled: true },
  { id: 'developer', label: 'Developer', href: '/pengembang', icon: 'fa-code', sort_order: 1, enabled: true },
  { id: 'struktur', label: 'Struktur', href: '/struktur', icon: 'fa-sitemap', sort_order: 2, enabled: true },
  { id: 'anggota', label: 'Anggota', href: '/anggota', icon: 'fa-users', sort_order: 3, enabled: true },
  { id: 'keahlian', label: 'Skills', href: '/keahlian', icon: 'fa-code', sort_order: 4, enabled: true },
  { id: 'galeri', label: 'Galeri', href: '/galeri', icon: 'fa-images', sort_order: 5, enabled: true },
  { id: 'tkj', label: 'TKJ', href: '/tkj', icon: 'fa-network-wired', sort_order: 6, enabled: true },
  ANNOUNCEMENTS_NAVIGATION,
];

/** Pastikan tautan publik pengumuman tersedia, tanpa menimpa menu CMS yang sudah dikonfigurasi. */
export function ensureAnnouncementsNavigation(items: NavigationItem[]): NavigationItem[] {
  const enabled = items.filter((item) => item.enabled !== false);
  const hasAnnouncementsEntry = items.some(
    (item) => item.href === ANNOUNCEMENTS_NAVIGATION.href,
  );

  if (!hasAnnouncementsEntry) {
    const nextOrder = enabled.reduce(
      (max, item) => Math.max(max, Number(item.sort_order) || 0),
      -1,
    ) + 1;
    const safeId = items.some((item) => item.id === ANNOUNCEMENTS_NAVIGATION.id)
      ? 'pengumuman-link'
      : ANNOUNCEMENTS_NAVIGATION.id;
    enabled.push({ ...ANNOUNCEMENTS_NAVIGATION, id: safeId, sort_order: nextOrder });
  }

  return enabled.length ? enabled : DEFAULT_NAVIGATION;
}

export async function getNavigation(): Promise<NavigationItem[]> {
  // SSR dapat memakai client server-side untuk melihat flag enabled=false yang
  // disembunyikan policy publik. Fallback publik tetap tersedia bila service key
  // tidak disetel; query hanya mengambil kolom navigasi yang aman.
  const client = getSupabaseAdmin() ?? getSupabasePublic();
  if (!client) return DEFAULT_NAVIGATION;
  try {
    const { data, error } = await client
      .from('site_navigation')
      .select('id,label,href,icon,sort_order,enabled')
      .order('sort_order', { ascending: true });
    if (error || !data?.length) return DEFAULT_NAVIGATION;
    return ensureAnnouncementsNavigation(data as NavigationItem[]);
  } catch (error) {
    logDataError('getNavigation', error);
    return DEFAULT_NAVIGATION;
  }
}

export async function getSections(pageSlug: string) {
  const client = getSupabasePublic();
  if (!client) return [];
  try {
    const { data, error } = await client.from('site_sections').select('section_key,sort_order,enabled').eq('page_slug', pageSlug).order('sort_order', { ascending: true });
    return error || !data ? [] : data;
  } catch (error) {
    logDataError('getSections', error);
    return [];
  }
}

export function mapGalleryRow(row: JsonRecord, client: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  return {
    id: row.id,
    src: resolveStorageReference(row.src, client),
    caption: row.caption || '',
    title: row.title || row.caption || '',
    description: row.description || '',
    category: row.category || 'Kegiatan',
    taken_at: row.taken_at || null,
    alt_text: row.alt_text || row.caption || 'Foto galeri TKJ XII-9',
    urutan: row.urutan ?? 0,
  };
}

export async function getSiteData(): Promise<JsonRecord> {
  const client = getSupabasePublic();
  const fallback = cloneFallback(client);
  if (!client) return fallback;
  try {
    const [storedSettings, membersResult, galleryResult, teachersResult, skillsResult] = await Promise.all([
      readSiteSettings(client),
      client.from('anggota').select(PUBLIC_MEMBER_COLUMNS).order('urutan', { ascending: true }).order('nama', { ascending: true }),
      client.from('galeri').select(PUBLIC_GALLERY_COLUMNS).order('urutan', { ascending: true }),
      client.from('guru').select('nama, mapel, peran, quote, expertise, urutan').order('urutan', { ascending: true }),
      client.from('skills').select('nama, level, icon, deskripsi, urutan').order('urutan', { ascending: true }),
    ]);
    const resolvedSettings = resolveNestedStorageReferences(storedSettings || {}, client);
    const result: JsonRecord = deepMerge(fallback, resolvedSettings);

    if (!membersResult.error && membersResult.data) {
      const members = membersResult.data.filter((row) => row.visible !== false).map((row) => mapMember(row, client));
      result.namaSiswa = members;
      result.strukturOrg = members.filter((member: JsonRecord) => member.jabatan).map((member: JsonRecord) => ({ nama: member.nama, jabatan: member.jabatan, foto: member.foto, desc: member.desc }));
    }
    if (!galleryResult.error && galleryResult.data) {
      result.galeri = galleryResult.data.filter((row) => row.visible !== false).map((row) => mapGalleryRow(row, client)).filter((item) => item.src);
    }
    if (!teachersResult.error && teachersResult.data) {
      result.guru = teachersResult.data.map((row) => ({ nama: row.nama, mapel: row.mapel, peran: row.peran, quote: row.quote, expertise: row.expertise || [] }));
    }
    if (!skillsResult.error && skillsResult.data) {
      result.skills = skillsResult.data.map((row) => ({ nama: row.nama, level: row.level, icon: row.icon, desc: row.deskripsi }));
    }
    return result;
  } catch (error) {
    logDataError('getSiteData', error);
    return fallback;
  }
}

export async function getPageContext(pathname: string, request?: Request) {
  const [site, sections, content] = await Promise.all([
    getSiteData(),
    getSections(pathname),
    getPageContent(pathname, request),
  ]);
  return { site, sections, content, draftPreview: isAuthorizedDraftPreview(request) };
}
