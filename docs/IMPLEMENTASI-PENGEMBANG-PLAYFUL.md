# Implementasi `/pengembang` — Playful Neo-Brutalist Editorial

## Yang diubah

- Kanvas halaman diperlebar hingga 1440px dengan gutter responsif; layout mobile menggunakan lebar viewport.
- Navigasi desktop menggunakan lima akses utama. Mobile menggunakan drawer yang menampilkan navigasi utama dan bab tambahan.
- Enam bab narasi lama (`Asal Saya`, `AI & Pembelajaran`, `Filosofi`, `Tantangan`, `Inspirasi`, `Masa Depan`) dipindahkan ke `src/data/developer-legacy-stories.ts`. Seluruh blok paragraf, subjudul, daftar, contoh kode, dan kutipan yang tersedia di source lama disertakan.
- Enam milestone timeline lama dipertahankan sebagai `DEVELOPER_LEGACY_TIMELINE`.
- Contoh kode Baileys dipulihkan spasi dan indentasinya sesuai token yang terlihat pada markup lama.
- Persentase hard/soft skill tidak dirender sebagai skor publik. Kompetensi disajikan sebagai deskripsi, sedangkan karakter personal tetap berupa tag reflektif. Enam catatan skill bernuansa humor dari tabel kelas juga ditampilkan tanpa angka level.
- Proyek kelas, draft skills, motivation, principles, quotes, education, notes, contacts, dan metadata lama tetap tersedia. Website kelas memakai URL Cloudflare Workers yang terlihat pada screenshot deployment, bukan tautan Vercel lama.
- Theme Studio khusus `/pengembang` menyediakan preset Brutalist Yellow, Monochrome, Electric Pop, dan Custom; sembilan color token (termasuk canvas luar) dapat diubah. Perubahan disimpan sebagai draft `/pengembang`, bukan ke tema global `site_settings`.
- Editor cerita CMS memuat enam bab sumber lama, memungkinkan mengedit, menambah, menghapus bab draft, menyimpan, dan membuka preview.
- Draft loader menggabungkan draft parsial dengan halaman terbit/fallback agar menyimpan tema atau bab tidak menghapus metadata/konten lain.
- Efek visual dibuat singkat dan comic-inspired: reveal stamp, page pop, micro-bounce, dan sound-word burst yang memakai warna tema. Animasi berulang jitter/spin pada tile/avatar dihentikan. `prefers-reduced-motion` tetap dihormati.
- Stage 4 migration menambahkan section `pengembang.story`. File migration tidak diterapkan ke Supabase live.

## Penyimpanan CMS

Konten tetap menggunakan `site_pages.content.developer`. Bentuk data tambahan:

- `developer.stories[]`: objek `{ key, title, subtitle, blocks[], codeTitle, codeLanguage, code, quote }`.
- `developer.legacyTimeline[]`: objek `{ title, label, description }`.
- `developer.theme`: objek `{ preset, colors }`.

`developer.theme.colors` berisi `frame`, `background`, `surface`, `text`, `muted`, `border`, `primary`, `secondary`, dan `highlight`. Nilai warna wajib hex enam digit. Pemeriksaan kontras minimum 4.5:1 diterapkan pada teks dan 3:1 untuk border terhadap surface/background.

## Urutan aktivasi database (belum dilakukan)

1. Backup database dan objek Storage. Backup JSON CMS tidak menyertakan binary Storage.
2. Pastikan migration CMS dasar benar-benar telah diterapkan; jangan menjalankan ulang `schema.sql`, seed, atau migration historis.
3. Database live saat audit mencatat Stage 3 Workflow dan Stage 3 Login Table, tetapi tidak mencatat Stage 3 Hardening. Periksa migration history dan objek RPC sebelum menerapkan `migrations/20261103_stage3_hardening.sql`.
4. Setelah Stage 3 Hardening terverifikasi, tinjau dan terapkan `migrations/20261103_stage4_developer_and_global_asset.sql` satu kali pada Preview. Migration ini men-seed section pengembang termasuk `pengembang.story`.
5. Jangan jalankan migration ke database production dari paket ini tanpa backup, review, dan persetujuan eksplisit.

## Batasan yang belum selesai

- Editor visual khusus tersedia untuk enam narasi dan palet tema. Array lain (skill, proyek, motivasi, perjalanan, filosofi, kutipan, edukasi, catatan, kontak, pengalaman) masih dapat diedit melalui JSON editor pada modul Pengembang & SEO; form visual item-per-item untuk seluruh kategori belum dibuat.
- Pembuatan source belum menjalankan `astro check`, Vitest, production build Astro, Cloudflare Workers Build, atau browser end-to-end.
- Publikasi draft bergantung pada RPC `publish_tkj_cms_draft` dari Stage 3 Hardening yang belum ditemukan pada database live saat audit. Simpan draft menggunakan tabel `site_page_drafts` yang sudah ada, tetapi publish akan gagal sampai fungsi tersebut tersedia.
- Tidak ada mutasi database, Storage, rahasia, atau deployment yang dilakukan.
