# Website Kelas TKJ XII-9

Website Astro untuk kelas XII-9 Teknik Komputer dan Jaringan, SMK Muhammadiyah Belitang.

## Menjalankan proyek

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
npm run preview
```

Aplikasi menggunakan Astro server output dan adapter Cloudflare. Integrasi runtime Supabase, API admin, dan halaman publik sudah tersedia. Jika Supabase belum dikonfigurasi atau query gagal, halaman publik memakai data cadangan dari `src/data/G.json`; file media lokal lama yang sudah tidak tersedia tidak dipanggil sebagai fallback.

## Setup Lanjutan — Supabase, Storage, dan Admin

Integrasi Supabase berjalan melalui server Astro. Konfigurasi proyek dan kredensial tetap dikelola pemilik proyek melalui environment variable, bukan ditanam di source code.

### 1. Buat proyek Supabase dan isi environment variable

1. Buka [Supabase](https://supabase.com/) dan buat akun/proyek baru.
2. Pilih organisasi, nama proyek, password database, dan region yang sesuai. Simpan password database di pengelola password; password tersebut berbeda dari `ADMIN_PASSWORD`.
3. Setelah proyek aktif, buka **Project Settings → API** (atau halaman API Keys sesuai tampilan dashboard).
4. Salin **Project URL** ke `SUPABASE_URL`.
5. Ambil key server dengan hak akses service role/bypass RLS (umumnya bernama `service_role` pada tampilan legacy atau secret server key pada tampilan key yang lebih baru) ke `SUPABASE_SERVICE_KEY`. Jangan gunakan publishable/anon key untuk variabel ini.
6. Buat password panjang untuk panel admin dan secret acak minimal 32 karakter untuk menandatangani sesi.
7. Salin `.env.example` menjadi `.env`, lalu isi nilainya sendiri:

```dotenv
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_KEY=PASTE_SERVER_SECRET_KEY_HERE
SUPABASE_STORAGE_BUCKET=astro
ADMIN_PASSWORD=GANTI_DENGAN_PASSWORD_ADMIN_YANG_KUAT
ADMIN_SESSION_SECRET=GANTI_DENGAN_SECRET_ACAK_MINIMAL_32_KARAKTER
```

Nilai di atas hanya format contoh/placeholder, bukan kredensial yang valid. Jangan commit `.env` ke Git. `.gitignore` sudah mengecualikannya.

Untuk membuat secret lokal, contoh perintah (jalankan sendiri):

```bash
openssl rand -base64 48
```

Nilai dibaca dari environment server saat runtime melalui `process.env`. `SUPABASE_SERVICE_KEY` hanya dipakai di server oleh `src/lib/supabase.ts`. Jangan mengganti namanya menjadi `PUBLIC_SUPABASE_SERVICE_KEY`, jangan mengirimnya ke browser, dan jangan menyimpannya di repo.

### 2. Buat bucket Storage

1. Di dashboard Supabase, buka **Storage → New bucket**.
2. Gunakan nama bucket `astro`, sesuai konfigurasi proyek saat ini.
3. Aktifkan **Public bucket** agar browser dapat menampilkan foto/logo/audio yang dipakai situs publik.
4. Simpan bucket.
5. Struktur object yang dipakai aplikasi:

```text
astro/
├── anggota/                 # foto profil anggota
├── galeri/                  # foto kenangan/galeri
└── assets-global/
    ├── logo/                # logo situs
    └── audio/               # audio latar global
```

Upload foto anggota dapat langsung dikaitkan ke NIS (opsional), upload galeri otomatis membuat item galeri dengan caption, dan upload logo/audio global otomatis memperbarui pengaturan situs. Bucket publik berarti URL media dapat dibaca publik; jangan menaruh dokumen pribadi di bucket ini.

### 3. Schema dasar dan migration CMS

Schema dasar `migrations/schema.sql` membuat tabel inti `site_settings`, `anggota`, `guru`, `skills`, dan `galeri`. Untuk database production yang sudah berisi data, **jangan jalankan ulang schema atau seed**. Jalankan hanya migration historis yang belum pernah diterapkan; cek tabel/kolom sebelum mengeksekusi ulang secara manual.

**Database production yang sudah dipakai:** ekspor backup database dan pastikan backup Storage tersedia terlebih dahulu. Periksa riwayat migration/tabel; jangan jalankan ulang `schema.sql`, seed, atau migration lama yang sudah diterapkan. Jika CMS dasar sudah ada tetapi tabel draft belum ada, jalankan `20261103_stage3_workflow.sql` satu kali. Setelah migration CMS dan draft tersedia, jalankan `20261103_stage3_hardening.sql` satu kali. Migration hardening membuat RPC transaksi serta rate limit login; endpoint login versi ini akan menolak login (`503`) sampai migration itu aktif. Jika ragu apakah migration pernah dijalankan, periksa struktur tabel dan daftar function di Supabase sebelum mengulanginya.

**Proyek Supabase benar-benar baru:** jalankan SQL melalui Supabase SQL Editor dengan urutan berikut:

1. `migrations/schema.sql` — tabel inti dan RLS.
2. `migrations/seed.generated.sql` — seed awal yang telah ditinjau (hanya untuk database kosong).
3. `migrations/20261101_cms.sql` — tabel dan kolom CMS.
4. `migrations/20261103_kelas_xii.sql` — transisi label kelas dan metadata CMS.
5. `migrations/20261103_site_cleanup.sql` — membersihkan konfigurasi runtime lama.
6. `migrations/20261103_stage3_workflow.sql` — tabel draft.
7. `migrations/20261103_stage3_hardening.sql` — rate limit login dan RPC transaksi.

Jangan menjalankan seed awal di database yang sudah memiliki data. Migration CMS dan Stage 3 bersifat additive; migration hardening memberi hak eksekusi RPC hanya kepada `service_role`. Setelah migration selesai, deployment perlu memakai environment variable server yang tepat.

Tabel inti yang sudah ada:
- `site_settings`
- `anggota`
- `guru`
- `skills`
- `galeri`

Operasi database aplikasi dilakukan dari server Astro. Jangan mengirim service-role key ke browser.

### 4. Generate seed SQL dan daftar upload media

Setelah schema disiapkan (atau kapan saja sebelum seed), jalankan dari root proyek:

```bash
npm run migrate:data
```

Perintah ini **tidak terkoneksi ke Supabase** dan tidak mengunggah file. Script hanya membaca `src/data/G.json`, lalu menghasilkan:

- `migrations/seed.generated.sql` — perintah INSERT/UPSERT untuk `site_settings`, `anggota`, `guru`, `skills`, dan `galeri`.
- `migrations/media-manifest.json` — daftar sumber file lokal, path object target di bucket, lokasi referensi kode, dan status apakah file sumber ditemukan dalam arsip.

Tinjau kedua file tersebut sebelum digunakan. Selanjutnya:

1. Jika seed belum pernah dijalankan pada proyek baru, buka `migrations/seed.generated.sql` di Supabase SQL Editor setelah schema dasar berhasil. Untuk database proyek saat ini yang sudah berisi data, jangan jalankan seed ulang hanya untuk mengaktifkan CMS.
2. Manifest media adalah catatan migrasi sumber lama. Media yang sudah berhasil dipindahkan ke Supabase tidak perlu diunggah ulang.
3. Manifest snapshot arsip awal mencatat 26 referensi media yang file binernya tidak disertakan dalam ZIP sumber. Pada proyek Termux berjalan, file lokal telah dipindahkan ke backup dan media telah berhasil diunggah ke Supabase Storage. Karena itu, **jangan mengulang upload 26 media lama** hanya karena manifest arsip mencatat file sumber missing.
4. Seed SQL lama mengubah path media yang dikenal menjadi referensi `storage://...`. Lapisan data server mengubah referensi tersebut menjadi URL publik Storage. URL eksternal yang valid tetap dipertahankan. Upload media baru melalui CMS akan otomatis mengindeks file di media library.

Seed memakai UPSERT untuk kunci unik (NIS, nama guru/skill, dan path galeri), sehingga dapat dijalankan ulang setelah ditinjau. Seed tidak menghapus row tambahan yang dibuat kemudian.

### 5. Deployment Cloudflare tanpa menjalankan npm di perangkat

Proyek ini menggunakan Astro SSR. Artinya deployment harus membangun Worker di layanan build; mengunggah folder source atau file HTML saja tidak cukup. Anda **tidak perlu memasang atau menjalankan npm di HP**: gunakan Cloudflare **Workers Builds** agar instalasi dependency, build, dan deploy dikerjakan di server Cloudflare.

1. Push seluruh isi repository ini ke GitHub. Pastikan root repository berisi `package.json`, `astro.config.mjs`, dan `wrangler.json`.
2. Di Cloudflare Dashboard, buka **Workers & Pages → Workers → Create → Connect to Git** (atau pilih Worker yang sudah dibuat), lalu hubungkan repository GitHub.
3. Pada **Worker → Settings → Builds**, atur:
   - Root directory: kosongkan bila repository ini berada di root; isi path hanya untuk monorepo.
   - Build command: `npm run build`.
   - Deploy command: `npx wrangler deploy`.
   - Preview command: `npx wrangler preview`.
   - Production branch: `main` (atau nama branch production Anda).
4. Aktifkan Preview Builds. Buat/push branch non-production seperti `preview-stage3`; gunakan URL Preview Cloudflare untuk melihat hasil tanpa mempromosikan branch tersebut ke production.
5. Pada **Worker → Settings → Variables and Secrets**, isi nilai runtime untuk environment Preview terlebih dahulu. Setelah preview lolos, isi Production dengan nilai yang sama/yang sesuai.
6. Tambahkan secret berikut sebagai **Secret**, bukan variable publik: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, dan `ADMIN_SESSION_SECRET` (minimal 32 byte acak). Tambahkan `SUPABASE_STORAGE_BUCKET=astro` dan `SITE_ORIGIN=https://domain-anda` sebagai variable biasa bila diperlukan.
7. Simpan konfigurasi dan push commit pada branch preview. Workers Builds akan menjalankan build serta membuat preview. Jangan sambungkan branch preview ke domain production.

`wrangler.json` sudah memakai entry point resmi adapter Astro modern, `@astrojs/cloudflare/entrypoints/server`, mengaktifkan `nodejs_compat`, dan mengikat aset dari `./dist` melalui `ASSETS`. Versi Node cloud build dipatok melalui `.nvmrc` (`24.22.1`); versi npm dipilih lewat `packageManager` di `package.json`.

Untuk pengembangan lokal saja, isi `.env` dan jalankan `npm install` lalu `npm run dev`. Untuk deployment melalui Workers Builds, `.env` tidak perlu diunggah dan npm tidak perlu dijalankan dari perangkat Anda. Cloudflare Workers Builds tetap menjalankan package manager di lingkungan cloud untuk membangun source Astro.

### 6. Masuk dan mengganti password admin

- URL panel: `/pengembang/admin`.
- Login dibandingkan di server dengan `ADMIN_PASSWORD`; percobaan dibatasi 5 kali per IP per 5 menit melalui tabel rate-limit Supabase (fingerprint IP memakai HMAC server; IP mentah tidak disimpan). Tambahkan juga aturan rate-limit Cloudflare WAF sebagai lapisan luar.
- Sesi disimpan di cookie `HttpOnly`, `SameSite=Strict`, dan ditandatangani HMAC memakai `ADMIN_SESSION_SECRET`. Masa berlaku sesi maksimum 8 jam.
- Ubah `ADMIN_PASSWORD` di `.env` lokal atau Environment Variables Cloudflare, lalu restart/redeploy. Disarankan mengganti `ADMIN_SESSION_SECRET` bersamaan agar semua sesi lama tidak berlaku.
- Pastikan password kuat dan jangan membagikannya. Panel memiliki operasi tambah/edit/hapus anggota dan upload media. Endpoint admin memeriksa sesi; URL API tidak dapat digunakan hanya dengan mengetahui alamatnya.

### 7. CMS: modul dan batasan yang diketahui

Dashboard `/pengembang/admin` menyediakan dashboard ringkasan, CRUD anggota, galeri, konten global, koleksi guru/keahlian, pengaturan section, tampilan, navigasi, SEO per halaman, media library, backup, dan pemulihan revisi. Rincian integrasi setiap modul tersedia di `docs/CMS-IMPLEMENTATION.md`.

Halaman publik tetap memakai fallback dari `src/data/G.json` ketika Supabase tidak tersedia. Referensi lama `/assets/...` yang sudah tidak tersedia dinetralkan agar tidak menghasilkan request 404.

Pengaturan identitas, hero, visi-misi, statistik, prestasi, wali kelas, profil developer, TKJ, sosial media, footer, dan tampilan disimpan di JSONB `site_settings`. Data anggota, guru, keahlian, dan galeri tetap memakai tabel relasional yang sudah ada. Metadata SEO per halaman, navigasi, section, media, revisi, dan aktivitas menggunakan tabel tambahan dari migration CMS.

Media library menampilkan metadata `media_assets` dan mencoba menemukan objek Storage lama yang belum terindeks. Angka ukuran yang ditampilkan adalah total file yang berhasil dibaca/diindeks, bukan kuota total bucket Supabase. Backup JSON tidak berisi binary media; file media tetap berada di Supabase Storage.

Perubahan konten global dan halaman SEO disimpan melalui transaksi database beserta snapshot revisi. Panel SEO mendukung draft terpisah dan preview khusus admin. Revisi konten dapat dipulihkan dari menu Sistem. Penggantian password admin tetap mengikuti mekanisme `ADMIN_PASSWORD` melalui environment variable; form ganti password mandiri belum tersedia.

### 8. Perubahan pada `astro.config.mjs`

Sebelumnya proyek tidak memasang adapter server dan menggunakan konfigurasi build tanpa server output. Refactor ini mengubah konfigurasi menjadi:

- `output: 'server'` agar halaman dapat membaca data Supabase saat request dan route API dapat berjalan.
- `adapter: cloudflare()` dari `@astrojs/cloudflare` untuk deployment Cloudflare.
- `site`, `compressHTML`, dan nama folder aset build `_astro` tetap dipertahankan.

Perubahan ini membuat halaman Astro berjalan melalui server runtime Cloudflare, bukan seluruh halaman dihasilkan sebagai static-only output. File statis di `public/` tetap disajikan sebagai aset statis.

## Daftar file refactor (untuk review diff)

### Diubah

- `.gitignore` — mengabaikan dependency/build/cache lokal, environment, dan file sementara.
- `astro.config.mjs` — mengaktifkan server output dan adapter Cloudflare.
- `package.json` — memakai `@astrojs/cloudflare`, `@supabase/supabase-js`, dan script migrasi/upload media.
- `public/offline.html` — mencoba memakai logo global dari API settings, fallback ke file statis lama.
- `public/audio-player.html` — menggunakan URL audio global dari API settings saat tersedia.
- `src/components/Header.astro` — mengambil logo dan tahun ajaran melalui data-access.
- `src/components/LogoLightbox.astro` — memakai URL logo global.
- `src/components/Footer.astro` — mengambil pengaturan situs dan tautan sosial melalui data-access.
- `src/layouts/Layout.astro` — mengambil metadata/OG settings melalui data-access.
- `src/pages/anggota.astro` — mengambil anggota dari data-access dan menyematkan payload aman untuk script browser.
- `src/pages/galeri.astro` — mengambil galeri dari data-access.
- `src/pages/index.astro` — mengambil statistik dan guru dari data-access.
- `src/pages/keahlian.astro` — mengambil skills dari data-access.
- `src/pages/pengembang.astro` — mengambil profil/skills dari data-access.
- `src/pages/struktur.astro` — mengambil struktur organisasi dari data-access.
- `src/pages/tkj.astro` — mengambil konten jurusan dari data-access.
- `src/scripts/anggota.js` — membaca JSON hasil render server, tidak lagi mengimpor data fallback secara langsung ke browser.
- `src/scripts/beranda.js` dan `src/scripts/alat.js` — mengambil slogan dari DOM hasil render server, bukan dari import JSON di client.
- `src/scripts/pengaturan.js` — diganti compatibility stub karena dataset duplikat legacy sudah dipensiunkan; fallback tunggal tetap `src/data/G.json`.

### Ditambahkan

- `.env.example` — nama variabel yang perlu diisi, tanpa nilai rahasia.
- `README.md` — panduan setup dan daftar perubahan.
- `docs/AUDIT.md` — catatan audit hardcoded data dan referensi media.
- `migrations/schema.sql` — skema Postgres/Supabase dan instruksi bucket.
- `scripts/migrate-data.mjs` — generator seed SQL dan manifest media.
- `src/env.d.ts` — deklarasi tipe environment variable.
- `src/lib/supabase.ts` — inisialisasi server-side Supabase client.
- `src/lib/data.ts` — query `getSettings`, `getAnggota`, `getGaleri`, `getSiteData` dan fallback lokal.
- `src/lib/admin-auth.ts` — verifikasi password dan cookie sesi HMAC.
- `src/pages/api/admin/login.ts` — endpoint login admin.
- `src/pages/api/admin/logout.ts` — endpoint logout admin.
- `src/pages/api/admin/anggota.ts` — API list/create/update/delete anggota.
- `src/pages/api/admin/media.ts` — API upload foto/galeri/logo/audio ke Supabase Storage.
- - `src/pages/api/public/settings.ts` — API publik terbatas untuk URL media global.
- `src/pages/pengembang/admin.astro` — UI panel admin.
- `migrations/seed.generated.sql` — seed SQL hasil generator pada snapshot data saat refactor.
- `migrations/media-manifest.json` — daftar media dan status file pada snapshot arsip.

File asli lain dipertahankan; tidak ada folder source asli yang sengaja dihapus. Folder `public/assets/*` dan file `src/data/G.json` tetap ada agar fallback dan struktur lama tidak hilang.

## Implementasi CMS tambahan (1 November 2026)

Paket perubahan CMS ini menambahkan migration `migrations/20261101_cms.sql`, panduan `docs/CMS-IMPLEMENTATION.md`, editor dashboard modular, endpoint admin konten/navigasi/section/SEO/media/backup/revisi, dan integrasi halaman publik. Terapkan migration CMS satu kali sebelum login ke dashboard versi baru. Versi dependency utama dipatok secara eksplisit pada `package.json`. Cloud build memasang dependency dari versi top-level yang dipatok di `package.json`. Untuk build yang sepenuhnya reproducible, hasilkan dan commit `package-lock.json` melalui Workers Builds/CI sebelum rilis final.

## Domain produksi

Origin publik proyek berasal dari `SITE_ORIGIN` (opsional) atau origin request aktif saat SSR. Isi `SITE_ORIGIN` dengan origin HTTPS domain production pada Cloudflare bila ingin canonical selalu menunjuk ke domain utama. Tidak ada placeholder domain yang ditanam di source. Canonical URL runtime, `robots.txt`, dan `sitemap.xml` memakai helper origin yang sama; `astro.config.mjs` menormalkan `SITE_ORIGIN` terpisah saat build.

## Cloudflare

Proyek menggunakan output server Astro dengan adapter Cloudflare dan `wrangler.json` untuk Workers. Deploy via Workers Builds agar instalasi dan build dilakukan di cloud; file `.env` lokal tidak boleh di-commit.

## Tahap 3 — CI, draft, thumbnail, dan audit log

Implementasi Tahap 3 dijelaskan di `docs/STAGE3.md`. Sebelum deploy, jalankan migration tambahan `migrations/20261103_stage3_workflow.sql`, lalu `migrations/20261103_stage3_hardening.sql` di Supabase (urutannya wajib; hardening menambahkan rate-limit login dan RPC transaksional). GitHub Actions menjalankan Astro check, unit test Vitest, dan production build secara otomatis; workflow validasi tersebut tidak melakukan deploy Cloudflare. Workers Builds menjalankan build/deploy ketika commit didorong ke branch yang dikonfigurasi.

Panel SEO kini menyimpan perubahan sebagai draft, menyediakan pratinjau hanya untuk sesi admin yang valid, dan memisahkan publikasi dari penyimpanan draft. Media library membuat thumbnail WebP opsional untuk preview admin. Riwayat aktivitas lengkap tersedia pada panel Sistem melalui endpoint audit terautentikasi.

## Media lokal

`assets.local-backup/` adalah arsip lokal, bukan aset publik. Jangan memindahkannya kembali ke `public/`. Upload media menggunakan `npm run media:upload` atau `node --env-file=.env scripts/upload-media.mjs [path-manifest.json]`.

## PWA dan keamanan

`public/_headers` menyediakan header untuk aset statis; `src/middleware.ts` menerapkan CSP dan header keamanan yang sama pada respons SSR/API, serta memaksa admin/API dan preview tidak di-cache. Service worker juga melewati cache untuk admin/API/preview; cache aset `_astro` dibatasi.
