-- DISPOSABLE PROJECT ONLY: apply the fully reconciled migration chain first.
-- Never run against production or a shared database: the transaction temporarily
-- updates /tkj, its draft, site settings, revisions, audit, announcements and agenda.
-- The entire test is rollback-only; do not remove the final ROLLBACK.
BEGIN;
DO $test$
DECLARE
  v_result jsonb;
  v_bundle jsonb;
  v_revision_id uuid;
  v_first_version integer;
  v_second_version integer;
  v_announcement_id uuid := gen_random_uuid();
  v_agenda_id uuid := gen_random_uuid();
  v_legacy_bundle jsonb;
BEGIN
  -- Export contract and all expected sections.
  v_bundle := public.export_tkj_cms_backup();
  IF v_bundle->>'format' <> 'tkj-xi9-cms-backup' OR v_bundle->>'version' <> '1' THEN
    RAISE EXCEPTION 'export contract mismatch';
  END IF;
  IF jsonb_typeof(v_bundle->'site_settings') <> 'array'
     OR jsonb_typeof(v_bundle->'anggota') <> 'array'
     OR jsonb_typeof(v_bundle->'galeri') <> 'array'
     OR jsonb_typeof(v_bundle->'announcements') <> 'array'
     OR jsonb_typeof(v_bundle->'agenda_events') <> 'array'
     OR jsonb_typeof(v_bundle->'content_revisions') <> 'array'
     OR jsonb_typeof(v_bundle->'admin_audit_logs') <> 'array' THEN
    RAISE EXCEPTION 'export sections missing';
  END IF;

  -- Page save, revision creation and revision restore.
  v_result := public.save_tkj_cms_page('/tkj', 'RPC smoke one', 'temporary one', NULL, false, '{"_rpc_smoke_test":"one"}'::jsonb);
  v_first_version := (v_result->>'revision_version')::integer;
  v_result := public.save_tkj_cms_page('/tkj', 'RPC smoke two', 'temporary two', NULL, false, '{"_rpc_smoke_test":"two"}'::jsonb);
  v_second_version := (v_result->>'revision_version')::integer;
  SELECT id INTO v_revision_id FROM public.content_revisions WHERE page_slug = '/tkj' AND version = v_first_version;
  IF v_revision_id IS NULL THEN RAISE EXCEPTION 'save page did not create revision'; END IF;
  v_result := public.restore_tkj_cms_revision(v_revision_id);
  IF v_result->>'ok' <> 'true' THEN RAISE EXCEPTION 'restore revision result mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.site_pages WHERE slug = '/tkj' AND content->>'_rpc_smoke_test' = 'one') THEN
    RAISE EXCEPTION 'selected revision was not restored';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.content_revisions WHERE page_slug = '/tkj' AND version > v_second_version AND content->>'_rpc_smoke_test' = 'two') THEN
    RAISE EXCEPTION 'pre-restore page state was not snapshotted';
  END IF;

  -- Site settings patch and global asset reference update.
  v_result := public.patch_tkj_cms_site_settings('{"_rpc_smoke_test":"temporary"}'::jsonb);
  IF v_result->'data'->>'_rpc_smoke_test' <> 'temporary' THEN RAISE EXCEPTION 'settings patch mismatch'; END IF;
  v_result := public.set_tkj_cms_global_asset('logo', 'https://example.invalid/rpc-smoke-test.webp');
  IF v_result->'data'->'media'->>'logo_url' <> 'https://example.invalid/rpc-smoke-test.webp' THEN RAISE EXCEPTION 'global asset update mismatch'; END IF;

  -- Draft publish flow. Any pre-existing /tkj draft is restored by outer ROLLBACK.
  INSERT INTO public.site_page_drafts(slug, title, description, og_image, noindex, content, updated_at)
  VALUES ('/tkj', 'RPC draft smoke', 'temporary draft', NULL, false, '{"_rpc_smoke_test":"draft"}'::jsonb, now())
  ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
    og_image = EXCLUDED.og_image, noindex = EXCLUDED.noindex, content = EXCLUDED.content, updated_at = EXCLUDED.updated_at;
  v_result := public.publish_tkj_cms_draft('/tkj');
  IF v_result->'data'->>'title' <> 'RPC draft smoke' THEN RAISE EXCEPTION 'draft publish mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM public.site_page_drafts WHERE slug = '/tkj') THEN RAISE EXCEPTION 'published draft was not removed'; END IF;

  -- Backup round-trip covers announcements and agenda using synthetic IDs only.
  INSERT INTO public.announcements (id, title, body, category, status, pinned)
  VALUES (v_announcement_id, 'RPC smoke announcement', 'synthetic', 'Kelas', 'draft', false);
  INSERT INTO public.agenda_events (id, title, description, category, status, starts_at)
  VALUES (v_agenda_id, 'RPC smoke agenda', 'synthetic', 'Kelas', 'draft', now() + interval '1 day');

  v_bundle := public.export_tkj_cms_backup();
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_bundle->'announcements') item WHERE item->>'id' = v_announcement_id::text)
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_bundle->'agenda_events') item WHERE item->>'id' = v_agenda_id::text) THEN
    RAISE EXCEPTION 'backup export omitted announcements or agenda';
  END IF;

  DELETE FROM public.announcements WHERE id = v_announcement_id;
  DELETE FROM public.agenda_events WHERE id = v_agenda_id;
  v_bundle := jsonb_set(v_bundle, '{confirm}', 'true'::jsonb, true);
  v_result := public.restore_tkj_cms_backup(v_bundle);
  IF v_result->>'ok' <> 'true'
     OR NOT EXISTS (SELECT 1 FROM public.announcements WHERE id = v_announcement_id)
     OR NOT EXISTS (SELECT 1 FROM public.agenda_events WHERE id = v_agenda_id) THEN
    RAISE EXCEPTION 'announcements/agenda backup round-trip mismatch';
  END IF;

  -- Legacy v1 files omit the two newer sections. Import accepts them and is upsert-only.
  v_legacy_bundle := (v_bundle - 'announcements' - 'agenda_events');
  v_result := public.restore_tkj_cms_backup(v_legacy_bundle);
  IF v_result->>'ok' <> 'true'
     OR NOT EXISTS (SELECT 1 FROM public.announcements WHERE id = v_announcement_id)
     OR NOT EXISTS (SELECT 1 FROM public.agenda_events WHERE id = v_agenda_id) THEN
    RAISE EXCEPTION 'legacy backup compatibility or upsert-only contract failed';
  END IF;

  -- Confirm backend-only execution privileges.
  IF has_function_privilege('anon', 'public.export_tkj_cms_backup()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.export_tkj_cms_backup()', 'EXECUTE') THEN
    RAISE EXCEPTION 'backup RPC is exposed to anon/authenticated';
  END IF;

  IF (SELECT count(*) FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'site_sections'
         AND cmd = 'SELECT' AND roles && ARRAY['anon','authenticated']::name[]) > 1 THEN
    RAISE EXCEPTION 'duplicate permissive site_sections SELECT policies remain';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.admin_login_attempts'::regclass AND contype = 'p'
  ) THEN
    RAISE EXCEPTION 'admin_login_attempts primary key is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) acl
    WHERE d.defaclnamespace = 'public'::regnamespace
      AND d.defaclobjtype IN ('r', 'S')
      AND acl.grantee IN ('anon'::regrole, 'authenticated'::regrole)
  ) OR EXISTS (
    SELECT 1 FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) acl
    WHERE d.defaclobjtype = 'f'
      AND (d.defaclnamespace = 0 OR d.defaclnamespace = 'public'::regnamespace)
      AND acl.grantee IN (0, 'anon'::regrole, 'authenticated'::regrole)
      AND acl.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'future public object defaults grant access to public roles';
  END IF;
END;
$test$;
ROLLBACK;
