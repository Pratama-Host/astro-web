# Roadmap & Status Pengembangan Website TKJ XII-9
**SMK Muhammadiyah Belitang — Kelas XII Teknik Komputer dan Jaringan**

> Dokumen ini diperbarui secara berkala sebagai panduan pengembangan dan serah terima (handover) antar developer maupun AI assistant.

---

## 📌 Ringkasan Stack & Lingkungan Kerja
- **Framework:** Astro 7.4.5 SSR (`@astrojs/cloudflare` v14.4.4)
- **Backend & Storage:** Supabase (`@supabase/supabase-js` v2.118.0) dengan fallback otomatis ke `src/data/G.json`
- **Testing:** Vitest 5.1.0 (`cmd.exe /c npm test`)
- **Status Build:** `npm run check` (0 errors), `npm test` (29 passed), `npm run build` (Clean & verified)

---

## ✅ Progres Terkini (Selesai Dikerjakan)

### 1. Fondasi & DX (Fase 1)
- [x] Verifikasi Node.js v26.13.0, npm 11.20.0, dan integritas `package-lock.json`.
- [x] Test suite ekspansi: `tests/data-navigation.test.ts` (total 29 unit test aktif dan lolos).
- [x] Pembersihan type warnings TypeScript di komponen inti (`Layout.astro`, `Footer.astro`, `GlobalClock.astro`, `anggota.astro`).

### 2. Optimasi Desktop, SEO & Breadcrumbs (Fase 2 & 3)
- [x] **Header Desktop:** Navigasi desktop lengkap (`.nav-desktop`) dengan auto-detect rute aktif dan brand link ke `/`.
- [x] **Jam Global:** Pemindahan `GlobalClock` ke posisi desktop non-obstruktif di pojok kiri bawah.
- [x] **Filter & Pencarian Anggota:**
  - Input pencarian real-time nama, NIS, dan peran.
  - Filter pills kategori: *Semua*, *Pengurus Kelas*, *Foto Asli*, *Voice Note*.
  - Dropdown sortir: *Urutan Presensi*, *Nama (A - Z)*, *Nama (Z - A)*, *NIS (Terkecil/Terbesar)*.
  - Mode tampilan toggle: *Grid View* (kartu foto) vs *Compact List View* (baris rapi) tersimpan di `localStorage`.
- [x] **Breadcrumbs SEO:** Komponen `Breadcrumbs.astro` dengan metadata Schema.org `BreadcrumbList` (JSON-LD) aktif di halaman `/anggota`, `/struktur`, `/galeri`, `/keahlian`, dan `/tkj`.
- [x] **Ikon Bawaan:** Tambahan path SVG untuk `grid`, `list`, dan `filter` di `Icon.astro`.

---

## 🚀 Antrean Berikutnya (Next Tasks)

### Fase 4 — Fitur Interaktif & Modul Akademik (TARGET BERIKUTNYA)
1. **Mading Digital / Modul Pengumuman Kelas:**
   - Menampilkan agenda ujian kompetensi, sertifikasi Mikrotik (MTCNA) / Cisco (CCNA), jadwal piket, dan pengumuman wali kelas.
   - Menyediakan fallback data di `src/data/G.json` di bawah kunci `"pengumuman"` serta query Supabase jika tabel tersedia.
2. **Agenda Akademik & Kalender Praktik:**
   - Ringkasan tanggal penting semester, jadwal PKL (*Praktik Kerja Lapangan*), dan ujian kelulusan.
3. **Showcase Proyek Praktikum TKJ:**
   - Menampilkan portofolio karya konfigurasi lab siswa (Packet Tracer, Debian/Ubuntu Server, Mikrotik routing).

### Fase 5 — Keamanan & CMS Hardening
1. Otentikasi admin CMS berbasis JWT / Supabase Auth.
2. Proteksi CSRF & Rate limiting pada endpoint `/api/admin/*`.
3. Tampilan visual riwayat revisi dan tombol rollback instan.

### Fase 6 — PWA & Mobile Experience
1. Offline background synchronization.
2. Web push notification untuk pengumuman mendesak.

---

## 🤖 Handover Prompt (Salin untuk AI Lain)

```markdown
Lanjutkan pengembangan website kelas TKJ XII-9 SMK Muhammadiyah Belitang (Astro 7 SSR + Cloudflare Workers + Supabase).

Status saat ini:
- Fase 1, 2, dan 3 telah selesai (Header desktop, filter/sort/view-mode di /anggota, Breadcrumbs JSON-LD di semua sub-halaman, 29/29 tests pass).
- File panduan lengkap ada di `ROADMAP.md` di root proyek.

Tugas selanjutnya:
Kerjakan **FASE 4: Modul Pengumuman / Mading Digital Kelas & Agenda Akademik**:
- Buat komponen pengumuman kelas (ujian, sertifikasi Mikrotik/Cisco, agenda kelas).
- Sertakan fallback di `src/data/G.json`.
- Pastikan `npm test` dan `npm run build` tetap lolos 100%.
```
