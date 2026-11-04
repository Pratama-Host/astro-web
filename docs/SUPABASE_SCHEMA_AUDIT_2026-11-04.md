# Audit skema Supabase xi9-mubela — 4 November 2026

## Ringkasan

Project Supabase yang dapat diakses: **`astro`**, status `ACTIVE_HEALTHY`, region `ap-southeast-1`, PostgreSQL **17.11**. Repository ZIP bernama `xi9-mubela` dan `package.json` menunjuk repo `Pratama-Host/xi9-mubela`, sehingga project Supabase ini dipakai sebagai target perbandingan.

Pemeriksaan database bersifat read-only. Tidak ada DDL, data, policy, bucket, atau function yang diubah pada database aktif.

| Item | Hasil aktual |
|---|---:|
| Tabel di `public` | 13 |
| RPC TKJ yang dirujuk kode | 9 |
| RPC ditemukan di database | 2 |
| RPC tidak ditemukan | 7 |
| Migration tercatat pada Supabase | 5 |
| Policy RLS pada `public` | 3 |
| Bucket Storage | `astro` (public) |

## Temuan utama

### 1. Klaim "migration kosong" benar untuk ZIP, tetapi tidak untuk database

Folder `migrations/` pada ZIP kosong. Database aktif justru mencatat migration berikut:

- `20261103114611` — `stage3_workflow_20261103`
- `20261103114812` — `stage3_login_table_20261103`
- `20261103115304` — `add_anggota_skills_column_20261103`
- `20261103115418` — `add_anggota_visible_column_20261103`
- `20261103115549` — `promote_anggota_class_to_xii_20261103`

Jadi risiko reproducibility tetap nyata: file SQL migration yang menjelaskan database tidak ikut dalam repository, walaupun sebagian riwayat migration tercatat pada project aktif.

### 2. Tujuh RPC yang dipanggil aplikasi tidak ada

Source code merujuk 9 RPC, tetapi introspeksi `pg_proc` hanya menemukan dua fungsi rate-limit login: `consume_tkj_admin_login_attempt` dan `clear_tkj_admin_login_attempts`. Tujuh fungsi workflow/CMS tidak ditemukan:

- `set_tkj_cms_global_asset`
- `export_tkj_cms_backup`
- `restore_tkj_cms_backup`
- `patch_tkj_cms_site_settings`
- `save_tkj_cms_page`
- `publish_tkj_cms_draft`
- `restore_tkj_cms_revision`

Dampak yang dapat dipastikan dari source: operasi update global site settings, menyimpan metadata halaman, publish draft, restore revision, backup export/import, serta update aset global akan gagal saat RPC dipanggil. Ini harus menjadi blocker sebelum menyatakan CMS siap dipakai penuh.

### 3. Dua perbedaan struktur tabel terhadap kode

**`anggota.skills`:** database bertipe `TEXT`, default string kosong. Endpoint `anggota.ts` selalu membentuk `skills` sebagai array dan mengirimnya langsung lewat `upsert`/`update`; `data.ts` juga membaca nilai itu sebagai array. Pemeriksaan isi tanpa mengambil data personal: 20 row, 19 nilai kosong, 1 nilai non-kosong; satu nilai non-kosong tersebut valid sebagai JSON array. Migration `0002` mengubahnya menjadi `jsonb` dengan preflight guard.

**`galeri`:** database hanya memiliki `id, src, caption, urutan, created_at, updated_at`. Source `gallery.ts` menulis `title, caption, description, category, taken_at, alt_text, visible, updated_at`. Endpoint upload memiliki fallback untuk insert ketika kolom baru belum ada, tetapi endpoint update galeri tidak memiliki fallback tersebut. Akibatnya update metadata/visibilitas dari admin akan gagal pada skema aktual. Migration `0002` menambah enam kolom yang dibutuhkan.

### 4. Struktur tabel lain

Tabel berikut ditemukan sesuai nama yang dipakai kode: `site_settings`, `site_pages`, `site_page_drafts`, `site_navigation`, `site_sections`, `media_assets`, `content_revisions`, `admin_audit_logs`, `guru`, `skills`, ditambah `admin_login_attempts`. Tidak ditemukan foreign key atau trigger pada tabel `public`; aplikasi/RPC mengisi `updated_at` secara eksplisit.

`admin_login_attempts` memiliki kolom `ip_hash text` dan `attempted_at timestamptz`, CHECK untuk hash heksadesimal 64 karakter, dua index, dan **tidak memiliki primary key**.

### 5. RLS, grants, dan Storage

Semua 13 tabel `public` mengaktifkan RLS. Policy yang ditemukan hanya:

- SELECT publik untuk `site_navigation` jika `enabled IS TRUE`;
- SELECT publik untuk `site_pages`;
- SELECT publik untuk `site_sections` jika `enabled IS TRUE`.

`anon` dan `authenticated` memiliki table grants yang luas pada tabel selain `admin_login_attempts`, tetapi RLS tanpa policy tetap menolak akses row. `service_role` memiliki CRUD dan menjadi jalur akses backend menurut `src/lib/supabase.ts`. Dua RPC login juga hanya dapat dieksekusi `service_role`.

Bucket `astro` adalah public; tidak ada policy `storage.objects` pada database. Ini konsisten dengan upload/pengelolaan Storage dilakukan oleh backend menggunakan service role, sementara URL objek dapat dibaca publik.

### 6. Hasil Supabase Advisors

**Security:** sepuluh tabel dengan RLS aktif tetapi tanpa policy (INFO): `admin_audit_logs`, `admin_login_attempts`, `anggota`, `content_revisions`, `galeri`, `guru`, `media_assets`, `site_page_drafts`, `site_settings`, `skills`. Untuk pola backend-only/service-role yang tampak di source, kondisi tanpa policy ini memang mencegah akses row melalui `anon`/`authenticated`; jangan menambah policy publik secara generik.

**Performance:** `admin_login_attempts` tidak memiliki primary key (INFO); empat index belum terpakai terdeteksi pada `site_page_drafts_updated_idx`, `media_assets_category_idx`, `anggota_urutan_idx`, `anggota_nama_idx`. Jangan hapus index hanya berdasarkan snapshot penggunaan singkat.

### 7. Catatan reproduksi saat ini

- `.nvmrc` mengunci Node `24.22.1`; pemeriksaan lokal pada container ini menggunakan Node `22.16.0`, jadi test/build tidak dijalankan.
- `package.json` tidak memiliki lockfile `package-lock.json`; CI masih memakai `npm install` menurut `.github/workflows/ci.yml`.
- `README.md` tidak ada dan folder `docs/` sebelumnya kosong.
- Supabase mengubah default exposure Data API: tabel baru pada schema `public` tidak lagi otomatis diekspos; perubahan diberlakukan ke semua project pada **30 Oktober 2026**. Saat membuat project baru/replay migration, cek pengaturan Data API untuk schema `public` dan grants-nya. RLS dan exposure adalah dua lapisan berbeda.

## File hasil kerja

- `migrations/0001_verified_schema_snapshot.sql`: baseline snapshot berdasarkan tabel, index, constraint, policy, grant, bucket dan dua RPC yang benar-benar teramati. Ini bukan migration untuk database aktif dan belum melengkapi seluruh RPC CMS.
- `migrations/0002_align_schema_with_current_astro_code.sql`: migration lanjutan untuk `anggota.skills` dan kolom metadata `galeri`; berhasil diterapkan dan diverifikasi pada project aktif 2026-11-04.
- `docs/RPC_RECONSTRUCTION_BACKLOG.md`: daftar tujuh RPC yang hilang beserta signature dan kontrak yang terlihat dari pemanggil di source.
- `migrations/0003_restore_cms_rpc_workflows.sql`: kandidat rekonstruksi tujuh RPC; belum diterapkan ke project aktif.
- `tests/supabase-cms-rpc-smoke.sql`: uji transaksional rollback-only untuk migration 0003.

## Langkah yang disarankan

1. Amankan SQL export/backup database dan cari definisi SQL asli Stage 3/Stage 4 dari Git history atau mesin pengembang.
2. Migration `0002` sudah diterapkan dan diverifikasi pada project aktif.
3. Tinjau migration rekonstruksi `0003_restore_cms_rpc_workflows.sql`, uji di staging dengan `tests/supabase-cms-rpc-smoke.sql`, lalu deploy terkontrol.
4. Susun baseline final dan uji 15 endpoint admin sebelum menyatakan recovery-from-zero selesai.

## Referensi

- Audit statis berdasarkan `ass.zip` dan dokumen audit yang diunggah.
- Introspeksi live Supabase: `information_schema`, `pg_catalog`, `pg_policies`, `pg_indexes`, `pg_constraint`, migration list, Storage bucket, dan Supabase Advisors pada 2026-11-04.
- Supabase Changelog — *Tables not exposed to Data and GraphQL API automatically*: https://supabase.com/changelog?types=breaking-change (perubahan exposure diberlakukan untuk semua project pada 2026-10-30).
