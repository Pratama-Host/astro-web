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
- Seluruh 11 section CMS halaman Pengembang kini sudah di-seed ke Supabase aktif melalui migration `0005_fix_nested_settings_merge_and_developer_sections.sql` (ledger `20261104134549`). Baris di-upsert berdasarkan `(page_slug, section_key)` sehingga tidak menduplikasi alias lama `developer.story`.

## Penyimpanan CMS

Konten tetap menggunakan `site_pages.content.developer`. Bentuk data tambahan:

- `developer.stories[]`: objek `{ key, title, subtitle, blocks[], codeTitle, codeLanguage, code, quote }`.
- `developer.legacyTimeline[]`: objek `{ title, label, description }`.
- `developer.theme`: objek `{ preset, colors }`.

`developer.theme.colors` berisi `frame`, `background`, `surface`, `text`, `muted`, `border`, `primary`, `secondary`, dan `highlight`. Nilai warna wajib hex enam digit. Pemeriksaan kontras minimum 4.5:1 diterapkan pada teks dan 3:1 untuk border terhadap surface/background.

## Status aktivasi database

Database Supabase aktif sudah memiliki 11 section untuk `/pengembang`, termasuk `profile`, `story`, `skills`, `work`, `motivation`, `contact`, `philosophy`, `experience`, `quotes`, `education`, dan `notes`. Semua diaktifkan sebagai konfigurasi awal; admin dapat mengubah urutan/visibilitasnya melalui CMS.

Migration terbaru `20261104134549 fix_nested_site_settings_merge_and_developer_sections` juga memperbaiki merge pengaturan global bersarang. Uji read-only pada helper merge memastikan nilai yang tidak dikirim patch tidak hilang. Hak eksekusi fungsi tetap hanya untuk `service_role`.

**Jangan jalankan** `migrations/20261103_stage4_developer_and_global_asset.sql` pada database aktif atau sebagai langkah fresh install. File tersebut dipertahankan sebagai artefak historis, tetapi mendefinisikan ulang fungsi memakai `SECURITY DEFINER`; alur kanonik yang aman adalah `0003` + `0004` + `0005` seperti pada `docs/MIGRATIONS.md`.

Untuk project Supabase baru, ikuti urutan kanonik pada `docs/MIGRATIONS.md`. Untuk project aktif, cek migration ledger dan jangan mengulang baseline/seed. Backup metadata database serta objek Storage sebelum perubahan database lanjutan.

## Batasan yang belum selesai

- Editor visual khusus tersedia untuk enam narasi dan palet tema. Array lain (skill, proyek, motivasi, perjalanan, filosofi, kutipan, edukasi, catatan, kontak, pengalaman) masih dapat diedit melalui JSON editor pada modul Pengembang & SEO; form visual item-per-item untuk seluruh kategori belum dibuat.
- Pada sesi audit ini `astro check`, Vitest, production build Astro, Cloudflare Workers Build, dan browser end-to-end belum dapat diverifikasi.
- Publikasi draft menggunakan RPC `publish_tkj_cms_draft` yang sudah tersedia pada database aktif. Uji browser end-to-end untuk draft/preview/publish masih harus dilakukan pada URL Preview Cloudflare.
- Perubahan database yang telah diterapkan hanya penambahan/penyelarasan section Pengembang dan fungsi recursive merge CMS melalui migration `20261104134549`; tidak ada perubahan grants tabel, RLS, Storage, NIS dummy, rahasia, atau deployment.
