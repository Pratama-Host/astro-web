# Audit awal data dan media

Audit dilakukan pada arsip `projek.zip` sebelum refactor. Sumber utama halaman Astro aktif adalah `src/data/G.json`. `src/scripts/pengaturan.js` berisi salinan konfigurasi/legacy yang tidak tampak diimpor oleh halaman aktif.

## Lokasi data terstruktur

| File:baris | Jenis data |
|---|---|
| `src/data/G.json:2-19` | Identitas kelas, jurusan, sekolah, tahun ajaran, motto, deskripsi, slogan, OG image, countdown, sosial media |
| `src/data/G.json:20-45` | Statistik kelas |
| `src/data/G.json:46-72` | Prestasi |
| `src/data/G.json:73-80` | Visi dan misi |
| `src/data/G.json:81-96` | Wali kelas, Masdo Officials, keahlian dan foto |
| `src/data/G.json:97-198` | Guru, mapel, peran, quote dan expertise |
| `src/data/G.json:199-240` | Struktur organisasi, nama, jabatan, foto |
| `src/data/G.json:241-502` | 20 anggota, nama, NIS, foto, deskripsi, audio, metadata audio, sosial |
| `src/data/G.json:503-540` | Enam skill, level, ikon, deskripsi |
| `src/data/G.json:541-642` | 20 entri galeri dan caption/label |
| `src/data/G.json:643-akhir` | Deskripsi program TKJ, mata pelajaran, karier, dan kurikulum |

Salinan/konfigurasi legacy: `src/scripts/pengaturan.js:13-27` identitas kelas; `31-44` countdown/sosial; `47-72` statistik; `75-106` prestasi; `109-116` visi/misi; `119-137` wali kelas/Masdo; `139-267` guru; `269-311` organisasi; `313-575` siswa; `577-614` skill; `616-737` galeri; `739-akhir` data TKJ.

Halaman/komponen pengguna `G.json`: `src/pages/index.astro`, `anggota.astro`, `galeri.astro`, `keahlian.astro`, `pengembang.astro`, `struktur.astro`, `tkj.astro`, `src/components/Footer.astro`, `src/layouts/Layout.astro`, serta `src/scripts/anggota.js` dan `src/scripts/beranda.js`.

## Referensi media

Path `public/assets/logo/logo-utama.svg` digunakan Header, LogoLightbox, Layout fallback, 404/offline dan service worker.

Path profil yang tercantum di data/config: `public/assets/profil/profil-alfredo.webp`, `alip.webp`, `profil-alvina.webp`, `cute.webp`. Dipakai data organisasi/anggota dan halaman pengembang.

Audio global: `public/assets/audio/videoplayback.weba`, dirujuk oleh `public/audio-player.html`, data anggota dan konfigurasi legacy.

Galeri (sumber kanonis `G.json`):

- `foto-kelas1.webp`
- `foto-kelas2.webp`
- `foto-lab1.webp`
- `foto-kelas3.webp`
- `foto-cewe1.webp`
- `foto-cewe2.webp`
- `kenangan1.webp`
- `kenangan2.webp`
- `meme.jpeg`
- `kenangan4.webp` sampai `kenangan13.webp`
- `meme2.jpeg`

Referensi legacy memiliki perbedaan `meme.png` pada `src/scripts/pengaturan.js` sedangkan JSON memakai `meme.jpeg`. URL avatar `ui-avatars.com` dan OG image `picsum.photos` merupakan sumber eksternal, bukan media lokal.

## Catatan kelengkapan arsip

Dalam ZIP awal, `public/assets/audio`, `public/assets/kenangan`, `public/assets/logo`, dan `public/assets/profil` hanya memuat file README.md. File biner media yang dirujuk tidak tersedia. Script migrasi memeriksa keberadaan file dan menandai referensi tersebut sebagai missing sampai file asli disalin kembali.


## Hardening 2026-11-03

- Referensi media `storage://` dipertahankan sebagai format internal yang valid dan di-resolve oleh `src/lib/data.ts`; tautan sosial tetap HTTP/HTTPS.
- Origin publik dipusatkan di `src/lib/site-url.ts`; nilainya diambil dari `SITE_ORIGIN` atau origin request SSR.
- `robots.txt` dan `sitemap.xml` kini merupakan endpoint Astro dinamis.
- `public/404.html` dihapus karena route `src/pages/404.astro` menjadi sumber 404 kanonis pada output server.
- Backup lokal dipindahkan dari `public/assets.local-backup/` ke `assets.local-backup/`.
- PWA memakai ikon PNG statis dan service worker tidak mencache admin/API.
- Revisi CMS memiliki retry saat terjadi konflik nomor versi.
- Backup Storage listing dan ekspor tabel memakai pagination.
- Stage 3 hardening menambahkan pemeriksaan media refs termasuk draft/revisi, upload berbasis signature, preview no-store, serta RPC PostgreSQL transaksional untuk backup/restore dan snapshot revisi.

## Verifikasi yang belum dilakukan

Build Astro, deploy Cloudflare, koneksi Supabase production, migration production, dan pengujian browser belum dijalankan oleh proses audit ini.

## Subnet calculator verification examples

- `192.168.1.10/24` -> network `192.168.1.0`, broadcast `192.168.1.255`, host range `192.168.1.1 - 192.168.1.254`.
- `192.168.1.10/31` -> RFC 3021 point-to-point range uses both addresses: `192.168.1.10 - 192.168.1.11` when the input belongs to that network.
- `192.168.1.10/32` -> the single address is both network and host endpoint: `192.168.1.10 - 192.168.1.10`.
- Invalid examples such as `192.168.1.999/24`, `192.168.1/24`, `01.2.3.4/24`, and `192.168.1.1/33` are rejected by the client-side calculator.
