# Kebijakan Keamanan

## Versi yang didukung

Hanya cabang `main` yang menerima perbaikan keamanan.

## Melaporkan kerentanan

Jangan membuka issue publik untuk kerentanan. Gunakan **GitHub → Security → Report a vulnerability**
pada repository ini (private vulnerability reporting), atau hubungi pemilik repository secara langsung.

Sertakan: deskripsi, langkah reproduksi, dampak yang dimaksud, dan versi/commit yang terdampak.
Laporan ditanggapi dengan upaya terbaik; ini proyek kelas yang dikelola sukarela.

## Cakupan

- Panel admin (`/pengembang/admin`) dan API `/api/admin/*`
- Konfigurasi Supabase (RLS, RPC, Storage)
- Header keamanan dan service worker

## Praktik yang berlaku

- `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, dan `ADMIN_SESSION_SECRET` adalah secret server-side dan tidak boleh di-commit.
- Halaman publik hanya memakai `SUPABASE_ANON_KEY` dengan RLS read-only.
- Jangan menjalankan `supabase/migrations/20261106000100_baseline.sql` pada database yang sudah berisi data.
