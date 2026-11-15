-- Read-only privilege smoke test. No member values or private rows are printed.
-- Run in SQL Editor after the current migrations have been reconciled/applied.
DO $test$
DECLARE
  v_missing_rls text;
BEGIN
  IF has_column_privilege('anon', 'public.anggota', 'nama', 'SELECT') IS NOT TRUE THEN
    RAISE EXCEPTION 'public member name column is not readable';
  END IF;
  IF has_column_privilege('anon', 'public.anggota', 'nis', 'SELECT') IS TRUE THEN
    RAISE EXCEPTION 'private anggota.nis is readable by anon';
  END IF;
  IF has_table_privilege('anon', 'public.anggota', 'INSERT')
     OR has_table_privilege('anon', 'public.anggota', 'UPDATE')
     OR has_table_privilege('anon', 'public.anggota', 'DELETE')
     OR has_table_privilege('authenticated', 'public.anggota', 'INSERT')
     OR has_table_privilege('authenticated', 'public.anggota', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.anggota', 'DELETE') THEN
    RAISE EXCEPTION 'public roles can mutate anggota';
  END IF;
  IF has_table_privilege('anon', 'public.content_revisions', 'SELECT')
     OR has_table_privilege('anon', 'public.admin_audit_logs', 'SELECT')
     OR has_table_privilege('anon', 'public.admin_login_attempts', 'SELECT')
     OR has_table_privilege('anon', 'public.site_page_drafts', 'SELECT')
     OR has_table_privilege('anon', 'public.media_assets', 'SELECT') THEN
    RAISE EXCEPTION 'an internal CMS table is readable by anon';
  END IF;
  IF has_function_privilege('anon', 'public.export_tkj_cms_backup()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.export_tkj_cms_backup()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.restore_tkj_cms_backup(jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.restore_tkj_cms_backup(jsonb)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.consume_tkj_admin_login_attempt(text,integer,integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.consume_tkj_admin_login_attempt(text,integer,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'a privileged CMS RPC is callable by public roles';
  END IF;
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO v_missing_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r'
     AND c.relname IN ('anggota','galeri','guru','skills','announcements','agenda_events',
       'site_navigation','site_sections','site_settings','site_pages','site_page_drafts',
       'media_assets','content_revisions','admin_audit_logs','admin_login_attempts')
     AND NOT c.relrowsecurity;
  IF v_missing_rls IS NOT NULL THEN
    RAISE EXCEPTION 'RLS missing on application tables: %', v_missing_rls;
  END IF;
END;
$test$;
