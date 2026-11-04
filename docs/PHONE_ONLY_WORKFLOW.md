# Alur pengembangan astro-web dari HP

Panduan ini mengasumsikan seluruh pekerjaan dilakukan melalui aplikasi GitHub/browser HP, Cloudflare Dashboard, Supabase Dashboard, dan browser untuk pengujian. Tidak diperlukan Termux, laptop, `npm install` lokal, atau terminal lokal.

## Siklus perubahan yang disarankan

1. **Buka repository GitHub** `Pratama-Host/astro-web` dari GitHub mobile atau browser HP. Periksa branch aktif dan status commit sebelum mengubah file.
2. **Buat branch kerja** untuk satu kelompok perubahan, misalnya `fix/cms-mobile-preview` atau `docs/migration-runbook`. Jangan langsung mengedit `main` untuk perubahan besar.
3. **Ubah file sesedikit mungkin.** Gunakan editor GitHub untuk file teks (Astro/TS/JS/CSS/SQL/Markdown). Jangan menghapus arsip, konfigurasi, atau file yang tampak tidak terpakai sebelum dependensinya diperiksa.
4. **Buka tab Actions.** Pastikan workflow CI berjalan pada commit/PR tersebut. CI menggunakan versi Node yang diambil dari `.nvmrc`.
5. **Periksa Cloudflare Workers Builds.** Pastikan branch preview dibuat sebagai Preview Deployment, bukan Production. Build menggunakan `npm run build` dan deploy menggunakan `npx wrangler deploy`.
6. **Buka URL Preview di browser HP.** Periksa halaman publik, scroll penuh, menu, drawer mobile, galeri, audio, tema, dan `/pengembang`. Gunakan refresh penuh bila asset/cache lama masih terlihat.
7. **Uji admin di Preview.** Login, baca daftar, edit satu konten dummy, simpan, buka ulang halaman, lalu uji draft/preview/publish, revision, backup/restore, dan media upload hanya dengan file uji. Jangan menguji restore menggunakan bundle yang satu-satunya salinan.
8. **Periksa log bila gagal.** Gunakan Cloudflare Worker logs untuk error runtime dan Supabase Logs untuk query/RPC. Catat URL, waktu, langkah reproduksi, dan error tanpa membagikan secret/token.
9. **Buat Pull Request dan merge setelah lolos.** Merge ke `main` hanya setelah CI hijau dan seluruh pemeriksaan Preview selesai. Pastikan Production deploy berasal dari `main` yang sudah diuji.

## Pengaturan Cloudflare

Pada Worker → Settings → Builds:

- Root directory: kosong jika project berada pada root repository.
- Build command: `npm run build`.
- Deploy command: `npx wrangler deploy`.
- Production branch: `main`.
- Preview Builds: aktif untuk branch non-production.
- Node runtime: ikuti `.nvmrc` (`24.22.1`).

Pada Worker → Settings → Variables and Secrets, isi environment **Preview** terlebih dahulu. Gunakan **Secret** untuk `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, dan `ADMIN_SESSION_SECRET`. `SUPABASE_STORAGE_BUCKET=astro` serta `SITE_ORIGIN` dapat menjadi variable non-secret bila diperlukan. Set secret Production terpisah setelah konfigurasi Preview diuji.

Jangan menaruh secret di GitHub source, issue, komentar PR, screenshot, atau chat publik. Jangan gunakan secret server dalam awalan `PUBLIC_`.

## Prosedur perubahan database dari HP

1. Buka Supabase Dashboard project yang tepat; periksa project name/ref sebelum menjalankan SQL.
2. Baca `docs/MIGRATIONS.md`, buat backup terlebih dahulu, lalu buka file migration yang memang belum diterapkan.
3. Salin SQL lengkap ke SQL Editor dan jalankan satu migration setiap kali. Jangan menggabungkan beberapa migration yang punya dependensi.
4. Simpan hasil sukses/error dan version ledger. Jalankan query verifikasi sesuai migration.
5. Jangan menjalankan baseline, schema awal, seed, atau migration historis di database aktif hanya karena file tersedia.

Project `astro` saat ini sudah memiliki migration terbaru `20261104134549`; tidak ada SQL lanjutan yang perlu dijalankan untuk memperbaiki merge nested settings atau seed section Pengembang.

## Checklist uji lewat browser HP

- [ ] Beranda terbuka dan tidak ada error runtime.
- [ ] Menu desktop/mobile dan semua link route utama bekerja.
- [ ] `/anggota`, `/galeri`, `/struktur`, `/keahlian`, `/tkj`, `/pengembang` tampil baik pada lebar HP.
- [ ] Gambar, audio, font, dan Storage URL tampil tanpa error.
- [ ] Admin dapat login dan logout.
- [ ] CRUD anggota/galeri/collections diuji dengan data dummy.
- [ ] Perubahan pengaturan nested tidak menghapus field lain.
- [ ] Section Pengembang dapat diubah urutan/visibilitasnya.
- [ ] Draft → preview → publish berjalan.
- [ ] Revision restore membuat snapshot kondisi aktif sebelum restore.
- [ ] Export/import backup diuji hanya pada Preview dengan bundle cadangan.
- [ ] Upload media dibatasi tipe/ukuran dan muncul di Media Library.
- [ ] CI dan Workers Build lulus pada commit yang sama.

## Yang sengaja belum diubah

Untuk tahap pengembangan sekarang, konfigurasi table grants/RLS/Storage dan data NIS dummy tetap dibiarkan sesuai keputusan pemilik proyek. Jadikan pemakaian NIS riil atau perluasan akses publik sebagai pekerjaan tersendiri sebelum situs beralih dari data uji ke data nyata.
