# Roadmap Website TKJ XII-9

Dokumen ini berfungsi sebagai ringkasan prioritas. Backlog AI yang dapat dieksekusi—lengkap dengan file target, instruksi, dependensi, batas aman Supabase, dan kriteria selesai—ada di [`docs/AI-IMPLEMENTATION-RUNBOOK.md`](docs/AI-IMPLEMENTATION-RUNBOOK.md).

## Prioritas utama

1. **P0 — Integritas data:** rekonsiliasi schema/migration Supabase; pastikan backup/restore CMS menyertakan pengumuman dan agenda; audit RLS, grants, dan privasi siswa; buat smoke test dan provisioning disposable.
2. **P1 — Keandalan CMS:** kontrak seluruh admin API; keamanan session/input/media; E2E publish/draft/backup; revisi dan restore.
3. **P1 — Web safety:** kebijakan cache Cloudflare/service worker; CSP report-only; aksesibilitas; route sitemap/robots.
4. **P2 — Maintainability:** pagination dan query bounds; pemisahan data layer bertahap; konsistensi fallback; CI, tes, dokumentasi dan repo hygiene.
5. **P3 — Fitur produk:** arsip pengumuman, portofolio siswa, audit media, editor CMS, dan peningkatan pengalaman publik—satu per satu setelah fondasi aman.

## Aturan pelaksanaan

- AI boleh mengubah source, tests, dokumentasi, dan menyiapkan migration baru.
- AI yang terhubung dan berwenang ke Supabase boleh menjalankan inspeksi atau perubahan sesuai preflight dan guardrail di runbook.
- Jangan jalankan baseline pada database berisi data; jangan ubah migration historis yang sudah diterapkan.
- Pisahkan status `CODED`, `DB-APPLIED`, dan `VERIFIED`; tulis bukti aktual.
- Jika tidak tersedia runtime/browser/deployment, tandai `NEEDS_RUNTIME`, `NEEDS_BROWSER`, atau `NEEDS_DEPLOY`.
- Jangan menampilkan data pribadi siswa, payload backup, atau secret dalam output.

## Kriteria selesai umum

Setiap tiket memiliki sasaran, file/objek, dependensi, tes yang ditulis, risiko, dan kriteria penerimaan. Perubahan data ditinjau untuk RLS/grants, privasi, backup, cache, dan rollback. Lihat runbook untuk backlog terperinci dan format laporan AI.
