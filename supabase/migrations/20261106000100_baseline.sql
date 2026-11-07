-- TKJ XII-9 CMS baseline reconstructed from the live Supabase schema (PostgreSQL 17).
-- Intended for a new Supabase project. Safe to re-run: tables/indexes/policies use IF NOT EXISTS
-- guards and all routines use CREATE OR REPLACE. Existing content is never seeded or deleted.

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
comment on table public.site_settings is 'Pengaturan situs dan media global.';

create table if not exists public.anggota (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique,
  nama text not null,
  kelas text not null default 'XII-9',
  jabatan text,
  deskripsi text,
  foto_url text,
  audio_url text,
  audio_nama text,
  foto_audio_url text,
  deskripsi_audio text,
  social jsonb not null default '{}'::jsonb,
  urutan integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  skills jsonb not null default '[]'::jsonb,
  visible boolean not null default true,
  constraint anggota_skills_is_array_check check (jsonb_typeof(skills) = 'array')
);
comment on table public.anggota is 'Data anggota siswa, NIS, jabatan, profil dan audio.';
comment on column public.anggota.skills is 'Daftar skill anggota dalam teks, dipisahkan dengan koma.';
comment on column public.anggota.visible is 'Controls whether this member is visible on the public website.';

create table if not exists public.galeri (
  id uuid primary key default gen_random_uuid(),
  src text not null unique,
  caption text,
  urutan integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text,
  description text,
  category text not null default 'Kegiatan',
  taken_at date,
  alt_text text,
  visible boolean not null default true
);
comment on table public.galeri is 'Item galeri dan URL media di Supabase Storage.';

create table if not exists public.guru (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  mapel text,
  peran text,
  quote text,
  expertise jsonb not null default '[]'::jsonb,
  urutan integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.guru is 'Data guru dan keahlian.';

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  level integer not null default 0,
  icon text,
  deskripsi text,
  urutan integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skills_level_check check (level >= 0 and level <= 100)
);
comment on table public.skills is 'Data keterampilan siswa.';

create table if not exists public.site_pages (
  slug text primary key,
  title text,
  description text,
  og_image text,
  noindex boolean not null default false,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_page_drafts (
  slug text primary key,
  title text,
  description text,
  og_image text,
  noindex boolean not null default false,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_navigation (
  id text primary key,
  label text not null,
  href text not null,
  icon text not null default '',
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_sections (
  id text primary key,
  page_slug text not null,
  section_key text not null,
  label text not null default '',
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_sections_page_section_unique unique (page_slug, section_key)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  object_path text not null unique,
  public_url text not null,
  filename text not null,
  title text,
  alt_text text,
  category text not null default 'assets',
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_size_nonnegative check (size_bytes >= 0)
);

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null,
  version integer not null,
  content jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint content_revisions_version_positive check (version > 0),
  constraint content_revisions_page_version_unique unique (page_slug, version)
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity text not null,
  entity_id text,
  summary text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_login_attempts (
  ip_hash text not null,
  attempted_at timestamptz not null default now(),
  constraint admin_login_attempts_ip_hash_check check (ip_hash ~ '^[0-9a-f]{64}$')
);

-- RLS is enabled for every application table. Login attempts are additionally inaccessible
-- to anon/authenticated via table grants; only the two SECURITY DEFINER RPCs use this table.
alter table public.site_settings enable row level security;
alter table public.anggota enable row level security;
alter table public.galeri enable row level security;
alter table public.guru enable row level security;
alter table public.skills enable row level security;
alter table public.site_pages enable row level security;
alter table public.site_page_drafts enable row level security;
alter table public.site_navigation enable row level security;
alter table public.site_sections enable row level security;
alter table public.media_assets enable row level security;
alter table public.content_revisions enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.admin_login_attempts enable row level security;

create index if not exists anggota_nama_idx on public.anggota using btree (nama);
create index if not exists anggota_urutan_idx on public.anggota using btree (urutan);
create index if not exists galeri_urutan_idx on public.galeri using btree (urutan);
create index if not exists guru_urutan_idx on public.guru using btree (urutan);
create index if not exists skills_urutan_idx on public.skills using btree (urutan);
create index if not exists site_navigation_enabled_order_idx on public.site_navigation using btree (enabled, sort_order);
create index if not exists site_sections_page_order_idx on public.site_sections using btree (page_slug, sort_order);
create index if not exists site_page_drafts_updated_idx on public.site_page_drafts using btree (updated_at desc);
create index if not exists media_assets_category_idx on public.media_assets using btree (category);
create index if not exists media_assets_created_at_idx on public.media_assets using btree (created_at desc);
create index if not exists content_revisions_page_version_idx on public.content_revisions using btree (page_slug, version desc);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs using btree (created_at desc);
create index if not exists admin_login_attempts_ip_time_idx on public.admin_login_attempts using btree (ip_hash, attempted_at desc);
create index if not exists admin_login_attempts_time_idx on public.admin_login_attempts using btree (attempted_at);

-- Public policies are read-only. Admin writes are made by server APIs using service_role.
do $policies$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='site_settings' and policyname='Public can read published site settings') then
    create policy "Public can read published site settings" on public.site_settings for select to anon, authenticated using (key = 'site');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='anggota' and policyname='Public can read visible members') then
    create policy "Public can read visible members" on public.anggota for select to anon, authenticated using (visible is true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='galeri' and policyname='Public can read visible gallery') then
    create policy "Public can read visible gallery" on public.galeri for select to anon, authenticated using (visible is true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='guru' and policyname='Public can read teachers') then
    create policy "Public can read teachers" on public.guru for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='skills' and policyname='Public can read skills') then
    create policy "Public can read skills" on public.skills for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='site_pages' and policyname='Public can read site pages') then
    create policy "Public can read site pages" on public.site_pages for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='site_navigation' and policyname='Public can read enabled site navigation') then
    create policy "Public can read enabled site navigation" on public.site_navigation for select to anon, authenticated using (enabled is true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='site_sections' and policyname='Public can read enabled site sections') then
    create policy "Public can read enabled site sections" on public.site_sections for select to anon, authenticated using (enabled is true);
  end if;
  -- Public pages need to read disabled rows too, so they can hide the matching sections.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='site_sections' and policyname='Public can read section visibility metadata') then
    create policy "Public can read section visibility metadata" on public.site_sections for select to anon, authenticated using (true);
  end if;
end
$policies$;

-- Public object reads match the current live bucket. Uploads remain server-side.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('astro', 'astro', true, null, null)
on conflict (id) do nothing;

create or replace function public.clear_tkj_admin_login_attempts(p_ip_hash text)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'IP hash login tidak valid.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('tkj-admin-login'), hashtext(p_ip_hash));
  delete from public.admin_login_attempts where ip_hash = p_ip_hash;
end;
$function$;

create or replace function public.consume_tkj_admin_login_attempt(
  p_ip_hash text, p_limit integer default 5, p_window_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare v_count bigint;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$'
     or p_limit < 1 or p_limit > 10
     or p_window_seconds < 60 or p_window_seconds > 3600 then
    raise exception 'Parameter rate limit login tidak valid.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('tkj-admin-login'), hashtext(p_ip_hash));
  delete from public.admin_login_attempts where attempted_at < now() - interval '1 day';
  select count(*) into v_count
    from public.admin_login_attempts
   where ip_hash = p_ip_hash
     and attempted_at >= now() - make_interval(secs => p_window_seconds);
  if v_count >= p_limit then return false; end if;
  insert into public.admin_login_attempts (ip_hash, attempted_at) values (p_ip_hash, now());
  return true;
end;
$function$;

create or replace function public.export_tkj_cms_backup()
returns jsonb
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  return jsonb_build_object(
    'format', 'tkj-xi9-cms-backup', 'version', 1, 'created_at', now(),
    'site_settings', coalesce((select jsonb_agg(to_jsonb(s) order by s.key) from public.site_settings s where s.key = 'site'), '[]'::jsonb),
    'anggota', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.anggota t), '[]'::jsonb),
    'galeri', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.galeri t), '[]'::jsonb),
    'guru', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.guru t), '[]'::jsonb),
    'skills', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.skills t), '[]'::jsonb),
    'site_pages', coalesce((select jsonb_agg(to_jsonb(t) order by t.slug) from public.site_pages t), '[]'::jsonb),
    'site_page_drafts', coalesce((select jsonb_agg(to_jsonb(t) order by t.slug) from public.site_page_drafts t), '[]'::jsonb),
    'site_navigation', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.site_navigation t), '[]'::jsonb),
    'site_sections', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.site_sections t), '[]'::jsonb),
    'media_assets', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.media_assets t), '[]'::jsonb),
    'content_revisions', coalesce((select jsonb_agg(to_jsonb(t) order by t.version, t.id) from public.content_revisions t), '[]'::jsonb),
    'admin_audit_logs', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from public.admin_audit_logs t), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.merge_tkj_cms_jsonb(p_base jsonb, p_patch jsonb)
returns jsonb
language plpgsql
immutable
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_result jsonb := case when jsonb_typeof(p_base) = 'object' then p_base else '{}'::jsonb end;
  v_key text;
  v_value jsonb;
  v_previous jsonb;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Site settings patch must be a JSON object' using errcode = '22023';
  end if;
  for v_key, v_value in select entry.key, entry.value from jsonb_each(p_patch) as entry loop
    v_previous := v_result -> v_key;
    if jsonb_typeof(v_value) = 'object' and jsonb_typeof(v_previous) = 'object' then
      v_result := jsonb_set(v_result, array[v_key], public.merge_tkj_cms_jsonb(v_previous, v_value), true);
    else
      v_result := jsonb_set(v_result, array[v_key], v_value, true);
    end if;
  end loop;
  return v_result;
end;
$function$;

create or replace function public.patch_tkj_cms_site_settings(p_patch jsonb)
returns jsonb
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_current jsonb;
  v_next jsonb;
  v_updated timestamptz := now();
  v_version integer;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or octet_length(p_patch::text) > 100000 then
    raise exception 'Invalid site settings patch' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tkj-cms:site-settings', 0));
  select s.value into v_current from public.site_settings as s where s.key = 'site' for update;
  v_current := coalesce(v_current, '{}'::jsonb);
  v_next := public.merge_tkj_cms_jsonb(v_current, p_patch);
  select coalesce(max(r.version), 0) + 1 into v_version from public.content_revisions as r where r.page_slug = 'site-settings';
  insert into public.site_settings (key, value, updated_at)
  values ('site', v_next, v_updated)
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  insert into public.content_revisions (page_slug, version, content, seo)
  values ('site-settings', v_version, v_next, '{}'::jsonb);
  insert into public.admin_audit_logs (action, entity, entity_id, summary)
  values ('update', 'site_settings', 'site', 'Pengaturan situs diperbarui melalui recursive patch CMS');
  return jsonb_build_object('data', v_next, 'updated_at', v_updated, 'revision_version', v_version);
end;
$function$;

create or replace function public.publish_tkj_cms_draft(p_slug text)
returns jsonb
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare v_draft public.site_page_drafts%rowtype; v_version integer; v_saved public.site_pages%rowtype;
begin
  if p_slug is null or p_slug not in ('/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang') then
    raise exception 'Invalid page slug' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tkj-cms:page:' || p_slug, 0));
  select d.* into v_draft from public.site_page_drafts as d where d.slug = p_slug for update;
  if not found then raise exception 'Draft not found' using errcode = 'P0002'; end if;
  if v_draft.content is null or jsonb_typeof(v_draft.content) <> 'object' then
    raise exception 'Invalid draft content' using errcode = '22023';
  end if;
  select coalesce(max(r.version), 0) + 1 into v_version from public.content_revisions as r where r.page_slug = p_slug;
  insert into public.site_pages(slug, title, description, og_image, noindex, content, updated_at)
  values (p_slug, v_draft.title, v_draft.description, v_draft.og_image, v_draft.noindex, v_draft.content, now())
  on conflict (slug) do update set title = excluded.title, description = excluded.description,
    og_image = excluded.og_image, noindex = excluded.noindex, content = excluded.content, updated_at = excluded.updated_at
  returning * into v_saved;
  insert into public.content_revisions(page_slug, version, content, seo)
  values (p_slug, v_version, v_saved.content, jsonb_build_object('title', v_saved.title,
    'description', v_saved.description, 'og_image', v_saved.og_image, 'noindex', v_saved.noindex));
  delete from public.site_page_drafts where slug = p_slug;
  insert into public.admin_audit_logs(action, entity, entity_id, summary)
  values ('publish', 'site_pages', p_slug, 'Draft halaman dipublikasikan');
  return jsonb_build_object('data', to_jsonb(v_saved), 'revision_version', v_version);
end;
$function$;

create or replace function public.replace_tkj_cms_collection(
  p_kind text, p_items jsonb, p_allow_delete boolean default false, p_expected_snapshot jsonb default null
)
returns jsonb
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_removed integer := 0;
  v_count integer := 0;
  v_duplicate boolean := false;
  v_actual_snapshot jsonb;
  v_expected_snapshot jsonb;
begin
  if p_kind is null or p_kind not in ('guru', 'skills') or p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Invalid collection replacement payload' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'Collection exceeds 100 items' using errcode = '22023'; end if;
  if p_expected_snapshot is null or jsonb_typeof(p_expected_snapshot) <> 'array' then
    raise exception 'Expected collection snapshot is required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tkj-cms:collection:' || p_kind, 0));
  if p_kind = 'guru' then
    lock table public.guru in share row exclusive mode;
    select coalesce(jsonb_agg(to_jsonb(current_row) order by current_row.nama), '[]'::jsonb) into v_actual_snapshot from public.guru as current_row;
    select coalesce(jsonb_agg(value order by value ->> 'nama'), '[]'::jsonb) into v_expected_snapshot from jsonb_array_elements(p_expected_snapshot) as expected(value);
  else
    lock table public.skills in share row exclusive mode;
    select coalesce(jsonb_agg(to_jsonb(current_row) order by current_row.nama), '[]'::jsonb) into v_actual_snapshot from public.skills as current_row;
    select coalesce(jsonb_agg(value order by value ->> 'nama'), '[]'::jsonb) into v_expected_snapshot from jsonb_array_elements(p_expected_snapshot) as expected(value);
  end if;
  if v_actual_snapshot <> v_expected_snapshot then raise exception 'Collection changed since it was loaded' using errcode = '40001'; end if;
  select exists (
    select 1 from (
      select btrim(value ->> 'nama') as nama, count(*) as total
      from jsonb_array_elements(p_items) group by btrim(value ->> 'nama')
    ) as duplicates where nama is null or nama = '' or total > 1
  ) into v_duplicate;
  if v_duplicate then raise exception 'Collection names must be non-empty and unique' using errcode = '22023'; end if;
  if p_kind = 'guru' then
    if exists (
      select 1 from jsonb_array_elements(p_items) as item(value)
      where jsonb_typeof(value) <> 'object'
        or octet_length(coalesce(value ->> 'nama', '')) > 160
        or octet_length(coalesce(value ->> 'mapel', '')) > 180
        or octet_length(coalesce(value ->> 'peran', '')) > 180
        or octet_length(coalesce(value ->> 'quote', '')) > 1000
        or (value ? 'expertise' and jsonb_typeof(value -> 'expertise') <> 'array')
        or jsonb_array_length(case when jsonb_typeof(value -> 'expertise') = 'array' then value -> 'expertise' else '[]'::jsonb end) > 20
        or exists (
          select 1 from jsonb_array_elements(case when jsonb_typeof(value -> 'expertise') = 'array' then value -> 'expertise' else '[]'::jsonb end) as expertise(entry)
          where jsonb_typeof(entry) <> 'object'
            or jsonb_typeof(entry -> 'label') <> 'string'
            or btrim(coalesce(entry ->> 'label', '')) = ''
            or octet_length(coalesce(entry ->> 'label', '')) > 160
            or case when coalesce(entry ->> 'level', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
              then (entry ->> 'level')::numeric < 0 or (entry ->> 'level')::numeric > 100 else true end
        )
    ) then raise exception 'Invalid guru payload' using errcode = '22023'; end if;
    select count(*) into v_removed from public.guru as current_row
    where not exists (select 1 from jsonb_array_elements(p_items) as item(value) where btrim(value ->> 'nama') = current_row.nama);
    if v_removed > 0 and not coalesce(p_allow_delete, false) then raise exception 'Collection replacement would delete existing rows' using errcode = '22023'; end if;
    insert into public.guru (nama, mapel, peran, quote, expertise, urutan, updated_at)
    select btrim(value ->> 'nama'), nullif(btrim(value ->> 'mapel'), ''), nullif(btrim(value ->> 'peran'), ''),
      nullif(btrim(value ->> 'quote'), ''), case when jsonb_typeof(value -> 'expertise') = 'array' then value -> 'expertise' else '[]'::jsonb end,
      (ordinality - 1)::integer, now()
    from jsonb_array_elements(p_items) with ordinality as item(value, ordinality)
    on conflict (nama) do update set mapel=excluded.mapel, peran=excluded.peran, quote=excluded.quote,
      expertise=excluded.expertise, urutan=excluded.urutan, updated_at=excluded.updated_at;
    delete from public.guru as current_row
    where not exists (select 1 from jsonb_array_elements(p_items) as item(value) where btrim(value ->> 'nama') = current_row.nama);
    v_count := jsonb_array_length(p_items);
    insert into public.admin_audit_logs (action, entity, entity_id, summary)
    values ('replace', 'guru', null, format('%s item guru disimpan secara atomik; %s item dihapus', v_count, v_removed));
  else
    if exists (
      select 1 from jsonb_array_elements(p_items) as item(value)
      where jsonb_typeof(value) <> 'object'
        or octet_length(coalesce(value ->> 'nama', '')) > 160
        or octet_length(coalesce(value ->> 'icon', '')) > 80
        or octet_length(coalesce(value ->> 'deskripsi', '')) > 1000
        or case when coalesce(value ->> 'level', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          then (value ->> 'level')::numeric < 0 or (value ->> 'level')::numeric > 100 else true end
    ) then raise exception 'Invalid skills payload' using errcode = '22023'; end if;
    select count(*) into v_removed from public.skills as current_row
    where not exists (select 1 from jsonb_array_elements(p_items) as item(value) where btrim(value ->> 'nama') = current_row.nama);
    if v_removed > 0 and not coalesce(p_allow_delete, false) then raise exception 'Collection replacement would delete existing rows' using errcode = '22023'; end if;
    insert into public.skills (nama, level, icon, deskripsi, urutan, updated_at)
    select btrim(value ->> 'nama'), round((value ->> 'level')::numeric)::integer, nullif(btrim(value ->> 'icon'), ''),
      nullif(btrim(value ->> 'deskripsi'), ''), (ordinality - 1)::integer, now()
    from jsonb_array_elements(p_items) with ordinality as item(value, ordinality)
    on conflict (nama) do update set level=excluded.level, icon=excluded.icon, deskripsi=excluded.deskripsi,
      urutan=excluded.urutan, updated_at=excluded.updated_at;
    delete from public.skills as current_row
    where not exists (select 1 from jsonb_array_elements(p_items) as item(value) where btrim(value ->> 'nama') = current_row.nama);
    v_count := jsonb_array_length(p_items);
    insert into public.admin_audit_logs (action, entity, entity_id, summary)
    values ('replace', 'skills', null, format('%s item skills disimpan secara atomik; %s item dihapus', v_count, v_removed));
  end if;
  return jsonb_build_object('count', v_count, 'removed', v_removed);
end;
$function$;

create or replace function public.replace_tkj_cms_navigation(
  p_items jsonb, p_allow_delete boolean default false, p_expected_snapshot jsonb default null
)
returns jsonb
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare v_removed integer := 0; v_count integer := 0; v_actual_snapshot jsonb; v_expected_snapshot jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Invalid navigation replacement payload' using errcode = '22023'; end if;
  if jsonb_array_length(p_items) > 15 then raise exception 'Navigation exceeds 15 items' using errcode = '22023'; end if;
  if p_expected_snapshot is null or jsonb_typeof(p_expected_snapshot) <> 'array' then raise exception 'Expected navigation snapshot is required' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('tkj-cms:site-navigation', 0));
  lock table public.site_navigation in share row exclusive mode;
  select coalesce(jsonb_agg(to_jsonb(current_row) order by current_row.id), '[]'::jsonb) into v_actual_snapshot from public.site_navigation as current_row;
  select coalesce(jsonb_agg(value order by value ->> 'id'), '[]'::jsonb) into v_expected_snapshot from jsonb_array_elements(p_expected_snapshot) as expected(value);
  if v_actual_snapshot <> v_expected_snapshot then raise exception 'Navigation changed since it was loaded' using errcode = '40001'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as item(value)
    where jsonb_typeof(value) <> 'object'
      or coalesce(value ->> 'id', '') !~ '^[a-z0-9-]{1,50}$'
      or btrim(coalesce(value ->> 'label', '')) = ''
      or octet_length(coalesce(value ->> 'label', '')) > 60
      or coalesce(value ->> 'href', '') !~ '^/'
      or left(coalesce(value ->> 'href', ''), 2) = '//'
      or octet_length(coalesce(value ->> 'href', '')) > 500
      or octet_length(coalesce(value ->> 'icon', '')) > 50
      or (value ? 'enabled' and jsonb_typeof(value -> 'enabled') <> 'boolean')
  ) then raise exception 'Invalid navigation item' using errcode = '22023'; end if;
  if exists (select value ->> 'id' from jsonb_array_elements(p_items) as item(value) group by value ->> 'id' having count(*) > 1) then
    raise exception 'Navigation IDs must be unique' using errcode = '22023';
  end if;
  select count(*) into v_removed from public.site_navigation as current_row
  where not exists (select 1 from jsonb_array_elements(p_items) as item(value) where value ->> 'id' = current_row.id);
  if v_removed > 0 and not coalesce(p_allow_delete, false) then raise exception 'Navigation replacement would delete existing rows' using errcode = '22023'; end if;
  insert into public.site_navigation (id, label, href, icon, sort_order, enabled, updated_at)
  select value ->> 'id', btrim(value ->> 'label'), value ->> 'href', coalesce(value ->> 'icon', ''),
    (ordinality - 1)::integer, coalesce((value ->> 'enabled')::boolean, true), now()
  from jsonb_array_elements(p_items) with ordinality as item(value, ordinality)
  on conflict (id) do update set label=excluded.label, href=excluded.href, icon=excluded.icon,
    sort_order=excluded.sort_order, enabled=excluded.enabled, updated_at=excluded.updated_at;
  delete from public.site_navigation as current_row
  where not exists (select 1 from jsonb_array_elements(p_items) as item(value) where value ->> 'id' = current_row.id);
  v_count := jsonb_array_length(p_items);
  insert into public.admin_audit_logs (action, entity, entity_id, summary)
  values ('replace', 'site_navigation', null, format('%s menu disimpan secara atomik; %s menu dihapus', v_count, v_removed));
  return jsonb_build_object('count', v_count, 'removed', v_removed);
end;
$function$;

create or replace function public.restore_tkj_cms_backup(p_bundle jsonb)
returns jsonb
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_table text;
  v_pk text;
  v_columns text;
  v_updates text;
  v_count integer := 0;
  v_rows integer;
  v_expected constant text[] := array['anggota','galeri','guru','skills','site_pages','site_page_drafts',
    'site_navigation','site_sections','media_assets','content_revisions','admin_audit_logs'];
begin
  if p_bundle is null or jsonb_typeof(p_bundle) <> 'object'
     or p_bundle->>'confirm' is distinct from 'true'
     or p_bundle->>'format' is distinct from 'tkj-xi9-cms-backup'
     or p_bundle->>'version' is distinct from '1' then
    raise exception 'Invalid backup format' using errcode = '22023';
  end if;
  if jsonb_typeof(p_bundle->'site_settings') is distinct from 'array' or jsonb_array_length(p_bundle->'site_settings') > 1 then
    raise exception 'Invalid site_settings backup section' using errcode = '22023';
  end if;
  if jsonb_array_length(p_bundle->'site_settings') = 1 and
     (p_bundle->'site_settings'->0->>'key' <> 'site' or jsonb_typeof(p_bundle->'site_settings'->0->'value') <> 'object') then
    raise exception 'Invalid site_settings row' using errcode = '22023';
  end if;
  foreach v_table in array v_expected loop
    if jsonb_typeof(p_bundle->v_table) is distinct from 'array' or jsonb_array_length(p_bundle->v_table) > 100000 then
      raise exception 'Missing or invalid backup section: %', v_table using errcode = '22023';
    end if;
  end loop;
  if jsonb_array_length(p_bundle->'site_settings') = 1 then
    insert into public.site_settings(key, value, updated_at)
    select x.key, x.value, coalesce(x.updated_at, now())
    from jsonb_to_recordset(p_bundle->'site_settings') as x(key text, value jsonb, updated_at timestamptz)
    on conflict (key) do update set value=excluded.value, updated_at=excluded.updated_at;
    get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  end if;
  foreach v_table in array v_expected loop
    v_pk := case v_table when 'site_pages' then 'slug' when 'site_page_drafts' then 'slug' else 'id' end;
    select string_agg(format('%I', a.attname), ', ' order by a.attnum),
           string_agg(format('%1$I = EXCLUDED.%1$I', a.attname), ', ' order by a.attnum)
      into v_columns, v_updates
      from pg_attribute a
     where a.attrelid = format('public.%I', v_table)::regclass and a.attnum > 0 and not a.attisdropped and a.attname <> v_pk;
    execute format('insert into public.%1$I select * from jsonb_populate_recordset(null::public.%1$I, $1) on conflict (%2$I) do update set %3$s', v_table, v_pk, v_updates)
      using p_bundle->v_table;
    get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  end loop;
  insert into public.admin_audit_logs(action, entity, entity_id, summary)
  values ('restore-backup', 'cms', null, 'Backup CMS diimpor secara transaksional');
  return jsonb_build_object('ok', true, 'rows_upserted', v_count,
    'message', 'Backup berhasil diimpor; baris yang tidak ada dalam bundle dipertahankan.');
end;
$function$;

create or replace function public.restore_tkj_cms_revision(p_id uuid)
returns jsonb
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_revision public.content_revisions%rowtype;
  v_current public.site_pages%rowtype;
  v_exists boolean;
  v_version integer;
  v_saved public.site_pages%rowtype;
  v_current_settings jsonb;
  v_updated timestamptz;
begin
  if p_id is null then raise exception 'Revision ID is required' using errcode = '22023'; end if;
  select r.* into v_revision from public.content_revisions as r where r.id = p_id;
  if not found then raise exception 'Revision not found' using errcode = 'P0002'; end if;
  if v_revision.page_slug <> 'site-settings' and v_revision.page_slug not in ('/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang') then
    raise exception 'Invalid revision slug' using errcode = '22023';
  end if;
  if v_revision.content is null or jsonb_typeof(v_revision.content) <> 'object'
     or v_revision.seo is null or jsonb_typeof(v_revision.seo) <> 'object'
     or (v_revision.seo ? 'noindex' and jsonb_typeof(v_revision.seo->'noindex') <> 'boolean') then
    raise exception 'Invalid revision content or SEO snapshot' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tkj-cms:' || v_revision.page_slug, 0));
  select coalesce(max(r.version), 0) + 1 into v_version from public.content_revisions as r where r.page_slug = v_revision.page_slug;
  if v_revision.page_slug = 'site-settings' then
    select coalesce(s.value, '{}'::jsonb) into v_current_settings from public.site_settings as s where s.key = 'site' for update;
    v_current_settings := coalesce(v_current_settings, '{}'::jsonb);
    insert into public.content_revisions(page_slug, version, content, seo) values ('site-settings', v_version, v_current_settings, '{}'::jsonb);
    insert into public.site_settings(key, value, updated_at) values ('site', v_revision.content, now())
    on conflict (key) do update set value=excluded.value, updated_at=excluded.updated_at returning updated_at into v_updated;
    insert into public.admin_audit_logs(action, entity, entity_id, summary)
    values ('restore', 'site_settings', 'site', 'Pengaturan situs dipulihkan dari revision');
    return jsonb_build_object('ok', true, 'data', v_revision.content, 'updated_at', v_updated, 'revision_version', v_version);
  end if;
  select p.* into v_current from public.site_pages as p where p.slug = v_revision.page_slug for update;
  v_exists := found;
  if v_exists then
    insert into public.content_revisions(page_slug, version, content, seo)
    values (v_revision.page_slug, v_version, v_current.content,
      jsonb_build_object('title', v_current.title, 'description', v_current.description, 'og_image', v_current.og_image, 'noindex', v_current.noindex));
  end if;
  insert into public.site_pages(slug, title, description, og_image, noindex, content, updated_at)
  values (v_revision.page_slug, v_revision.seo->>'title', v_revision.seo->>'description', v_revision.seo->>'og_image',
    coalesce((v_revision.seo->>'noindex')::boolean, false), v_revision.content, now())
  on conflict (slug) do update set title=excluded.title, description=excluded.description, og_image=excluded.og_image,
    noindex=excluded.noindex, content=excluded.content, updated_at=excluded.updated_at
  returning * into v_saved;
  if not v_exists then
    insert into public.content_revisions(page_slug, version, content, seo)
    values (v_revision.page_slug, v_version, v_saved.content,
      jsonb_build_object('title', v_saved.title, 'description', v_saved.description, 'og_image', v_saved.og_image, 'noindex', v_saved.noindex));
  end if;
  insert into public.admin_audit_logs(action, entity, entity_id, summary)
  values ('restore', 'site_pages', v_revision.page_slug, 'Halaman dipulihkan dari revision');
  return jsonb_build_object('ok', true, 'data', to_jsonb(v_saved), 'revision_version', v_version);
end;
$function$;

create or replace function public.save_tkj_cms_page(
  p_slug text, p_title text, p_description text, p_og_image text, p_noindex boolean, p_content jsonb
)
returns jsonb
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare v_version integer; v_saved public.site_pages%rowtype;
begin
  if p_slug is null or p_slug not in ('/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengembang')
     or p_content is null or jsonb_typeof(p_content) <> 'object' or octet_length(p_content::text) > 100000 then
    raise exception 'Invalid page slug or content' using errcode = '22023';
  end if;
  if p_og_image is not null and p_og_image !~* '^(https?://|storage://)' then
    raise exception 'Invalid page media reference' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tkj-cms:page:' || p_slug, 0));
  select coalesce(max(r.version), 0) + 1 into v_version from public.content_revisions as r where r.page_slug = p_slug;
  insert into public.site_pages(slug, title, description, og_image, noindex, content, updated_at)
  values (p_slug, p_title, p_description, p_og_image, coalesce(p_noindex, false), p_content, now())
  on conflict (slug) do update set title=excluded.title, description=excluded.description, og_image=excluded.og_image,
    noindex=excluded.noindex, content=excluded.content, updated_at=excluded.updated_at
  returning * into v_saved;
  insert into public.content_revisions(page_slug, version, content, seo)
  values (p_slug, v_version, v_saved.content, jsonb_build_object('title', v_saved.title,
    'description', v_saved.description, 'og_image', v_saved.og_image, 'noindex', v_saved.noindex));
  insert into public.admin_audit_logs(action, entity, entity_id, summary)
  values ('save', 'site_pages', p_slug, 'Metadata dan konten halaman disimpan');
  return jsonb_build_object('data', to_jsonb(v_saved), 'revision_version', v_version);
end;
$function$;

create or replace function public.set_tkj_cms_global_asset(p_asset_type text, p_public_url text)
returns jsonb
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare v_current jsonb; v_patch jsonb; v_media_key text;
begin
  if p_asset_type is null or p_asset_type not in ('logo', 'alternate_logo', 'favicon', 'audio', 'background', 'og')
     or p_public_url is null or length(p_public_url) > 2048 or p_public_url !~* '^https?://' then
    raise exception 'Invalid global asset type or URL' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tkj-cms:site-settings', 0));
  select coalesce(s.value, '{}'::jsonb) into v_current from public.site_settings as s where s.key = 'site' for update;
  v_current := coalesce(v_current, '{}'::jsonb);
  if p_asset_type = 'background' then
    v_patch := jsonb_build_object('appearance',
      (case when jsonb_typeof(v_current->'appearance') = 'object' then v_current->'appearance' else '{}'::jsonb end)
      || jsonb_build_object('background_image_url', p_public_url));
  else
    v_media_key := case p_asset_type when 'logo' then 'logo_url' when 'alternate_logo' then 'alternate_logo_url'
      when 'favicon' then 'favicon_url' when 'audio' then 'audio_url' when 'og' then 'og_url' end;
    v_patch := jsonb_build_object('media',
      (case when jsonb_typeof(v_current->'media') = 'object' then v_current->'media' else '{}'::jsonb end)
      || jsonb_build_object(v_media_key, p_public_url));
  end if;
  return public.patch_tkj_cms_site_settings(v_patch);
end;
$function$;

-- RPC privileges: application APIs call these using service_role only.
revoke all on function public.clear_tkj_admin_login_attempts(text) from public, anon, authenticated;
revoke all on function public.consume_tkj_admin_login_attempt(text, integer, integer) from public, anon, authenticated;
revoke all on function public.export_tkj_cms_backup() from public, anon, authenticated;
revoke all on function public.merge_tkj_cms_jsonb(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.patch_tkj_cms_site_settings(jsonb) from public, anon, authenticated;
revoke all on function public.publish_tkj_cms_draft(text) from public, anon, authenticated;
revoke all on function public.replace_tkj_cms_collection(text, jsonb, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.replace_tkj_cms_navigation(jsonb, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.restore_tkj_cms_backup(jsonb) from public, anon, authenticated;
revoke all on function public.restore_tkj_cms_revision(uuid) from public, anon, authenticated;
revoke all on function public.save_tkj_cms_page(text, text, text, text, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.set_tkj_cms_global_asset(text, text) from public, anon, authenticated;
grant execute on function public.clear_tkj_admin_login_attempts(text) to service_role;
grant execute on function public.consume_tkj_admin_login_attempt(text, integer, integer) to service_role;
grant execute on function public.export_tkj_cms_backup() to service_role;
grant execute on function public.merge_tkj_cms_jsonb(jsonb, jsonb) to service_role;
grant execute on function public.patch_tkj_cms_site_settings(jsonb) to service_role;
grant execute on function public.publish_tkj_cms_draft(text) to service_role;
grant execute on function public.replace_tkj_cms_collection(text, jsonb, boolean, jsonb) to service_role;
grant execute on function public.replace_tkj_cms_navigation(jsonb, boolean, jsonb) to service_role;
grant execute on function public.restore_tkj_cms_backup(jsonb) to service_role;
grant execute on function public.restore_tkj_cms_revision(uuid) to service_role;
grant execute on function public.save_tkj_cms_page(text, text, text, text, boolean, jsonb) to service_role;
grant execute on function public.set_tkj_cms_global_asset(text, text) to service_role;

-- The anon role only needs SELECT for public data. No RLS write policies are defined above.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.site_settings, public.anggota, public.galeri, public.guru, public.skills,
  public.site_pages, public.site_navigation, public.site_sections to anon, authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
