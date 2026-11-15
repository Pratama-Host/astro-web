# Runbook backup dan pemulihan

## Empat jenis artefak yang berbeda

| Artefak | Mencakup | Tidak mencakup |
|---|---|---|
| CMS JSON (`/api/admin/backup`) | Data CMS pada tabel yang diekspor: pengaturan, anggota, galeri, guru, skills, konten/draft halaman, navigasi, sections, metadata media, revisi, audit, announcements, agenda (setelah migration backup diterapkan) | Schema PostgreSQL, grants/RLS, function/trigger, auth users/config, byte file Storage, Cloudflare configuration/secrets |
| PostgreSQL logical dump | Schema dan/atau data sesuai opsi dump; bisa dipakai untuk pemulihan database di project terpisah | Objek file Storage; custom role passwords tidak disertakan dalam daily backups Supabase |
| Storage object copy | Byte file pada bucket, beserta manifest metadata/checksum yang dibuat operator | Schema dan data relasional PostgreSQL |
| Configuration/secrets inventory | Daftar nama setting, project identifiers, build/runtime compatibility dan prosedur pemulihan secret | Nilai secret tidak boleh dimasukkan ke repo/ZIP/log |

**CMS JSON bukan full backup.** Ia mengekspor `media_assets` metadata/path saja; file asli dan thumbnails berada di Storage. Pemulihan database tanpa salinan objek Storage dapat meninggalkan URL/path yang rusak. Backup Supabase juga tidak otomatis mencakup objek Storage. Lihat [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups).

## Kontrak CMS JSON

- Endpoint export: `GET /api/admin/backup`; restore: `POST /api/admin/backup` dengan sesi admin dan konfirmasi eksplisit.
- Limit request/hasil: 20 MiB; maximum 100.000 row per collection.
- Bundle mempertahankan identifier format historis `tkj-xi9-cms-backup`, version `1` untuk kompatibilitas file lama. Nama file unduhan baru menggunakan `tkj-xii9-cms-YYYY-MM-DD.json`.
- Dua collection yang hilang pada fungsi export aktif saat audit adalah `announcements` dan `agenda_events`. Migration `20261114150000_cms_backup_announcements_agenda.sql` dan validator TS memasukkannya. **Migration belum diterapkan**, sehingga endpoint aktif belum otomatis memperoleh cakupan baru.
- Restore menggunakan upsert berdasarkan primary key, bukan replace-table: row yang tidak ada pada file tidak dihapus. File JSON v1 lama yang tidak punya keys announcement/agenda diterima sebagai collection kosong setelah migration baru diterapkan.
- Seluruh perubahan restore dilakukan lewat satu RPC/transaksi; jika satu upsert gagal, transaksi harus rollback. Restore bukan alat penghapusan data total.
- Cache HTML publik di-purge setelah restore berhasil.
- Isi backup dapat berisi data internal/anggota; simpan terenkripsi, jangan commit ke GitHub, jangan kirim ke ruang publik, dan batasi akses admin.

## Logical backup PostgreSQL memakai Supabase CLI v3

Per 14 November 2026, Supabase CLI v3 menjalankan perintah database ke local stack secara default. Untuk database hosted, target harus ditentukan dengan `--remote=<project-ref>`; jangan mengandalkan asumsi `--linked`/target lama. Pastikan baris `Target:` menunjuk project yang memang dimaksud. Hosted changes meminta konfirmasi, tetapi `db dump` sendiri adalah operasi export. Baca [CLI v3 migration guide](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3) dan [CLI db dump reference](https://supabase.com/docs/reference/cli/supabase-db-dump) sebelum menjalankan.

Project yang teramati pada snapshot 14 November:

```text
project ref: qwffhznzcjorhapzzklr
project name: astro
region: ap-southeast-1
```

Jangan memasukkan password koneksi ke command history, file repo, atau chat. Siapkan folder backup terenkripsi di luar working tree dan storage tujuan off-site yang aksesnya dibatasi. Setelah CLI v3 terpasang serta login, jalankan **satu per satu**:

```bash
supabase link --project-ref qwffhznzcjorhapzzklr
supabase db dump --remote=qwffhznzcjorhapzzklr -f /path-di-luar-repo/astro-schema.sql
supabase db dump --remote=qwffhznzcjorhapzzklr --data-only --use-copy -x storage.buckets_vectors -x storage.vector_indexes -f /path-di-luar-repo/astro-data.sql
supabase db dump --remote=qwffhznzcjorhapzzklr --role-only -f /path-di-luar-repo/astro-roles.sql
```

CLI v3 `db dump` default hanya schema (tidak memuat data maupun custom roles); `--data-only` dan `--role-only` harus diminta eksplisit. Periksa ukuran dan header file; jangan mengunggah hasil dump ke repository publik. Simpan juga backup otomatis Supabase melalui Dashboard > Database > Backups sesuai retensi paket. Logical dump tidak menyertakan schema managed tertentu termasuk `storage`, jadi jangan menganggap hasilnya sebagai backup Storage.

## Storage object backup dan manifest

Belum ada salinan Storage off-site yang terbukti untuk project ini. Sebelum membuat perubahan media atau menjalankan restore:

1. Inventaris bucket `astro`, path objek, MIME type, ukuran, waktu modifikasi, dan references pada tabel `media_assets`, galeri, anggota, settings, serta konten.
2. Copy semua objek dan thumbnail ke storage terpisah yang dienkripsi dan tidak diakses publik. Gunakan prosedur object-storage copy yang didukung provider/S3 endpoint; jangan menyamakan copy metadata database dengan copy byte objek.
3. Simpan manifest minimal: `bucket`, `object_path`, `content_type`, `size_bytes`, `sha256`, waktu export, dan status copy. Jangan masukkan URL bertanda token atau data anggota ke report.
4. Verifikasi jumlah objek, ukuran total, dan SHA-256 source-vs-destination. Catat objek yang gagal, jangan menganggap transfer parsial sebagai backup berhasil.
5. Restore objek ke bucket/project terisolasi, verifikasi MIME/path, lalu cocokan referensi DB sebelum melakukan switch.

## Restore drill — hanya pada project disposable

- Buat project Supabase disposable/isolated. Pastikan project ref dan environment target terlihat di setiap perintah.
- Restore roles/schema/data menurut prosedur CLI yang sesuai, lalu periksa default privileges dan jalankan migration chain yang telah direkonsiliasi.
- Restore Storage bytes dari backup terpisah; cek checksum dan referensi `storage://`/public URL.
- Terapkan migration app yang telah diuji. Jalankan `supabase/smoke/anon-access-smoke.sql` dan `supabase/smoke/cms-rpc-smoke.sql` dalam transaksi sesuai petunjuk. Smoke CMS sementara mengubah `/tkj`, setting, revisions, audit, draft, announcements dan agenda; hanya disposable, dan file harus tetap berakhir `ROLLBACK`.
- Coba login, buka halaman publik, preview/publish, restore revisi, export/import JSON; pastikan draft/archived/scheduled tetap tidak terlihat publik dan NIS tetap privat.
- Tutup dengan bukti migration version, query privilege/RLS, row-count agregat, manifest/checksum, log smoke, serta hasil pemeriksaan browser.

## Status pada 14 November 2026

- CMS backup source dan migration: **CODED, NOT DB-APPLIED**.
- Existing remote backup/export: **read-only function definition inspected**.
- PostgreSQL full dump/off-site copy: **NEEDS_EXTERNAL_BACKUP**.
- Storage byte copy/manifest/checksum: **NEEDS_EXTERNAL_BACKUP**.
- Isolated restore drill: **NEEDS_SUPABASE_DISPOSABLE**.
