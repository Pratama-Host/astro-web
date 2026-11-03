-- Stage 3 hardening. Apply after 20261101_cms.sql and 20261103_stage3_workflow.sql.

-- Persistent login throttling: unlike Worker memory, this is shared by every isolate.
create table if not exists public.admin_login_attempts (
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  attempted_at timestamptz not null default now()
);
create index if not exists admin_login_attempts_ip_time_idx
  on public.admin_login_attempts (ip_hash, attempted_at desc);
create index if not exists admin_login_attempts_time_idx
  on public.admin_login_attempts (attempted_at);
alter table public.admin_login_attempts enable row level security;
revoke all on table public.admin_login_attempts from public, anon, authenticated;
grant all on table public.admin_login_attempts to service_role;

create or replace function public.consume_tkj_admin_login_attempt(
  p_ip_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count bigint;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$'
     or p_limit < 1 or p_limit > 10
     or p_window_seconds < 60 or p_window_seconds > 3600 then
    raise exception 'Parameter rate limit login tidak valid.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('tkj-admin-login'), hashtext(p_ip_hash));
  delete from public.admin_login_attempts
   where attempted_at < now() - interval '1 day';
  select count(*) into v_count
    from public.admin_login_attempts
   where ip_hash = p_ip_hash
     and attempted_at >= now() - make_interval(secs => p_window_seconds);
  if v_count >= p_limit then
    return false;
  end if;
  insert into public.admin_login_attempts (ip_hash, attempted_at) values (p_ip_hash, now());
  return true;
end;
$$;

create or replace function public.clear_tkj_admin_login_attempts(p_ip_hash text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'IP hash login tidak valid.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('tkj-admin-login'), hashtext(p_ip_hash));
  delete from public.admin_login_attempts where ip_hash = p_ip_hash;
end;
$$;
-- All functions are callable only by the server-side Supabase service_role client.

create or replace function public.export_tkj_cms_backup()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Keep the export within the same per-table row ceiling accepted by restore.
  if (select count(*) from public.site_settings where key = 'site') > 1
     or (select count(*) from public.anggota) > 100000
     or (select count(*) from public.galeri) > 100000
     or (select count(*) from public.guru) > 100000
     or (select count(*) from public.skills) > 100000
     or (select count(*) from public.site_pages) > 100000
     or (select count(*) from public.site_page_drafts) > 100000
     or (select count(*) from public.site_navigation) > 100000
     or (select count(*) from public.site_sections) > 100000
     or (select count(*) from public.media_assets) > 100000
     or (select count(*) from public.content_revisions) > 100000
     -- Import writes one additional audit event, so reserve one row for it.
     or (select count(*) from public.admin_audit_logs) > 99999 then
    raise exception 'Backup melebihi batas aman 100.000 baris per tabel (99.999 untuk audit log).' using errcode = '54000';
  end if;

  return (
    select jsonb_build_object(
      'format', 'tkj-xi9-cms-backup',
      'version', 1,
      'exported_at', statement_timestamp(),
      'site_settings', coalesce((select jsonb_agg(to_jsonb(t) order by t.key) from public.site_settings t where t.key = 'site'), '[]'::jsonb),
      'anggota', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.anggota t), '[]'::jsonb),
      'galeri', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.galeri t), '[]'::jsonb),
      'guru', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.guru t), '[]'::jsonb),
      'skills', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.skills t), '[]'::jsonb),
      'site_pages', coalesce((select jsonb_agg(to_jsonb(t) order by t.slug) from public.site_pages t), '[]'::jsonb),
      'site_page_drafts', coalesce((select jsonb_agg(to_jsonb(t) order by t.slug) from public.site_page_drafts t), '[]'::jsonb),
      'site_navigation', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.site_navigation t), '[]'::jsonb),
      'site_sections', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.site_sections t), '[]'::jsonb),
      'media_assets', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.media_assets t), '[]'::jsonb),
      'content_revisions', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.content_revisions t), '[]'::jsonb),
      'admin_audit_logs', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.admin_audit_logs t), '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.restore_tkj_cms_backup(p_bundle jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_spec record;
  v_rows jsonb;
  v_table_oid regclass;
  v_update_columns text;
  v_report jsonb := '{}'::jsonb;
  v_count integer;
  v_conflict_part text;
begin
  if p_bundle is null or jsonb_typeof(p_bundle) <> 'object'
     or p_bundle->>'format' <> 'tkj-xi9-cms-backup'
     or p_bundle->>'version' <> '1'
     or p_bundle->>'confirm' <> 'true' then
    raise exception 'Backup tidak valid atau konfirmasi tidak diberikan.' using errcode = '22023';
  end if;

  -- Validate every table payload before performing any write.
  if not (p_bundle ? 'site_settings') or jsonb_typeof(p_bundle->'site_settings') is distinct from 'array' then
    raise exception 'Bagian site_settings tidak valid.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_bundle->'site_settings') > 1 then
    raise exception 'Backup hanya boleh berisi satu baris site_settings.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_bundle->'site_settings') = 1 then
    if jsonb_typeof(p_bundle->'site_settings'->0) <> 'object'
       or p_bundle->'site_settings'->0->>'key' <> 'site'
       or jsonb_typeof(p_bundle->'site_settings'->0->'value') <> 'object' then
      raise exception 'Baris site_settings tidak valid.' using errcode = '22023';
    end if;
  end if;

  -- Serialize restores so that two admin requests cannot interleave large imports.
  perform pg_advisory_xact_lock(hashtext('tkj-cms-backup'), 1);

  -- First pass: validate every table envelope and required conflict metadata.
  -- No write occurs until every table passes these checks.
  for v_spec in
    select * from (values
      ('anggota', 'nis'),
      ('galeri', 'src'),
      ('guru', 'nama'),
      ('skills', 'nama'),
      ('site_pages', 'slug'),
      ('site_page_drafts', 'slug'),
      ('site_navigation', 'id'),
      ('site_sections', 'id'),
      ('media_assets', 'object_path'),
      ('content_revisions', 'page_slug, version'),
      ('admin_audit_logs', 'id')
    ) as specs(table_name, conflict_column)
  loop
    if not (p_bundle ? v_spec.table_name) then
      raise exception 'Bagian % tidak ada dalam backup.', v_spec.table_name using errcode = '22023';
    end if;
    v_rows := p_bundle->v_spec.table_name;
    if jsonb_typeof(v_rows) is distinct from 'array' then
      raise exception 'Bagian % harus berupa array.', v_spec.table_name using errcode = '22023';
    end if;
    v_count := jsonb_array_length(v_rows);
    if v_count > case when v_spec.table_name = 'admin_audit_logs' then 99999 else 100000 end then
      raise exception 'Bagian % melebihi batas aman restore.', v_spec.table_name using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(v_rows) as element(value) where jsonb_typeof(element.value) <> 'object') then
      raise exception 'Bagian % berisi baris non-object.', v_spec.table_name using errcode = '22023';
    end if;

    v_table_oid := to_regclass(format('public.%I', v_spec.table_name));
    if v_table_oid is null then
      raise exception 'Tabel % tidak tersedia. Jalankan migrasi CMS terlebih dahulu.', v_spec.table_name using errcode = '42P01';
    end if;

    foreach v_conflict_part in array string_to_array(replace(v_spec.conflict_column, ' ', ''), ',') loop
      if not exists (
        select 1 from pg_attribute a
         where a.attrelid = v_table_oid and a.attnum > 0 and not a.attisdropped
           and a.attname = v_conflict_part
      ) then
        raise exception 'Kolom konflik % tidak tersedia pada tabel %.', v_conflict_part, v_spec.table_name using errcode = '22023';
      end if;
    end loop;
  end loop;

  -- Second pass: all envelopes were validated. Any database/type/constraint error
  -- still aborts the surrounding RPC transaction and rolls back every upsert.
  for v_spec in
    select * from (values
      ('anggota', 'nis'),
      ('galeri', 'src'),
      ('guru', 'nama'),
      ('skills', 'nama'),
      ('site_pages', 'slug'),
      ('site_page_drafts', 'slug'),
      ('site_navigation', 'id'),
      ('site_sections', 'id'),
      ('media_assets', 'object_path'),
      ('content_revisions', 'page_slug, version'),
      ('admin_audit_logs', 'id')
    ) as specs(table_name, conflict_column)
  loop
    v_rows := p_bundle->v_spec.table_name;
    v_count := jsonb_array_length(v_rows);
    if v_count = 0 then
      v_report := v_report || jsonb_build_object(v_spec.table_name, 0);
      continue;
    end if;

    v_table_oid := to_regclass(format('public.%I', v_spec.table_name));
    select string_agg(format('%I = EXCLUDED.%I', a.attname, a.attname), ', ' order by a.attnum)
      into v_update_columns
      from pg_attribute a
     where a.attrelid = v_table_oid
       and a.attnum > 0
       and not a.attisdropped
       and not (a.attname = any(string_to_array(replace(v_spec.conflict_column, ' ', ''), ',')));

    if v_update_columns is null then
      raise exception 'Kolom konflik tabel % tidak valid.', v_spec.table_name using errcode = '22023';
    end if;

    execute format(
      'insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1) on conflict (%s) do update set %s',
      v_spec.table_name, v_spec.table_name, v_spec.conflict_column, v_update_columns
    ) using v_rows;
    v_report := v_report || jsonb_build_object(v_spec.table_name, v_count);
  end loop;

  -- Restore site settings only after all payloads have passed validation and table upserts.
  if jsonb_array_length(p_bundle->'site_settings') = 1 then
    insert into public.site_settings (key, value, updated_at)
    select 'site', value, coalesce(updated_at, now())
      from jsonb_populate_record(null::public.site_settings, p_bundle->'site_settings'->0)
    on conflict (key) do update
      set value = excluded.value, updated_at = excluded.updated_at;
  end if;
  v_report := v_report || jsonb_build_object('site_settings', jsonb_array_length(p_bundle->'site_settings'));

  insert into public.admin_audit_logs (action, entity, entity_id, summary)
  values ('import', 'backup', null, 'Backup CMS dipulihkan secara transaksional (upsert, tanpa menghapus baris lama)');

  return jsonb_build_object(
    'ok', true,
    'report', v_report,
    'message', 'Backup berhasil dipulihkan secara atomik. Baris yang tidak ada di backup tetap dipertahankan.'
  );
end;
$$;

create or replace function public.publish_tkj_cms_draft(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_draft public.site_page_drafts%rowtype;
  v_page public.site_pages%rowtype;
  v_version integer;
begin
  if p_slug is null or p_slug not in ('/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang') then
    raise exception 'Slug halaman tidak diizinkan.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('tkj-cms-page'), hashtext(p_slug));
  select * into v_draft from public.site_page_drafts where slug = p_slug for update;
  if not found then raise exception 'Draft tidak ditemukan.' using errcode = 'P0002'; end if;

  insert into public.site_pages (slug, title, description, og_image, noindex, content, updated_at)
  values (v_draft.slug, v_draft.title, v_draft.description, v_draft.og_image, v_draft.noindex, v_draft.content, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, og_image = excluded.og_image,
    noindex = excluded.noindex, content = excluded.content, updated_at = excluded.updated_at
  returning * into v_page;

  select coalesce(max(version), 0) + 1 into v_version
    from public.content_revisions where page_slug = p_slug;
  insert into public.content_revisions (page_slug, version, content, seo)
  values (
    p_slug, v_version, v_page.content,
    jsonb_build_object('title', v_page.title, 'description', v_page.description,
                       'og_image', v_page.og_image, 'noindex', v_page.noindex)
  );

  delete from public.site_page_drafts where slug = p_slug;
  insert into public.admin_audit_logs (action, entity, entity_id, summary)
  values ('publish', 'site_pages', p_slug, format('Draft %s dipublikasikan dengan snapshot versi %s', p_slug, v_version));

  return jsonb_build_object('ok', true, 'page', to_jsonb(v_page), 'revision_version', v_version);
end;
$$;

create or replace function public.save_tkj_cms_page(
  p_slug text,
  p_title text,
  p_description text,
  p_og_image text,
  p_noindex boolean,
  p_content jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_page public.site_pages%rowtype;
  v_version integer;
begin
  if p_slug is null or p_slug not in ('/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang') then
    raise exception 'Slug halaman tidak diizinkan.' using errcode = '22023';
  end if;
  if p_noindex is null or p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'Metadata halaman tidak valid.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('tkj-cms-page'), hashtext(p_slug));
  insert into public.site_pages (slug, title, description, og_image, noindex, content, updated_at)
  values (p_slug, p_title, p_description, p_og_image, p_noindex, p_content, now())
  on conflict (slug) do update set
    title = excluded.title, description = excluded.description, og_image = excluded.og_image,
    noindex = excluded.noindex, content = excluded.content, updated_at = excluded.updated_at
  returning * into v_page;

  select coalesce(max(version), 0) + 1 into v_version
    from public.content_revisions where page_slug = p_slug;
  insert into public.content_revisions (page_slug, version, content, seo)
  values (
    p_slug, v_version, v_page.content,
    jsonb_build_object('title', v_page.title, 'description', v_page.description,
                       'og_image', v_page.og_image, 'noindex', v_page.noindex)
  );
  insert into public.admin_audit_logs (action, entity, entity_id, summary)
  values ('update', 'site_pages', p_slug, format('SEO halaman %s diperbarui; snapshot versi %s dibuat', p_slug, v_version));

  return jsonb_build_object('ok', true, 'data', to_jsonb(v_page), 'revision_version', v_version);
end;
$$;

create or replace function public.save_tkj_cms_site_settings(p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_version integer;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'object' then
    raise exception 'Pengaturan situs harus berupa JSON object.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('tkj-cms-page'), hashtext('site-settings'));
  insert into public.site_settings (key, value, updated_at)
  values ('site', p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;

  select coalesce(max(version), 0) + 1 into v_version
    from public.content_revisions where page_slug = 'site-settings';
  insert into public.content_revisions (page_slug, version, content, seo)
  values ('site-settings', v_version, p_value, '{}'::jsonb);
  insert into public.admin_audit_logs (action, entity, entity_id, summary)
  values ('update', 'site_settings', 'site', format('Pengaturan dan konten situs diperbarui; snapshot versi %s dibuat', v_version));

  return jsonb_build_object('ok', true, 'revision_version', v_version, 'updated_at', now());
end;
$$;

create or replace function public.restore_tkj_cms_revision(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_revision public.content_revisions%rowtype;
  v_current_page public.site_pages%rowtype;
  v_current_settings jsonb;
  v_target_seo jsonb;
  v_version integer;
begin
  select * into v_revision from public.content_revisions where id = p_id for share;
  if not found then raise exception 'Versi tidak ditemukan.' using errcode = 'P0002'; end if;

  if v_revision.page_slug = 'site-settings' then
    perform pg_advisory_xact_lock(hashtext('tkj-cms-page'), hashtext('site-settings'));
    select value into v_current_settings from public.site_settings where key = 'site' for update;
    if found then
      select coalesce(max(version), 0) + 1 into v_version
        from public.content_revisions where page_slug = 'site-settings';
      insert into public.content_revisions (page_slug, version, content, seo)
      values ('site-settings', v_version, v_current_settings, '{}'::jsonb);
    end if;
    insert into public.site_settings (key, value, updated_at)
    values ('site', v_revision.content, now())
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  else
    if v_revision.page_slug not in ('/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang') then
      raise exception 'Slug revisi tidak diizinkan.' using errcode = '22023';
    end if;
    perform pg_advisory_xact_lock(hashtext('tkj-cms-page'), hashtext(v_revision.page_slug));
    select * into v_current_page from public.site_pages where slug = v_revision.page_slug for update;
    if found then
      select coalesce(max(version), 0) + 1 into v_version
        from public.content_revisions where page_slug = v_revision.page_slug;
      insert into public.content_revisions (page_slug, version, content, seo)
      values (
        v_current_page.slug, v_version, v_current_page.content,
        jsonb_build_object('title', v_current_page.title, 'description', v_current_page.description,
                           'og_image', v_current_page.og_image, 'noindex', v_current_page.noindex)
      );
    end if;
    v_target_seo := coalesce(v_revision.seo, '{}'::jsonb);
    insert into public.site_pages (slug, title, description, og_image, noindex, content, updated_at)
    values (
      v_revision.page_slug,
      nullif(v_target_seo->>'title', ''),
      nullif(v_target_seo->>'description', ''),
      nullif(v_target_seo->>'og_image', ''),
      coalesce((v_target_seo->>'noindex')::boolean, false),
      coalesce(v_revision.content, '{}'::jsonb), now()
    )
    on conflict (slug) do update set
      title = excluded.title, description = excluded.description, og_image = excluded.og_image,
      noindex = excluded.noindex, content = excluded.content, updated_at = excluded.updated_at;
  end if;

  insert into public.admin_audit_logs (action, entity, entity_id, summary)
  values ('restore', 'content_revisions', p_id::text, format('Versi %s untuk %s dipulihkan', v_revision.version, v_revision.page_slug));
  return jsonb_build_object('ok', true, 'page_slug', v_revision.page_slug, 'restored_version', v_revision.version);
end;
$$;

revoke all on function public.consume_tkj_admin_login_attempt(text, integer, integer) from public, anon, authenticated;
revoke all on function public.clear_tkj_admin_login_attempts(text) from public, anon, authenticated;
revoke all on function public.export_tkj_cms_backup() from public, anon, authenticated;
revoke all on function public.restore_tkj_cms_backup(jsonb) from public, anon, authenticated;
revoke all on function public.publish_tkj_cms_draft(text) from public, anon, authenticated;
revoke all on function public.save_tkj_cms_page(text, text, text, text, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.restore_tkj_cms_revision(uuid) from public, anon, authenticated;
revoke all on function public.save_tkj_cms_site_settings(jsonb) from public, anon, authenticated;

grant execute on function public.consume_tkj_admin_login_attempt(text, integer, integer) to service_role;
grant execute on function public.clear_tkj_admin_login_attempts(text) to service_role;
grant execute on function public.export_tkj_cms_backup() to service_role;
grant execute on function public.restore_tkj_cms_backup(jsonb) to service_role;
grant execute on function public.publish_tkj_cms_draft(text) to service_role;
grant execute on function public.save_tkj_cms_page(text, text, text, text, boolean, jsonb) to service_role;
grant execute on function public.restore_tkj_cms_revision(uuid) to service_role;
grant execute on function public.save_tkj_cms_site_settings(jsonb) to service_role;

-- Refresh the Supabase PostgREST schema cache so new RPC functions are immediately discoverable.
notify pgrst, 'reload schema';
