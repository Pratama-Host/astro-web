-- Hardening (audit Fase 1.2). UJI DI PROYEK DISPOSABLE SEBELUM PRODUKSI.
-- Backup dulu: SELECT public.export_tkj_cms_backup();
-- Aplikasi memakai service_role untuk semua penulisan, jadi tidak terpengaruh.

-- 1) Defense in depth: anon/authenticated tidak perlu hak tulis sama sekali.
--    RLS sudah menolak penulisan; ini menghilangkan ketergantungan pada RLS saja.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon, authenticated;

-- 2) Tabel internal tidak boleh punya grant baca untuk role publik.
revoke all on table
  public.site_page_drafts, public.content_revisions, public.admin_audit_logs,
  public.media_assets
  from anon, authenticated;
-- (tabel percobaan login ikut dicabut lewat blok di bawah bila ada)
do $$
declare t text;
begin
  for t in select tablename from pg_tables
           where schemaname = 'public' and tablename like '%login_attempt%' loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;

-- 3) Default privilege: tabel baru tidak otomatis terbuka untuk role publik.
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- 4) Bucket 'astro': batas ukuran (sama dengan batas kode, 20 MB) dan daftar MIME
--    sesuai src/lib/media-validation.ts. SVG/HTML sengaja tidak termasuk.
--    Hanya memengaruhi unggahan BARU; objek lama tidak diubah.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/png','image/jpeg','image/webp','image/gif','image/avif',
      'image/x-icon','image/vnd.microsoft.icon',
      'audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/aac','audio/webm','audio/flac',
      'application/pdf'
    ]
where id = 'astro';
