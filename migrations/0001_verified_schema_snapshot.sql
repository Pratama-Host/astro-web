-- ============================================================================
-- SNAPSHOT SKEMA SUPABASE TERVerifikasi (hasil introspeksi 2026-11-04)
-- Project yang diperiksa: Supabase project `astro` (Postgres 17.11)
--
-- PENTING:
-- 1) Ini adalah baseline snapshot untuk DATABASE BARU, bukan migration untuk
--    dijalankan ulang ke project `astro` yang sedang aktif.
-- 2) Snapshot ini mereproduksi tabel/index/constraint/RLS/grant/bucket yang
--    benar-benar ditemukan, serta 2 RPC yang definisinya masih ada.
-- 3) Tujuh RPC lain yang dipanggil kode TIDAK ADA di database saat audit.
--    Karena itu file ini BELUM cukup untuk membuat seluruh CMS berfungsi.
--    Lihat docs/RPC_RECONSTRUCTION_BACKLOG.md sebelum membuat baseline final.
-- 4) Skema tabel anggota/galeri pada snapshot ini adalah kondisi database saat
--    inspeksi; migrations/0002_align_schema_with_current_astro_code.sql adalah
--    langkah lanjutan agar tipe/kolom selaras dengan kode Astro saat ini.
-- 5) Jangan jalankan file ini terhadap database produksi yang sudah berisi
--    tabel. Gunakan sebagai referensi / baseline untuk lingkungan kosong.
-- ============================================================================

BEGIN;

-- UUID generator tersedia di PostgreSQL 17.

CREATE TABLE public.admin_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  summary text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id)
);

-- Tabel event rate-limit tidak memiliki primary key pada database aktif.
CREATE TABLE public.admin_login_attempts (
  ip_hash text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_login_attempts_ip_hash_check CHECK (ip_hash ~ '^[0-9a-f]{64}$'::text)
);

CREATE TABLE public.anggota (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nis text NOT NULL,
  nama text NOT NULL,
  kelas text NOT NULL DEFAULT 'XII-9'::text,
  jabatan text,
  deskripsi text,
  foto_url text,
  audio_url text,
  audio_nama text,
  foto_audio_url text,
  deskripsi_audio text,
  social jsonb NOT NULL DEFAULT '{}'::jsonb,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  skills text NOT NULL DEFAULT ''::text,
  visible boolean NOT NULL DEFAULT true,
  CONSTRAINT anggota_pkey PRIMARY KEY (id),
  CONSTRAINT anggota_nis_key UNIQUE (nis)
);

CREATE TABLE public.content_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  page_slug text NOT NULL,
  version integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_revisions_pkey PRIMARY KEY (id),
  CONSTRAINT content_revisions_version_positive CHECK (version > 0),
  CONSTRAINT content_revisions_page_version_unique UNIQUE (page_slug, version)
);

CREATE TABLE public.galeri (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  src text NOT NULL,
  caption text,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT galeri_pkey PRIMARY KEY (id),
  CONSTRAINT galeri_src_key UNIQUE (src)
);

CREATE TABLE public.guru (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  mapel text,
  peran text,
  quote text,
  expertise jsonb NOT NULL DEFAULT '[]'::jsonb,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guru_pkey PRIMARY KEY (id),
  CONSTRAINT guru_nama_key UNIQUE (nama)
);

CREATE TABLE public.media_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  object_path text NOT NULL,
  public_url text NOT NULL,
  filename text NOT NULL,
  title text,
  alt_text text,
  category text NOT NULL DEFAULT 'assets'::text,
  mime_type text NOT NULL DEFAULT 'application/octet-stream'::text,
  size_bytes bigint NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_pkey PRIMARY KEY (id),
  CONSTRAINT media_assets_size_nonnegative CHECK (size_bytes >= 0),
  CONSTRAINT media_assets_object_path_key UNIQUE (object_path)
);

CREATE TABLE public.site_navigation (
  id text NOT NULL,
  label text NOT NULL,
  href text NOT NULL,
  icon text NOT NULL DEFAULT ''::text,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_navigation_pkey PRIMARY KEY (id)
);

CREATE TABLE public.site_page_drafts (
  slug text NOT NULL,
  title text,
  description text,
  og_image text,
  noindex boolean NOT NULL DEFAULT false,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_page_drafts_pkey PRIMARY KEY (slug)
);

CREATE TABLE public.site_pages (
  slug text NOT NULL,
  title text,
  description text,
  og_image text,
  noindex boolean NOT NULL DEFAULT false,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_pages_pkey PRIMARY KEY (slug)
);

CREATE TABLE public.site_sections (
  id text NOT NULL,
  page_slug text NOT NULL,
  section_key text NOT NULL,
  label text NOT NULL DEFAULT ''::text,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_sections_pkey PRIMARY KEY (id),
  CONSTRAINT site_sections_page_section_unique UNIQUE (page_slug, section_key)
);

CREATE TABLE public.site_settings (
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_pkey PRIMARY KEY (key)
);

CREATE TABLE public.skills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  level integer NOT NULL DEFAULT 0,
  icon text,
  deskripsi text,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skills_pkey PRIMARY KEY (id),
  CONSTRAINT skills_level_check CHECK (level >= 0 AND level <= 100),
  CONSTRAINT skills_nama_key UNIQUE (nama)
);

COMMENT ON TABLE public.site_settings IS 'Pengaturan situs dan media global.';
COMMENT ON TABLE public.anggota IS 'Data anggota siswa, NIS, jabatan, profil dan audio.';
COMMENT ON TABLE public.guru IS 'Data guru dan keahlian.';
COMMENT ON TABLE public.skills IS 'Data keterampilan siswa.';
COMMENT ON TABLE public.galeri IS 'Item galeri dan URL media di Supabase Storage.';

-- Index non-constraint yang benar-benar ditemukan pada database aktif.
CREATE INDEX admin_audit_logs_created_at_idx ON public.admin_audit_logs USING btree (created_at DESC);
CREATE INDEX admin_login_attempts_ip_time_idx ON public.admin_login_attempts USING btree (ip_hash, attempted_at DESC);
CREATE INDEX admin_login_attempts_time_idx ON public.admin_login_attempts USING btree (attempted_at);
CREATE INDEX anggota_nama_idx ON public.anggota USING btree (nama);
CREATE INDEX anggota_urutan_idx ON public.anggota USING btree (urutan);
CREATE INDEX content_revisions_page_version_idx ON public.content_revisions USING btree (page_slug, version DESC);
CREATE INDEX galeri_urutan_idx ON public.galeri USING btree (urutan);
CREATE INDEX guru_urutan_idx ON public.guru USING btree (urutan);
CREATE INDEX media_assets_category_idx ON public.media_assets USING btree (category);
CREATE INDEX media_assets_created_at_idx ON public.media_assets USING btree (created_at DESC);
CREATE INDEX site_navigation_enabled_order_idx ON public.site_navigation USING btree (enabled, sort_order);
CREATE INDEX site_page_drafts_updated_idx ON public.site_page_drafts USING btree (updated_at DESC);
CREATE INDEX site_sections_page_order_idx ON public.site_sections USING btree (page_slug, sort_order);
CREATE INDEX skills_urutan_idx ON public.skills USING btree (urutan);

-- RLS aktif pada seluruh 13 tabel. Hanya tiga kebijakan SELECT publik ditemukan.
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_page_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled site navigation"
  ON public.site_navigation FOR SELECT TO anon, authenticated
  USING (enabled IS TRUE);
CREATE POLICY "Public can read site pages"
  ON public.site_pages FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Public can read enabled site sections"
  ON public.site_sections FOR SELECT TO anon, authenticated
  USING (enabled IS TRUE);

-- Replikasi grant aktual. RLS tetap menentukan baris yang boleh diakses.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE
  public.admin_audit_logs,
  public.anggota,
  public.content_revisions,
  public.galeri,
  public.guru,
  public.media_assets,
  public.site_navigation,
  public.site_page_drafts,
  public.site_pages,
  public.site_sections,
  public.site_settings,
  public.skills
TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.admin_login_attempts TO service_role;

-- Dua RPC ini ditemukan apa adanya pada pg_proc; EXECUTE hanya service_role.
CREATE OR REPLACE FUNCTION public.clear_tkj_admin_login_attempts(p_ip_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'IP hash login tidak valid.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('tkj-admin-login'), hashtext(p_ip_hash));
  delete from public.admin_login_attempts where ip_hash = p_ip_hash;
end;
$function$;

CREATE OR REPLACE FUNCTION public.consume_tkj_admin_login_attempt(
  p_ip_hash text,
  p_limit integer DEFAULT 5,
  p_window_seconds integer DEFAULT 300
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
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
  if v_count >= p_limit then return false; end if;
  insert into public.admin_login_attempts (ip_hash, attempted_at) values (p_ip_hash, now());
  return true;
end;
$function$;

REVOKE ALL ON FUNCTION public.clear_tkj_admin_login_attempts(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_tkj_admin_login_attempts(text) TO service_role;
REVOKE ALL ON FUNCTION public.consume_tkj_admin_login_attempt(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_tkj_admin_login_attempt(text, integer, integer) TO service_role;

-- Bucket Storage yang ditemukan: public bucket bernama `astro`; tidak ada
-- policy storage.objects. Upload/delete dilakukan backend menggunakan service_role.
INSERT INTO storage.buckets (id, name, public)
VALUES ('astro', 'astro', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, public = EXCLUDED.public;

COMMIT;
