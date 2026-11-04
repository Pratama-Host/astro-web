# Catatan revisi — 4 November 2026

## Isi revisi

- Sinkronisasi migration `0002_align_schema_with_current_astro_code.sql` dengan perubahan yang telah berhasil diterapkan ke Supabase `astro`.
- Migration `0003_restore_cms_rpc_workflows.sql` berisi implementasi rekonstruksi tujuh RPC CMS yang dirujuk source Astro.
- `tests/supabase-cms-rpc-smoke.sql` menyediakan smoke test transaksi yang seluruhnya di-rollback.
- Audit skema, backlog RPC, dan status deployment diperbarui.

## Status penerapan

Migration `0002` sudah diterapkan dan diverifikasi. Tujuh RPC pada migration `0003` kini berhasil diterapkan ke database aktif dengan nama migration `restore_cms_rpc_workflows_functions` (versi `20261104053918`). Percobaan awal juga mencatat satu entri placeholder kosong `restore_cms_rpc_workflows` (versi `20261104053820`); entri historis ini dibiarkan apa adanya.

Implementasi final menggunakan `SECURITY INVOKER` (bukan `SECURITY DEFINER`) dengan `search_path` terbatas dan `EXECUTE` hanya untuk `service_role`. Migration `0004_fix_revision_restore_snapshot.sql` (versi `20261104054021`) memperbaiki restore revision agar konten aktif sebelum restore tersimpan sebagai snapshot. Smoke test rollback-only lulus termasuk verifikasi snapshot sebelum restore; query verifikasi mengonfirmasi ketujuh RPC tersedia, izin publik ditolak, dan tidak ada data uji yang tertinggal.

## Validasi yang dilakukan

- Memeriksa signature RPC terhadap pemanggilan `.rpc()` di enam endpoint admin.
- Menjaga fungsi `SECURITY INVOKER`, `search_path` dibatasi ke `pg_catalog, public`, dan `EXECUTE` hanya untuk `service_role`.
- Menggunakan advisory transaction lock untuk penulisan pengaturan situs dan halaman.
- Restore backup upsert-only, sesuai perilaku yang dijelaskan UI: baris yang tidak ada di bundle tetap dipertahankan.
- Menjalankan smoke test rollback-only dengan sukses; seluruh perubahan uji dibatalkan.

Automated app checks (`npm run check`, `npm test`, `npm run build`) belum dijalankan karena dependencies belum terpasang dan runtime container Node 22.16.0 lebih rendah dari versi minimum yang ditentukan project (`>=22.23.4`).
