# Catatan hardening dan status deploy

Paket ini berisi source Astro SSR lengkap yang telah diperkuat untuk preview Cloudflare Workers. Perbaikan dilakukan pada source dan migrasi; paket ini **belum merupakan sertifikasi runtime production**.

## Perubahan utama

- Penghapusan media memeriksa referensi di tabel anggota, galeri, pengaturan situs, halaman terbit, draft, dan revisi. Pemeriksaan membaca halaman data secara bertahap dan gagal tertutup bila referensi tidak dapat diverifikasi.
- Upload media memeriksa signature file, bukan mempercayai MIME browser. SVG aktif ditolak; request multipart dibatasi sebelum parsing.
- Endpoint JSON admin memakai pembacaan stream berbatas byte. Mutasi admin dan login/logout menolak request lintas-origin.
- Login memiliki rate limit persisten 5 percobaan per IP per 5 menit melalui Supabase. Hanya HMAC IP yang disimpan, bukan IP mentah. Fitur ini memerlukan migration hardening.
- Preview draft menggunakan `no-store`/`noindex` dan dilewati Service Worker agar tidak masuk cache offline.
- Thumbnail memakai nama berversi untuk menghindari cache gambar lama setelah file diganti.
- Publish, simpan halaman/pengaturan, pulihkan revisi, dan restore backup menggunakan RPC database transaksional.
- Backup memiliki batas byte/baris yang selaras. Restore memvalidasi envelope sebelum menulis; kegagalan transaksi akan rollback seluruh perubahan.
- Header keamanan diterapkan untuk SSR/API dan aset statis; sink DOM `innerHTML`/`document.write` yang ditemukan di script proyek dihilangkan.
- Konfigurasi Cloudflare menggunakan entry point adapter Astro modern.

## Sebelum Preview

1. **Backup terlebih dahulu** database Supabase dan isi Storage. Backup JSON CMS tidak menyertakan binary media Storage.
2. Pastikan migration CMS dasar sudah ada. Pada database production yang sudah berisi data, jangan menjalankan ulang `schema.sql`, seed, atau migration historis yang sudah diterapkan.
3. Jika tabel draft belum ada, jalankan `migrations/20261103_stage3_workflow.sql` satu kali.
4. Jalankan `migrations/20261103_stage3_hardening.sql` satu kali setelah tabel CMS dan draft tersedia. Migration ini menambahkan rate limiter login serta RPC transaksional. Tanpa migration tersebut, login akan merespons `503` dan operasi transaksional akan gagal dengan pesan migration.
5. Deploy dulu dari branch Preview/non-production. Jangan hubungkan branch preview ke domain production.
6. Isi environment Preview Cloudflare: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, dan `ADMIN_SESSION_SECRET` (minimal 32 byte acak). Tambahkan `SUPABASE_STORAGE_BUCKET=astro` dan `SITE_ORIGIN=https://domain-anda` bila diperlukan.

## Build dari perangkat terbatas

Tidak perlu memasang npm pada ponsel. Hubungkan repository ke Cloudflare Workers Builds. Gunakan:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler preview`
- Node: `.nvmrc` (`24.22.1`)

Cloudflare menjalankan instalasi package dan build di lingkungan cloud. Dependencies top-level di `package.json` dipatok ke versi eksplisit. `package-lock.json` belum disertakan, sehingga versi transitif belum sepenuhnya terkunci untuk build yang reproducible; buat dan commit lockfile melalui lingkungan build yang memiliki akses registry sebelum rilis production.

## Batas verifikasi saat paket dibuat

Pemeriksaan statis yang selesai:

- 51 file TypeScript: tidak ada kesalahan parsing.
- 18 file JavaScript: `node --check` lulus.
- 5 file JSON: valid.
- Workflow CI YAML: valid.
- Tidak ada import relatif yang tidak ditemukan.
- Tidak ditemukan `request.json()`/`request.formData()` tanpa pembatas di API admin.
- Tidak ditemukan `innerHTML`, `outerHTML`, `document.write`, `eval`, `new Function`, atau `dangerouslySetInnerHTML` pada source/script yang dipindai.
- 11 smoke check helper request-body, referensi media, signature upload, dan same-origin: lulus.

Belum dapat dijalankan di lingkungan pembuatan paket:

- `astro check`, `vitest`, production build Astro, dan `npm audit` (akses registry npm tidak tersedia).
- Eksekusi migration SQL terhadap instance PostgreSQL/Supabase nyata.
- Cloudflare Workers Preview dan uji end-to-end browser.

Karena itu, gunakan Preview terlebih dahulu. Periksa build log, login, navigasi semua halaman, preview draft, upload/hapus media, backup/restore, dan revisi sebelum mengalihkan branch production.

## Batas arsitektur yang tetap ada

- PostgreSQL transaction tidak dapat mencakup operasi Supabase Storage. Endpoint media melakukan pemeriksaan referensi dan cleanup best-effort; perubahan database dan Storage yang bersamaan masih memiliki kemungkinan race yang tidak dapat dibuat atomic oleh satu transaksi SQL.
- Restore backup melakukan **upsert tanpa menghapus baris yang tidak ada di file backup**. JSON backup menyimpan metadata/record CMS, bukan binary object Storage.
- CSP masih mengizinkan inline script/style karena halaman lama memakai inline code; ini hardening header dasar, bukan CSP nonce ketat.
