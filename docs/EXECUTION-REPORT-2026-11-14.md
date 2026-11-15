# Laporan eksekusi roadmap — 14 November 2026

## Ringkasan

Paket source sudah menerima perubahan untuk memperbaiki cakupan backup CMS, memperkeras privilege default database (migration disiapkan saja), menambah assertion smoke SQL, mempersempit cache service worker, menambah batas query/list, menutup error detail internal pada API tertentu, memperbaiki sitemap SEO, memperkuat batch media uploader, memperluas regression tests, dan melengkapi dokumentasi operasional.

**Tidak ada perubahan pada database Supabase hosted selama sesi ini.** Pemeriksaan Supabase hanya read-only. Migration baru disiapkan tetapi belum diterapkan karena target project yang terhubung belum dapat dikonfirmasi sebagai disposable/staging dan migration history source tidak sama dengan remote.

## Status ringkas

| Area | Status saat ini | Bukti |
|---|---|---|
| DB-01 inventory | CODED / READ-ONLY COMPLETE | `docs/DATABASE-STATE.md`; 21 remote migrations dicatat |
| DB-02 backup contract | CODED / DB-APPLY PENDING | RPC lama terinspeksi; migration, API normalizer, validators, tests disiapkan |
| DB-03 RLS/grants/default ACL | CODED / DB-APPLY PENDING | privilege/RPC snapshot dan smoke assertions; tidak ada mutation |
| DB-04 disposable upgrade | BLOCKED | Belum ada disposable Supabase project |
| DB-05 smoke | CODED / NEEDS_DISPOSABLE | SQL smoke rollback-only, belum dijalankan |
| DB-06 full backup | NEEDS_EXTERNAL_BACKUP | Runbook disiapkan; tidak ada off-site copy/checksum |
| SEC-01 API contract | SOURCE-AUDITED | `docs/ADMIN-API-CONTRACT.md` |
| SEC-02 auth/session | TESTS_CODED / NEEDS_RUNTIME | Test file diperluas; belum dijalankan |
| SEC-03 validation/error | PARTIAL CODED / NEEDS_RUNTIME | Backup validators + API generic errors; belum integration-tested |
| SEC-04 media | CODED / NEEDS_RUNTIME | Batch uploader allowlist, signature/path validation, dry-run |
| SEC-05 consent/retention | OWNER REVIEW REQUIRED | NIS visibility tetap false; keputusan consent/retention belum dibuat |
| CMS-01 announcements/agenda | PARTIAL CODED / NEEDS_RUNTIME | Backup validation updated; domain/timezone matrix belum penuh |
| CMS-02 E2E | BLOCKED / NEEDS_BROWSER | Tidak ada browser/dependencies |
| CMS-03 backup UI | CODED / DB-APPLY PENDING | Copy UI dan cache purge setelah restore |
| CMS-04 revision/audit | PARTIAL / NEEDS_DISPOSABLE + BROWSER | RPC smoke diperluas, belum dieksekusi |
| WEB-01 cache | CODED / NEEDS_DEPLOY | Middleware reviewed, API no-store, invalidation |
| WEB-02 CSP | NOT STARTED | Enforcement dibiarkan tetap; browser inventory diperlukan |
| WEB-03 service worker | CODED / NEEDS_BROWSER | Cache ownership/private-route contracts + tests |
| WEB-04 accessibility | PARTIAL CODED / NEEDS_BROWSER | Dialog anggota/foto/struktur/logo inert saat tertutup; avatar anggota keyboard-operable + focus indicator; guard Escape focus-trap; tes statis. Audit semua dialog/nav/screen reader tetap belum dilakukan |
| WEB-05 sitemap | CODED / NEEDS_RUNTIME | Sitemap now respects page `noindex`; not built |
| DATA-01 bounds | CODED / NEEDS_RUNTIME | Bound queries + warnings |
| DATA-02 domain split | NOT STARTED | Tidak melakukan refactor struktural massal |
| DATA-03 fallback | PARTIAL CODED / NEEDS_RUNTIME | Error logging/fallback preserved; no runtime tests |
| TOOL-01 CI | CODED / NEEDS_RUNTIME | Workflow runs `npm ci`, high-severity audit, and `npm run validate`; lint deliberately not added as a gate because ESLint is not a declared dependency |
| TOOL-02 tests | TESTS_CODED / NEEDS_RUNTIME | backup, service worker, auth, DB smoke additions |
| TOOL-03 docs | CODED | API, DB, backup runbooks, changelog |
| TOOL-04 dependencies | NOT STARTED | Tidak menambah/mengupgrade dependency |

Feature backlog P3 tidak dimulai karena prerequisite keamanan, disposable DB, E2E dan verifikasi owner belum terpenuhi.

## Database findings yang memengaruhi rollout

- Remote project ref: `qwffhznzcjorhapzzklr` (`astro`, `ap-southeast-1`, PostgreSQL 17.11).
- 21 migrations tercatat remote; tiga pasangan migration lokal dengan nama serupa memiliki operasi inti ekuivalen, tetapi versi/timestamp berbeda. Migration navigasi local belum checksum-verified ke versi remote. Lihat `docs/DATABASE-STATE.md`.
- Seluruh 15 tabel aplikasi yang diperiksa memiliki RLS; role publik tidak punya mutasi tabel; `anggota.nis` tak diberi grant baca anon.
- Sensitive RPC execution hanya service-role; dua fungsi SECURITY DEFINER memakai search_path tetap.
- Default privileges schema `public` untuk objek mendatang masih perlu diperketat.
- Advisor WARN menemukan policy SELECT redundant pada `site_sections`; INFO menemukan `admin_login_attempts` tanpa PK.

## Artefak kode baru

- `src/lib/backup-validation.ts`
- `tests/backup-validation.test.ts`
- `tests/service-worker-contract.test.ts`
- `tests/media-upload-contract.test.ts`
- `tests/member-dialog-accessibility.test.ts`
- `supabase/migrations/20261114150000_cms_backup_announcements_agenda.sql`
- `supabase/migrations/20261114150100_harden_public_default_privileges.sql`
- `supabase/migrations/20261114150200_cms_schema_advisor_cleanup.sql`
- `docs/DATABASE-STATE.md`
- `docs/BACKUP-RESTORE-RUNBOOK.md`
- `docs/ADMIN-API-CONTRACT.md`

## Runtime dan deployment

Static checks yang benar-benar dijalankan: `node --check` pada 33 file `.js`/`.mjs` di `src`, `scripts`, `public`; pencarian shell tidak menemukan file `.sh` sehingga tidak ada shell script yang perlu diperiksa; parsing GitHub workflow YAML dan `supabase/config.toml` berhasil. Batch uploader juga diuji langsung: satu manifest fixture icon lolos dry-run (1 berhasil, 0 gagal), sedangkan target path traversal `../outside.png` ditolak dengan exit code 1 sebelum upload. Ini bukan build TypeScript/Astro atau unit test.

Runtime container tersedia: Node `v22.16.0`, npm `10.9.2`; source menetapkan `.nvmrc` `24.22.1` dan `engines.node >=22.23.4`. Dependency belum terpasang dan tidak ada Supabase CLI/browser di lingkungan eksekusi. Oleh sebab itu:

- `npm ci`, `npm run check`, `npm test`, dan `npm run build`: **NOT RUN / NEEDS_RUNTIME**.
- Vitest regression files ditambahkan, tetapi **tidak dieksekusi**; hanya static syntax/contract checks dan uploader dry-run di atas yang berjalan.
- ESLint tidak dijadikan CI gate: `eslint.config.js` ada, tetapi `eslint` bukan dependency langsung/terkunci dan tidak ada baseline command yang dapat dipelihara tanpa menambah dependency baru. Workflow tetap menjalankan audit kerentanan high severity secara terpisah dan satu `npm run validate` untuk check/test/build.
- Supabase smoke SQL: **NOT RUN / NEEDS_SUPABASE_DISPOSABLE**.
- Cloudflare deploy dan live URL smoke: **NOT RUN / NEEDS_DEPLOY**.
- Browser/mobile, accessibility, offline/PWA test: **NOT RUN / NEEDS_BROWSER**.
- Off-site DB/Storage backup and restore drill: **NOT DONE / NEEDS_EXTERNAL_BACKUP**.

Tidak ada klaim build, migration, test, atau deploy berhasil pada laporan ini.

## Pembersihan paket ZIP

Paket ini dirapikan setelah audit duplikasi: tiga salinan migration lama bertimestamp `20261109000` dihapus karena operasi intinya sudah diwakili file migration bertimestamp `2026111313...` yang dipertahankan; salinan kedua `cms-rpc-smoke.sql` di `tests/` dihapus karena file kanonis berada di `supabase/smoke/`. Referensi dokumentasi diarahkan ke lokasi kanonis. Tidak ada source aplikasi, aset, konfigurasi, atau migration baru yang dihapus. Ini pembersihan isi paket saja dan tidak mengubah Supabase hosted.
