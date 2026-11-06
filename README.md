# Website TKJ XII-9 — SMK Muhammadiyah Belitang

Website kelas dengan CMS admin sendiri.
Stack: Astro 7 (SSR) · Cloudflare Workers · Supabase (database + storage) · PWA.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm install` | Pasang dependensi |
| `npm run dev` | Jalankan lokal |
| `npm run validate` | `astro check` + tes + build |
| `npm run deploy` | Deploy ke Cloudflare (`wrangler deploy`) |
| `npm run migrate:data` | Migrasi data awal ke Supabase |
| `npm run media:upload` | Unggah media dari manifest ke Supabase Storage |

## Environment variable

Salin `.env.example` menjadi `.env` untuk lokal. Di Cloudflare, isi sebagai variable/secret.

| Nama | Keterangan |
| --- | --- |
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_KEY` | Service-role key (rahasia, hanya API admin/server) |
| `SUPABASE_ANON_KEY` | Publishable/anon key untuk pembacaan publik yang dibatasi RLS |
| `SUPABASE_STORAGE_BUCKET` | Nama bucket, default `astro` |
| `ADMIN_PASSWORD` | Password login admin |
| `ADMIN_SESSION_SECRET` | Rahasia sesi, minimal 32 karakter |
| `SITE_ORIGIN` | (opsional) domain kanonik, mis. `https://domain-anda` |

## Struktur singkat

- `src/pages/` — halaman publik, `pengembang/admin.astro` (panel admin), `api/admin/*` (API CMS)
- `src/lib/` — auth admin, akses data Supabase, validasi
- `src/data/G.json` — data fallback bila Supabase tidak terjangkau
- `public/sw.js` — service worker (cache offline)
- Beranda menampilkan visi, misi, motto, dan prestasi dari CMS (`G.visi`, `G.misi`, `G.motto`, `G.prestasi`)
- `tests/` — tes unit dan `supabase-cms-rpc-smoke.sql` (smoke test RPC, rollback-only)

## Catatan

- Bila data Supabase gagal dibaca, situs memakai `G.json` dan mencatat penyebabnya di log Cloudflare (`[data:...]`).
- `migrations/0001_baseline.sql` merekonstruksi skema live (tabel, index, RLS, RPC, dan bucket `astro`) untuk project kosong. `0002_home_section_controls.sql`, `0003_public_read_only_rls.sql`, dan `0004_gallery_metadata_from_caption.sql` adalah migrasi aditif yang telah diterapkan di project aktif.
- Halaman publik memakai `SUPABASE_ANON_KEY` + policy RLS. Draft preview admin dan seluruh API mutasi tetap memakai `SUPABASE_SERVICE_KEY`. Isi kedua variable tersebut di Cloudflare Workers sebelum deploy; jangan pernah memasukkan service key ke kode/browser.
- Admin: `/pengembang/admin`. Login dibatasi 5 percobaan per 5 menit per IP.
