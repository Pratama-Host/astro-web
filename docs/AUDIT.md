# Laporan Audit dan Perubahan Astro Web TKJ XII-9

Tanggal audit: 6 November 2026  
Proyek Supabase: `astro` (`qwffhznzcjorhapzzklr`), PostgreSQL 17.11  
Lingkup: ZIP proyek yang diterima, skema `public`, bucket Storage `astro`, keamanan data publik, CMS admin, dan pemeriksaan statis. Tidak ada `npm install`, build, deploy, atau eksekusi tes Vitest.

## Ringkasan backup sebelum perubahan

Sebelum mutasi database pertama, `public.export_tkj_cms_backup()` berhasil dipanggil dan JSONB yang dikembalikan berukuran **86.928 byte**. Ringkasan awal: anggota 20, galeri 20, guru 3, skills 6, site_settings 1, site_sections 11, site_navigation 7, media_assets 1, content_revisions 8, admin_audit_logs 16, site_pages 0, site_page_drafts 0.

Payload mentah tidak dimasukkan ke ZIP karena berisi data personal siswa dan log admin. Catatan penting: tool SQL pada sesi ini hanya mempertahankan ringkasan agregat yang dicatat di bawah, bukan file dump unduhan terpisah. Sebelum perubahan database berikutnya, simpan hasil `SELECT public.export_tkj_cms_backup();` dari Supabase SQL Editor sebagai file JSON di perangkat. Jadi, pemanggilan fungsi backup sudah diverifikasi, tetapi artefak dump mentah tidak dilampirkan.

## A. Rekonstruksi `migrations/`

**Status: SEBAGIAN.** `supabase/migrations/20261106000100_baseline.sql` direkonstruksi dari introspeksi database aktif dan definisi fungsi live. File mencakup 13 tabel beserta kolom, PK/unique/check constraints, index, RLS, sembilan policy, 12 fungsi/RPC dan privilege fungsi, serta bucket `astro`. Snapshot live: 24 constraints, 33 index, 0 view publik, 0 trigger aplikasi pada `public`, dan 12 fungsi `public`. Baseline ditujukan untuk project Supabase kosong dan **tidak dijalankan pada database aktif**.

Supabase Storage mempunyai trigger internal yang dikelola Supabase pada `storage.buckets`/`storage.objects` (antara lain `enforce_bucket_name_length_trigger`, `enforce_versioning_status_transition`, `protect_active_lifecycle_states`, `protect_bucket_control_insert`, `protect_bucket_control_update`, `protect_bucket_control_update_role`, `protect_buckets_delete`, `wake_lifecycle_on_policy_write`, `wake_lifecycle_on_versioning_enable`, `protect_objects_delete`, `update_objects_updated_at`). Trigger sistem tersebut tidak dibuat ulang oleh migration aplikasi. Tidak ada custom trigger pada `public` dan tidak ada view publik.

File tambahan `0002`–`0005` mencatat perubahan yang diterapkan ke database aktif. Riwayat migrasi Supabase memuat 12 migrasi lama ditambah empat migrasi baru. Nama rujukan lama yang diminta untuk diselaraskan tidak ditemukan lagi dalam pencarian source/tests/README.

**Risiko/batas verifikasi:** baseline dibandingkan secara struktural terhadap metadata dan definisi fungsi live, tetapi tidak diuji dari nol pada database disposable. Jangan jalankan `supabase/migrations/20261106000100_baseline.sql` pada database yang sudah berisi tabel/data; gunakan hanya untuk project baru.

## B. Kesesuaian kode dan database

**Status: SELESAI.** Tabel dan RPC yang dipanggil kode ditemukan pada database. Kekurangan nyata yang ditemukan adalah empat baris konfigurasi section beranda (`hero`, `stats`, `teachers`, `about`); empat baris itu ditambahkan dengan `ON CONFLICT DO NOTHING` dan diverifikasi. Tidak ditemukan tabel/kolom/RPC yang masih hilang setelah rekonsiliasi. Pembacaan publik kini memakai client anon; API admin dan preview draft terotorisasi tetap memakai client service-role di server.

## C. Keamanan

**Status: SEBAGIAN.** RLS aktif pada 13/13 tabel. Sembilan policy SELECT publik membatasi pembacaan ke data yang dipublikasikan dan metadata visibilitas section; lima tabel internal (draft, revisi, audit, percobaan login, metadata media) sengaja tidak memiliki policy baca publik. Pengujian dengan `SET LOCAL ROLE anon` berhasil membaca settings 1, anggota 20, galeri 20, guru 3, skills 6, navigasi 7, section beranda 4, dan pages 0. Uji tambahan mematikan `home.about` sementara di dalam transaksi, lalu membuktikan anon tetap membaca baris `enabled=false`; percobaan UPDATE oleh anon menghasilkan 0 baris. Uji tulis settings juga menghasilkan 0 baris update dan INSERT ditolak; draft/revisi/audit tidak terlihat; SELECT login attempt ditolak.

Catatan hardening yang belum diterapkan:
- `anon` masih memiliki privilege SQL INSERT/UPDATE/DELETE pada sejumlah tabel, tetapi tidak ada policy RLS untuk menulis sehingga percobaan write ditolak oleh RLS. Pencabutan grant (`REVOKE`) tidak dilakukan karena perubahan database dibatasi aditif.
- Bucket `astro` bersifat public, tanpa batas ukuran atau daftar MIME di konfigurasi bucket. `storage.objects` memiliki RLS aktif dan tidak memiliki policy; anon memiliki grant tabel bawaan, tetapi tidak ada policy yang memberi hak tulis. Pembacaan object publik memang terbuka melalui URL bucket public. Upload tetap melalui API admin; kode membatasi file 20 MB, body 22 MB, memeriksa signature file, serta menolak SVG/HTML/script. Konfigurasi bucket sebaiknya diperketat setelah uji kompatibilitas semua aset.
- Cookie sesi admin `HttpOnly`, `SameSite=Strict`, TTL 8 jam, `Secure` pada production; validasi mutasi memeriksa Origin. Login memakai rate limit 5 percobaan per 300 detik dengan hash IP.
- CSP masih mengandung `'unsafe-inline'` pada script/style dan `connect-src https:` masih luas. Sengaja tidak diubah tanpa uji nonce/hash dan report-only.

Supabase advisor hanya melaporkan lima tabel privat yang RLS-nya aktif tanpa policy, sesuai rancangan akses privat. Langkah ponsel sebelum deploy: isi `SUPABASE_ANON_KEY` di Cloudflare Workers Variables sebagai publishable/anon key. Pertahankan `SUPABASE_SERVICE_KEY` sebagai secret server-side; jangan masukkan ke browser atau repository.

## D. Konsistensi konten

**Status: SEBAGIAN.** Anggota 20, galeri 20, guru 3, skills 6: tidak ditemukan nama kosong, placeholder umum, atau URL `/assets/` lama di baris database. Ada 19 galeri yang sebelumnya tanpa `title` dan `alt_text`; keduanya diisi dari `caption` yang sudah ada. Verifikasi akhir: 20/20 memiliki caption, title, dan alt text. Tidak ada foto, caption, urutan, atau baris yang dihapus.

`site_settings` berisi visi, lima misi, dan lima prestasi dengan gaya bercanda. Isi tersebut dipertahankan karena merupakan konten yang sudah tersimpan, bukan placeholder teknis. Kolom opsional yang tetap kosong: audio pada 19 anggota, jabatan pada 12 anggota, array skills anggota pada 20 anggota, deskripsi pada 20 galeri. Tidak dibuat nilai rekaan. `site_pages` dan `site_page_drafts` masing-masing kosong (0 baris).

Koreksi hitung aset fallback: perhitungan ulang terhadap ZIP input menunjukkan **31 occurrence** `/assets/` di `src/data/G.json` (angka 29 yang sempat disebut sebelumnya adalah hitungan awal yang kurang). Semuanya diganti dengan referensi `storage://` ke object path yang ada di bucket `astro`; tidak ada file media yang diganti. Hasil akhir: 0 referensi `/assets/` dan 31 referensi `storage://` di JSON tersebut.

## E. Section `about` beranda

**Status: SELESAI.** `/:about` ditambahkan ke `ALLOWED` pada `src/pages/api/admin/sections.ts`. Database berisi section `/` untuk Hero, Statistik kelas, Tim pengajar, dan Visi, Misi & Prestasi. UI admin menggunakan renderer generik untuk field urutan dan toggle tampil. Policy baru `Public can read section visibility metadata` diperlukan agar halaman publik juga menerima baris `enabled=false`; hal ini diuji dalam transaksi rollback dan hasilnya terbukti.

## F. Tes

**Status: SEBAGIAN.** Ditambahkan `tests/data-mappers.test.ts` untuk mapper anggota/galeri dan resolusi Storage, serta `tests/cms-admin-helpers.test.ts` untuk helper teks, record, dan pembatasan byte request. Keduanya memakai API Vitest yang sudah dipakai repo. **Belum dijalankan** karena tidak ada install/build/test sesuai batasan. Pemecahan `src/scripts/admin.js`, perubahan CI, dan aktivasi lint ditunda. Alias tipe lokal yang tidak dipakai pada backup API dihapus.

## G. Performa

**Status: DITUNDA.** Tidak ada RPC/view agregat baru atau pengurangan query. Kesetaraan hasil harus dibuktikan dengan query uji terhadap baseline aktual sebelum menggabungkan pembacaan settings, members, gallery, teachers, skills, navigasi, sections, dan SEO/content.

## Perubahan file utama

- `supabase/migrations/20261106000100_baseline.sql` sampai `supabase/migrations/20261106000500_public_section_visibility_metadata.sql`.
- `src/lib/supabase.ts`: client publik berbasis `SUPABASE_ANON_KEY`; client admin tetap service-role.
- `src/lib/data.ts`: pembacaan normal memakai anon/RLS; preview draft hanya memakai service-role setelah otorisasi admin.
- `.env.example`, `src/env.d.ts`, `README.md`: dokumentasi variable anon baru.
- `src/pages/api/admin/sections.ts` dan `src/pages/pengembang/admin.astro`.
- `src/data/G.json`: 31 referensi aset fallback diperbaiki.
- Dua tes baru di `tests/`.

Tidak ada dependensi/versi `package.json` yang berubah; file `package.json` sama persis dengan ZIP input. Tidak dibuat `package-lock.json`. Tidak ada file `.env` yang dimasukkan.

## Hasil verifikasi statis a–f

| Pemeriksaan | Hasil |
|---|---|
| a. `node --check` seluruh JS/MJS | **21 file, 0 error** |
| b. TypeScript compiler API `createSourceFile` + `parseDiagnostics` | **34 file TS + 21 frontmatter + 16 inline script pada 23 Astro, 0 parse error** |
| c. `JSON.parse` + keseimbangan CSS | **6 JSON valid; 24 CSS seimbang** |
| d. `tsc --noEmit --allowJs --checkJs --noUnusedLocals --noUnusedParameters` | **Tidak bisa dijalankan persis sebagai project check:** repo tidak memiliki `tsconfig.json` dan perintah tanpa daftar input hanya menampilkan bantuan CLI. Pemeriksaan best-effort dengan 55 input `.ts/.js/.mjs`, target ES2022 dan moduleResolution bundler menghasilkan 309 diagnostic: 45 TS2307 (modul tidak tersedia, diabaikan sesuai instruksi) dan 264 diagnostic lain yang banyak merupakan efek tipe Node/Astro/Supabase yang tidak terpasang. Diagnostic noUnused (TS6133/6196/6192/6198) = 0. TypeScript CLI global 5.8.3. |
| e. Referensi lama/dihapus | **0 temuan** untuk nama migrasi lama. `src/data/G.json` tidak lagi menyimpan path `/assets/`; pengecekan `/assets/` pada mapper/API tetap ada secara sengaja untuk menolak URL usang, dan `scripts/migrate-data.mjs` mempertahankan path lama hanya sebagai input migrasi. Cross-reference: 11/11 komponen Astro, 16/16 script, 24/24 stylesheet mempunyai pemakai teks. 12 export yang tidak tampak lintas-file telah diperiksa: dipakai internal, konvensi middleware Astro, atau tipe internal; tidak ada bukti kode mati yang baru ditemukan. |
| f. Import relatif | **164 referensi, 0 target hilang** |

Pemeriksaan TypeScript semantik belum hijau/konklusif; 264 diagnostic non-TS2307 perlu diverifikasi setelah dependency dan type definitions tersedia. Perintah exact tanpa tsconfig belum dapat memproses project files. Build, `astro check`, dan Vitest tidak dijalankan.

## SQL Supabase yang dijalankan

Sebelum SQL pertama, backup diekspor dan ringkasannya dicatat di atas. Empat perubahan database berikut diterapkan; tidak ada `DROP`, `TRUNCATE`, atau penghapusan data.

### Migrasi `20261106121320_home_section_controls`

```sql
insert into public.site_sections
  (id, page_slug, section_key, label, sort_order, enabled, updated_at)
values
  ('home.hero', '/', 'hero', 'Hero', 0, true, now()),
  ('home.stats', '/', 'stats', 'Statistik kelas', 1, true, now()),
  ('home.teachers', '/', 'teachers', 'Tim pengajar', 2, true, now()),
  ('home.about', '/', 'about', 'Visi, Misi & Prestasi', 3, true, now())
on conflict (page_slug, section_key) do nothing;
```

### Migrasi `20261106121753_public_read_only_rls`

```sql
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='site_settings'
      AND policyname='Public can read published site settings'
  ) THEN
    CREATE POLICY "Public can read published site settings"
      ON public.site_settings FOR SELECT TO anon, authenticated
      USING (key = 'site');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='anggota'
      AND policyname='Public can read visible members'
  ) THEN
    CREATE POLICY "Public can read visible members"
      ON public.anggota FOR SELECT TO anon, authenticated
      USING (visible IS TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='galeri'
      AND policyname='Public can read visible gallery'
  ) THEN
    CREATE POLICY "Public can read visible gallery"
      ON public.galeri FOR SELECT TO anon, authenticated
      USING (visible IS TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='guru'
      AND policyname='Public can read teachers'
  ) THEN
    CREATE POLICY "Public can read teachers"
      ON public.guru FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='skills'
      AND policyname='Public can read skills'
  ) THEN
    CREATE POLICY "Public can read skills"
      ON public.skills FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END
$migration$;
```

### Migrasi `20261106122747_gallery_metadata_from_caption`

```sql
UPDATE public.galeri
SET
  title = COALESCE(NULLIF(BTRIM(title), ''), BTRIM(caption)),
  alt_text = COALESCE(NULLIF(BTRIM(alt_text), ''), BTRIM(caption)),
  updated_at = now()
WHERE NULLIF(BTRIM(caption), '') IS NOT NULL
  AND (
    NULLIF(BTRIM(title), '') IS NULL
    OR NULLIF(BTRIM(alt_text), '') IS NULL
  );
```

### Migrasi `20261106130115_public_section_visibility_metadata`

```sql
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_sections'
      AND policyname = 'Public can read section visibility metadata'
  ) THEN
    CREATE POLICY "Public can read section visibility metadata"
      ON public.site_sections
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END
$migration$;
```

### Query pembuktian akses anon (read/write dan privasi)

Query berikut dijalankan dengan transaksi rollback agar tidak meninggalkan data uji:

```sql
BEGIN;
SET LOCAL ROLE anon;
SELECT jsonb_build_object(
  'site_settings_rows', (SELECT count(*) FROM public.site_settings WHERE key='site'),
  'anggota_rows', (SELECT count(*) FROM public.anggota),
  'galeri_rows', (SELECT count(*) FROM public.galeri),
  'guru_rows', (SELECT count(*) FROM public.guru),
  'skills_rows', (SELECT count(*) FROM public.skills),
  'home_sections_rows', (SELECT count(*) FROM public.site_sections WHERE page_slug='/'),
  'navigation_rows', (SELECT count(*) FROM public.site_navigation),
  'site_pages_rows', (SELECT count(*) FROM public.site_pages)
) AS anon_public_read_test;
ROLLBACK;
```

Hasil: settings 1, anggota 20, galeri 20, guru 3, skills 6, section beranda 4, navigasi 7, site_pages 0. Uji UPDATE publik mempengaruhi 0 baris; INSERT ditolak privilege/RLS. Query atas draft/revisi/audit menghasilkan 0; SELECT login attempt ditolak.

Uji khusus kontrol section dilakukan dengan menonaktifkan `home.about` oleh role database di dalam transaksi, mengganti role menjadi `anon`, lalu mencoba mengaktifkannya kembali. Hasilnya: `anon_reads_disabled_about=true`, `anon_update_affected_rows=0`; transaksi di-rollback sehingga status aslinya tetap `enabled=true`.

```sql
BEGIN;
UPDATE public.site_sections SET enabled = false WHERE id = 'home.about';
SET LOCAL ROLE anon;
WITH updated AS (
  UPDATE public.site_sections SET enabled = true WHERE id = 'home.about' RETURNING id
)
SELECT jsonb_build_object(
  'anon_update_affected_rows', (SELECT count(*) FROM updated),
  'anon_reads_disabled_about', (
    SELECT enabled IS FALSE FROM public.site_sections WHERE id = 'home.about'
  )
) AS section_visibility_test;
ROLLBACK;
```

## Langkah deploy melalui ponsel

1. Buka Cloudflare Dashboard → Workers & Pages → worker proyek ini → Settings → Variables and Secrets.
2. Tambahkan `SUPABASE_ANON_KEY` dengan publishable/anon key dari proyek Supabase yang sama. `SUPABASE_URL` harus menunjuk proyek itu.
3. Pastikan `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, dan `ADMIN_SESSION_SECRET` tetap tersimpan sebagai secret server-side. Jangan memasukkan nilainya ke file atau frontend.
4. Deploy ZIP setelah meninjau hasilnya. Jangan jalankan `supabase/migrations/20261106000100_baseline.sql` pada database aktif; migrasi `0002`–`0005` sudah diterapkan ke database yang diaudit.
5. Setelah deploy, cek beranda, anggota, galeri, guru, skills, SEO, lalu login admin dan toggle section Visi/Misi/Prestasi.
