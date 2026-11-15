/** Validation helpers for backup data that does not belong to a public page. */
export type BackupRecord = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTENT_STATUSES = new Set(['draft', 'published', 'archived']);

function isValidDate(value: unknown, nullable = true): value is string | null {
  if (value === null || value === undefined) return nullable;
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isHttpUrl(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Additive compatibility: older v1 bundles predate the two content collections.
 * Missing keys become empty arrays; restore remains upsert-only and never deletes rows.
 */
export function normalizeBackupSections(body: BackupRecord): BackupRecord {
  return {
    ...body,
    announcements: body.announcements === undefined ? [] : body.announcements,
    agenda_events: body.agenda_events === undefined ? [] : body.agenda_events,
  };
}

export function validateAnnouncementBackupRows(rows: BackupRecord[]): string | null {
  for (const row of rows) {
    if (typeof row.id !== 'string' || !UUID_PATTERN.test(row.id)) return 'Backup announcements memiliki ID yang tidak valid.';
    if (typeof row.title !== 'string' || row.title.trim().length < 1 || row.title.length > 160) return 'Backup announcements memiliki judul yang tidak valid.';
    if (typeof row.body !== 'string' || row.body.length > 5000) return 'Backup announcements memiliki isi yang tidak valid.';
    if (typeof row.category !== 'string' || row.category.length > 60) return 'Backup announcements memiliki kategori yang tidak valid.';
    if (!CONTENT_STATUSES.has(String(row.status)) || typeof row.pinned !== 'boolean') return 'Backup announcements memiliki status atau pin yang tidak valid.';
    if (!isValidDate(row.publish_at) || !isValidDate(row.expires_at)) return 'Backup announcements memiliki tanggal yang tidak valid.';
    if (row.publish_at && row.expires_at && Date.parse(String(row.expires_at)) <= Date.parse(String(row.publish_at))) return 'Jendela tanggal announcements tidak valid.';
    if (!isHttpUrl(row.link_url)) return 'Backup announcements memiliki tautan non-HTTP(S).';
  }
  return null;
}

export function validateAgendaBackupRows(rows: BackupRecord[]): string | null {
  for (const row of rows) {
    if (typeof row.id !== 'string' || !UUID_PATTERN.test(row.id)) return 'Backup agenda_events memiliki ID yang tidak valid.';
    if (typeof row.title !== 'string' || row.title.trim().length < 1 || row.title.length > 160) return 'Backup agenda_events memiliki judul yang tidak valid.';
    if (typeof row.description !== 'string' || row.description.length > 3000) return 'Backup agenda_events memiliki deskripsi yang tidak valid.';
    if (typeof row.category !== 'string' || row.category.length > 60) return 'Backup agenda_events memiliki kategori yang tidak valid.';
    if (!CONTENT_STATUSES.has(String(row.status))) return 'Backup agenda_events memiliki status yang tidak valid.';
    if (!isValidDate(row.starts_at, false) || !isValidDate(row.ends_at)) return 'Backup agenda_events memiliki tanggal yang tidak valid.';
    if (row.ends_at && Date.parse(String(row.ends_at)) < Date.parse(String(row.starts_at))) return 'Rentang waktu agenda_events tidak valid.';
    if (row.location !== null && row.location !== undefined && (typeof row.location !== 'string' || row.location.length > 160)) return 'Backup agenda_events memiliki lokasi yang tidak valid.';
  }
  return null;
}
