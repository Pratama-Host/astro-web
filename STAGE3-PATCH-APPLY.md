# Panduan deployment source lengkap — Stage 3 hardening

ZIP distribusi ini berisi source project lengkap, bukan overlay patch. Ekstrak seluruh isi ke repository (atau unggah sebagai source repository) dengan struktur root yang tetap memuat `package.json`, `astro.config.mjs`, `wrangler.json`, `src/`, `migrations/`, dan `public/`. Jangan mengekstrak ke dalam subfolder tambahan.

## 1. Sebelum deployment

1. Backup database Supabase dan Storage.
2. Pastikan source sudah masuk ke branch Git yang dipakai Workers Builds.
3. Pada Cloudflare, gunakan **Workers Builds**, bukan Cloudflare Pages.
4. Build command: `npm run build`. Deploy command: `npx wrangler deploy`. Root directory adalah root proyek. Build output adalah `dist`.
5. Atur Node.js 22.23.4 atau lebih baru (Node 24.22.1 disematkan melalui `.nvmrc`). Proses instalasi dependency dan build terjadi di mesin Cloudflare; tidak perlu menjalankan npm pada ponsel.

## 2. Urutan migrasi Supabase

Pada project Supabase yang sama dengan production, buka SQL Editor dan jalankan hanya migrasi yang belum diterapkan, dengan urutan: 

1. `migrations/20261101_cms.sql` (jika CMS dasar belum tersedia).
2. `migrations/20261103_stage3_workflow.sql`.
3. `migrations/20261103_stage3_hardening.sql`.

`migrations/20261101_cms.sql` mengandalkan tabel inti dari `migrations/schema.sql`. Pada database lama yang sudah memiliki tabel inti, jangan jalankan ulang seed/schema tanpa kebutuhan. Kedua migration Stage 3 bersifat additive. Hardening RPC hanya dapat dipanggil oleh `service_role`.

## 3. Secrets dan environment variables Cloudflare

Atur pada environment Production:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (secret)
- `ADMIN_PASSWORD` (secret)
- `ADMIN_SESSION_SECRET` (secret acak minimal 32 byte)
- `SUPABASE_STORAGE_BUCKET` (opsional; default `astro`)
- `SITE_ORIGIN` (opsional; contoh `https://domain-anda.tld`, tanpa path)

Jangan pernah memasukkan secret dengan awalan `PUBLIC_`, menyimpannya di Git, atau mengirimkannya lewat chat.

## 4. Build/deploy

Push commit ke branch yang terhubung ke Workers Builds. Cloudflare menjalankan install/build/deploy sesuai pengaturan project. Konfigurasi Worker ada di `wrangler.json`; entrypoint hasil build adalah `dist/_worker.js/index.js`.

Jika workflow GitHub Actions CI gagal, jangan deploy commit tersebut. CI memeriksa audit dependency, Astro, unit tests, dan build; ia tidak melakukan deploy.

## 5. Smoke test sesudah deployment

1. Buka website dan pastikan beranda serta seluruh route publik dimuat.
2. Login `/pengembang/admin`; pastikan sesi tetap aktif setelah reload.
3. Simpan draft halaman, buka preview dalam profil browser yang sama, lalu pastikan banner preview dan `noindex` ada. Buka URL publik biasa pada tab tanpa sesi untuk memastikan hanya konten publish yang terlihat.
4. Publish draft dan periksa revisi serta audit log.
5. Upload gambar JPEG/PNG/WebP dan pastikan media tampil di library. Coba SVG atau file berekstensi palsu; API harus menolaknya.
6. Coba hapus media yang masih dipakai halaman/draft/revisi; server harus menolak dengan HTTP 409.
7. Ekspor backup, lalu uji restore pada project Supabase staging/test. Jangan menguji restore pertama kali pada production.

## Catatan

Source Astro SSR tidak bisa diunggah sebagai file HTML biasa. Cloudflare harus membangun source menjadi Worker bundle. Anda tidak perlu menjalankan npm di perangkat; gunakan Workers Builds untuk menjalankan proses tersebut di cloud.
