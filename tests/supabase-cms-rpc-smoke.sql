-- Run ONLY after migrations/0003_restore_cms_rpc_workflows.sql is deployed.
-- Entire smoke test is rollback-only. It temporarily writes test-shaped values to
-- the existing /tkj page, its draft, site settings, revision history and audit log,
-- then rolls everything back. Do not remove the final ROLLBACK.

BEGIN;
DO $test$
DECLARE
  v_result jsonb;
  v_bundle jsonb;
  v_revision_id uuid;
  v_first_version integer;
  v_second_version integer;
BEGIN
  -- Export contract and all expected sections.
  v_bundle := public.export_tkj_cms_backup();
  IF v_bundle->>'format' <> 'tkj-xi9-cms-backup' OR v_bundle->>'version' <> '1' THEN
    RAISE EXCEPTION 'export contract mismatch';
  END IF;
  IF jsonb_typeof(v_bundle->'site_settings') <> 'array'
     OR jsonb_typeof(v_bundle->'anggota') <> 'array'
     OR jsonb_typeof(v_bundle->'galeri') <> 'array'
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

  -- Backup restore is upsert-only and must run in the same transaction.
  v_bundle := public.export_tkj_cms_backup();
  v_bundle := jsonb_set(v_bundle, '{confirm}', 'true'::jsonb, true);
  v_result := public.restore_tkj_cms_backup(v_bundle);
  IF v_result->>'ok' <> 'true' THEN RAISE EXCEPTION 'backup restore mismatch'; END IF;

  -- Confirm backend-only execution privileges.
  IF has_function_privilege('anon', 'public.export_tkj_cms_backup()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.export_tkj_cms_backup()', 'EXECUTE') THEN
    RAISE EXCEPTION 'backup RPC is exposed to anon/authenticated';
  END IF;
END;
$test$;
ROLLBACK;
