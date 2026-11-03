-- Independent developer portfolio sections and atomic global-asset settings.
-- Apply after 20261103_stage3_hardening.sql.
begin;

insert into public.site_sections (id, page_slug, section_key, label, sort_order, enabled)
values
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
on conflict (id) do nothing;

create or replace function public.set_tkj_cms_global_asset(
  p_asset_type text,
  p_public_url text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current jsonb;
  v_next jsonb;
  v_media jsonb;
  v_appearance jsonb;
  v_media_key text;
  v_version integer;
  v_now timestamptz := now();
begin
  if p_asset_type not in ('logo', 'alternate_logo', 'favicon', 'audio', 'background', 'og') then
    raise exception 'Jenis aset global tidak diizinkan.' using errcode = '22023';
  end if;
  if p_public_url is null or length(p_public_url) > 2048 or p_public_url !~ '^https://[^[:space:]]+$' then
    raise exception 'URL aset global harus berupa URL HTTPS valid.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('tkj-cms-page'), hashtext('site-settings'));
  select value into v_current
    from public.site_settings
    where key = 'site'
    for update;
  v_current := coalesce(v_current, '{}'::jsonb);
  if jsonb_typeof(v_current) <> 'object' then
    raise exception 'Pengaturan situs bukan JSON object.' using errcode = '22023';
  end if;

  if p_asset_type = 'background' then
    v_appearance := case when jsonb_typeof(v_current->'appearance') = 'object'
      then v_current->'appearance' else '{}'::jsonb end;
    v_next := jsonb_set(
      v_current,
      '{appearance}',
      jsonb_set(v_appearance, '{background_image_url}', to_jsonb(p_public_url), true),
      true
    );
  elsif p_asset_type = 'og' then
    v_next := jsonb_set(v_current, '{ogImage}', to_jsonb(p_public_url), true);
  else
    v_media_key := p_asset_type || '_url';
    v_media := case when jsonb_typeof(v_current->'media') = 'object'
      then v_current->'media' else '{}'::jsonb end;
    v_next := jsonb_set(
      v_current,
      '{media}',
      jsonb_set(v_media, array[v_media_key], to_jsonb(p_public_url), true),
      true
    );
  end if;

  v_next := v_next || jsonb_build_object('updated_at', v_now);
  insert into public.site_settings (key, value, updated_at)
  values ('site', v_next, v_now)
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;

  select coalesce(max(version), 0) + 1 into v_version
    from public.content_revisions
    where page_slug = 'site-settings';
  insert into public.content_revisions (page_slug, version, content, seo)
  values ('site-settings', v_version, v_next, '{}'::jsonb);
  insert into public.admin_audit_logs (action, entity, entity_id, summary)
  values ('update', 'site_settings', 'site', format('Aset global %s diperbarui; snapshot versi %s dibuat', p_asset_type, v_version));

  return jsonb_build_object('ok', true, 'updated_at', v_now, 'revision_version', v_version);
end;
$$;

revoke all on function public.set_tkj_cms_global_asset(text, text) from public, anon, authenticated;
grant execute on function public.set_tkj_cms_global_asset(text, text) to service_role;


-- Merge only fields sent by the admin client while holding the same lock as
-- global-asset updates. This prevents stale full-settings reads from clobbering
-- unrelated values saved by another request. Nested objects are merged recursively; arrays replace.
create or replace function public.merge_tkj_cms_jsonb(p_base jsonb, p_patch jsonb)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb := case when jsonb_typeof(p_base) = 'object' then p_base else '{}'::jsonb end;
  v_key text;
  v_value jsonb;
  v_previous jsonb;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Patch pengaturan harus berupa JSON object.' using errcode = '22023';
  end if;

  for v_key, v_value in select entry.key, entry.value from jsonb_each(p_patch) as entry
  loop
    v_previous := v_result->v_key;
    if jsonb_typeof(v_value) = 'object' and jsonb_typeof(v_previous) = 'object' then
      v_result := jsonb_set(v_result, array[v_key], public.merge_tkj_cms_jsonb(v_previous, v_value), true);
    else
      v_result := jsonb_set(v_result, array[v_key], v_value, true);
    end if;
  end loop;
  return v_result;
end;
$$;

create or replace function public.patch_tkj_cms_site_settings(p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current jsonb;
  v_next jsonb;
  v_version integer;
  v_now timestamptz := now();
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Patch pengaturan harus berupa JSON object.' using errcode = '22023';
  end if;
  if octet_length(p_patch::text) > 100000 then
    raise exception 'Patch pengaturan melebihi 100 KB.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('tkj-cms-page'), hashtext('site-settings'));
  select value into v_current
    from public.site_settings
    where key = 'site'
    for update;
  v_current := coalesce(v_current, '{}'::jsonb);
  if jsonb_typeof(v_current) <> 'object' then
    raise exception 'Pengaturan situs bukan JSON object.' using errcode = '22023';
  end if;

  v_next := public.merge_tkj_cms_jsonb(v_current, p_patch);
  v_next := v_next || jsonb_build_object('updated_at', v_now);
  insert into public.site_settings (key, value, updated_at)
  values ('site', v_next, v_now)
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;

  select coalesce(max(version), 0) + 1 into v_version
    from public.content_revisions
    where page_slug = 'site-settings';
  insert into public.content_revisions (page_slug, version, content, seo)
  values ('site-settings', v_version, v_next, '{}'::jsonb);
  insert into public.admin_audit_logs (action, entity, entity_id, summary)
  values ('update', 'site_settings', 'site', format('Patch pengaturan situs diterapkan; snapshot versi %s dibuat', v_version));

  return jsonb_build_object('ok', true, 'data', v_next, 'updated_at', v_now, 'revision_version', v_version);
end;
$$;

revoke all on function public.merge_tkj_cms_jsonb(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.patch_tkj_cms_site_settings(jsonb) from public, anon, authenticated;
grant execute on function public.patch_tkj_cms_site_settings(jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
