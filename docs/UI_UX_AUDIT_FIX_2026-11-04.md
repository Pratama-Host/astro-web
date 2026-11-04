# Audit UI/UX dan perbaikan — 4 November 2026

## Cakupan
Audit statis dilakukan terhadap source ZIP Phase 2 yang diberikan. Pemeriksaan live URL `https://astro-web.mabarpropesonal234.workers.dev/` tidak berhasil karena host tidak dapat diakses oleh pemeriksa, sehingga tidak ada klaim bahwa tampilan produksi telah diverifikasi.

## Temuan dan perbaikan

### 1. Skip link publik selalu terlihat — diperbaiki
- Penyebab: `src/styles/dasar.css` menyembunyikan `.skip-link` dengan `top: -100%`, tetapi `src/styles/ui-finish.css` menimpa `top` ke area layar tanpa menyembunyikannya dengan transform.
- Perbaikan: tautan tetap tersedia untuk navigasi keyboard, tetapi berada di luar layar sampai menerima fokus. Saat fokus, tautan muncul.
- Target `main-content` diberi `tabindex="-1"` agar perpindahan fokus ke konten utama berfungsi. Target portfolio juga dibuat fokusable.
- Skip link admin tetap dipertahankan; stylesheet admin sudah menyembunyikannya sampai fokus.

### 2. Jam melebar saat diseret pada layar kecil — diperbaiki
- Penyebab: CSS mobile menambatkan jam menggunakan `bottom`, sementara JavaScript drag menambahkan `top`. Pada elemen `position: fixed`, kombinasi `top` dan `bottom` dapat membuat elemen meregang.
- Perbaikan: ketika drag dimulai, script mengubah anchor menjadi `top` dan mengatur `bottom: auto`; batas drag memakai ukuran elemen aktual. Posisi tersimpan juga menghapus anchor bawah.
- Reset posisi menghapus override inline sehingga posisi default desktop/mobile kembali berlaku.
- Ukuran jam dibuat intrinsik dan tidak meregang. Semantik pembaca layar diubah menjadi `role="timer"` agar pembaruan tiap detik tidak diumumkan sebagai status berulang.

### 3. Bubble indikator galeri — dirapikan
- Sebelumnya tombol dot memiliki minimum 26×26 px dan mewarisi background lingkaran, sehingga seluruh area target dapat terlihat seperti bubble besar.
- Perbaikan: area target 26×26 px tetap dipertahankan, tetapi indikator visual menjadi titik 8 px; indikator aktif menjadi kapsul 18×8 px. Fokus keyboard tetap terlihat.

## Pemeriksaan yang berhasil
- `node --check` untuk seluruh file `src/scripts/*.js` lulus.
- Target `main-content` pada halaman publik diperiksa dan dibuat fokusable, termasuk halaman offline.
- Struktur patch dan sumber perubahan ditinjau.

## Pemeriksaan yang belum dilakukan
- `astro check`, Vitest, dan production build belum dijalankan karena `node_modules` tidak tersedia pada lingkungan pemeriksaan.
- Node yang tersedia adalah 22.16.0, sedangkan `package.json` mensyaratkan Node >=22.23.4 dan `.nvmrc` menentukan 24.22.1.
- Uji browser visual/responsif, interaksi drag di perangkat nyata, serta uji live deployment belum dapat diklaim lulus.

## Catatan audit lanjutan
- Dokumentasi Phase 2 sebelumnya mencatat cakupan test otomatis masih terbatas pada `admin-auth`, `cms-admin`, dan `media-validation`; `admin.js` serta banyak endpoint belum memiliki pengujian langsung.
- Sebelum deploy, jalankan `npm ci`, lalu `npm run check`, `npm test`, dan `npm run build` dengan Node versi yang sesuai. Setelah deploy, uji keyboard skip-link, jam pada viewport mobile, dan galeri pada lebar 360/390 px.
