import { describe, expect, it } from 'vitest';
import { mapGalleryRow, mapMember } from '../src/lib/data';
import { getSupabaseAdmin } from '../src/lib/supabase';

function createStorageClient() {
  return {
    storage: {
      from(bucket: string) {
        return {
          getPublicUrl(path: string) {
            return { data: { publicUrl: `https://cdn.example/${bucket}/${path}` } };
          },
        };
      },
    },
  } as unknown as NonNullable<ReturnType<typeof getSupabaseAdmin>>;
}

describe('data mappers', () => {
  const client = createStorageClient();

  it('maps member fields and resolves storage-backed media', () => {
    const member = mapMember({
      nama: 'Siswa Contoh', nis: '001', kelas: 'XII-9', jabatan: 'Ketua',
      foto_url: 'storage://anggota/siswa.webp', audio_url: 'storage://anggota/suara.webm',
      foto_audio_url: null, deskripsi: 'Profil', social: { github: 'https://github.com/example' },
      skills: ['Routing'], visible: true, urutan: 2,
    }, client);

    expect(member.nama).toBe('Siswa Contoh');
    expect(member.foto).toBe('https://cdn.example/astro/anggota/siswa.webp');
    expect(member.audio).toBe('https://cdn.example/astro/anggota/suara.webm');
    expect(member.fotoAudio).toBe(member.foto);
    expect(member.skills).toEqual(['Routing']);
    expect(member.visible).toBe(true);
  });

  it('never exposes NIS in the public member mapper', () => {
    const member = mapMember({ nama: 'Siswa', nis: '12345' }, client);
    expect(member).not.toHaveProperty('nis');
    expect(JSON.stringify(member)).not.toContain('12345');
  });

  it('does not return retired local member asset paths', () => {
    const member = mapMember({ nama: 'Siswa', foto_url: '/assets/profil/old.webp' }, client);
    expect(member.foto).toBeNull();
  });

  it('maps gallery metadata and resolves storage references', () => {
    const image = mapGalleryRow({
      id: 'gallery-1', src: 'storage://galeri/foto.webp', caption: 'Kegiatan',
      title: null, description: 'Dokumentasi kelas', category: 'Kegiatan',
      taken_at: '2026-01-02', alt_text: null, urutan: 4,
    }, client);

    expect(image.src).toBe('https://cdn.example/astro/galeri/foto.webp');
    expect(image.title).toBe('Kegiatan');
    expect(image.alt_text).toBe('Kegiatan');
    expect(image.urutan).toBe(4);
  });
});
