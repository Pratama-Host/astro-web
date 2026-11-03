# CMS TKJ XII-9: panduan implementasi

## Aktivasi database

Database inti proyek sudah berisi tabel `site_settings`, `anggota`, `guru`, `skills`, dan `galeri`. Untuk instalasi CMS baru, jalankan migration berurutan: `20261101_cms.sql`, `20261103_stage3_workflow.sql`, `20261103_stage3_hardening.sql`, lalu `20261103_stage4_developer_and_global_asset.sql`. Pada database yang sudah menjalankan migration sebelumnya, jangan mengulang file lama. Jalankan hanya migration yang belum diterapkan, satu kali, melalui Supabase SQL Editor. Migration kelas/data historis tetap mengikuti status database proyek dan tidak perlu diulang hanya untuk fitur ini.

Migration ini bersifat additive. Migration menambah kolom `anggota.visible`, `anggota.skills`, metadata galeri, serta tabel:

- `site_pages`: metadata SEO dan konten terstruktur per halaman.
- `site_navigation`: menu publik.
- `site_sections`: visibilitas dan urutan section yang sudah ada di markup. Untuk `/pengembang`, migration tambahan menambah `profile`, `skills`, `work`, `motivation`, `contact`, `philosophy`, `experience`, `quotes`, `education`, dan `notes`. Kunci lama `story` tetap ditoleransi sebagai alias profil untuk kompatibilitas.
- `media_assets`: metadata file Storage.
- `content_revisions`: versi snapshot pengaturan global dan metadata halaman.
- `admin_audit_logs`: catatan aktivitas CMS.

Tabel lama tidak dihapus. Seed navigasi dan section memakai route yang benar-benar ada pada proyek saat audit.

## Modul dashboard

| Modul admin | Data/API | Integrasi publik |
|---|---|---|
| Dashboard | `/api/admin/cms` | Ringkasan jumlah record, ukuran metadata media, koneksi, aktivitas |
| Anggota | tabel `anggota`, `/api/admin/anggota` | `/anggota`, `/struktur`, `/pengembang` melalui data-access |
| Galeri | tabel `galeri`, `/api/admin/gallery` | `/galeri` |
| Konten & profil | `site_settings.value`, `/api/admin/content` | Beranda, header, footer, struktur, TKJ, developer |
| Guru & keahlian | tabel `guru` dan `skills`, `/api/admin/collections` | Beranda dan halaman keahlian |
| Section | `site_sections`, `/api/admin/sections` | Visibilitas/urutan section yang sudah dipetakan di Astro, termasuk 11 bagian halaman Pengembang |
| Tampilan & media | `site_settings.media` dan `.appearance`, `/api/admin/content`, `/api/admin/media` | Logo, favicon, background, tema, aksen, warna latar, OG dan audio |
| Navigasi | `site_navigation`, `/api/admin/navigation` | `HamburgerMenu.astro` |
| SEO | `site_pages`, `/api/admin/pages` | `Layout.astro` membaca title, description, OG image dan robots |
| Media library | `media_assets` + Storage, `/api/admin/media` | Referensi file yang dipakai halaman dan pengaturan |
| Sistem | `/api/admin/backup`, `/api/admin/revisions` | Export/import data dan pulihkan snapshot |

Semua endpoint admin baru memverifikasi sesi admin melalui mekanisme autentikasi yang telah ada. Client tidak menerima Supabase service-role key. Route publik `/pengembang` memakai `DeveloperLayout.astro` yang berdiri sendiri: tidak memuat layout, header/footer, tema, canvas jaringan, audio iframe, widget offline, atau script global website. Data tetap bersumber dari Supabase dan `site_pages`, sehingga tidak membuat database/profil duplikat.

## Konten yang bisa dikelola

### Pengaturan global (`site_settings.value`)

- `namaKelas`, `jurusan`, `namaSekolah`, `tahunAjaran`, `motto`, `deskripsi`, `sloganHero`.
- `hero`: `eyebrow`, `schoolPrefix`, `highlight`, `classLabel`, `primaryText`, `primaryHref`, `secondaryText`, `secondaryHref`.
- `visi`, `misi`, `waliKelas`, `masdo`, `stats`, `prestasi`, `tkj`, `sosmed`, `footer`.
- `media`: `logo_url`, `alternate_logo_url`, `favicon_url`, `og_url` (jika digunakan), `audio_url`, `audio_volume`.
- `appearance`: `theme` (`dark`, `light`, `blue`), `accent_color`, `background_color`, `background_image_url`.

Field daftar terstruktur seperti `stats`, `prestasi`, `tkj`, `sosmed`, dan `footer` diedit sebagai JSON. Pertahankan bentuk object/array yang sudah ditampilkan di editor. Tidak ada HTML atau JavaScript arbitrer yang dieksekusi dari database.

### Metadata halaman (`site_pages.content`)

Halaman yang didukung: `/`, `/anggota`, `/galeri`, `/struktur`, `/keahlian`, `/tkj`, `/pengembang`.

Kunci konten yang sudah dipakai markup saat ini meliputi `eyebrow`, `headline`, `intro`, `featuredEyebrow`, `featuredTitle`, `collectionEyebrow`, `collectionTitle`, `footerNote`, `subjectsTitle`, `curriculumTitle`, `careersTitle`, `teachersEyebrow`, `teachersTitle`, dan `devIntroText`.


Untuk halaman `/pengembang`, field lama tetap didukung: `role`, `eyebrow`, `headline`, `intro`, `devIntroText`, `taglines[]`, `experiences[]`, dan `quote`. Konten dari draft editorial disimpan di dalam object `developer` agar tidak mencampur namespace konten halaman lain:

```json
{
  "developer": {
    "profile": {
      "name": "Nama profil",
      "role": "Peran",
      "photo": "storage://assets/profile.webp",
      "location": "Lokasi",
      "status": "Status singkat",
      "languages": "ID, EN, DE",
      "focus": "Web & Bot",
      "fuel": "Coffee",
      "bio": "Paragraf profil"
    },
    "typing": ["Kalimat pertama", "Kalimat kedua"],
    "focusCards": [{"icon": "🎯", "title": "Fokus", "description": "Deskripsi"}],
    "hardSkills": [{"name": "Web Dev", "percent": 85}],
    "softSkills": [{"name": "Retorika", "percent": 79}],
    "projects": [{"icon": "🌐", "tag": "Astro", "status": "PROJECT", "title": "Nama proyek", "description": "Deskripsi", "href": "/"}],
    "motivation": [{"title": "Tema", "description": "Catatan"}],
    "journey": [{"title": "Tahap", "description": "Catatan"}],
    "principles": [{"icon": "🧠", "title": "Prinsip", "description": "Uraian"}],
    "quotes": [{"text": "Kutipan", "author": "Penulis"}],
    "education": [{"category": "Teknologi", "title": "Artikel", "paragraphs": ["Paragraf"]}],
    "notes": [{"category": "Notes", "title": "Catatan", "description": "Isi"}],
    "contacts": [{"icon": "✉️", "label": "Email", "value": "alamat", "href": "mailto:alamat", "copy": "alamat"}],
    "theme": {
      "preset": "brutalist-yellow",
      "colors": {
        "background": "#F4F1E8", "surface": "#FFFDF8", "text": "#111111",
        "muted": "#686868", "border": "#111111", "primary": "#F5CD32",
        "secondary": "#32CFC2", "highlight": "#D90B46"
      }
    },
    "stories": [{"key":"origin","title":"Asal Saya","subtitle":"...","blocks":[{"type":"paragraph","text":"..."},{"type":"heading","text":"..."},{"type":"list","text":"..."}],"codeTitle":"...","codeLanguage":"JavaScript","code":"...","quote":"..."}],
    "legacyTimeline": [{"title":"Awal yang Mengejutkan","label":"Babak 01","description":"..."}]
  }
}
```

Field di atas dibaca sebagai JSON object dan dinormalisasi lagi di halaman sebelum dirender. Array yang valid menggantikan array default terkait; array yang tidak dikirim memakai konten draft bawaan. `profile.name`/`profile.role` dapat mengganti nama/peran dari data anggota; `profile.photo` menerima URL HTTPS atau referensi media yang sudah di-resolve. `contacts[].href` dibatasi ke HTTPS, `mailto:`, `tel:`, atau path internal. Persentase skill lama tetap dapat tersimpan pada konten historis untuk kompatibilitas, tetapi tidak lagi ditampilkan sebagai skor kemampuan pada halaman publik. Palet warna khusus halaman Pengembang dikelola melalui Theme Studio dan disimpan di `developer.theme.colors`, terpisah dari tema global website kelas. Cerita lama disimpan pada `developer.stories` sebagai blok terstruktur: `heading`, `paragraph`, dan `list`; blok kode dan kutipan opsional juga didukung. `developer.legacyTimeline` menyimpan enam narasi timeline lama. `developer.theme.colors` memakai sembilan token: `frame`, `background`, `surface`, `text`, `muted`, `border`, `primary`, `secondary`, dan `highlight`. `frame` mengatur canvas luar, sementara token lainnya mengatur warna halaman dan komponen. Palet ini tidak mengubah tema global website kelas.

Konten profil anggota dan media sosial kelas yang sebelumnya ditarik dari tabel `anggota`/`site_settings` tetap digabungkan dengan konten `site_pages`. Stack teknologi proyek website kelas juga ditampilkan sebagai stack proyek, bukan skor kemampuan pribadi.

### Section

Section hanya dapat diatur jika sudah dipetakan di markup Astro. Halaman `/pengembang` memiliki sebelas sakelar terpisah, termasuk section `story` untuk mengembalikan seluruh materi narasi halaman lama. Kunci `story` merupakan section tersendiri untuk narasi lama dan tidak lagi menjadi alias `profile`. CMS tetap tidak dapat membuat komponen visual baru secara dinamis. Penambahan struktur/desain baru tetap memerlukan perubahan source code.

## Media dan Storage

- Default bucket aplikasi dan script migrasi/upload adalah `astro`.
- Upload mendukung gambar, audio, dan PDF dengan batas 20 MB per file.
- Path file dibuat unik agar upload baru tidak menimpa file lama.
- Fitur “Ganti file” mempertahankan object path/URL lama dan mensyaratkan ekstensi sama.
- Hapus media memeriksa referensi pada anggota, galeri, pengaturan, halaman terbit, draft, dan snapshot revisi dengan pagination; jika pemeriksaan gagal atau media masih direferensikan, penghapusan dibatalkan.
- File legacy Storage yang belum punya row `media_assets` tetap ditampilkan sebagai item tidak terindeks dan dapat dimasukkan ke indeks lewat edit metadata.
- Penghapusan item galeri tidak menghapus file Storage. File tetap terlihat di Media Library sampai dihapus secara terpisah dan tidak lagi direferensikan.

## Publikasi dan revisi

Simpan di dashboard berarti langsung memperbarui database dan halaman SSR menggunakan nilai baru pada request berikutnya. Pastikan migration Stage 4 diterapkan sebelum mengaktifkan kode patch pengaturan global dan halaman Pengembang yang memiliki section terpisah. Workflow draft/publish dan preview khusus admin tersedia setelah migrasi Stage 3 (`20261103_stage3_workflow.sql` dan `20261103_stage3_hardening.sql`). Riwayat menyimpan snapshot pengaturan global dan SEO/konten halaman; admin dapat memulihkan versi terdahulu. Pengaturan global memakai RPC patch `patch_tkj_cms_site_settings` pada migration `20261103_stage4_developer_and_global_asset.sql`. Patch digabungkan secara rekursif di PostgreSQL di bawah advisory lock agar pembacaan lama tidak menimpa field lain yang berubah bersamaan. Pengunggahan aset global memakai RPC `set_tkj_cms_global_asset` dengan lock yang sama. Keduanya menulis pengaturan, snapshot revisi, dan audit log dalam satu transaksi database.

Backup JSON berisi baris database/metadata CMS, bukan binary object Storage. Import melakukan upsert dan tidak menghapus baris yang tidak ada dalam file backup.

## Batas yang belum disediakan

- Form ganti password admin mandiri. Password tetap diubah melalui mekanisme environment `ADMIN_PASSWORD` yang sudah ada.
- Kuota total bucket Storage. Dashboard menghitung file yang ditemukan melalui listing Storage dan metadata yang terindeks, tetapi tidak menampilkan batas kuota akun Supabase. Listing dibatasi dan dapat memberi peringatan jika pemindaian tidak lengkap.
- Editor visual khusus untuk seluruh array konten belum lengkap. CMS kini menyediakan editor cerita per bab serta Theme Studio khusus `/pengembang`; konten lain tetap bisa diedit lewat JSON textarea pada modul Pengembang & SEO. Semua perubahan halaman disimpan sebagai draft, dan publikasi memerlukan RPC Stage 3 Hardening.
- Workflow draft/publish saat ini mencakup konten dan SEO `site_pages`; perubahan global, anggota, galeri, koleksi, navigasi, section, dan metadata media tetap disimpan langsung.

## Pengujian sesudah penerapan

1. Jalankan migration CMS sekali di Supabase.
2. Jalankan `npm run build` di lingkungan Termux dengan versi Node yang digunakan proyek.
3. Jalankan server lokal, login ke `/pengembang/admin`, dan buka dashboard.
4. Uji simpan satu field hero, lalu muat ulang beranda untuk memeriksa hasil publik.
5. Uji tambah/edit/sembunyikan/hapus satu anggota percobaan.
6. Uji upload satu foto galeri, edit metadata, sembunyikan, lalu tampilkan lagi.
7. Uji upload logo/audio baru dan periksa header/player.
8. Uji ubah label/urutan navigasi, warna aksen, favicon, dan SEO.
9. Uji media library: edit metadata, ganti file dengan ekstensi yang sama, dan pastikan file yang masih dipakai tidak dapat dihapus.
10. Uji export backup dan pemulihan satu revisi.

Jangan menganggap deployment Cloudflare berhasil sebelum ada build/deployment aktual dan verifikasi URL produksi.
