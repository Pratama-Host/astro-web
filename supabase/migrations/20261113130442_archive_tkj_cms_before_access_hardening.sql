begin;

-- Snapshot payload CMS sebelum perubahan hak akses dan modul pengumuman/agenda.
-- Arsip berada di skema privat dan bukan backup PostgreSQL penuh/off-site.
create schema if not exists backup_private authorization postgres;
revoke all on schema backup_private from public, anon, authenticated, service_role;

create table if not exists backup_private.cms_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  purpose text not null,
  format text not null,
  version text not null,
  payload jsonb not null,
  payload_md5 text not null,
  section_counts jsonb not null
);

revoke all on all tables in schema backup_private from public, anon, authenticated, service_role;
revoke all on all sequences in schema backup_private from public, anon, authenticated, service_role;

with exported as (
  select public.export_tkj_cms_backup() as payload
)
insert into backup_private.cms_snapshots
  (purpose, format, version, payload, payload_md5, section_counts)
select
  'before_090001_090002_090003',
  payload->>'format',
  payload->>'version',
  payload,
  md5(payload::text),
  jsonb_build_object(
    'site_settings', jsonb_array_length(coalesce(payload->'site_settings','[]'::jsonb)),
    'anggota', jsonb_array_length(coalesce(payload->'anggota','[]'::jsonb)),
    'galeri', jsonb_array_length(coalesce(payload->'galeri','[]'::jsonb)),
    'guru', jsonb_array_length(coalesce(payload->'guru','[]'::jsonb)),
    'skills', jsonb_array_length(coalesce(payload->'skills','[]'::jsonb)),
    'site_pages', jsonb_array_length(coalesce(payload->'site_pages','[]'::jsonb)),
    'site_page_drafts', jsonb_array_length(coalesce(payload->'site_page_drafts','[]'::jsonb)),
    'site_navigation', jsonb_array_length(coalesce(payload->'site_navigation','[]'::jsonb)),
    'site_sections', jsonb_array_length(coalesce(payload->'site_sections','[]'::jsonb)),
    'media_assets', jsonb_array_length(coalesce(payload->'media_assets','[]'::jsonb)),
    'content_revisions', jsonb_array_length(coalesce(payload->'content_revisions','[]'::jsonb)),
    'admin_audit_logs', jsonb_array_length(coalesce(payload->'admin_audit_logs','[]'::jsonb))
  )
from exported;

commit;
