# Status revisi Supabase CMS — 4 November 2026

## Perubahan yang sudah diterapkan pada project `astro`

Migration `align_tkj...` (`20261104052811`) berhasil tercatat di Supabase.

- `public.anggota.skills` berubah dari `text` menjadi `jsonb`, default `[]`.
- Constraint `anggota_skills_is_array_check` memastikan nilai selalu JSON array.
- Enam kolom metadata galeri ditambahkan: `title`, `description`, `category`, `taken_at`, `alt_text`, `visible`.
- Verifikasi sesudah deploy: 20 baris anggota, 0 nilai skills invalid; 20 baris galeri tetap ada; keenam kolom ditemukan.

## Revisi source yang disiapkan

- `migrations/0002_align_schema_with_current_astro_code.sql` disinkronkan dengan SQL yang berhasil diterapkan, termasuk melepas default TEXT sebelum konversi dan constraint JSON array.
- `migrations/0003_restore_cms_rpc_workflows.sql` berisi rekonstruksi tujuh RPC yang hilang, mengikuti signature dan kontrak pemanggil di source Astro.
- `tests/supabase-cms-rpc-smoke.sql` berisi smoke test rollback-only untuk ketujuh alur.
- `docs/RPC_RECONSTRUCTION_BACKLOG.md` diperbarui dengan status rekonstruksi.

## Status deployment RPC

Migration RPC berhasil diterapkan ke project aktif melalui dua entri riwayat: `20261104053820 restore_cms_rpc_workflows` (entri placeholder kosong yang tercatat dari percobaan awal) dan `20261104053918 restore_cms_rpc_workflows_functions` (implementasi fungsi yang sebenarnya). Jangan hapus entri riwayat secara manual.

Verifikasi database menunjukkan ketujuh RPC tersedia. Semua berjalan sebagai `SECURITY INVOKER`, `search_path` dibatasi ke `pg_catalog, public`, `EXECUTE` diberikan ke `service_role`, dan tidak diberikan ke `anon` maupun `authenticated`.

Perbaikan lanjutan `restore_tkj_cms_revision` diterapkan pada migration `20261104054021 fix_revision_restore_snapshot` untuk memastikan keadaan halaman aktif disimpan sebagai snapshot baru sebelum revisi lama dipulihkan. Smoke test transaksional yang mencakup pemeriksaan snapshot sebelum restore berhasil dijalankan melalui SQL Editor/MCP dan berakhir dengan `ROLLBACK`. Pemeriksaan sesudahnya memastikan tidak ada data uji tertinggal pada halaman, revision, pengaturan, atau draft.

Supabase Security Advisors masih menampilkan 10 temuan INFO `rls_enabled_no_policy` pada tabel yang memang dibatasi ke backend; ini bukan kegagalan smoke test dan tidak mengubah status deploy RPC. Tinjau tetap sebagai bagian audit keamanan terpisah.

Restore backup bersifat **upsert-only** sesuai teks konfirmasi di `src/scripts/admin.js`: baris yang tidak ada di file backup tidak dihapus. Seluruh operasi restore tetap satu transaksi PostgreSQL; kegagalan satu upsert membatalkan seluruh transaksi.
