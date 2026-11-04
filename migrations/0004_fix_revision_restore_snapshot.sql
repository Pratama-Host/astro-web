-- Preserve the currently published page as a new revision before restoring an older one.
-- Applied to Supabase project astro as 20261104054021 fix_revision_restore_snapshot.
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
  SELECT COALESCE(MAX(r.version), 0) + 1 INTO v_version FROM public.content_revisions AS r WHERE r.page_slug = v_revision.page_slug;

  IF v_revision.page_slug = 'site-settings' THEN
    SELECT COALESCE(s.value, '{}'::jsonb) INTO v_current_settings FROM public.site_settings AS s WHERE s.key = 'site' FOR UPDATE;
    v_current_settings := COALESCE(v_current_settings, '{}'::jsonb);
    INSERT INTO public.content_revisions(page_slug, version, content, seo) VALUES ('site-settings', v_version, v_current_settings, '{}'::jsonb);
    INSERT INTO public.site_settings(key, value, updated_at) VALUES ('site', v_revision.content, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at RETURNING updated_at INTO v_updated;
    INSERT INTO public.admin_audit_logs(action, entity, entity_id, summary) VALUES ('restore', 'site_settings', 'site', 'Pengaturan situs dipulihkan dari revision');
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
  VALUES (v_revision.page_slug, v_revision.seo->>'title', v_revision.seo->>'description', v_revision.seo->>'og_image',
    COALESCE((v_revision.seo->>'noindex')::boolean, false), v_revision.content, now())
  ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
    og_image = EXCLUDED.og_image, noindex = EXCLUDED.noindex, content = EXCLUDED.content, updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_saved;

  IF NOT v_exists THEN
    INSERT INTO public.content_revisions(page_slug, version, content, seo)
    VALUES (v_revision.page_slug, v_version, v_saved.content,
      jsonb_build_object('title', v_saved.title, 'description', v_saved.description,
        'og_image', v_saved.og_image, 'noindex', v_saved.noindex));
  END IF;
  INSERT INTO public.admin_audit_logs(action, entity, entity_id, summary) VALUES ('restore', 'site_pages', v_revision.page_slug, 'Halaman dipulihkan dari revision');
  RETURN jsonb_build_object('ok', true, 'data', to_jsonb(v_saved), 'revision_version', v_version);
END;
$function$;
