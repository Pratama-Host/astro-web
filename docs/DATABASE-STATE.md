# Snapshot keadaan Supabase — 14 November 2026

> Snapshot ini berasal dari inspeksi read-only melalui koneksi Supabase yang tersedia pada 14 November 2026. Tidak ada migration, DDL, DML, restore, atau perubahan Storage yang dijalankan selama audit ini. Angka di bawah adalah metadata/agregat, bukan salinan record.

## Identitas target dan batas bukti

| Item | Nilai yang teramati |
|---|---|
| Project name | `astro` |
| Project ref | `qwffhznzcjorhapzzklr` |
| Region | `ap-southeast-1` |
| PostgreSQL | `17.11.0.011` (major 17) |
| Status layanan | `ACTIVE_HEALTHY` saat inspeksi |
| Source archive | `astro-web-main[REFORMED V8.0.0].zip` |
| Git commit | Tidak dapat ditentukan: ZIP tidak menyertakan metadata `.git` |
| Database mutation | Tidak dilakukan |

Status `ACTIVE_HEALTHY` hanya status layanan, bukan bukti bahwa project aman untuk uji destruktif. Lingkungan (production/staging/disposable) tidak dapat dipastikan secara independen. Karena itu, seluruh perubahan DB baru berstatus **CODED / NOT APPLIED**.

## Histori migration remote yang teramati

Remote melaporkan 21 migration berikut:

```text
20261103114611 stage3_workflow_20261103
20261103114812 stage3_login_table_20261103
20261103115304 add_anggota_skills_column_20261103
20261103115418 add_anggota_visible_column_20261103
20261103115549 promote_anggota_class_to_xii_20261103
20261104052811 align_schema_with_current_astro_code
20261104053820 restore_cms_rpc_workflows
20261104053918 restore_cms_rpc_workflows_functions
20261104054021 fix_revision_restore_snapshot
20261104134549 fix_nested_site_settings_merge_and_developer_sections
20261105114917 atomic_cms_collections_navigation
20261105115313 validate_guru_expertise_objects
20261106121320 home_section_controls
20261106121753 public_read_only_rls
20261106122747 gallery_metadata_from_caption
20261106130115 public_section_visibility_metadata
20261113130442 archive_tkj_cms_before_access_hardening
20261113130505 restrict_anon_anggota_columns
20261113130520 harden_grants_and_storage_limits
20261113130543 announcements_and_agenda
20261113143902 add_announcements_navigation
```

### Rekonsiliasi dengan source ZIP

Source ZIP tidak sinkron satu-ke-satu dengan remote migration history:

- Remote memuat beberapa migration workflow awal (3–5 November) yang tidak direpresentasikan sebagai file migration bernama sama pada source ZIP.
- Source mempunyai `20261106000100_baseline.sql`, yang **tidak boleh** dijalankan pada database berisi data.
- Tiga salinan migration lokal bertimestamp `20261109000` sempat menduplikasi operasi inti migration `20261113130505`, `20261113130520`, dan `20261113130543`. Setelah dibandingkan, salinan bertimestamp lama dihapus dari paket agar tidak menimbulkan dua jalur migration untuk operasi yang sama. File bertimestamp `2026111313...` dipertahankan sebagai source yang sesuai dengan versi tercatat remote; perbandingan isi lokal tetap bukan bukti checksum terhadap file historis hosted.
- Source berisi `20261113211300_add_announcements_navigation.sql`, sedangkan remote mencatat `20261113143902_add_announcements_navigation`. Isi local memeriksa duplikasi href/id lalu menambahkan tautan `/pengumuman`; SQL historis remote tidak tersedia lewat daftar migration yang dibaca, sehingga pasangan tersebut belum bisa checksum-verified. State hosted saat ini memiliki 8 baris navigasi, tetapi hitungan saja tidak membuktikan baris/SQL spesifik.
- Source archive ini tidak menyertakan git commit. Versi harus ditetapkan setelah sinkronisasi repo, bukan ditebak dari nama ZIP.

Migration baru yang disiapkan dalam pekerjaan ini (belum diterapkan):

```text
20261114150000_cms_backup_announcements_agenda.sql
20261114150100_harden_public_default_privileges.sql
20261114150200_cms_schema_advisor_cleanup.sql
```

**Tindakan wajib sebelum `db push`:** ambil dump/backup penuh, sinkronkan histori migration remote dengan source repo, bandingkan definisi fungsi/policy/grant aktual, dan uji seluruh migration pada project Supabase disposable. Jangan melakukan `migration repair`, baseline push, atau reset remote sebagai jalan pintas.

## State tabel aplikasi

Seluruh 15 tabel aplikasi berikut teramati dengan RLS aktif:

`admin_audit_logs`, `admin_login_attempts`, `agenda_events`, `anggota`, `announcements`, `content_revisions`, `galeri`, `guru`, `media_assets`, `site_navigation`, `site_page_drafts`, `site_pages`, `site_sections`, `site_settings`, `skills`.

Agregat jumlah baris saat inspeksi:

| Tabel | Baris |
|---|---:|
| anggota | 20 |
| galeri | 21 |
| guru | 3 |
| skills | 6 |
| site_pages | 0 |
| site_page_drafts | 0 |
| announcements | 0 |
| agenda_events | 0 |
| media_assets | 2 |
| content_revisions | 10 |
| admin_audit_logs | 19 |
| admin_login_attempts | 0 |
| site_navigation | 8 |
| site_sections | 15 |
| site_settings | 1 |

Tidak ada record individual yang diambil ke dokumen ini.

### Constraints dan indeks penting yang teramati

- `anggota`: primary key UUID, `nis` UNIQUE, `skills` harus JSON array. NIS adalah identifier internal dan tidak boleh dipublikasikan.
- `announcements`: UUID primary key; judul 1–160 karakter; body maksimal 5.000 karakter; kategori maksimal 60; status `draft|published|archived`; tautan hanya `http(s)`; `expires_at` harus lebih akhir dari `publish_at` bila keduanya terisi.
- `agenda_events`: UUID primary key; judul 1–160; deskripsi maksimal 3.000; kategori maksimal 60; lokasi maksimal 160; status `draft|published|archived`; `ends_at` tidak boleh sebelum `starts_at`.
- `site_pages` dan `site_page_drafts` memakai `slug` sebagai primary key; `site_sections` punya unique `(page_slug, section_key)`; `content_revisions` punya unique `(page_slug, version)` dan version positif.
- `media_assets.object_path` UNIQUE dan `size_bytes >= 0`; `skills.level` dibatasi 0–100; `guru.nama` dan `galeri.src` UNIQUE.
- `admin_login_attempts` hanya punya `ip_hash` (format 64 hex) dan `attempted_at`, dengan indeks `(ip_hash, attempted_at DESC)` dan `(attempted_at)`, tetapi belum memiliki primary key.

## RLS, grants, kolom privat dan RPC

- Semua tabel aplikasi di atas memiliki RLS aktif.
- `anon` dan `authenticated` tidak memiliki mutasi tabel pada tabel aplikasi yang diperiksa.
- Role publik hanya memiliki akses baca pada domain yang dipublikasikan secara eksplisit. Tabel internal `admin_audit_logs`, `admin_login_attempts`, `content_revisions`, `media_assets`, dan `site_page_drafts` tidak memiliki grant baca untuk `anon`.
- `anggota.nis` tidak memiliki grant baca untuk `anon`; kolom nama publik yang diizinkan memiliki grant kolom eksplisit. `src/lib/public-data-policy.ts` juga menetapkan `SHOW_MEMBER_NIS = false` dan kolom publik eksplisit. Jangan menampilkan NIS pada output publik, HTML, API publik, atau log.
- Seluruh RPC CMS/admin yang diperiksa hanya dapat dieksekusi oleh `service_role`; `anon`, `authenticated`, dan `PUBLIC` tidak dapat memanggil RPC export/restore atau login limiter.
- Dua RPC `SECURITY DEFINER` adalah `consume_tkj_admin_login_attempt(text,integer,integer)` dan `clear_tkj_admin_login_attempts(text)`. Keduanya memakai `search_path=pg_catalog, public` dan ACL execute terbatas ke `service_role`.
- Bucket Storage `astro` adalah public, batas file 20 MiB dan allowlist MIME yang dibatasi. Public bucket berarti byte objek yang diketahui path-nya dapat diunduh publik; unggah/mutasi tetap jalur server. Jangan menyimpan file privat di bucket ini.

## Temuan Supabase advisors

| Temuan | Level | Penilaian |
|---|---|---|
| RLS aktif tanpa policy pada 5 tabel internal | INFO | Sesuai desain saat ini karena role publik tidak diberi grant tabel. Pertahankan bukti grant sebagai kontrol utama. |
| `admin_login_attempts` tanpa primary key | INFO | Migration aditif disiapkan untuk menambah identity key; belum diterapkan. |
| Dua policy SELECT permissive di `site_sections` | WARN | Policy `Public can read section visibility metadata` memakai `USING (true)` dan membuat policy `Public can read enabled site sections` redundant untuk SELECT; migration disiapkan untuk menghapus policy enabled-only saja. |
| Index tak terpakai pada beberapa tabel | INFO | Tidak dihapus. Statistik usage saja tidak cukup untuk membuktikan index tidak diperlukan. |
| Health advisor | Tidak ada temuan | Snapshot saat diperiksa. |

## Risiko tersisa dan keputusan

1. **P0 — migration drift:** sinkronkan source dan histori remote sebelum push. Ini blocker untuk rollout migration.
2. **P0 — default privileges:** ditemukan default ACL schema `public` yang dapat memberi hak luas pada objek baru yang dibuat oleh owner tertentu. Migration hardening disiapkan, belum diterapkan; uji dulu pada disposable dan pastikan owner/role migration cocok.
3. **P0 — backup:** definisi RPC aktif lama belum menyertakan announcements/agenda. Migration dan validator baru disiapkan, belum aktif sampai migration teruji dan diterapkan.
4. **P0 — full backup:** belum ada bukti backup eksternal database + Storage + konfigurasi, atau restore drill.
5. **P1 — schema cleanup:** PK ledger dan penghapusan policy redundant belum diterapkan.
6. **P1 — default privilege scope:** source migration hardening menyasar default ACL creator `postgres` dan `supabase_admin`; verifikasi role creator sebenarnya pada target disposable sebelum penerapan.

Dokumen `RECONCILIATION-2026-11-13.md` adalah snapshot historis dan tidak ditimpa; gunakan dokumen ini untuk hasil inspeksi pada 14 November 2026.
