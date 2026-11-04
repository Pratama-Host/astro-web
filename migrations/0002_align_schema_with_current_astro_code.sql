-- Menyamakan dua bagian skema yang berbeda dari asumsi kode Astro saat ini.
-- Sudah diperiksa terhadap database `astro` pada 2026-11-04:
--   anggota.skills: TEXT; 19 kosong, 1 non-kosong valid sebagai JSON array.
--   galeri: tidak memiliki title/description/category/taken_at/alt_text/visible.
-- Migration ini berhasil diterapkan ke project Supabase `astro` pada 2026-11-04.
-- Catatan: default TEXT lama harus di-DROP sebelum ALTER TYPE ke jsonb.

BEGIN;

DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.anggota
    WHERE NULLIF(BTRIM(skills), '') IS NOT NULL
      AND NOT pg_input_is_valid(BTRIM(skills), 'jsonb')
  ) THEN
    RAISE EXCEPTION 'Migration dibatalkan: ada nilai anggota.skills non-kosong yang bukan JSON valid.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.anggota
    WHERE NULLIF(BTRIM(skills), '') IS NOT NULL
      AND CASE
        WHEN pg_input_is_valid(BTRIM(skills), 'jsonb')
          THEN jsonb_typeof(BTRIM(skills)::jsonb) <> 'array'
        ELSE false
      END
  ) THEN
    RAISE EXCEPTION 'Migration dibatalkan: semua nilai anggota.skills non-kosong harus berupa JSON array.';
  END IF;
END;
$preflight$;

ALTER TABLE public.anggota
  ALTER COLUMN skills DROP DEFAULT;
ALTER TABLE public.anggota
  ALTER COLUMN skills TYPE jsonb
  USING CASE
    WHEN NULLIF(BTRIM(skills), '') IS NULL THEN '[]'::jsonb
    ELSE BTRIM(skills)::jsonb
  END;
ALTER TABLE public.anggota
  ALTER COLUMN skills SET DEFAULT '[]'::jsonb;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.anggota'::regclass
      AND conname = 'anggota_skills_is_array_check'
  ) THEN
    ALTER TABLE public.anggota
      ADD CONSTRAINT anggota_skills_is_array_check
      CHECK (jsonb_typeof(skills) = 'array');
  END IF;
END;
$constraint$;

ALTER TABLE public.galeri ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.galeri ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.galeri ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Kegiatan'::text;
ALTER TABLE public.galeri ADD COLUMN IF NOT EXISTS taken_at date;
ALTER TABLE public.galeri ADD COLUMN IF NOT EXISTS alt_text text;
ALTER TABLE public.galeri ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;

COMMIT;
