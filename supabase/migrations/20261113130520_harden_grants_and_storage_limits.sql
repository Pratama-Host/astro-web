-- Semua penulisan CMS tetap berlangsung di server menggunakan service_role.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon, authenticated;

revoke all on table
  public.site_page_drafts, public.content_revisions, public.admin_audit_logs,
  public.media_assets
  from anon, authenticated;

do $$
declare t text;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename like '%login_attempt%'
  loop
    execute format(
      'revoke all on table public.%I from anon, authenticated',
      t
    );
  end loop;
end $$;

alter default privileges in schema public
  revoke all on tables from anon, authenticated;

-- Batas unggahan baru; objek Storage yang sudah ada tidak diubah.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/png','image/jpeg','image/webp','image/gif','image/avif',
      'image/x-icon','image/vnd.microsoft.icon',
      'audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/aac','audio/webm','audio/flac',
      'application/pdf'
    ]
where id = 'astro';
