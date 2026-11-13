# Klasifikasi data publik vs privat

Aturan berikut dipakai saat menambah endpoint, komponen, atau field CMS. Status publik ditentukan oleh kebutuhan halaman dan persetujuan pengelola kelas, bukan hanya karena sebuah kolom tersedia pada tabel.

| Kelompok data | Penanganan publik | Catatan |
|---|---|---|
| Profil anggota yang disetujui | Boleh dibaca sesuai status visibilitas | Gunakan daftar kolom publik eksplisit pada `src/lib/public-data-policy.ts`. |
| Foto, audio, dan tautan sosial | Tampilkan hanya sesuai persetujuan dan kebutuhan halaman | Sediakan proses koreksi atau penarikan persetujuan. |
| Identitas internal, metadata teknis, dan penanda operasional | Tidak ditampilkan pada halaman atau endpoint publik | Simpan hanya untuk proses server/admin yang memang membutuhkannya. |
| Draft, revisi, audit, percobaan login, dan metadata internal CMS | Privat | Akses hanya melalui API admin yang telah mengotorisasi sesi dan memakai client server-side. |
| Pengumuman dan agenda | Publik hanya setelah berstatus terbit | Policy RLS dan helper publik membatasi konten sesuai status serta jendela waktu. |

## Lapisan perlindungan

- RLS membatasi baris; grant kolom membatasi field yang dapat dibaca. Keduanya harus diperiksa bersama.
- Peran publik hanya mendapat hak baca minimum yang dibutuhkan halaman.
- Penulisan CMS dilakukan melalui server Astro dengan service-role key yang hanya tersedia di lingkungan server.
- Jangan menaruh secret, session token, kredensial, atau data operasional internal pada HTML, JSON publik, JavaScript browser, maupun log publik.
- Periksa ulang kebijakan RLS, privilege tabel/kolom, serta policy Storage setiap kali modul atau tabel baru ditambahkan.
