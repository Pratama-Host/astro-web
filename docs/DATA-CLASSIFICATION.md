# Klasifikasi data publik vs privat

Status: **draf — perlu persetujuan pengelola kelas.** Dibuat sebagai Fase 0/1.1 blueprint.

| Data | Tabel/kolom | Publik? | Catatan |
|---|---|---|---|
| Nama, jabatan, kelas | `anggota.nama/jabatan/kelas` | Ya | Tampil di /anggota dan /struktur |
| Deskripsi, skill, sosial | `anggota.deskripsi/skills/social` | Ya (setelah persetujuan siswa) | Tinjau tautan sosial pribadi |
| Foto & audio | `anggota.foto_url/audio_url/...` | Ya (setelah persetujuan siswa) | Perlu proses penarikan persetujuan |
| **NIS** | `anggota.nis` | **Tidak (default)** | Hanya admin. Ubah `SHOW_MEMBER_NIS` di `src/lib/public-data-policy.ts` bila diputuskan lain |
| Draft, revisi, audit, login attempts | tabel CMS | Tidak | Hanya via jalur admin |

## Catatan keamanan yang masih terbuka
- RLS membatasi **baris**, bukan **kolom**. Selama grant `anon` pada `anggota` mencakup kolom `nis`, siapa pun yang memegang anon key dapat membacanya langsung lewat REST API Supabase, meski halaman tidak menampilkannya.
- Perbaikan tuntas: cabut `SELECT` tabel untuk `anon` lalu beri grant per kolom (lihat `supabase/migrations/20261109000100_restrict_anon_anggota_columns.sql`). **Uji dulu di proyek disposable** sebelum diterapkan ke produksi.
