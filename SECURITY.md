# Kebijakan Keamanan

## Versi yang didukung

Hanya cabang `main` yang menerima perbaikan keamanan.

## Melaporkan kerentanan

Jangan membuka issue publik untuk kerentanan. Gunakan **GitHub → Security → Report a vulnerability** pada repository ini (private vulnerability reporting), atau hubungi pemilik repository secara langsung.

Sertakan deskripsi, langkah reproduksi, dampak, serta versi/commit yang terdampak. Laporan ditangani dengan upaya terbaik; ini proyek kelas yang dikelola sukarela.

## Cakupan

- Panel admin (`/pengembang/admin`) dan API `/api/admin/*`.
- Konfigurasi Supabase: RLS, RPC, grants, dan Storage.
- Header keamanan, cache, dan service worker.

## Praktik wajib

- `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, dan `ADMIN_SESSION_SECRET` adalah secret server-side. Jangan commit nilai aslinya ke repository atau menampilkannya di log.
- Halaman publik menggunakan `SUPABASE_ANON_KEY`; anon key bukan pengganti RLS. Hak baca harus diberikan secara eksplisit dan hak mutasi publik tidak boleh dibuka.
- NIS adalah identifier internal siswa. Jangan tampilkan pada halaman publik, API publik, HTML, atau log.
- Jangan menjalankan `supabase/migrations/20261106000100_baseline.sql` pada database yang sudah berisi data.
- Jangan mendorong migration ke Supabase hosted sebelum histori remote, source migration, backup, dan target deployment direkonsiliasi.

## Catatan audit terakhir dalam paket

Snapshot read-only bertanggal **14 November 2026** mencatat RLS aktif pada seluruh 15 tabel aplikasi yang diperiksa dan tidak menemukan grant mutasi tabel aplikasi untuk role publik. Snapshot tersebut juga menemukan default privileges yang perlu diperketat.

Migration `20261114150100_harden_public_default_privileges.sql` dan `20261114150200_cms_schema_advisor_cleanup.sql` tersedia pada source, tetapi belum diterapkan pada snapshot itu. Ini adalah temuan bertanggal, bukan jaminan kondisi database saat ini. Baca [`docs/DATABASE-STATE.md`](docs/DATABASE-STATE.md) dan [`docs/EXECUTION-REPORT-2026-11-14.md`](docs/EXECUTION-REPORT-2026-11-14.md) sebelum rollout.

Backup JSON CMS bukan dump PostgreSQL penuh dan tidak mencakup byte objek Storage. Ikuti [`docs/BACKUP-RESTORE-RUNBOOK.md`](docs/BACKUP-RESTORE-RUNBOOK.md) dan lakukan restore drill pada target terpisah.
