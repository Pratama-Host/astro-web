# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/).

## [Unreleased]

### Added
- Cache TTL 3 detik + de-duplikasi untuk `getSettings` dan `getNavigation` (`src/lib/ttl-cache.ts`, dengan tes).
- Guardrail CI `tests/css-quality.test.ts` (ratchet `!important`, font minimum, token kontras, struktur header/menu).
- Kontrol animasi latar dan musik latar di menu hamburger untuk ponsel; dokumentasi `docs/UIUX-REFORM.md`.
- Menambahkan `src/lib/color-contrast.ts` (+ tes) dan token `--accent-text`, `--on-accent`, `--btn-end` agar warna aksen dari CMS selalu memenuhi kontras WCAG AA (4,5:1) untuk teks dan tombol.
- Memperluas export/restore backup CMS untuk `announcements` dan `agenda_events`, dengan kompatibilitas terhadap bundle v1 lama.
- Menambahkan validator backup, regression tests, SQL smoke assertions, dan contract tests service worker.
- Menambahkan bagian beranda "Visi, Misi & Prestasi" yang dapat diatur dari CMS.
- Menambahkan modul CMS pengumuman dan agenda serta rute publik `/pengumuman`.
- Menambahkan dokumentasi rekonsiliasi database, backup/restore, dan status implementasi bertanggal.

### Changed
- Halaman dalam: breadcrumb tidak lagi tertimbun header fixed (`margin-top: var(--top-h)`), ruang atas judul dirapikan, label seksi/judul/deskripsi sama-sama di tengah, nama brand rata kiri.
- Kartu struktur organisasi didesain ulang: permukaan bergradasi, tepi gradien 1px, cahaya aksen di atas, bayangan berlapis, avatar bercincin, kartu sebaris sama tinggi; animasi border tak berujung dihapus. Aturan kartu disatukan di `struktur.css` (23 `!important` di `animasi.css` dan beberapa override di `ui.css` dihapus; total `!important` 325 → 299).
- Logo header kini `<button>` sungguhan; label tombol menu berganti Buka/Tutup; animasi kanvas berhenti saat tab tersembunyi.
- `<head>`: hapus `X-UA-Compatible`; `og:image`/`twitter:image` hanya dirender bila ada gambar.
- Reformasi UI/UX: teks beraksen memakai `--accent-text`; teks di atas isian aksen memakai `--on-accent`; ukuran font minimum 12px (65 deklarasi di bawahnya dinaikkan); target sentuh kontrol header 44px; header ponsel sempit dirapatkan; `color-scheme` mengikuti tema; dukungan `prefers-contrast`.
- Aksen bawaan tema terang diubah `#0d9488` → `#0f766e` (kontras 5,2:1); nilai yang sudah disimpan di CMS tidak diubah.
- Google Fonts dimuat non-blocking; `theme-color` ikut berganti saat tema diganti.
- Manifest PWA: `orientation` dibuat `any`, ikon `any` dan `maskable` dipisah, `id` ditambahkan.
- CI menggunakan `npm run validate` setelah instalasi dependency berbasis lockfile (`npm ci`).
- Memecah `admin.js` menjadi modul per fitur di `src/scripts/admin/`.
- Menggabungkan stylesheet tambalan ke file induknya dengan urutan cascade yang dipertahankan.
- Memindahkan keluaran `npm run migrate:data` ke `supabase/seed/` agar tidak tercampur dengan migration.
- Menyelaraskan batch media uploader dengan validasi tipe/path dan menambahkan opsi `--dry-run`.
- Menambahkan batas pada query data serta purge cache publik setelah mutasi konten, halaman, publish, dan restore.

### Fixed
- Memulihkan carousel horizontal anggota pada ponsel dengan scroll-snap dan gesture swipe; desktop menggunakan grid responsif.
- Memisahkan mode daftar anggota menjadi satu kolom vertikal dengan kartu horizontal, avatar utuh, dan nama yang dapat membungkus.
- Mengembalikan kontrol geser pada breakpoint tablet dan mereset posisi scroll saat mode tampilan berubah.
- Memperbaiki Escape pada dialog foto profil agar tidak menutup focus trap milik komponen lain.
- Memperbaiki helper endpoint pengumuman/agenda agar memakai parameter `type` yang sesuai.
- Mencegah deklarasi tautan navigasi Pengumuman ganda dan mempertahankan menu yang sengaja dinonaktifkan.
- Memperbaiki sitemap agar menghormati metadata `noindex`.
- Memperketat service worker agar tidak menyimpan cache admin/API/preview dan tidak menghapus cache milik aplikasi lain.

### Security
- Menjaga query publik memakai daftar kolom eksplisit dan RLS; mutasi CMS tetap melalui endpoint server admin.
- Menyiapkan migration default privileges dan cleanup schema advisor. Keduanya belum diterapkan pada snapshot Supabase 14 November 2026; lihat `docs/DATABASE-STATE.md` sebelum rollout.
- Menyamarkan detail error provider pada sejumlah API admin.

### Removed
- Menghapus kode mati, skrip/stylesheet yang tidak dipakai, fungsi data duplikat, dan field `masdo`.

---

Catatan: bagian `[Unreleased]` merangkum perubahan pada source package. Daftar ini bukan bukti bahwa seluruh migration sudah diterapkan, test sudah lulus, atau deployment sudah terverifikasi. Periksa laporan dan snapshot bertanggal di folder `docs/` untuk status verifikasi.
