# RPC yang belum tersedia pada database aktif

Audit dilakukan dengan membandingkan pemanggilan `.rpc(...)` di source code dengan `pg_proc` database Supabase `astro` pada 2026-11-04.

## Status hasil verifikasi

Dari 9 nama RPC yang dirujuk source code:

- **Ditemukan (2):** `consume_tkj_admin_login_attempt`, `clear_tkj_admin_login_attempts`.
- **Tidak ditemukan (7):** `set_tkj_cms_global_asset`, `export_tkj_cms_backup`, `restore_tkj_cms_backup`, `patch_tkj_cms_site_settings`, `save_tkj_cms_page`, `publish_tkj_cms_draft`, `restore_tkj_cms_revision`.

Dua RPC login yang ada menggunakan `SECURITY DEFINER`. Untuk tujuh RPC CMS hasil rekonstruksi, implementasi final menggunakan `SECURITY INVOKER`, `search_path` dibatasi ke `pg_catalog, public`, dan hak `EXECUTE` hanya diberikan ke `service_role`.

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

## Status rekonstruksi 2026-11-04

Implementasi rekonstruksi tujuh RPC tersedia di `migrations/0003_restore_cms_rpc_workflows.sql` dan telah diterapkan ke project aktif pada migration `20261104053918 restore_cms_rpc_workflows_functions`, lalu diperbaiki oleh `20261104054021 fix_revision_restore_snapshot` untuk snapshot sebelum restore. Implementasi mengikuti signature/pemanggil pada source, menggunakan `SECURITY INVOKER`, `search_path` terbatas, advisory transaction locks untuk penulisan konten, serta `EXECUTE` hanya untuk `service_role`.

**Penting:** implementasi ini adalah rekonstruksi dari kontrak source, bukan salinan definisi SQL historis. Smoke test transaksi yang memeriksa snapshot sebelum restore pada `tests/supabase-cms-rpc-smoke.sql` telah lulus dan semua perubahan tes di-rollback. Restore backup sengaja upsert-only, sesuai teks konfirmasi UI bahwa baris yang tidak ada di bundle tetap dipertahankan. Percobaan awal mencatat satu entri migration placeholder kosong `20261104053820 restore_cms_rpc_workflows`; entri itu dibiarkan di riwayat, sedangkan implementasi aktif tercatat pada migration berikutnya.

## Pekerjaan yang belum aman untuk ditebak

Kode di atas memberi signature dan sebagian kontrak, tetapi tidak memberi definisi lengkap untuk:

- aturan version numbering saat dua request berjalan bersamaan;
- bentuk tepat JSON hasil export dan restore;
- urutan delete/upsert serta perlakuan row yang tidak ada di bundle;
- jalur penyimpanan revision untuk `site-settings` versus page slug;
- struktur key JSON bersarang untuk logo/favicon/background/audio;
- ACL dan perilaku error lengkap dari setiap fungsi.

Jika definisi SQL historis ditemukan kemudian, bandingkan dengan implementasi rekonstruksi ini. Verifikasi signature, security mode, `search_path`, grants, versioning, rollback, dan perilaku restore sebelum deploy ulang.
