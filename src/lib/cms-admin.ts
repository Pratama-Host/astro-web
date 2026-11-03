import type { SupabaseClient } from '@supabase/supabase-js';

export async function logCmsAction(
  client: SupabaseClient,
  action: string,
  entity: string,
  entityId: string | null,
  summary: string,
) {
  try {
    await client.from('admin_audit_logs').insert({ action, entity, entity_id: entityId, summary });
  } catch {
    // Audit logging must not turn a successful content write into a failed request.
  }
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function cleanText(value: unknown, max = 5000): string {
  return String(value ?? '').trim().slice(0, max);
}

/** Membaca request body dengan batas byte yang ditegakkan pada stream, bukan hanya Content-Length. */
export async function readRequestBytes(
  request: Request,
  maxBytes: number,
): Promise<{ bytes: Uint8Array | null; tooLarge: boolean }> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return { bytes: null, tooLarge: true };
    }
  }

  if (!request.body) return { bytes: new Uint8Array(), tooLarge: false };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { bytes: null, tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, tooLarge: false };
}

/** Membaca JSON dengan batas byte aktual dan menolak body kosong/JSON invalid. */
export async function readJsonRequest(
  request: Request,
  maxBytes = 128 * 1024,
): Promise<{ data: unknown | null; error: 'too_large' | 'invalid_json' | null }> {
  const result = await readRequestBytes(request, maxBytes);
  if (result.tooLarge || !result.bytes) return { data: null, error: 'too_large' };
  try {
    return { data: JSON.parse(new TextDecoder().decode(result.bytes)), error: null };
  } catch {
    return { data: null, error: 'invalid_json' };
  }
}

/** Memeriksa nilai string JSON secara rekursif dengan pencocokan referensi persis. */
export function containsAnyReference(value: unknown, references: ReadonlySet<string>): boolean {
  if (typeof value === 'string') return references.has(value);
  if (Array.isArray(value)) return value.some((item) => containsAnyReference(item, references));
  if (isPlainRecord(value)) return Object.values(value).some((item) => containsAnyReference(item, references));
  return false;
}

/** Validasi URL absolut dengan skema HTTP atau HTTPS saja. */
export function validPublicUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const input = value.trim();

  if (!input || /[\u0000-\u0020<>"'`\\]/.test(input)) return null;

  try {
    const parsed = new URL(input);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/** Memvalidasi field URL HTTP/HTTPS yang boleh kosong. */
export function isValidOptionalPublicUrl(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return validPublicUrl(value) !== null;
}

/** Referensi media: URL http(s) ATAU "storage://<path>" (di-resolve oleh data.ts). */
export function validMediaRef(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (input.startsWith('storage://')) {
    const path = input.slice('storage://'.length);
    const segments = path.split('/');
    const ok =
      path.length > 0 &&
      path.length <= 500 &&
      /^[A-Za-z0-9._\-/]+$/.test(path) &&
      !segments.some((segment) => segment === '' || segment === '.' || segment === '..');
    return ok ? input : null;
  }
  return validPublicUrl(input);
}

export function isValidOptionalMediaRef(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return validMediaRef(value) !== null;
}

/**
 * Memvalidasi object URL sosial. URL sosial harus HTTP/HTTPS;
 * "storage://" tidak diperbolehkan untuk tautan akun.
 * "#" dipertahankan sebagai penanda tautan yang belum diisi.
 */
const SOCIAL_KEYS = new Set(['instagram', 'youtube', 'tiktok', 'facebook', 'twitter', 'x', 'github', 'linkedin', 'whatsapp']);

export function isValidSocialLinks(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isPlainRecord(value)) return false;

  return Object.entries(value).every(([platform, url]) => {
    if (!SOCIAL_KEYS.has(platform)) return false;
    if (url === undefined || url === null) return true;
    if (typeof url !== 'string') return false;
    const input = url.trim();
    if (input === '' || input === '#') return true;
    return validPublicUrl(input) !== null;
  });
}

/** Validasi URL media/OG/background dan tautan sosial pada pengaturan situs. */
export function isValidSiteSettingsUrls(value: unknown): boolean {
  if (!isPlainRecord(value)) return false;

  if (value.ogImage !== undefined && !isValidOptionalMediaRef(value.ogImage)) return false;
  if (value.sosmed !== undefined && !isValidSocialLinks(value.sosmed)) return false;

  if (value.media !== undefined) {
    if (!isPlainRecord(value.media)) return false;
    for (const [key, url] of Object.entries(value.media)) {
      if (key.endsWith('_url') && !isValidOptionalMediaRef(url)) return false;
    }
  }

  if (value.appearance !== undefined) {
    if (!isPlainRecord(value.appearance)) return false;
    if (
      value.appearance.background_image_url !== undefined &&
      !isValidOptionalMediaRef(value.appearance.background_image_url)
    ) return false;
  }

  return true;
}

export function validInternalHref(value: unknown): string | null {
  const href = cleanText(value, 300);
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('\\') || /[\r\n]/.test(href)) return null;
  if (/^\/(?:api\/admin|pengembang\/admin)(?:\/|$)/i.test(href)) return null;
  const pathname = href.split(/[?#]/, 1)[0];
  const allowedPaths = new Set(['/', '/pengembang', '/struktur', '/anggota', '/keahlian', '/galeri', '/tkj', '/404', '/offline']);
  if (!allowedPaths.has(pathname)) return null;
  return href;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}
