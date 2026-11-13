-- Membatasi kolom anggota yang dapat dibaca role anon. NIS tidak ikut.
-- JANGAN langsung dijalankan di produksi: uji di proyek disposable dan pastikan
-- halaman publik (query kolom eksplisit di src/lib/public-data-policy.ts) tetap berfungsi.
-- Jalur admin memakai service role sehingga tidak terpengaruh.
revoke select on table public.anggota from anon, authenticated;
grant select (nama, kelas, jabatan, deskripsi, foto_url, audio_url, audio_nama,
              foto_audio_url, deskripsi_audio, social, skills, visible, urutan)
  on public.anggota to anon, authenticated;
