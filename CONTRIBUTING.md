# Panduan Kontribusi

## Alur kerja

1. Buat branch dari `main` (`fitur/nama-singkat` atau `perbaikan/nama-singkat`).
2. Lakukan perubahan kecil dan fokus pada satu tujuan.
3. Jalankan `npm run validate` (`astro check`, tes, dan build) sebelum membuka pull request.
4. Perbarui `CHANGELOG.md` pada bagian `Unreleased`.

## Konvensi

- Format mengikuti `.editorconfig` dan `.prettierrc.json`.
- Pesan commit: `jenis: ringkasan` (contoh: `fix: perbaiki urutan section beranda`).
- Perubahan database ditulis sebagai migrasi baru di `supabase/migrations/` dengan nama
  `YYYYMMDDHHMMSS_deskripsi.sql`, bersifat aditif dan idempotent. Jangan mengubah migrasi lama.
- Jangan menaruh secret di repository. Gunakan `.env` (lokal) dan Cloudflare Variables/Secrets.

## Struktur singkat

Lihat bagian "Struktur Proyek" pada `README.md`.
