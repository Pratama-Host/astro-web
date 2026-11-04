-- Repair nested site-settings merge semantics and seed all Pengembang CMS sections.
-- This migration deliberately preserves the current table grants/RLS model.
-- All public-facing function execution remains restricted to service_role.

BEGIN;

-- Use the natural unique key so this migration also handles the legacy
-- developer.story row created by 20261101_cms.sql without creating duplicates.
INSERT INTO public.site_sections (id, page_slug, section_key, label, sort_order, enabled)
VALUES
  ('pengembang.profile', '/pengembang', 'profile', 'Profil dan tentang', 0, true),
  ('pengembang.story', '/pengembang', 'story', 'Cerita dan perjalanan lama', 1, true),
  ('pengembang.skills', '/pengembang', 'skills', 'Keahlian', 2, true),
  ('pengembang.work', '/pengembang', 'work', 'Karya dan proyek', 3, true),
  ('pengembang.motivation', '/pengembang', 'motivation', 'Motivasi dan perjalanan', 4, true),
  ('pengembang.contact', '/pengembang', 'contact', 'Kontak', 5, true),
  ('pengembang.philosophy', '/pengembang', 'philosophy', 'Filosofi dan prinsip', 6, true),
  ('pengembang.experience', '/pengembang', 'experience', 'Pengalaman', 7, true),
  ('pengembang.quotes', '/pengembang', 'quotes', 'Kutipan', 8, true),
  ('pengembang.education', '/pengembang', 'education', 'Edukasi', 9, true),
  ('pengembang.notes', '/pengembang', 'notes', 'Catatan', 10, true)
ON CONFLICT (page_slug, section_key) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    enabled = EXCLUDED.enabled;

-- Recursively merge JSON objects. Arrays and scalar values are replaced.
CREATE OR REPLACE FUNCTION public.merge_tkj_cms_jsonb(p_base jsonb, p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result jsonb := CASE
    WHEN jsonb_typeof(p_base) = 'object' THEN p_base
    ELSE '{}'::jsonb
  END;
  v_key text;
  v_value jsonb;
  v_previous jsonb;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'Site settings patch must be a JSON object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN
    SELECT entry.key, entry.value
    FROM jsonb_each(p_patch) AS entry
  LOOP
    v_previous := v_result -> v_key;
    IF jsonb_typeof(v_value) = 'object' AND jsonb_typeof(v_previous) = 'object' THEN
      v_result := jsonb_set(
        v_result,
        ARRAY[v_key],
        public.merge_tkj_cms_jsonb(v_previous, v_value),
        true
      );
    ELSE
      v_result := jsonb_set(v_result, ARRAY[v_key], v_value, true);
    END IF;
  END LOOP;

  RETURN v_result;
END;
$function$;

-- The caller is service_role via the server-only Astro endpoint.
-- SECURITY INVOKER is intentional; do not replace it with SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.patch_tkj_cms_site_settings(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_current jsonb;
  v_next jsonb;
  v_updated timestamptz := now();
  v_version integer;
BEGIN
  IF p_patch IS NULL
     OR jsonb_typeof(p_patch) <> 'object'
     OR octet_length(p_patch::text) > 100000 THEN
    RAISE EXCEPTION 'Invalid site settings patch' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('tkj-cms:site-settings', 0));

  SELECT s.value
  INTO v_current
  FROM public.site_settings AS s
  WHERE s.key = 'site'
  FOR UPDATE;

  v_current := COALESCE(v_current, '{}'::jsonb);
  v_next := public.merge_tkj_cms_jsonb(v_current, p_patch);

  SELECT COALESCE(MAX(r.version), 0) + 1
  INTO v_version
  FROM public.content_revisions AS r
  WHERE r.page_slug = 'site-settings';

  INSERT INTO public.site_settings (key, value, updated_at)
  VALUES ('site', v_next, v_updated)
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at;

  INSERT INTO public.content_revisions (page_slug, version, content, seo)
  VALUES ('site-settings', v_version, v_next, '{}'::jsonb);

  INSERT INTO public.admin_audit_logs (action, entity, entity_id, summary)
  VALUES ('update', 'site_settings', 'site', 'Pengaturan situs diperbarui melalui recursive patch CMS');

  RETURN jsonb_build_object(
    'data', v_next,
    'updated_at', v_updated,
    'revision_version', v_version
  );
END;
$function$;

-- Keep RPCs backend-only and retain the existing service_role calling model.
REVOKE ALL ON FUNCTION public.merge_tkj_cms_jsonb(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_tkj_cms_jsonb(jsonb, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.patch_tkj_cms_site_settings(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.patch_tkj_cms_site_settings(jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
