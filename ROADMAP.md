# Roadmap Website TKJ XII-9
**SMK Muhammadiyah Belitang — Kelas XII TKJ**

> Status dicatat berdasarkan kode di repositori. Angka build/test **harus diverifikasi ulang** di CI; jangan mengandalkan angka lama di dokumen.

## Prinsip
Satu pusat informasi kelas yang tepercaya dan mudah diperbarui, yang hanya menampilkan data yang disetujui untuk publik (lihat `docs/DATA-CLASSIFICATION.md`). Urutan kerja: privasi → keandalan rilis → konten akademik → pengalaman publik → PWA lanjutan.

## Status fitur

| Area | Status | Catatan |
|---|---|---|
| Halaman publik (beranda, anggota, struktur, keahlian, galeri, TKJ, pengembang) | Selesai | Filter/urut/mode tampilan di /anggota |
| Breadcrumbs + JSON-LD | Selesai | |
| CMS: anggota, galeri, media, konten, navigasi, section | Selesai | |
| Draft, revisi, audit, backup/restore (RPC) | Selesai (kode) | Restore penuh belum diuji di lingkungan terpisah |
| Auth admin: sesi HMAC, cek Origin, rate limit login | **Sudah diterapkan** | Bukan lagi "rencana"; ganti ke Supabase Auth hanya jika butuh multi-admin/peran/pencabutan sesi |
| UI riwayat revisi + rollback | Sebagian | Endpoint `/api/admin/revisions` ada; periksa UI |
| PWA dasar (manifest, service worker, offline) | Selesai | Lanjutan (sync/push) ditunda |
| NIS di halaman publik | **Disembunyikan (default)** | Keputusan akhir pengelola kelas diperlukan |
| Hardening grant/Storage | Migrasi ditulis, **belum diterapkan** | `20261109000100`, `20261109000200` |
| Migrasi dari database kosong | Belum terbukti | Uji di proyek disposable |
| Pengumuman/agenda, showcase proyek | Belum dibuat | |

## Antrean (urut prioritas)
1. **Privasi:** putuskan kebijakan NIS & persetujuan foto/audio; terapkan migrasi grant setelah uji di staging; verifikasi HTML `/anggota` tanpa NIS.
2. **Keandalan:** uji baseline dari DB kosong, backup + restore penuh (termasuk file Storage), smoke test pascarilis, pisahkan PR dependensi mayor.
3. **Data layer:** petakan query per halaman, pagination anggota/galeri, pisahkan tipe publik vs CMS.
4. **Modul konten pertama:** pengumuman + agenda (tabel sendiri, status draft/publish/arsip, RLS, fallback, test).
5. **Showcase proyek TKJ:** dengan tinjauan agar tidak memuat kredensial/IP internal.
6. **E2E, aksesibilitas, observabilitas; CSP bertahap (report-only dahulu).**
7. **PWA lanjutan/push:** hanya jika kebutuhan terbukti dan ada pengelola pengirim.

## Ditunda
Migrasi auth besar tanpa kebutuhan jelas • push notification • refaktor CSS/JS total • banyak modul sekaligus • ubah strategi cache tanpa pengukuran • menjalankan baseline di DB aktif.

## Definisi selesai fitur
Validasi server, RLS diuji (anon/admin), tanpa kebocoran data pribadi, alur draft/publish/arsip, UI responsif + aksesibel, test relevan, SEO/sitemap/cache ditinjau, backup/rollback kompatibel, dokumen diperbarui setelah kode ada.

## Handover
Baca `docs/AUDIT.md`, `docs/DATA-CLASSIFICATION.md`, dan tabel status di atas. Jalankan `npm ci && npm run check && npm test && npm run build` sebelum dan sesudah perubahan. Kerjakan item antrean nomor terkecil yang belum selesai.
