/**
 * Kebijakan data publik.
 *
 * NIS adalah identitas siswa dan TIDAK ditampilkan atau dikirim ke browser publik
 * secara default. Jika pengelola kelas memutuskan NIS boleh tampil, ubah konstanta
 * ini menjadi `true` (keputusan harus dicatat di docs/DATA-CLASSIFICATION.md).
 * NIS tetap tersedia di jalur admin (CMS) yang terautentikasi.
 */
export const SHOW_MEMBER_NIS = false;

/** Kolom `anggota` yang boleh dibaca halaman publik. `nis` ditambahkan hanya jika kebijakan mengizinkan. */
export const PUBLIC_MEMBER_COLUMNS = [
  'nama', 'kelas', 'jabatan', 'deskripsi', 'foto_url', 'audio_url', 'audio_nama',
  'foto_audio_url', 'deskripsi_audio', 'social', 'skills', 'visible', 'urutan',
  ...(SHOW_MEMBER_NIS ? ['nis'] : []),
].join(', ');

export const PUBLIC_GALLERY_COLUMNS =
  'id, src, caption, title, description, category, taken_at, alt_text, urutan, visible';

/** Buang NIS dari data anggota (termasuk data fallback lokal) bila kebijakan melarang. */
export function stripPrivateMemberFields<T extends Record<string, any>>(member: T): T {
  if (SHOW_MEMBER_NIS) return member;
  const { nis: _nis, ...rest } = member;
  return rest as T;
}
