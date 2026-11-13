-- Akses baca publik hanya untuk kolom yang digunakan halaman anggota.
revoke select on table public.anggota from anon, authenticated;
grant select (
  nama, kelas, jabatan, deskripsi, foto_url, audio_url, audio_nama,
  foto_audio_url, deskripsi_audio, social, skills, visible, urutan
) on public.anggota to anon, authenticated;
