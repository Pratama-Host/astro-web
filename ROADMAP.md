# Roadmap Website TKJ XII-9
**SMK Muhammadiyah Belitang — Kelas XII TKJ**

> Status berikut memisahkan pekerjaan yang sudah diterapkan dan diuji dari pekerjaan yang masih memerlukan browser, CI, atau verifikasi infrastruktur.

## Prinsip
Satu pusat informasi kelas yang mudah diperbarui, dengan akses publik hanya untuk konten yang memang diterbitkan. Urutan kerja: keamanan data → keandalan rilis → konten akademik → pengalaman publik → PWA lanjutan bila dibutuhkan.

## Status fitur

| Area | Status | Catatan |
|---|---|---|
| Halaman publik (beranda, anggota, struktur, keahlian, galeri, TKJ, pengembang) | Selesai | Perilaku publik perlu smoke test setelah setiap rilis. |
| CMS anggota, galeri, media, konten, navigasi, section, tampilan | Selesai | Menggunakan API admin dan service-side Supabase client. |
| Draft, revisi, audit, ekspor/pemulihan CMS | Selesai pada kode | Snapshot CMS pra-perubahan tersimpan di skema database privat; dump eksternal penuh dan backup Storage masih perlu prosedur terpisah. |
| Auth admin: sesi HMAC, cek Origin, rate limit login | Sudah diterapkan | Tidak diubah dalam pekerjaan ini. |
| UI riwayat revisi dan rollback | Sebagian | Endpoint tersedia; cek kelengkapan alur melalui browser. |
| PWA dasar (manifest, service worker, offline) | Selesai | Sync/push ditunda sampai kebutuhan dan pengelolanya jelas. |
| Hak akses database dan batas unggahan Storage | Diterapkan dan diverifikasi | Tiga migrasi diterapkan pada lingkungan pengembangan/pengujian aktif pada 13 November 2026. |
| Pengumuman dan agenda | Skema, RLS, API, UI admin, dan menu publik tersedia pada source | Helper endpoint submit diperbaiki; menu publik punya fallback dan migrasi navigasi. Build/CI serta browser E2E untuk patch ini belum dijalankan. |
| Migrasi project Supabase kosong | Belum terbukti penuh | Baseline direkonstruksi dari skema aktif; perlu uji pemulihan/provisioning terpisah. |
| Restore eksternal dan objek Storage | Belum selesai | Snapshot CMS internal bukan backup PostgreSQL penuh atau backup file Storage. |
| Grid anggota responsif dan kontrol pencarian | Source diperbarui | Dua kolom pada ponsel normal, satu kolom pada layar sangat sempit; filter kategori dan slider horizontal dihapus. Perlu cek visual setelah deploy. |
| E2E browser dan rilis Cloudflare terbaru | Belum diverifikasi setelah perubahan UI | Tunggu hasil CI dan smoke test browser/deployment yang aktual. |

## Antrean berikutnya
1. Jalankan CI untuk source terkini (`npm ci`, `npm run check`, `npm test`, `npm run build`) di runner Ubuntu.
2. Uji halaman anggota dua kolom pada beberapa lebar Android, lalu uji CMS di browser: login/logout, buka modul pengumuman dan agenda, buat draft, ubah, terbitkan, arsipkan, dan periksa halaman publik.
3. Verifikasi layout admin pada lebar ponsel, tablet, dan desktop serta navigasi keyboard.
4. Selesaikan backup PostgreSQL eksternal dan pemindahan objek Storage, lalu lakukan uji restore pada lingkungan terpisah.
5. Petakan query halaman dan tambahkan pagination untuk data yang berpotensi berkembang.
6. Tambahkan E2E Playwright dan smoke test pascarilis; lanjutkan CSP Report-Only sebelum pengetatan.
7. PWA lanjutan/push hanya jika kebutuhan sudah jelas dan ada pengelola pengirim.

## Ditunda
Migrasi autentikasi besar tanpa kebutuhan jelas • push notification • refaktor CSS/JS total • banyak modul sekaligus • perubahan strategi cache tanpa pengukuran.

## Definisi selesai fitur
Validasi server, RLS diuji sebagai anon dan server admin, alur draft/terbit/arsip, UI responsif dan aksesibel, tes relevan, SEO/cache ditinjau, backup/rollback sesuai cakupan, dan dokumentasi diperbarui.

## Handover
Mulai dari `docs/RECONCILIATION-2026-11-13.md`, lalu baca `docs/DATA-CLASSIFICATION.md` untuk aturan pengelolaan data. Jangan menyatakan build, test, atau deploy berhasil sebelum log CI/Cloudflare terbaru tersedia.
