-- CMS RPC reconstruction for xi9-mubela.
-- Based on the exact RPC signatures and call sites in src/pages/api/admin/*.ts.
-- All functions are backend-only SECURITY INVOKER and EXECUTE is restricted to service_role.
-- No table data is modified by applying this migration.

BEGIN;

CREATE OR REPLACE FUNCTION public.patch_tkj_cms_site_settings(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_current jsonb;
  v_next jsonb;
  v_updated timestamptz;
  v_version integer;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR octet_length(p_patch::text) > 100000 THEN
    RAISE EXCEPTION 'Invalid site settings patch' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('tkj-cms:site-settings', 0));
  SELECT s.value INTO v_current FROM public.site_settings AS s WHERE s.key = 'site' FOR UPDATE;
  v_current := COALESCE(v_current, '{}'::jsonb);
  v_next := v_current || p_patch;

  SELECT COALESCE(MAX(r.version), 0) + 1 INTO v_version
  FROM public.content_revisions AS r WHERE r.page_slug = 'site-settings';

  INSERT INTO public.site_settings(key, value, updated_at)
  VALUES ('site', v_next, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
  RETURNING updated_at INTO v_updated;

  INSERT INTO public.content_revisions(page_slug, version, content, seo)
  VALUES ('site-settings', v_version, v_next, '{}'::jsonb);

  INSERT INTO public.admin_audit_logs(action, entity, entity_id, summary)
  VALUES ('update', 'site_settings', 'site', 'Pengaturan situs diperbarui melalui patch CMS');

  RETURN jsonb_build_object('data', v_next, 'updated_at', v_updated, 'revision_version', v_version);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_tkj_cms_global_asset(p_asset_type text, p_public_url text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_current jsonb;
  v_patch jsonb;
  v_media_key text;
BEGIN
  IF p_asset_type IS NULL OR p_asset_type NOT IN ('logo', 'alternate_logo', 'favicon', 'audio', 'background', 'og')
     OR p_public_url IS NULL OR length(p_public_url) > 2048
     OR p_public_url !~* '^https?://' THEN
    RAISE EXCEPTION 'Invalid global asset type or URL' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('tkj-cms:site-settings', 0));
  SELECT COALESCE(s.value, '{}'::jsonb) INTO v_current
  FROM public.site_settings AS s WHERE s.key = 'site' FOR UPDATE;
  v_current := COALESCE(v_current, '{}'::jsonb);

  IF p_asset_type = 'background' THEN
    v_patch := jsonb_build_object(
      'appearance', (CASE WHEN jsonb_typeof(v_current->'appearance') = 'object' THEN v_current->'appearance' ELSE '{}'::jsonb END) || jsonb_build_object('background_image_url', p_public_url)
    );
  ELSE
    v_media_key := CASE p_asset_type
      WHEN 'logo' THEN 'logo_url'
      WHEN 'alternate_logo' THEN 'alternate_logo_url'
      WHEN 'favicon' THEN 'favicon_url'
      WHEN 'audio' THEN 'audio_url'
      WHEN 'og' THEN 'og_url'
    END;
    v_patch := jsonb_build_object(
      'media', (CASE WHEN jsonb_typeof(v_current->'media') = 'object' THEN v_current->'media' ELSE '{}'::jsonb END) || jsonb_build_object(v_media_key, p_public_url)
    );
  END IF;

  RETURN public.patch_tkj_cms_site_settings(v_patch);
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_tkj_cms_page(
  p_slug text,
  p_title text,
  p_description text,
  p_og_image text,
  p_noindex boolean,
  p_content jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_current public.site_pages%ROWTYPE;
  v_exists boolean;
  v_version integer;
  v_saved public.site_pages%ROWTYPE;
  v_seo jsonb;
BEGIN
  IF p_slug IS NULL OR p_slug NOT IN ('/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang')
     OR p_content IS NULL OR jsonb_typeof(p_content) <> 'object'
     OR octet_length(p_content::text) > 100000 THEN
    RAISE EXCEPTION 'Invalid page slug or content' USING ERRCODE = '22023';
  END IF;
  IF p_og_image IS NOT NULL AND p_og_image !~* '^(https?://|storage://)' THEN
    RAISE EXCEPTION 'Invalid page media reference' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('tkj-cms:page:' || p_slug, 0));
  SELECT p.* INTO v_current FROM public.site_pages AS p WHERE p.slug = p_slug FOR UPDATE;
  v_exists := FOUND;
  SELECT COALESCE(MAX(r.version), 0) + 1 INTO v_version
  FROM public.content_revisions AS r WHERE r.page_slug = p_slug;

  INSERT INTO public.site_pages(slug, title, description, og_image, noindex, content, updated_at)
  VALUES (p_slug, p_title, p_description, p_og_image, COALESCE(p_noindex, false), p_content, now())
  ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
    og_image = EXCLUDED.og_image, noindex = EXCLUDED.noindex, content = EXCLUDED.content,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_saved;

  INSERT INTO public.content_revisions(page_slug, version, content, seo)
  VALUES (p_slug, v_version, v_saved.content,
    jsonb_build_object('title', v_saved.title, 'description', v_saved.description,
      'og_image', v_saved.og_image, 'noindex', v_saved.noindex));

  INSERT INTO public.admin_audit_logs(action, entity, entity_id, summary)
  VALUES ('save', 'site_pages', p_slug, 'Metadata dan konten halaman disimpan');

  RETURN jsonb_build_object('data', to_jsonb(v_saved), 'revision_version', v_version);
END;
$function$;

CREATE OR REPLACE FUNCTION public.publish_tkj_cms_draft(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_draft public.site_page_drafts%ROWTYPE;
  v_current public.site_pages%ROWTYPE;
  v_exists boolean;
  v_version integer;
  v_saved public.site_pages%ROWTYPE;
BEGIN
  IF p_slug IS NULL OR p_slug NOT IN ('/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang') THEN
    RAISE EXCEPTION 'Invalid page slug' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('tkj-cms:page:' || p_slug, 0));
  SELECT d.* INTO v_draft FROM public.site_page_drafts AS d WHERE d.slug = p_slug FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Draft not found' USING ERRCODE = 'P0002'; END IF;
  IF v_draft.content IS NULL OR jsonb_typeof(v_draft.content) <> 'object' THEN
    RAISE EXCEPTION 'Invalid draft content' USING ERRCODE = '22023';
  END IF;

  SELECT p.* INTO v_current FROM public.site_pages AS p WHERE p.slug = p_slug FOR UPDATE;
  v_exists := FOUND;
  SELECT COALESCE(MAX(r.version), 0) + 1 INTO v_version
  FROM public.content_revisions AS r WHERE r.page_slug = p_slug;
  INSERT INTO public.site_pages(slug, title, description, og_image, noindex, content, updated_at)
  VALUES (p_slug, v_draft.title, v_draft.description, v_draft.og_image, v_draft.noindex, v_draft.content, now())
  ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
    og_image = EXCLUDED.og_image, noindex = EXCLUDED.noindex, content = EXCLUDED.content,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_saved;

  INSERT INTO public.content_revisions(page_slug, version, content, seo)
  VALUES (p_slug, v_version, v_saved.content,
    jsonb_build_object('title', v_saved.title, 'description', v_saved.description,
      'og_image', v_saved.og_image, 'noindex', v_saved.noindex));

  DELETE FROM public.site_page_drafts WHERE slug = p_slug;
  INSERT INTO public.admin_audit_logs(action, entity, entity_id, summary)
  VALUES ('publish', 'site_pages', p_slug, 'Draft halaman dipublikasikan');

  RETURN jsonb_build_object('data', to_jsonb(v_saved), 'revision_version', v_version);
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_tkj_cms_revision(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_revision public.content_revisions%ROWTYPE;
  v_current public.site_pages%ROWTYPE;
  v_exists boolean;
  v_version integer;
  v_saved public.site_pages%ROWTYPE;
  v_current_settings jsonb;
  v_updated timestamptz;
BEGIN
  IF p_id IS NULL THEN RAISE EXCEPTION 'Revision ID is required' USING ERRCODE = '22023'; END IF;
  SELECT r.* INTO v_revision FROM public.content_revisions AS r WHERE r.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revision not found' USING ERRCODE = 'P0002'; END IF;
  IF v_revision.page_slug <> 'site-settings' AND v_revision.page_slug NOT IN ('/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang') THEN
    RAISE EXCEPTION 'Invalid revision slug' USING ERRCODE = '22023';
  END IF;
  IF v_revision.content IS NULL OR jsonb_typeof(v_revision.content) <> 'object'
     OR v_revision.seo IS NULL OR jsonb_typeof(v_revision.seo) <> 'object'
     OR (v_revision.seo ? 'noindex' AND jsonb_typeof(v_revision.seo->'noindex') <> 'boolean') THEN
    RAISE EXCEPTION 'Invalid revision content or SEO snapshot' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('tkj-cms:' || v_revision.page_slug, 0));
  SELECT COALESCE(MAX(r.version), 0) + 1 INTO v_version
  FROM public.content_revisions AS r WHERE r.page_slug = v_revision.page_slug;

  IF v_revision.page_slug = 'site-settings' THEN
    SELECT COALESCE(s.value, '{}'::jsonb) INTO v_current_settings
    FROM public.site_settings AS s WHERE s.key = 'site' FOR UPDATE;
    v_current_settings := COALESCE(v_current_settings, '{}'::jsonb);
    INSERT INTO public.content_revisions(page_slug, version, content, seo)
    VALUES ('site-settings', v_version, v_current_settings, '{}'::jsonb);
    INSERT INTO public.site_settings(key, value, updated_at)
    VALUES ('site', v_revision.content, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
    RETURNING updated_at INTO v_updated;
    INSERT INTO public.admin_audit_logs(action, entity, entity_id, summary)
    VALUES ('restore', 'site_settings', 'site', 'Pengaturan situs dipulihkan dari revision');
    RETURN jsonb_build_object('ok', true, 'data', v_revision.content, 'updated_at', v_updated, 'revision_version', v_version);
  END IF;

  SELECT p.* INTO v_current FROM public.site_pages AS p WHERE p.slug = v_revision.page_slug FOR UPDATE;
  v_exists := FOUND;
  IF v_exists THEN
    INSERT INTO public.content_revisions(page_slug, version, content, seo)
    VALUES (v_revision.page_slug, v_version, v_current.content,
      jsonb_build_object('title', v_current.title, 'description', v_current.description,
        'og_image', v_current.og_image, 'noindex', v_current.noindex));
  END IF;

  INSERT INTO public.site_pages(slug, title, description, og_image, noindex, content, updated_at)
  VALUES (v_revision.page_slug,
    v_revision.seo->>'title', v_revision.seo->>'description', v_revision.seo->>'og_image',
    COALESCE((v_revision.seo->>'noindex')::boolean, false), v_revision.content, now())
  ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
    og_image = EXCLUDED.og_image, noindex = EXCLUDED.noindex, content = EXCLUDED.content,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_saved;

  IF NOT v_exists THEN
    INSERT INTO public.content_revisions(page_slug, version, content, seo)
    VALUES (v_revision.page_slug, v_version, v_saved.content,
      jsonb_build_object('title', v_saved.title, 'description', v_saved.description,
        'og_image', v_saved.og_image, 'noindex', v_saved.noindex));
  END IF;

  INSERT INTO public.admin_audit_logs(action, entity, entity_id, summary)
  VALUES ('restore', 'site_pages', v_revision.page_slug, 'Halaman dipulihkan dari revision');
  RETURN jsonb_build_object('ok', true, 'data', to_jsonb(v_saved), 'revision_version', v_version);
END;
$function$;

CREATE OR REPLACE FUNCTION public.export_tkj_cms_backup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_bundle jsonb;
BEGIN
  SELECT jsonb_build_object(
    'format', 'tkj-xi9-cms-backup',
    'version', 1,
    'created_at', now(),
    'site_settings', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.key) FROM public.site_settings AS s WHERE s.key = 'site'), '[]'::jsonb),
    'anggota', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.anggota AS t), '[]'::jsonb),
    'galeri', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.galeri AS t), '[]'::jsonb),
    'guru', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.guru AS t), '[]'::jsonb),
    'skills', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.skills AS t), '[]'::jsonb),
    'site_pages', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.slug) FROM public.site_pages AS t), '[]'::jsonb),
    'site_page_drafts', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.slug) FROM public.site_page_drafts AS t), '[]'::jsonb),
    'site_navigation', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.site_navigation AS t), '[]'::jsonb),
    'site_sections', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.site_sections AS t), '[]'::jsonb),
    'media_assets', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.media_assets AS t), '[]'::jsonb),
    'content_revisions', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.version, t.id) FROM public.content_revisions AS t), '[]'::jsonb),
    'admin_audit_logs', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at, t.id) FROM public.admin_audit_logs AS t), '[]'::jsonb)
  ) INTO v_bundle;
  RETURN v_bundle;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_tkj_cms_backup(p_bundle jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_table text;
  v_pk text;
  v_columns text;
  v_updates text;
  v_count integer := 0;
  v_rows integer;
  v_expected constant text[] := ARRAY[
    'anggota','galeri','guru','skills','site_pages','site_page_drafts',
    'site_navigation','site_sections','media_assets','content_revisions','admin_audit_logs'
  ];
BEGIN
  IF p_bundle IS NULL OR jsonb_typeof(p_bundle) <> 'object'
     OR p_bundle->>'confirm' IS DISTINCT FROM 'true'
     OR p_bundle->>'format' IS DISTINCT FROM 'tkj-xi9-cms-backup'
     OR p_bundle->>'version' IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Invalid backup format' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_bundle->'site_settings') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid site_settings backup section' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_bundle->'site_settings') > 1 THEN
    RAISE EXCEPTION 'Invalid site_settings backup section' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_bundle->'site_settings') = 1 AND
     (p_bundle->'site_settings'->0->>'key' <> 'site' OR jsonb_typeof(p_bundle->'site_settings'->0->'value') <> 'object') THEN
    RAISE EXCEPTION 'Invalid site_settings row' USING ERRCODE = '22023';
  END IF;

  FOREACH v_table IN ARRAY v_expected LOOP
    IF jsonb_typeof(p_bundle->v_table) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Missing or invalid backup section: %', v_table USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(p_bundle->v_table) > CASE WHEN v_table = 'admin_audit_logs' THEN 99999 ELSE 100000 END THEN
      RAISE EXCEPTION 'Backup section exceeds row limit: %', v_table USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- Import is deliberately upsert-only: rows absent from the bundle remain untouched,
  -- matching the confirmation text and behavior in src/scripts/admin.js.
  FOREACH v_table IN ARRAY (ARRAY['site_settings'] || v_expected) LOOP
    IF v_table = 'site_settings' THEN
      IF jsonb_array_length(p_bundle->'site_settings') = 1 THEN
        INSERT INTO public.site_settings(key, value, updated_at)
        SELECT x.key, x.value, COALESCE(x.updated_at, now())
        FROM jsonb_to_recordset(p_bundle->'site_settings') AS x(key text, value jsonb, updated_at timestamptz)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
        GET DIAGNOSTICS v_rows = ROW_COUNT; v_count := v_count + v_rows;
      END IF;
      CONTINUE;
    END IF;

    v_pk := CASE v_table
      WHEN 'anggota' THEN 'id' WHEN 'galeri' THEN 'id' WHEN 'guru' THEN 'id' WHEN 'skills' THEN 'id'
      WHEN 'site_pages' THEN 'slug' WHEN 'site_page_drafts' THEN 'slug' WHEN 'site_navigation' THEN 'id'
      WHEN 'site_sections' THEN 'id' WHEN 'media_assets' THEN 'id' WHEN 'content_revisions' THEN 'id'
      WHEN 'admin_audit_logs' THEN 'id'
    END;

    SELECT string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum),
           string_agg(format('%1$I = EXCLUDED.%1$I', a.attname), ', ' ORDER BY a.attnum)
    INTO v_columns, v_updates
    FROM pg_attribute AS a
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

  RETURN jsonb_build_object('ok', true, 'rows_upserted', v_count, 'message', 'Backup berhasil diimpor; baris yang tidak ada dalam bundle dipertahankan.');
END;
$function$;

-- Backend-only RPC surface. Never grant these functions to anon/authenticated.
REVOKE ALL ON FUNCTION public.patch_tkj_cms_site_settings(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_tkj_cms_global_asset(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_tkj_cms_page(text, text, text, text, boolean, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_tkj_cms_draft(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_tkj_cms_revision(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.export_tkj_cms_backup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_tkj_cms_backup(jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.patch_tkj_cms_site_settings(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_tkj_cms_global_asset(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_tkj_cms_page(text, text, text, text, boolean, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_tkj_cms_draft(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_tkj_cms_revision(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.export_tkj_cms_backup() TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_tkj_cms_backup(jsonb) TO service_role;

COMMIT;
