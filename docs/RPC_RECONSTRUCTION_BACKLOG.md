# Status RPC CMS dan autentikasi — 4 November 2026

Audit dan verifikasi dilakukan dengan membandingkan pemanggilan `.rpc(...)` di source code dengan `pg_proc` database Supabase `astro` pada 2026-11-04. Status di bawah adalah status sesudah migration terbaru diterapkan.

## Status hasil verifikasi

Dari 9 nama RPC yang dirujuk source code, **9/9 ditemukan dan tersedia** pada database aktif:

- **7 RPC CMS:** `set_tkj_cms_global_asset`, `export_tkj_cms_backup`, `restore_tkj_cms_backup`, `patch_tkj_cms_site_settings`, `save_tkj_cms_page`, `publish_tkj_cms_draft`, `restore_tkj_cms_revision`.
- **2 RPC login:** `consume_tkj_admin_login_attempt`, `clear_tkj_admin_login_attempts`.

Tujuh RPC CMS memakai `SECURITY INVOKER`, `search_path` dibatasi ke `pg_catalog, public`, dan `EXECUTE` hanya diberikan ke `service_role`. Dua RPC login memakai `SECURITY DEFINER` dengan `EXECUTE` hanya untuk `service_role`, sesuai kondisi existing yang dipertahankan. Fungsi helper `merge_tkj_cms_jsonb(jsonb,jsonb)` ditambahkan pada migration terbaru; helper ini bukan RPC aplikasi yang dipanggil langsung oleh browser. ACL helper dan patch telah diverifikasi: `anon=false`, `authenticated=false`, `service_role=true`.

## Kontrak fungsi dari kode (belum merupakan definisi SQL)

| RPC | Signature dari pemanggil | Pemanggil | Perilaku/hasil yang diharapkan dari source |
|---|---|---|---|
| `set_tkj_cms_global_asset` | `p_asset_type text`, `p_public_url text` | `src/pages/api/admin/media.ts` | Memperbarui referensi aset global di `site_settings` secara transaksional setelah file baru diunggah. Dipanggil untuk kategori `assets-global`; tipe yang diterima ditentukan oleh `GLOBAL_TYPES` di source. |
| `export_tkj_cms_backup` | tanpa argumen | `src/pages/api/admin/backup.ts` | Mengembalikan object JSON berisi seluruh tabel CMS yang di-backup, termasuk bagian `site_settings`; format impor yang divalidasi adalah `tkj-xi9-cms-backup`, versi `1`. |
| `restore_tkj_cms_backup` | `p_bundle jsonb` | `src/pages/api/admin/backup.ts` | Memulihkan semua tabel dalam satu transaksi. Jika satu penulisan gagal, seluruh restore harus rollback. Harus mempertahankan ruang satu entri audit baru. |
| `patch_tkj_cms_site_settings` | `p_patch jsonb` | `src/pages/api/admin/content.ts` | Menggabungkan hanya field patch yang dikirim dengan nilai terbaru di PostgreSQL di bawah advisory lock; hasil yang dibaca endpoint: `{data, updated_at, revision_version}`. |
| `save_tkj_cms_page` | `p_slug text`, `p_title text`, `p_description text`, `p_og_image text`, `p_noindex boolean`, `p_content jsonb` | `src/pages/api/admin/pages.ts` | Menyimpan halaman dan membuat versi riwayat secara atomik; hasil endpoint memakai `{data, revision_version}`. |
| `publish_tkj_cms_draft` | `p_slug text` | `src/pages/api/admin/drafts.ts` | Mengambil draft, menerbitkan konten/SEO ke `site_pages`, membuat snapshot revision, lalu menyelesaikan draft dalam satu transaksi. Kode mengharapkan SQLSTATE `P0002` bila draft tak ditemukan dan `22023` untuk slug/parameter tidak valid. |
| `restore_tkj_cms_revision` | `p_id uuid` | `src/pages/api/admin/revisions.ts` | Memulihkan revision terpilih. Komentar endpoint menyatakan keadaan aktif sebelum restore disimpan sebagai snapshot baru. Kode mengharapkan `P0002` bila ID tidak ada dan `22023` untuk input invalid. |

## Status penerapan 2026-11-04

Implementasi tujuh RPC CMS tersedia di `migrations/0003_restore_cms_rpc_workflows.sql` dan telah diterapkan ke project aktif pada migration `20261104053918 restore_cms_rpc_workflows_functions`. Migration `20261104054021 fix_revision_restore_snapshot` memperbaiki snapshot sebelum restore. Migration terbaru `20261104134549 fix_nested_site_settings_merge_and_developer_sections` memperkenalkan recursive helper `merge_tkj_cms_jsonb`, mengganti merge dangkal di `patch_tkj_cms_site_settings`, dan men-seed 11 section Pengembang.

Verifikasi terbaru menunjukkan seluruh 11 section ada, recursive merge mempertahankan properti bersarang yang tidak disentuh, dan dua fungsi terkait tetap `SECURITY INVOKER` serta hanya dapat dipanggil `service_role`. Smoke test rollback-only untuk workflow CMS tersedia di `tests/supabase-cms-rpc-smoke.sql`. Restore backup tetap upsert-only: baris yang tidak ada dalam bundle tidak dihapus.

Riwayat aktif mencatat 10 migration hingga `20261104134549`. Entri placeholder `20261104053820 restore_cms_rpc_workflows` tetap dibiarkan; jangan hapus/ubah ledger manual.

## Hal yang tetap perlu diuji pada preview

Penerapan database telah berhasil, tetapi hasil integrasi browser dan Cloudflare Preview belum terverifikasi. Sisa pengujian mencakup:

- aturan version numbering saat dua request berjalan bersamaan;
- bentuk tepat JSON hasil export dan restore;
- urutan delete/upsert serta perlakuan row yang tidak ada di bundle;
- jalur penyimpanan revision untuk `site-settings` versus page slug;
- struktur key JSON bersarang untuk logo/favicon/background/audio;
- ACL dan perilaku error lengkap dari setiap fungsi.

Jika definisi SQL historis ditemukan kemudian, bandingkan dengan implementasi rekonstruksi ini. Verifikasi signature, security mode, `search_path`, grants, versioning, rollback, dan perilaku restore sebelum deploy ulang.
