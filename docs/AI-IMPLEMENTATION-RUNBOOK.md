# Rundown Pengembangan Besar — AI Execution Plan

**Project:** Website Kelas TKJ XII-9 (`Pratama-Host/astro-web`)  
**Tujuan:** backlog teknis terperinci untuk AI coding agent yang dapat mengubah source repository dan, jika sesi memang terhubung serta memiliki otorisasi, melakukan pemeriksaan atau perubahan Supabase secara terkontrol.  
**Dokumen teknis utama:** [`docs/AI-IMPLEMENTATION-RUNBOOK.md`](docs/AI-IMPLEMENTATION-RUNBOOK.md)

> Roadmap ini adalah rencana kerja, bukan laporan bahwa semua test, migration, atau deployment sudah dilakukan. Status setiap tiket wajib disertai bukti. `CODED` berarti perubahan source dibuat; `DB-APPLIED` berarti migration benar-benar diterapkan; `RUNTIME-VERIFIED` berarti perintah/browser/deployment benar-benar diperiksa.

## Prinsip kerja AI

1. Satu tiket atau satu rangkaian dependensi kecil per perubahan; jangan menjalankan refaktor seluruh repo sekaligus.
2. Sebelum menyentuh database: identifikasi project/ref yang tersambung, mode/lingkungan, histori migration, objek yang akan berubah, dan backup sebelum perubahan. Hentikan proses bila target ambigu atau terindikasi production tanpa izin eksplisit untuk operasi tersebut.
3. Jangan pernah menjalankan baseline `20261106000100_baseline.sql` pada database yang sudah berisi data. Jangan mengedit migration yang sudah diterapkan; gunakan migration baru yang aditif.
4. Jangan membaca/menyalin payload pribadi siswa ke output atau log. Untuk inspeksi gunakan schema, nama kolom, jumlah agregat, dan assertion boolean.
5. Eksekusi `npm ci`, `check`, test, build, browser, atau deploy hanya jika alat/runtime yang sesuai tersedia dan tugas mengizinkan. Bila tidak, tulis tes dan tandai `NEEDS_RUNTIME`.
6. Setiap tiket harus memperbarui dokumentasi/changelog saat kontrak, schema, policy, atau perilaku pengguna berubah.

## Status tiket

- `[ ] TODO` — belum dikerjakan.
- `[~] IN_PROGRESS` — sedang dikerjakan.
- `[x] CODED` — perubahan source telah dibuat; belum tentu dijalankan.
- `[x] DB-APPLIED` — migration terpasang dan diverifikasi pada target yang disebutkan.
- `[x] VERIFIED` — test/runtime yang diperlukan lulus dan buktinya dicatat.
- `[!] BLOCKED` — menunggu akses, keputusan, kredensial, lingkungan, atau verifikasi manusia.

Jangan mengganti `TODO` menjadi `VERIFIED` hanya karena kode terlihat benar.

---

# P0 — Keselamatan data dan kontrak database

## EPIC DB: Schema, migration, backup, dan akses publik

### DB-01 — Inventaris dan rekonsiliasi Supabase (READ-ONLY)
**Status:** TODO · **Dependensi:** tidak ada · **Dampak:** P0

**Source:** semua `supabase/migrations/*.sql`, `supabase/config.toml`, `docs/AUDIT.md`, `docs/RECONCILIATION-2026-11-13.md`.

**AI kerjakan:**
- Catat commit/ref repo dan identitas non-secret project Supabase yang benar-benar terhubung.
- Bandingkan migration version di repo dengan histori migration database.
- Inventaris schema: tabel/kolom, PK/FK/unique/check, index, function/RPC dan signature, RLS, policy, grants, Storage bucket, limit ukuran dan MIME.
- Cocokkan urutan migration bernama serupa: 090001 dengan 13130505; 090002 dengan 13130520; 090003 dengan 13130543. Tentukan berdasarkan isi dan migration history, bukan filename saja.
- Jangan melakukan mutasi pada tiket audit ini. Gunakan hasil agregat, tanpa mencetak isi record.

**Kriteria selesai:** `docs/DATABASE-STATE.md` memuat source version, target identifier non-secret, migration version, status setiap objek, mismatch, tingkat risiko, tindakan berikut, dan bukti pembacaan. Semua ketidakpastian ditandai.

### DB-02 — Verifikasi backup/restore aktual dan cakupan domain
**Status:** TODO · **Dependensi:** DB-01 · **Dampak:** P0

**Source:** `src/pages/api/admin/backup.ts`, RPC `export_tkj_cms_backup()` dan `restore_tkj_cms_backup(jsonb)`, migration baseline, migration announcements, smoke SQL.

**AI kerjakan:**
- Periksa definisi RPC aktif dan payload contract tanpa menampilkan payload.
- Secara khusus pastikan `announcements` dan `agenda_events` masuk export, restore, validator API, batas jumlah baris, dan smoke tests. Source backup API saat ini mendefinisikan `TABLES` tanpa dua tabel tersebut; RPC aktif harus diperiksa sebelum membuat kesimpulan.
- Pastikan `site_settings`, anggota, galeri, guru, skills, site_pages, drafts, navigation, sections, media metadata, revisions, dan audit diperlakukan konsisten dengan kontrak yang dipilih.
- Pastikan format/version bundle, mode upsert, konfirmasi restore, transaksi atomik, dan permission service-role selaras.
- Jangan membuang konten yang tidak ada pada bundle saat restore kecuali perilaku itu menjadi keputusan eksplisit yang didokumentasikan.

**Jika ditemukan gap:** buat migration baru untuk RPC serta ubah validator/API dan tes; jangan mengedit migration lama yang sudah diterapkan. Siapkan urutan rollout kompatibel antara database dan source.

**Kriteria selesai:** bundle export mencantumkan domain yang disepakati; restore mengembalikan data dalam transaksi; malformed/oversize bundle ditolak; anon/authenticated tidak bisa execute RPC; SQL smoke membuktikan round-trip pakai data uji dan diakhiri `ROLLBACK`.

### DB-03 — Proteksi RPC, RLS, grant, dan privasi siswa
**Status:** TODO · **Dependensi:** DB-01 · **Dampak:** P0

**Source:** `supabase/migrations/*`, `supabase/smoke/anon-access-smoke.sql`, `supabase/smoke/cms-rpc-smoke.sql`, `src/lib/public-data-policy.ts`, `tests/public-data-policy.test.ts`.

**AI kerjakan:**
- Verifikasi pembacaan publik per tabel dan per kolom, bukan sekadar RLS enabled.
- Pastikan NIS, login attempts, drafts, revisions, audit, internal media metadata dan backup privat tidak terbaca role publik.
- Periksa `anon`/`authenticated` tidak memiliki mutasi tabel aplikasi; periksa default privileges agar tabel mendatang tidak terbuka otomatis.
- Periksa execute privilege seluruh RPC sensitif: backup/restore, login limiter, publikasi draft, perubahan koleksi/navigasi/settings/aset/revisi.
- Tambahkan assertion eksplisit pada smoke SQL yang menghasilkan pass/fail tanpa membocorkan data.
- Cocokkan kolom eksplisit `PUBLIC_MEMBER_COLUMNS` dengan grants aktif.

**Kriteria selesai:** migration baru hanya bila ada temuan yang bisa dibuktikan; smoke tests mencakup policy dan grants; `docs/DATA-CLASSIFICATION.md` dan database-state menjelaskan aturan dan bukti. Eksekusi mutasi DB dicatat terpisah dari kode.

### DB-04 — Provisioning kosong dan upgrade schema pada disposable
**Status:** TODO · **Dependensi:** DB-01 · **Dampak:** P0

**AI kerjakan:** susun prosedur project kosong vs upgrade dari versi yang didukung; tinjau baseline hasil rekonstruksi dan semua migration sesudahnya. Jika Supabase disposable tersedia, jalankan pada target yang terisolasi; bila tidak, buat checklist dan tandai `NEEDS_SUPABASE_DISPOSABLE`.

**Kriteria selesai:** urutan migrasi lengkap; state akhir diverifikasi dari nol dan upgrade; semua objek publik/internal dan privilege diperiksa; tidak ada baseline diterapkan ke database berisi data.

### DB-05 — Smoke test DB yang aman dan berguna
**Status:** TODO · **Dependensi:** DB-02, DB-03 · **Dampak:** P0

**Source:** `supabase/smoke/anon-access-smoke.sql`, `supabase/smoke/cms-rpc-smoke.sql`, `tests/supabase-cms-rpc-smoke.sql`.

**AI kerjakan:**
- Tambahkan coverage member/gallery/site data publik dan pengumuman/agenda draft, scheduled, live, expired, archived.
- Tambahkan test grant/execute privilege dan pengujian fungsi backup/restore.
- Smoke RPC saat ini mengubah sementara `/tkj`, settings, revisions, audit dan draft di dalam transaksi. Pertahankan `ROLLBACK`, validasi bahwa test cocok dengan fungsi aktif dan aman concurrent; jangan jalankan pada target yang transaction rollback-nya tidak terjamin.
- Hindari test yang outputnya mengandung nama, NIS, isi pesan, atau payload backup.

**Kriteria selesai:** tiap test memiliki prasyarat dan hasil yang diharapkan; mutasi test rollback; tidak ada instruksi ambigu “jalankan satu per satu” tanpa prosedur aman; status eksekusi nyata dicatat.

### DB-06 — Backup penuh: database, Storage, konfigurasi; batas CMS export
**Status:** TODO · **Dependensi:** DB-02 · **Dampak:** P0

**AI dapat mengerjakan di repo:** dokumentasi cakupan, script/checklist backup Storage, manifest verifikasi object, checksum dan restore procedure. `export_tkj_cms_backup()` bukan pengganti backup PostgreSQL penuh/off-site dan bukan backup byte objek Storage.

**AI dengan Supabase integration:** inspeksi read-only bucket/object metadata dan bandingkan path yang direferensikan, tanpa mengambil/menampilkan data pribadi. Jangan mengklaim off-site backup kecuali ada destinasi backup dan bukti salinan terpisah.

**Perlu lingkungan/operasional:** salinan eksternal, retensi, enkripsi, restore drill ke project terpisah, secrets recovery. Tandai `NEEDS_EXTERNAL_BACKUP`.

**Kriteria selesai:** runbook membedakan database dump, CMS JSON, object Storage, config/secret; ada manifest/checksum dan restore checklist; satu restore drill hanya berstatus VERIFIED dengan bukti aktual.

---

# P1 — Keamanan aplikasi dan stabilitas CMS

## EPIC AUTH: Login, API, input, dan audit

### SEC-01 — Audit semua route admin dengan matriks kontrol
**Status:** TODO · **Dependensi:** tidak ada · **Dampak:** P1

**Source:** `src/pages/api/admin/*.ts`, `src/lib/admin-auth.ts`, `src/lib/cms-admin.ts`.

Untuk tiap route catat method, session check, Origin check untuk mutasi, body limit, schema validation, privilege DB, error mapping, `no-store`, audit log, cache purge, dan side effect. Tinjau login/logout secara khusus.

**Kriteria selesai:** `docs/ADMIN-API-CONTRACT.md` dan tes per route; tidak ada mutasi tanpa server-side authorization/validation; semua error privat no-store; perilaku audit best-effort jelas.

### SEC-02 — Tes autentikasi dan session cookie yang lengkap
**Status:** TODO · **Dependensi:** SEC-01 · **Dampak:** P1

**Source:** `src/lib/admin-auth.ts`, login/logout API, `tests/admin-auth.test.ts`.

Tambah tes expiry, signature rusak, secret hilang/kurang panjang, cookie flag production, Origin hilang/null/mismatch, safe methods, token malformed, dan rate-limit error. Jangan membuat tes yang mencetak password, cookie, secret, atau IP mentah.

**Kriteria selesai:** kontrak negatif dan positif punya test; asumsi runtime Cloudflare/Node dicatat; tes statis yang tidak dapat menjalankan crypto environment tidak dilaporkan sebagai runtime lulus.

### SEC-03 — Validasi konsisten payload dan error API
**Status:** TODO · **Dependensi:** SEC-01 · **Dampak:** P1

**Source:** admin endpoints dan helper `cms-admin.ts`, `announcements.ts`.

Review batas byte aktual, JSON invalid, field tidak dikenal, panjang string, URL, status transition, UUID/path ID, query parameter, error DB, dan response header. Buat helper hanya untuk pola yang benar-benar berulang; endpoint tetap jelas dan domain-specific.

**Kriteria selesai:** test tabel valid/invalid per domain; response tidak membocorkan detail internal; batas request tercakup; API docs sesuai source.

### SEC-04 — Audit upload media end-to-end
**Status:** TODO · **Dependensi:** DB-03 · **Dampak:** P1

**Source:** `src/lib/media-validation.ts`, `src/pages/api/admin/media.ts`, `scripts/upload-media.mjs`, Storage MIME migration, media tests.

Source API memeriksa magic bytes dan menolak SVG, sedangkan batch uploader mencantumkan SVG. Tentukan policy per jalur, allowlist MIME, kategori, ukuran, filename, path traversal, thumbnail, replace, metadata, cleanup saat sebagian gagal, dan service-role boundary. Tambah validasi manifest/path pada script batch dan dry-run bila sesuai.

**Kriteria selesai:** matriks format kanonik; kode, bucket, dan dokumentasi konsisten; upload parsial ditangani; tes signature/path/size/replacement/rollback; kebijakan SVG disetujui dan jelas.

### SEC-05 — Privasi dan retensi data anggota
**Status:** TODO · **Dependensi:** DB-03 · **Dampak:** P1

**Source:** `docs/DATA-CLASSIFICATION.md`, `src/lib/public-data-policy.ts`, member page, CMS member/media.

Buat alur izin publik untuk nama, foto, audio, social links; koreksi/penarikan; retensi saat angkatan/kelas berganti; proses admin; minimisasi log dan backup. Jangan mengubah kebijakan NIS tanpa keputusan pemilik data.

**Kriteria selesai:** dokumentasi memberi siapa/apa/cara/retensi; test publik memastikan field privat tak dikirim; setiap perubahan kebijakan NIS membutuhkan persetujuan eksplisit dan perubahan DB/code/test.

## EPIC CMS: Alur konten dan recovery UI

### CMS-01 — Pengumuman dan agenda: domain contract
**Status:** TODO · **Dependensi:** DB-02, SEC-03 · **Dampak:** P1

**Source:** `src/lib/announcements.ts`, `src/pages/api/admin/announcements.ts`, `src/scripts/admin/announcements.js`, `src/pages/pengumuman.astro`, SQL migration/tests.

Samakan model validasi server, constraints database, RLS, filter publik, WIB/timezone, publish schedule, expiry, pinned sorting, agenda ends_at, arsip. Periksa route helper GET/POST dan error loading UI. Buat tests untuk jam tepi dan zona waktu.

**Kriteria selesai:** domain rules tidak berkontradiksi antara TS/SQL/UI; draft/arsip/scheduled tak terlihat publik; publish live tampil; semua tanggal ditampilkan sesuai aturan waktu terdokumentasi.

### CMS-02 — E2E alur admin yang dapat direproduksi
**Status:** TODO · **Dependensi:** CMS-01, SEC-02, test environment · **Dampak:** P1

**AI kerjakan:** tulis konfigurasi/test E2E dan fixture terisolasi untuk login/logout, pengumuman/agenda CRUD dan publish/archive, preview draft, backup UI, media upload/error. Gunakan test DB/project terpisah dan data sintetis.

**Perlu runtime:** instalasi dependency E2E, browser execution, viewport/device check. Tandai `NEEDS_RUNTIME` bila tool tidak tersedia.

**Kriteria selesai:** source E2E menguji jalur penting; tidak menulis ke Supabase live; hasil dijalankan baru dinyatakan VERIFIED dengan log.

### CMS-03 — Backup/restore UI aman dan dapat dimengerti
**Status:** TODO · **Dependensi:** DB-02 · **Dampak:** P1

**Source:** `src/pages/api/admin/backup.ts`, admin system UI/js.

Audit preview/konfirmasi restore, ukuran file, format/version, pesan sukses/gagal, cache invalidation setelah restore, audit log, dan penanganan partial failure. Tampilkan dengan jelas restore bersifat apa dan apakah menghapus/menimpa record. Jangan membocorkan backup contents di UI log.

**Kriteria selesai:** operator melihat dampak dan konfirmasi eksplisit; validasi dilakukan server-side; satu transaksi DB atau gagal utuh; cache publik di-purge; tes UI/API menguji failure.

### CMS-04 — Revisi konten, rollback, dan audit log
**Status:** TODO · **Dependensi:** SEC-01 · **Dampak:** P1

**Source:** revisions/audit API, admin modules, RPC SQL, `docs/RECONCILIATION-2026-11-13.md`.

Pastikan UI riwayat/restore yang disebut sebagian tersedia; bandingkan content version, restore confirmation, siapa/apa yang tercatat, dan apakah aktivitas berisiko menghasilkan audit event. Hindari menyimpan PII ekstra dalam summary.

**Kriteria selesai:** tes restore revision membuktikan versi terpilih dipulihkan dan versi sebelum restore tetap tercatat; UI menunjukkan kegagalan dan konfirmasi; audit tidak memuat rahasia.

---

# P1 — Kualitas publik, cache, dan aksesibilitas

## EPIC WEB: PWA, cache, SEO, dan pengalaman

### WEB-01 — Cache matrix dan invalidation
**Status:** TODO · **Dependensi:** tidak ada · **Dampak:** P1

**Source:** `src/middleware.ts`, `src/lib/cms-admin.ts`, `public/sw.js`, `public/_headers`, `src/pages/api/public/settings.ts`.

Buat matriks URL/method/response: HTML publik, settings API, admin UI/API, preview draft, sitemap, robots, offline, hashed assets. Verifikasi perbedaan cache Cloudflare Worker dan browser Cache API. Audit invalidation `site-html` setelah tiap mutasi publik.

**Kriteria selesai:** test header mencakup seluruh kategori; admin/preview no-store; draft tidak masuk SW cache; perubahan public invalidasi sesuai desain.

### WEB-02 — CSP bertahap, jangan mematahkan fitur
**Status:** TODO · **Dependensi:** inventaris external origins · **Dampak:** P1

**Source:** `src/middleware.ts`, `public/_headers`, `public/offline.html`, `src/layouts/Layout.astro`, komponen/iframe.

Inventaris inline script/style, fonts, iframe audio, img/media/connect origins. Satukan policy SSR dan static di batas yang sesuai. Buat mode Report-Only atau dokumentasi rollout terlebih dahulu; refaktor inline hanya dengan tes dan dukungan adapter yang nyata. Hindari `*`/protocol-wide source tanpa justifikasi.

**Kriteria selesai:** kebijakan report-only terdokumentasi; allowlist punya alasan; tidak mengaktifkan enforcement sebelum browser/runtime verification.

### WEB-03 — Service worker dan offline flow
**Status:** TODO · **Dependensi:** WEB-01 · **Dampak:** P1

**Source:** `public/sw.js`, `public/offline.html`, `src/pages/offline.astro`, `public/manifest.json`, layout.

Bandingkan offline URL/relative URL, precache entries, static asset strategy, cache version, response private detection, preview bypass, cache trimming, update flow. `offline.html` memiliki referensi path/asset dan deskripsi cache yang perlu dicocokkan dengan output Astro aktual.

**Kriteria selesai:** static contract tests memastikan path dan asset valid; seluruh private routes dikecualikan; update cache tidak menghapus cache lain yang bukan milik app; runtime offline test diberi status terpisah.

### WEB-04 — Aksesibilitas publik dan admin
**Status:** TODO · **Dependensi:** E2E/UI test tersedia · **Dampak:** P1

**Source:** halaman `.astro`, komponen, `src/scripts/anggota.js`, admin JS/CSS.

Audit semantik button/link/form labels, heading order, dialog focus management, focus return, keyboard escape, reduced motion, status live region, alt text, warna/kontras. Prioritaskan modal anggota/admin dan nav mobile. Ganti elemen clickable dengan semantic element bila kompatibel.

**Kriteria selesai:** temuan prioritas tinggi ditangani; automated DOM/keyboard tests dibuat; screen reader/device manual tetap ditandai NEEDS_HUMAN_RUNTIME.

### WEB-05 — SEO route consistency
**Status:** TODO · **Dependensi:** tidak ada · **Dampak:** P1

**Source:** `src/pages/sitemap.xml.ts`, `robots.txt.ts`, `src/lib/site-url.ts`, page routes, nav data.

Cocokkan sitemap dengan route nyata (termasuk `/pengumuman`), admin/noindex, canonical origin, draft preview noindex, dan route dinamis. Hindari memasukkan admin/offline/API. Test XML escaping/canonical origin dan route inventory.

**Kriteria selesai:** daftar route publik adalah satu kontrak yang bisa dites; sitemap tidak punya route mati/privat; origin tidak berasal dari input host yang tidak tervalidasi.

---

# P2 — Performa, kualitas kode, dan pemeliharaan

## EPIC DATA: Query, paging, dan typed boundaries

### DATA-01 — Query map dan bounded reads
**Status:** TODO · **Dependensi:** baseline data diketahui · **Dampak:** P2

**Source:** `src/lib/data.ts`, `src/lib/announcements.ts`, media/member/gallery APIs.

Inventaris query per halaman dan kolom yang dipilih. Tinjau `getSiteData()` parallel queries, member/gallery growth, announcements limits 50/100, admin list limits 200, media pagination 1000/10k. Tentukan paginasi/limit berdasarkan kebutuhan, sort stabil, index berdasarkan query aktual.

**Kriteria selesai:** batas data eksplisit, tidak ada truncation diam-diam, paging contract teruji; index migration hanya jika query plan/data evidence mendukung.

### DATA-02 — Pisahkan data layer per domain bertahap
**Status:** TODO · **Dependensi:** tes data layer · **Dampak:** P2

**Source:** `src/lib/data.ts`, `src/lib/supabase.ts`, `src/lib/public-data-policy.ts`.

Pisahkan mapper/member/gallery/settings/page SEO/navigation/sections berdasarkan ownership. Pertahankan exported interfaces sementara; satu domain per patch. Ganti `any` pada domain yang disentuh dengan interface yang cocok data DB/fallback. Jangan refactor tanpa tes kontrak.

**Kriteria selesai:** domain boundaries jelas; tidak ada duplikasi mapping; fallback & storage resolution parity teruji; tidak ada breaking public page behavior yang tidak disengaja.

### DATA-03 — Konsistensi fallback/live state
**Status:** TODO · **Dependensi:** DATA-01 · **Dampak:** P2

Bedakan query kosong vs error vs client tidak ada. Pastikan fallback G.json tidak mengirim NIS, `/assets/` lama, atau nilai privat; logging hanya scope dan error aman. Periksa announcement fallback kosong dan admin health/status.

**Kriteria selesai:** tabel perilaku per domain dan tes parsial failure; tidak ada error database mentah ke browser.

## EPIC TOOLING: CI, docs, repo hygiene

### TOOL-01 — Selaraskan CI dengan validasi yang dijanjikan
**Status:** TODO · **Dependensi:** tidak ada · **Dampak:** P2

**Source:** `.github/workflows/ci.yml`, `package.json`, `eslint.config.js`, Vitest config.

CI saat ini menjalankan npm ci, audit, Astro check, Vitest, build. ESLint config ada tetapi belum tampak script/lint step di `package.json`/workflow. Putuskan apakah lint diwajibkan; jika ya, tambahkan npm script dan CI step, lalu perbaiki temuan. Jangan menambah gate yang tidak dapat dipelihara.

**Kriteria selesai:** satu perintah validasi yang terdokumentasi; workflow dan package scripts sama; dependency audit failure ditangani dengan aturan jelas.

### TOOL-02 — Perkuat tes tanpa menjalankan instalasi
**Status:** TODO · **Dependensi:** ticket spesifik · **Dampak:** P2

AI dapat menulis tes statis; bila npm/runtime tidak tersedia, catat `NEEDS_RUNTIME`. Tambah test untuk API response/security, data failures, navigation, member view controls, URL, upload, backup contract. Jangan menulis snapshot yang mengandung data real.

**Kriteria selesai:** tiap bug fix memiliki regression test yang terkait; laporan membedakan file test ditambah vs test dieksekusi.

### TOOL-03 — Dokumentasi satu sumber kebenaran
**Status:** TODO · **Dependensi:** DB-01, APP-01 · **Dampak:** P2

**Source:** README, ROADMAP, CHANGELOG, SECURITY, CONTRIBUTING, docs.

Cocokkan routes, API methods, migration versions, package versions, UI anggota (carousel/grid), PWA, backup coverage, DB status. README dan changelog jangan mengklaim hal runtime yang tidak diverifikasi. Periksa `.zip` lokal hanya bila dapat diinspeksi; jangan simpulkan dari namanya.

**Kriteria selesai:** setiap claim ditandai source evidence atau bukti runtime; tanggal/revision konsisten; keputusan `4.zip` dicatat atau tetap blocked.

### TOOL-04 — Dependency dan ukuran permukaan kode
**Status:** TODO · **Dependensi:** TOOL-01 · **Dampak:** P2

Review dependency langsung vs penggunaan, lockfile/version, assets/legacy scripts, CSS cascade dan dead files. Hapus hanya setelah penggunaan dan public references dipastikan dengan pencarian lengkap. Upgrade dependency satu kelompok, migration note dan test; jangan melakukan major upgrades massal.

**Kriteria selesai:** tidak ada penghapusan berdasarkan tebakan; dependency update terisolasi; perubahan CSS/JS punya regression checks.

---

# P3 — Ekspansi fitur produk (pilih setelah P0/P1)

## FEATURE-01 — Pengumuman/agenda searchable archive

- Tentukan kebutuhan pengguna dan aturan konten arsip.
- Implementasikan filter kategori/tanggal, pagination, sorting stabil, timezone WIB, empty/error state.
- Jangan expose draft/scheduled/expired; pastikan RLS dan aplikasi sejalan.
- Backup/restore dan audit log harus menyertakan perubahan.
- Done: domain tests + API tests + E2E; UI keyboard/mobile ditinjau.

## FEATURE-02 — Portofolio karya/proyek siswa

- Sebelum schema: definisikan pemilik, persetujuan, penghapusan/takedown, retensi, moderasi.
- Buat model draft/published/archived, media links, alt text, metadata SEO, revisions.
- Mutasi via API admin service-side; RLS read published only; backup inkludensinya teruji.
- Done: data-classification, migration, API/UI, media handling, tests, docs.

## FEATURE-03 — Media library audit/orphan report

- Tambahkan laporan read-only object tak terpakai dan referensi rusak dengan pagination.
- Tunjukkan referensi entity tanpa menampilkan data privat berlebih.
- Hapus otomatis dilarang pada iterasi awal; perlu konfirmasi dan backup yang valid.
- Done: laporan deterministik, semua sumber referensi disisir, test false-positive dan inaccessible data.

## FEATURE-04 — Editor CMS autosave/recovery

- Tambah dirty-state, confirm keluar, draft recovery yang tidak menyimpan rahasia di local storage, validasi inline, retry aman.
- Pastikan request idempotent atau mencegah double-submit untuk mutasi.
- Done: tes kehilangan koneksi, duplikasi submit, refresh/restore, keyboard/accessibility.

## FEATURE-05 — Perbaikan pengalaman pengunjung

- Peningkatan navigasi, pencarian anggota, galeri metadata/alt text, halaman pengumuman, offline state.
- Pengembangan berdasarkan kebutuhan kelas, bukan redesign total.
- Done: satu fitur per PR, metric/acceptance jelas, perf/SEO/accessibility diperiksa.

---

# Pekerjaan dengan bukti lingkungan eksternal

AI boleh menyiapkan file/prompt/test untuk semua ini, tetapi jangan mengklaim selesai hanya dari edit source.

| Pekerjaan | Label jika belum dijalankan | Bukti untuk menutup tiket |
|---|---|---|
| `npm ci`, `npm run check`, `npm test`, `npm run build` | `NEEDS_RUNTIME` | Log pada commit/SHA yang sama |
| Supabase migration | `NEEDS_DB_APPLY` | Target project/ref, backup ID/metadata tanpa payload, migration version, post-check |
| Browser/E2E/device test | `NEEDS_BROWSER` | Test run, route dan viewport yang diuji |
| Off-site backup/Storage restore | `NEEDS_EXTERNAL_BACKUP` | Bukti destinasi terpisah, checksum, restore drill report |
| Cloudflare deploy/rollback | `NEEDS_DEPLOY` | Deployment ID, waktu, smoke test, status |
| Consent/privacy decision | `NEEDS_OWNER_DECISION` | Persetujuan pemilik/pengelola dan dokumentasi aturan |

# Format laporan AI per tiket

```text
Ticket: DB-02
Status: CODED / DB-APPLIED / VERIFIED / BLOCKED
Repo commit/ref:
Supabase target (identifier non-secret, jika relevan):
Perubahan file:
Perubahan database:
Bukti yang benar-benar diperoleh:
Test ditulis:
Test dijalankan dan hasil:
Risiko / rollback:
Langkah berikutnya:
```

Jangan memasukkan row data, NIS, password, cookie, Supabase key, token, maupun isi backup ke laporan.

# Urutan eksekusi yang dianjurkan

1. DB-01 read-only inventory.
2. DB-02 backup contract (terutama announcements/agenda gap).
3. DB-03 RLS/grants/privacy.
4. DB-04 disposable provisioning, DB-05 smoke tests, DB-06 recovery scope.
5. SEC-01/02/03 dan CMS-01/02/03/04.
6. SEC-04/05, WEB-01/02/03/04/05.
7. DATA-01/02/03 dan TOOL-01/02/03/04.
8. P3 features satu per satu setelah syarat P0/P1 terpenuhi.

Urutan ini adalah prioritas; agent dapat mengerjakan tiket independen secara paralel hanya bila tidak mengubah schema, migration, atau kontrak yang sama.
