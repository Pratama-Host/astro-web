# Audit skema Supabase astro-web — status 4 November 2026

## Target dan metode

Project yang diperiksa: **`astro`**, status `ACTIVE_HEALTHY`, region `ap-southeast-1`, PostgreSQL `17.11`. Pemeriksaan menggabungkan introspeksi database dan verifikasi migration terbaru pada 4 November 2026.

## Kondisi database aktif sesudah migration terakhir

| Item | Kondisi terverifikasi |
|---|---:|
| Tabel `public` | 13 |
| RPC aplikasi yang dirujuk source | 9/9 tersedia (7 CMS + 2 login) |
| Migration ledger | 10, terakhir `20261104134549` |
| Section CMS `/pengembang` | 11 row, sort order 0–10 |
| Policy RLS `public` | 3 |
| Bucket Storage | `astro` (public) |
| `anggota` | 20 row |
| `galeri` | 19 row |
| `site_pages` | 0 row pada snapshot pemeriksaan |
| `site_sections` | 11 row untuk `/pengembang` setelah migration terbaru |

Migration terakhir: `20261104134549 fix_nested_site_settings_merge_and_developer_sections`.

### Hal yang sudah diperbaiki dan diuji

1. **Recursive nested settings patch.** Sebelum fix, `patch_tkj_cms_site_settings` menggunakan operator `jsonb ||` yang hanya menggabungkan tingkat teratas. Migration baru menambahkan `merge_tkj_cms_jsonb` untuk menggabungkan object secara rekursif. Array dan scalar pada patch tetap menggantikan nilai lama sebagai satu kesatuan. Uji read-only membuktikan sibling di dalam `appearance`, `palettes.dark`, `media`, dan `footer` tetap ada saat hanya satu properti diubah.
2. **Seed section Pengembang.** Sebelas section telah dimasukkan/upsert berdasarkan `(page_slug, section_key)` agar baris `story` lama tidak menghasilkan duplikasi.
3. **Hak function.** Kedua function terkait merge diverifikasi `SECURITY INVOKER`. `anon` dan `authenticated` tidak memiliki EXECUTE; `service_role` memilikinya.
4. **RPC CMS tersedia.** Tujuh RPC CMS yang dipakai endpoint dan dua RPC login ditemukan. Entri ledger placeholder `20261104053820` dibiarkan, sementara implementasi RPC CMS aktif tercatat pada `20261104053918` dan perbaikan lanjutannya.

## Struktur dan migration ledger

Ledger aktif:

- `20261103114611 stage3_workflow_20261103`
- `20261103114812 stage3_login_table_20261103`
- `20261103115304 add_anggota_skills_column_20261103`
- `20261103115418 add_anggota_visible_column_20261103`
- `20261103115549 promote_anggota_class_to_xii_20261103`
- `20261104052811 align_schema_with_current_astro_code`
- `20261104053820 restore_cms_rpc_workflows` (placeholder kosong dari percobaan awal)
- `20261104053918 restore_cms_rpc_workflows_functions`
- `20261104054021 fix_revision_restore_snapshot`
- `20261104134549 fix_nested_site_settings_merge_and_developer_sections`

Panduan fresh install dan upgrade terpisah ada pada [`MIGRATIONS.md`](MIGRATIONS.md). File `20261103_stage4_developer_and_global_asset.sql` ditandai legacy/deprecated dan tidak boleh dijalankan karena definisi function lama memakai `SECURITY DEFINER` dan seed conflict strategy lama.

## Keamanan dan batas perubahan

Database aktif mengaktifkan RLS pada 13 tabel. Sebelumnya ditemukan 10 tabel tanpa policy dan grants `anon`/`authenticated` yang lebih luas daripada kebutuhan backend. Status tersebut **sengaja tidak diubah** pada pekerjaan ini sesuai instruksi pemilik proyek. Storage bucket `astro` juga tetap public. Jangan menyimpan file privat dalam bucket tersebut.

Pemilik proyek menyatakan seluruh nilai NIS pada dataset yang sedang dipakai adalah dummy/placeholder. Karena itu temuan lama tentang NIS yang ikut dibentuk untuk tampilan publik bukan bukti paparan NIS riil pada saat ini. Struktur/field tersebut dibiarkan; sebelum data riil dimasukkan, kebijakan publikasi dan payload publik perlu dievaluasi ulang.

## Verifikasi yang masih menunggu lingkungan cloud/browser

- `astro check`, Vitest, production build, dan `npm audit` belum dapat dijalankan dalam container pemeriksaan karena dependency tidak terpasang, runtime Node lokal `22.16.0` lebih rendah daripada `.nvmrc` `24.22.1`, dan akses registry npm gagal (`EAI_AGAIN`).
- Tidak ada bukti browser end-to-end pada URL Preview Cloudflare dalam pemeriksaan ini.
- Tidak ada deployment Cloudflare yang dilakukan dari sesi ini.
- Tidak ada perubahan grants tabel, RLS policy, Storage bucket/policy, NIS dummy, atau source aplikasi selain dokumen/CI workflow yang dinyatakan terpisah dalam catatan kerja.

## Hasil statis arsip sumber sebelumnya

Audit arsip sebelumnya mencatat parsing statis TypeScript/Astro/JavaScript/CSS/JSON/YAML tanpa diagnostic parsing dan 11 smoke check helper lulus. Hasil ini bukan pengganti `astro check`, test suite Vitest, build penuh, atau pengujian browser; karena dependency tidak tersedia, status tersebut tetap perlu dibuktikan di CI/Workers Builds pada commit terbaru.
