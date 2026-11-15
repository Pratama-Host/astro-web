import { describe, expect, it } from 'vitest';
import {
  normalizeBackupSections,
  validateAgendaBackupRows,
  validateAnnouncementBackupRows,
} from '../src/lib/backup-validation';

const announcement = {
  id: '3d8d2c63-9a3d-4f0a-9d3a-7e4e38b21d80',
  title: 'Informasi kelas', body: 'Isi pengumuman', category: 'Kelas', status: 'draft',
  pinned: false, publish_at: null, expires_at: null, link_url: null,
};
const agenda = {
  id: 'b6f7c1bf-1da0-42e8-85dd-9a9b024fdb73',
  title: 'Rapat kelas', description: 'Agenda rapat', category: 'Kelas', status: 'draft',
  starts_at: '2026-12-01T02:00:00.000Z', ends_at: '2026-12-01T03:00:00.000Z', location: 'Ruang kelas',
};

describe('CMS backup collection compatibility', () => {
  it('adds empty announcements and agenda sections to legacy v1 bundles', () => {
    expect(normalizeBackupSections({ format: 'tkj-xi9-cms-backup', version: 1 })).toMatchObject({
      announcements: [], agenda_events: [],
    });
  });

  it('preserves populated announcement and agenda sections', () => {
    expect(normalizeBackupSections({ announcements: [announcement], agenda_events: [agenda] })).toMatchObject({
      announcements: [announcement], agenda_events: [agenda],
    });
  });

  it('validates announcement constraints before restore', () => {
    expect(validateAnnouncementBackupRows([announcement])).toBeNull();
    expect(validateAnnouncementBackupRows([{ ...announcement, status: 'scheduled' }])).not.toBeNull();
    expect(validateAnnouncementBackupRows([{ ...announcement, link_url: 'javascript:alert(1)' }])).not.toBeNull();
    expect(validateAnnouncementBackupRows([{ ...announcement, expires_at: '2026-01-01T00:00:00Z', publish_at: '2026-02-01T00:00:00Z' }])).not.toBeNull();
  });

  it('validates agenda constraints before restore', () => {
    expect(validateAgendaBackupRows([agenda])).toBeNull();
    expect(validateAgendaBackupRows([{ ...agenda, ends_at: '2026-11-30T00:00:00Z' }])).not.toBeNull();
    expect(validateAgendaBackupRows([{ ...agenda, starts_at: 'not-a-date' }])).not.toBeNull();
    expect(validateAgendaBackupRows([{ ...agenda, location: 'x'.repeat(161) }])).not.toBeNull();
  });
});
