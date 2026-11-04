# Manifest migration Supabase — astro-web

Tanggal sinkronisasi: 4 November 2026  
Target yang diverifikasi: project Supabase `astro` (`ap-southeast-1`, PostgreSQL 17.11).

Dokumen ini memisahkan **instalasi database kosong** dari **upgrade database yang sudah berjalan**. Jangan memilih file berdasarkan nama atau tanggal saja.

## Status project aktif `astro`

Project aktif memiliki 13 tabel `public`, tujuh RPC CMS, dua RPC login, dan 11 row `site_sections` untuk halaman `/pengembang`. Migration ledger aktif berisi 10 entri, berakhir pada:

| Version ledger | Nama |
|---|---|
| `20261103114611` | `stage3_workflow_20261103` |
| `20261103114812` | `stage3_login_table_20261103` |
| `20261103115304` | `add_anggota_skills_column_20261103` |
| `20261103115418` | `add_anggota_visible_column_20261103` |
| `20261103115549` | `promote_anggota_class_to_xii_20261103` |
| `20261104052811` | `align_schema_with_current_astro_code` |
| `20261104053820` | `restore_cms_rpc_workflows` — entri placeholder kosong dari percobaan awal, dibiarkan apa adanya |
| `20261104053918` | `restore_cms_rpc_workflows_functions` |
| `20261104054021` | `fix_revision_restore_snapshot` |
| `20261104134549` | `fix_nested_site_settings_merge_and_developer_sections` |

Status sesudah migration terakhir diverifikasi langsung:

- 11 section halaman Pengembang tersedia dan `enabled=true` sebagai nilai awal.
- Recursive JSONB merge mempertahankan nilai sibling/anak yang tidak dikirim dalam patch.
- `merge_tkj_cms_jsonb` dan `patch_tkj_cms_site_settings` tetap `SECURITY INVOKER`; `anon` dan `authenticated` tidak memiliki `EXECUTE`, sedangkan `service_role` memilikinya.
- Tidak ada perubahan grants tabel, policy/RLS, bucket Storage, ataupun data anggota/NIS.

**Jangan jalankan baseline atau seed terhadap project aktif. Jangan menghapus atau mengubah ledger secara manual.**

## Urutan kanonik untuk project Supabase yang benar-benar baru

Gunakan urutan di bawah pada project kosong, melalui Supabase SQL Editor. Buka file di repository, salin SQL utuh, jalankan satu per satu dan periksa hasil/error sebelum melanjutkan.

| Urutan | File | Tujuan |
|---:|---|---|
| 1 | `migrations/0001_verified_schema_snapshot.sql` | Baseline tabel, index, constraint, RLS/grants dan Storage bucket yang menjadi fondasi proyek. Khusus project kosong. |
| 2 | `migrations/20261101_cms.sql` | CMS core: halaman, navigasi, section, media assets, revision, audit log dan seed metadata default. |
| 3 | `migrations/0002_align_schema_with_current_astro_code.sql` | Ubah `anggota.skills` menjadi JSONB array dan tambah metadata galeri yang dipakai source terkini. |
| 4 | `migrations/0003_restore_cms_rpc_workflows.sql` | Tambah tujuh RPC CMS backend-only (`SECURITY INVOKER`). |
| 5 | `migrations/0004_fix_revision_restore_snapshot.sql` | Memperbaiki snapshot kondisi aktif sebelum restore revision. |
| 6 | `migrations/0005_fix_nested_settings_merge_and_developer_sections.sql` | Recursive merge pengaturan JSONB dan 11 section awal halaman Pengembang. |
| 7 (opsional) | `migrations/seed.generated.sql` | Isi contoh/dummy awal yang dihasilkan dari `src/data/G.json`; hanya pada project kosong dan setelah review. |

`0001` adalah snapshot schema yang direkam dari Supabase pada 4 November 2026, bukan migration incremental. `20261101_cms.sql` menambahkan CMS core secara additive; `0002` dibutuhkan karena baseline `0001` menangkap tipe awal `anggota.skills` sebagai TEXT. `0003` juga menyediakan RPC login? **Tidak** — dua RPC login dan tabel attempt sudah menjadi bagian snapshot baseline `0001`; `0003` khusus tujuh RPC CMS.

Seed tidak wajib untuk menguji struktur kosong. Jika dipakai, tinjau `seed.generated.sql` dahulu: data di dalamnya adalah contoh/placeholder, bukan data riil.

## File historis yang tidak menjadi urutan kanonik

| File | Status/penggunaan |
|---|---|
| `schema.sql` | Schema inti generasi awal. Jangan jalankan bersama baseline `0001`; keduanya sama-sama membentuk schema. |
| `20261103_kelas_xii.sql` | Transisi data historis dari label XI-9 menjadi XII-9. Relevan untuk upgrade data lama, bukan project kosong yang telah memakai XII-9 sejak awal. |
| `20261103_site_cleanup.sql` | Membersihkan key runtime lama (`baseUrl`, `countdown`) pada `site_settings`; migration pemeliharaan historis, bukan prasyarat baseline kosong. |
| `20261103_stage3_workflow.sql` | Versi additive lama untuk tabel draft. Baseline `0001` sudah memiliki tabel draft. |
| `20261103_stage3_hardening.sql` | Versi lama setup login RPC/rate limit. Baseline `0001` sudah menyertakan tabel dan dua RPC login; jangan gunakan untuk menimpa baseline tanpa audit. |
| `20261103_stage4_developer_and_global_asset.sql` | **DEPRECATED — jangan dijalankan.** Mendefinisikan ulang function sebagai `SECURITY DEFINER` dan memiliki strategi konflik seed lama. Digantikan oleh `0003` + `0005`. |

## Prosedur upgrade database yang sudah berjalan

1. Catat project ref dan periksa migration history di **Supabase Dashboard → Database → Migrations**.
2. Pastikan backup database dan backup file Storage tersedia. JSON CMS backup tidak menyertakan binary media.
3. Cocokkan struktur tabel/function saat ini dengan efek migration yang hendak diterapkan. Jangan jalankan `0001`, `schema.sql`, atau `seed.generated.sql` pada database berisi data.
4. Terapkan hanya migration yang belum ada dan memang diperlukan. Perhatikan bahwa file lokal `0002`–`0005` adalah catatan implementasi yang dipetakan ke versi ledger bernama; nama/version di ledger tidak selalu identik dengan nama file lokal.
5. Jalankan verifikasi pasca-migration: jumlah row yang relevan, signature function, `SECURITY INVOKER`, ACL function, dan Supabase Advisors.
6. Catat hasil dan version ledger baru di dokumen ini.

Untuk project `astro` aktif, langkah 4 untuk migration `0005` **sudah selesai** pada version `20261104134549`. Jangan menerapkannya kembali secara manual.

## Verifikasi minimum

Sesudah instalasi/upgrade, periksa:

- tabel yang diharapkan tersedia di schema `public`;
- `anggota.skills` bertipe `jsonb` dan nilai berupa array;
- `galeri` mempunyai `title`, `description`, `category`, `taken_at`, `alt_text`, `visible`;
- ketujuh RPC CMS dan kedua RPC login ditemukan;
- 11 section `/pengembang` tidak duplikat berdasarkan `(page_slug, section_key)`;
- fungsi patch pengaturan menggunakan recursive merge dan tidak menghapus nested properties yang tidak disentuh;
- key `SUPABASE_SERVICE_KEY` hanya ada pada secret runtime server, tidak dalam source/browser;
- browser Preview dan seluruh workflow CMS diuji sebelum dipromosikan.

Catatan keamanan yang disepakati untuk tahap pengembangan: jangan mengubah grants/RLS/bucket pada project aktif tanpa pekerjaan khusus berikutnya. Data NIS yang saat ini disimpan/ditampilkan adalah dummy/placeholder menurut pemilik proyek; jangan menggantinya dengan NIS riil sebelum desain publikasi ditinjau ulang.
