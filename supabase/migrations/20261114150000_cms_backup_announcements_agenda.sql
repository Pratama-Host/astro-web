-- Extend the existing v1 CMS bundle without invalidating older v1 files.
-- Old bundles may omit announcements/agenda_events; those sections are skipped,
-- which preserves the upsert-only restore contract and never deletes live rows.

CREATE OR REPLACE FUNCTION public.export_tkj_cms_backup()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'format', 'tkj-xi9-cms-backup', 'version', 1, 'created_at', now(),
    'site_settings', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.key) FROM public.site_settings s WHERE s.key = 'site'), '[]'::jsonb),
    'anggota', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.anggota t), '[]'::jsonb),
    'galeri', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.galeri t), '[]'::jsonb),
    'guru', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.guru t), '[]'::jsonb),
    'skills', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.skills t), '[]'::jsonb),
    'announcements', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.announcements t), '[]'::jsonb),
    'agenda_events', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.agenda_events t), '[]'::jsonb),
    'site_pages', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.slug) FROM public.site_pages t), '[]'::jsonb),
    'site_page_drafts', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.slug) FROM public.site_page_drafts t), '[]'::jsonb),
    'site_navigation', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.site_navigation t), '[]'::jsonb),
    'site_sections', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.site_sections t), '[]'::jsonb),
    'media_assets', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.media_assets t), '[]'::jsonb),
    'content_revisions', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.version, t.id) FROM public.content_revisions t), '[]'::jsonb),
    'admin_audit_logs', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at, t.id) FROM public.admin_audit_logs t), '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_tkj_cms_backup(p_bundle jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_table text;
  v_pk text;
  v_updates text;
  v_count integer := 0;
  v_rows integer;
  v_expected constant text[] := ARRAY[
    'anggota','galeri','guru','skills','announcements','agenda_events',
    'site_pages','site_page_drafts','site_navigation','site_sections',
    'media_assets','content_revisions','admin_audit_logs'
  ];
  v_optional constant text[] := ARRAY['announcements','agenda_events'];
BEGIN
  IF p_bundle IS NULL OR jsonb_typeof(p_bundle) <> 'object'
     OR p_bundle->>'confirm' IS DISTINCT FROM 'true'
     OR p_bundle->>'format' IS DISTINCT FROM 'tkj-xi9-cms-backup'
     OR p_bundle->>'version' IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Invalid backup format' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_bundle->'site_settings') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_bundle->'site_settings') > 1 THEN
    RAISE EXCEPTION 'Invalid site_settings backup section' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_bundle->'site_settings') = 1 AND
     (p_bundle->'site_settings'->0->>'key' <> 'site'
      OR jsonb_typeof(p_bundle->'site_settings'->0->'value') <> 'object') THEN
    RAISE EXCEPTION 'Invalid site_settings row' USING ERRCODE = '22023';
  END IF;

  FOREACH v_table IN ARRAY v_expected LOOP
    IF NOT (p_bundle ? v_table) AND v_table = ANY(v_optional) THEN
      CONTINUE;
    END IF;
    IF jsonb_typeof(p_bundle->v_table) IS DISTINCT FROM 'array'
       OR jsonb_array_length(p_bundle->v_table) > 100000 THEN
      RAISE EXCEPTION 'Missing or invalid backup section: %', v_table USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF jsonb_array_length(p_bundle->'site_settings') = 1 THEN
    INSERT INTO public.site_settings(key, value, updated_at)
    SELECT x.key, x.value, COALESCE(x.updated_at, now())
    FROM jsonb_to_recordset(p_bundle->'site_settings') AS x(key text, value jsonb, updated_at timestamptz)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_count := v_count + v_rows;
  END IF;

  FOREACH v_table IN ARRAY v_expected LOOP
    IF NOT (p_bundle ? v_table) AND v_table = ANY(v_optional) THEN
      CONTINUE;
    END IF;
    v_pk := CASE v_table WHEN 'site_pages' THEN 'slug' WHEN 'site_page_drafts' THEN 'slug' ELSE 'id' END;
    SELECT string_agg(format('%1$I = EXCLUDED.%1$I', a.attname), ', ' ORDER BY a.attnum)
      INTO v_updates
      FROM pg_attribute a
     WHERE a.attrelid = format('public.%I', v_table)::regclass
       AND a.attnum > 0 AND NOT a.attisdropped AND a.attname <> v_pk;

    EXECUTE format(
      'INSERT INTO public.%1$I SELECT * FROM jsonb_populate_recordset(NULL::public.%1$I, $1) ON CONFLICT (%2$I) DO UPDATE SET %3$s',
      v_table, v_pk, v_updates
    ) USING p_bundle->v_table;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_count := v_count + v_rows;
  END LOOP;

  INSERT INTO public.admin_audit_logs(action, entity, entity_id, summary)
  VALUES ('restore-backup', 'cms', NULL, 'Backup CMS diimpor secara transaksional');

  RETURN jsonb_build_object(
    'ok', true,
    'rows_upserted', v_count,
    'message', 'Backup berhasil diimpor; baris yang tidak ada dalam bundle dipertahankan.'
  );
END;
$function$;

-- Preserve the backend-only contract after CREATE OR REPLACE.
REVOKE ALL ON FUNCTION public.export_tkj_cms_backup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_tkj_cms_backup(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_tkj_cms_backup() TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_tkj_cms_backup(jsonb) TO service_role;
