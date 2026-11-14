# Rekonsiliasi Audit — 13 November 2026

## Lingkup dan status

Pemeriksaan dilakukan terhadap source Astro dan database Supabase `astro` (`qwffhznzcjorhapzzklr`), PostgreSQL 17.11. Perubahan database diterapkan langsung pada lingkungan pengembangan/pengujian aktif sesuai instruksi pengelola. Tidak ada deployment Cloudflare dalam pekerjaan ini.

## Backup sebelum perubahan

Sebelum perubahan hak akses dan tabel konten, hasil `public.export_tkj_cms_backup()` disimpan pada `backup_private.cms_snapshots`.

- Snapshot ID: `b588efe9-02fa-4792-9aef-d597586d88f5`
- Waktu: `2026-11-13 13:04:42 UTC`
- Ukuran serialisasi JSON: sekitar 87.552 byte
- MD5: `7274f730b996b9e76d36f8d48c217981`
- Skema arsip tidak dapat diakses oleh `anon`, `authenticated`, maupun `service_role`.

**Batas cakupan:** ini adalah snapshot data CMS di database yang sama. Ini bukan dump PostgreSQL eksternal, tidak mencakup konfigurasi project, dan tidak mencakup object biner Storage. Simpan dump eksternal dan backup Storage secara terpisah sebelum mengandalkan pemulihan penuh.

## Migrasi yang diterapkan

| Versi tercatat | File source | Hasil |
|---|---|---|
| `20261113130442` | `archive_tkj_cms_before_access_hardening.sql` | Snapshot CMS tersimpan pada skema privat. |
| `20261113130505` | `restrict_anon_anggota_columns.sql` | Grant baca tabel diubah menjadi grant kolom eksplisit yang diperlukan untuk halaman publik. |
| `20261113130520` | `harden_grants_and_storage_limits.sql` | Hak mutasi publik dicabut; tabel internal dilindungi; batas upload bucket `astro` menjadi 20 MiB dan MIME allowlist diterapkan. |
| `20261113130543` | `announcements_and_agenda.sql` | Tabel pengumuman dan agenda, index, RLS, policy publik baca-terbit, serta grant service-role dibuat. |

Migrasi baseline tidak dijalankan ulang. Riwayat Supabase berisi empat versi baru di atas setelah riwayat yang berakhir pada `20261106130115`.

## Verifikasi database

- RLS aktif pada 13 tabel aplikasi yang diperiksa.
- `anon` dan `authenticated` tidak memiliki hak INSERT, UPDATE, DELETE, atau TRUNCATE pada tabel aplikasi.
- Tabel draft, revisi, audit, metadata media, dan percobaan login tidak memiliki hak baca untuk peran publik.
- Pembacaan publik tetap tersedia pada tabel yang digunakan halaman: anggota, galeri, guru, navigasi, halaman, section, pengaturan situs, dan skills.
- `service_role` tetap memiliki hak tulis yang dibutuhkan pada tabel CMS.
- Bucket `astro` dikonfirmasi memiliki batas 20.971.520 byte serta daftar MIME yang disetujui. Objek lama tidak diubah.
- Pengumuman publik hanya dapat dibaca ketika status `published` dan berada dalam jendela terbit; agenda publik hanya dapat membaca status `published`.

Uji `SET LOCAL ROLE anon` membaca data yang diperlukan dan berhasil. Uji transaksional dengan data sementara memastikan draft, item masa depan, dan arsip tidak muncul dalam pembacaan pengumuman; hanya agenda berstatus terbit yang terlihat. Semua data uji dibatalkan dengan `ROLLBACK`.

Smoke test RPC dalam transaksi rollback mencakup ekspor backup, simpan halaman, pembuatan revisi, pemulihan revisi, patch pengaturan, pengaturan aset global, publikasi draft, pemulihan backup CMS, serta pembatasan hak EXECUTE. Tidak ada data uji yang dipertahankan.

## Temuan advisor

- Lima tabel internal memiliki RLS tanpa policy. Ini disengaja: tidak ada grant publik pada tabel-tabel tersebut.
- `admin_login_attempts` tidak memiliki primary key (INFO); tidak diubah karena bukan kebutuhan hardening langsung.
- Advisor menandai beberapa index belum digunakan (INFO); tidak dihapus tanpa data beban yang cukup.
- `site_sections` memiliki dua policy SELECT permissive (WARN), yang mempertahankan kebutuhan baca metadata visibilitas section. Tidak diubah karena menghapus policy metadata akan mengubah perilaku halaman publik.
- Health advisor tidak mengembalikan temuan.

## Pengumuman dan agenda: source aplikasi

Sumber sudah memiliki helper domain `src/lib/announcements.ts`, halaman publik `/pengumuman`, dan endpoint admin `src/pages/api/admin/announcements.ts`. Pekerjaan ini menambahkan view CMS pada `/pengembang/admin` melalui `src/scripts/admin/announcements.js`, dengan fitur:

- Beralih antara daftar pengumuman dan agenda.
- Membuat dan mengubah item.
- Mengatur status draft, terbit, dan arsip.
- Mengatur jadwal terbit, kedaluwarsa, pin, dan tautan pengumuman.
- Mengatur waktu mulai/selesai dan lokasi agenda.
- Menampilkan daftar dengan teks aman menggunakan `textContent` dan tautan eksternal dengan `noopener noreferrer`.

Penghapusan langsung tidak disediakan; gunakan status arsip agar jejak konten tetap terpelihara. Mutasi melewati endpoint admin yang memeriksa sesi dan memakai client server-side.

## Status validasi source

`node --check` lulus untuk `src/scripts/admin/announcements.js`, `src/scripts/admin.js`, dan `src/scripts/admin/core.js`. Pemeriksaan tersebut hanya pemeriksaan sintaks JavaScript. Dependency belum dipasang di lingkungan kerja ini; versi Node lokal yang tersedia `v22.16.0`, sementara `package.json` menetapkan `node >=22.23.4`. Karena itu `npm ci`, `astro check`, Vitest, dan build belum dijalankan pada source yang sudah diperbarui ini.

Log GitHub Actions yang pernah diberikan sebelumnya menunjukkan satu versi source terdahulu berhasil menjalankan install, check, 39 tes, dan build pada Ubuntu. Log itu bukan bukti untuk perubahan UI yang baru dibuat. Jalankan kembali workflow setelah source ini dikomit/dikirim ke GitHub.

## Pekerjaan lanjutan

1. Jalankan `npm ci`, `npm run check`, `npm test`, dan `npm run build` di GitHub Actions/Ubuntu.
2. Uji browser alur login, create/edit/publish/archive, dan tampilan halaman `/pengumuman`.
3. Uji responsif pada lebar ponsel, tablet, dan desktop serta navigasi keyboard.
4. Buat dump PostgreSQL eksternal dan backup objek Storage; lakukan restore di lingkungan terpisah.
5. Tambahkan E2E otomatis dan smoke test setelah deployment Cloudflare.


## Patch UI anggota dan menu pengumuman — source `2.zip`

- `src/styles/anggota.css`: layout carousel horizontal diganti grid responsif; dua kolom mulai 360 px, satu kolom di bawah 360 px, tiga kolom mulai 760 px, dan empat kolom mulai 1120 px. Mode ringkas juga memakai dua kolom dan kartu horizontal.
- `src/pages/anggota.astro` dan `src/scripts/anggota.js`: filter kategori yang tidak digunakan dan kontrol slider dihapus; pencarian, pengurutan nama, dan mode tampilan tetap tersedia.
- `src/scripts/admin/announcements.js`: helper `endpoint()` didefinisikan untuk menunjuk ke `/api/admin/announcements?type=announcements|agenda`. Ini memperbaiki ReferenceError `endpoint is not defined` pada submit.
- `src/lib/data.ts`: menu Pengumuman ditambahkan ke default navigation dan akan dilengkapi jika baris konfigurasi publik belum ada; baris yang sengaja disabled tetap dihormati jika terbaca.
- `supabase/migrations/20261113211300_add_announcements_navigation.sql`: migrasi idempotent menambahkan item Pengumuman agar menu juga muncul di pengelolaan navigasi CMS.
- `tests/data-navigation.test.ts`: tes regresi untuk menu Pengumuman pada fallback, konfigurasi yang sudah ada, dan item yang dinonaktifkan.

Validasi yang dijalankan pada patch ini: `node --check` seluruh file `.js`/`.mjs`; pemeriksaan ID admin unik dan referensi DOM; pemeriksaan statis helper endpoint, CSS grid, filter/slider yang dihapus, dan file migrasi. `npm ci` tidak selesai pada lingkungan kerja ini: Node tersedia `v22.16.0` sedangkan proyek meminta `>=22.23.4`; registry npm juga mengalami `EAI_AGAIN`. Karena dependency tidak terpasang penuh, `astro check`, Vitest, dan build belum dijalankan untuk patch ini. Tidak ada migrasi yang diterapkan pada database selama patch UI ini.
