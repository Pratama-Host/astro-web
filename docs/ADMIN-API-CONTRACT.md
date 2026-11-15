# Kontrak API admin — 14 November 2026

Semua route di bawah berada di `/api/admin/*`. Middleware menetapkan `private, no-store` untuk API admin, dan seluruh route mutasi memeriksa sesi admin serta validasi Origin same-origin melalui `isAdminRequest`. Metode mutasi tanpa `Origin` atau dengan Origin lintas domain ditolak. `GET` tidak memerlukan header Origin, tetapi tetap membutuhkan cookie sesi admin.

Session cookie: `tkj_admin_session`, signed HMAC-SHA256, TTL 8 jam, `Path=/`, `HttpOnly`, `SameSite=Strict`, dan `Secure` saat production. `ADMIN_SESSION_SECRET` minimal 32 byte. Login memerlukan `ADMIN_PASSWORD`, request JSON maksimum 2 KiB, dan rate limit server-side 5 attempt/300 detik per HMAC hash IP yang memakai secret session. IP mentah tidak disimpan sebagai identifier login limiter.

## Route matrix

| Endpoint | Method | Body limit | Query/list bound | Side effect dan validasi utama |
|---|---|---:|---|---|
| `/login` | POST | 2 KiB | — | Origin wajib same-origin; password server-side; rate limit; set cookie |
| `/logout` | POST | Tidak ada | — | Origin wajib same-origin; clear cookie |
| `/anggota` | GET | — | 500 | Sesi admin; daftar anggota admin |
| `/anggota` | POST | 128 KiB | — | JSON; NIS/nama wajib untuk jalur admin; skills, visible, social dan referensi media divalidasi |
| `/anggota` | PUT | 128 KiB | — | JSON; validasi record dan collision key NIS; update existing |
| `/anggota` | DELETE | 8 KiB | — | JSON + `confirm: true`; penghapusan berdasarkan NIS internal |
| `/announcements?type=announcements\|agenda` | GET | — | 200 | Kolom explicit; jenis harus valid |
| `/announcements?type=announcements\|agenda` | POST | 16 KiB | — | Create/update; UUID, status, tanggal, URL HTTP(S), batas field |
| `/audit` | GET | — | limit 1–100, offset 0–100.000 | Filter entity/action/query; urutan terbaru; ringkas tanpa secret |
| `/backup` | GET | — | Maks 20 MiB hasil export | RPC export server-only; unduhan JSON no-store |
| `/backup` | POST | 20 MiB | 100.000 row/collection | `confirm: true`; schema/media path/URL/domain validation; RPC restore atomik dan upsert-only; cache purge sukses |
| `/cms` | GET | — | media index hingga 100.000, Storage scan hingga 10.000 | Status/count aggregate, warning untuk scan yang gagal/terpotong |
| `/collections?type=...` | GET | — | 100 | Jenis collection allowlisted |
| `/collections?type=...` | PUT | 256 KiB | Maksimum 100 item | Collection replace lewat RPC dan audit |
| `/content` | GET | — | satu `site_settings` row | Status konten/settings |
| `/content` | PUT | 128 KiB | — | JSON + merge/URL validation; save atomik; purge HTML cache |
| `/drafts?slug=...` | GET | — | satu draft | Sesi admin |
| `/drafts` | PUT | 128 KiB | satu slug | Simpan draft; validasi slug, SEO dan content size maksimum 100 KB |
| `/drafts` | POST | 8 KiB | — | Operasi publish/discard yang diizinkan; publish mem-purge cache |
| `/gallery` | GET | — | 500 | Daftar galeri admin |
| `/gallery` | PUT | 32 KiB | satu UUID | Update metadata item |
| `/gallery` | DELETE | 8 KiB | satu UUID | Delete/cleanup sesuai route contract |
| `/media` | GET | — | Maks 10.000 objek | Pagination internal 1.000; warning jika terpotong/gagal |
| `/media` | POST | 22 MiB body, 20 MiB file | satu upload/request | Magic-byte/MIME/extension/path validation; SVG ditolak; Storage dan index metadata |
| `/media` | PATCH | 8 KiB | — | Metadata/global asset operation yang diizinkan |
| `/media` | DELETE | 8 KiB | — | Konfirmasi dan pemeriksaan referensi sebelum delete |
| `/navigation` | GET | — | 100 | Sesi admin |
| `/navigation` | PUT | 32 KiB | Maksimum 15 | Validasi href/icon/order dan RPC replace atomik |
| `/pages` | GET | — | 100 | Daftar halaman CMS |
| `/pages` | PUT | 128 KiB | satu slug | Slug allowlist, noindex, OG image, konten maksimum 100 KB; revision dan cache purge |
| `/revisions?slug=...` | GET | — | 30 revisi | Halaman/slug terbatas, kolom explicit |
| `/revisions` | POST | 8 KiB | satu UUID | Konfirmasi restore revisi; snapshot keadaan sebelumnya; no-store |
| `/sections` | GET | — | 100 | Metadata section admin |
| `/sections` | PUT | 32 KiB | Maksimum 50 | Page/section allowlist, duplikat ditolak, RPC replace dan audit |

Batas berasal dari source saat ini; `Content-Length` tidak dijadikan satu-satunya ukuran: helper membaca stream dan membatasi byte aktual pada endpoint yang menggunakan `readJsonRequest`/`readRequestBytes`.

## Kontrol bersama dan pengecualian

- `src/middleware.ts` menerapkan security headers, `no-store` untuk halaman admin, API admin dan API privat, serta `X-Robots-Tag: noindex, nofollow` untuk admin/preview.
- Endpoint admin memakai server-side Supabase client; service-role key tidak boleh diekspos ke browser. RLS/grants tetap menjadi defense-in-depth.
- Error API dibuat generik pada beberapa route untuk menghindari bocornya pesan internal provider/database. Detail operasional tetap di log server, bukan response publik.
- `logCmsAction` membuat audit log secara best-effort lalu mencoba purge `site-html`. Mutasi langsung yang melewati helper (mis. content/page/restore/draft publish) memiliki purge eksplisit. Audit failure tidak membatalkan mutasi yang sudah berhasil; periksa log server bila audit tidak masuk.
- `GET /api/admin/cms` menghitung sebagian tabel untuk overview; announcements/agenda tidak masuk pada kartu count overview saat ini.
- Batas list bukan pagination UI universal. Jika row melewati cap, admin harus memberi warning atau menambah pagination sebelum volume mendekati batas.
- `anggota.nis` adalah identifier internal: hanya jalur admin terautentikasi yang membutuhkannya; jangan memasukkannya ke halaman/API publik, sitemap, logs atau dokumentasi.

## Verifikasi yang belum dilakukan

Kontrak ini dibangun dari source ZIP, bukan hasil runtime. Belum ada tes HTTP integration/E2E, pemeriksaan header di deployed Worker, atau browser exercise. Label: **CODED / SOURCE-AUDITED; NEEDS_RUNTIME + NEEDS_BROWSER + NEEDS_DEPLOY**.
