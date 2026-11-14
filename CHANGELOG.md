# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/).

## [Unreleased]
- Perbaikan deklarasi navigasi pengumuman agar tidak terduplikasi.
- Penyesuaian layout anggota responsif dua kolom pada ponsel dan penghapusan filter yang tidak digunakan.
- Perbaikan helper endpoint modul CMS pengumuman dan agenda.

### Added
- Bagian beranda "Visi, Misi & Prestasi" (dapat disembunyikan/diurutkan dari admin).
- Pembacaan publik memakai anon key + RLS read-only (`getSupabasePublic`).
- Migrasi Supabase berstempel waktu di `supabase/migrations/`, `supabase/config.toml`.
- Berkas repo standar: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig`, `.gitattributes`, Dependabot, template PR/issue.
- Logging error pada fallback data dan peringatan bila `SUPABASE_ANON_KEY` kosong.
- Modul CMS pengumuman dan agenda: daftar, buat, ubah, jadwalkan, terbitkan, dan arsipkan konten.
- Dokumentasi rekonsiliasi database dan status implementasi 13 November 2026.

### Security
- Query publik memakai daftar kolom eksplisit dan kebijakan RLS.
- Migrasi hak akses publik dan batas unggahan bucket `astro` diterapkan serta diverifikasi pada lingkungan pengembangan/pengujian aktif.
- Seluruh mutasi CMS tetap melalui endpoint server admin; tidak ada hak tulis tabel aplikasi untuk peran publik.

### Changed
- CI memakai `npm ci` agar sesuai lockfile.
- `admin.js` dipecah menjadi modul per fitur di `src/scripts/admin/`.
- CSS tambalan (`*-refresh`, `*-finish`) digabung ke file induknya dengan urutan cascade yang sama.
- Keluaran `npm run migrate:data` dipindah ke `supabase/seed/`.

### Removed
- Kode mati: skrip/stylesheet tidak terpakai, fungsi data duplikat, field `masdo`.


## Perbaikan UI anggota dan pengumuman
- Mengganti jalur kartu anggota horizontal menjadi grid responsif: dua kolom pada ponsel normal, satu kolom hanya pada layar sangat sempit, dan tiga/empat kolom untuk layar lebih besar.
- Menghapus filter kategori yang tidak dipakai dan navigasi slider horizontal.
- Memperbaiki helper endpoint di modul admin pengumuman agar permintaan GET/POST memakai `/api/admin/announcements?type=...`.
- Menambahkan tautan Pengumuman ke fallback navigasi publik dan migrasi idempotent untuk menu yang dikelola CMS.
