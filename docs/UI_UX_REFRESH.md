# UI/UX Refresh — astro-web

## Tujuan
Menyatukan kualitas pengalaman halaman publik dan CMS admin tanpa mengubah data, kontrak API, alur CMS, atau identitas konten yang sudah berjalan.

## Prinsip desain
- Modern, rapi, berkarakter teknologi, dan tetap ringan dibaca.
- Sistem token global untuk radius, gutter, motion, dan hierarki tipografi.
- Mempertahankan tiga tema publik (dark, light, blue) dan warna aksen yang dikelola CMS.
- Dashboard admin memakai sistem visual yang konsisten, dengan kontras dan affordance yang lebih jelas.
- Portofolio pengembang mempertahankan identitas visual brutalist tersendiri, tetapi mendapat lapisan aksesibilitas dan responsive safety.
- Interaksi harus tetap ramah keyboard, sentuhan, dan pengaturan reduced motion.

## Perubahan tahap pertama
- `src/styles/ui-refresh.css`: lapisan visual global untuk seluruh halaman publik berbasis `Layout.astro`.
- `src/styles/admin-refresh.css`: lapisan visual dashboard/login CMS, termasuk sidebar mobile, form, tabel, status, dan kartu.
- `src/styles/developer-ui-refresh.css`: peningkatan fokus keyboard, safe-area, dan reduced motion tanpa mengubah gaya khas portofolio.
- `src/scripts/admin.js`: status `aria-expanded`, label tombol menu mobile, penutupan menu via Escape, serta status aktif dan relasi kontrol pada navigasi dashboard.
- Halaman Galeri dan Struktur: item foto/kartu yang interaktif memiliki nama aksesibel; kartu struktur dan carousel dapat dioperasikan dengan keyboard.
- `src/layouts/Layout.astro`, `src/layouts/DeveloperLayout.astro`, dan `src/pages/pengembang/admin.astro`: pemasangan stylesheet sesuai cakupan halaman.

## Area audit lanjutan
1. Beranda: prioritas hero, CTA, ritme section, dan keterbacaan.
2. Anggota dan struktur: pencarian, kartu profil, detail anggota, dan navigasi data.
3. Galeri: filter, grid gambar, lightbox, caption, dan empty state.
4. Keahlian dan TKJ: visualisasi informasi, urutan baca, dan responsivitas.
5. Portofolio pengembang: navigasi, proyek, cerita, detail, dan kontrol interaktif.
6. CMS admin: alur kerja per modul, form panjang, validasi, konfirmasi destruktif, dan feedback simpan.
7. Pengujian lintas viewport, tema, keyboard, reduced motion, dan kontras.

## Validasi
- `node --check` berhasil untuk seluruh file `src/scripts/*.js`.
- Stylesheet finishing phase 2 berhasil diparse dengan `tinycss2`; pemeriksaan sintaks JavaScript mencakup seluruh 15 script frontend.
- Build Astro, `astro check`, dan Vitest belum dijalankan pada lingkungan kerja ini karena dependency belum terpasang dan versi Node lokal `22.16.0` lebih rendah dari persyaratan proyek `>=22.23.4` (`.nvmrc` menetapkan `24.22.1`).
- Sebelum deployment, jalankan `npm install`, `npm run check`, `npm test`, `npm run build` menggunakan Node `24.22.1`.
