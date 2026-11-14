# Roadmap Pengembangan — Website TKJ XII-9

**Repositori:** `Pratama-Host/astro-web`  
**Tujuan:** peta kerja yang dapat dijalankan AI dengan mengubah source, tes, dokumentasi, dan migrasi Supabase.  
**Prinsip eksekusi:** kerjakan satu tugas terukur per perubahan; baca kode dan keadaan database sebelum mengubahnya; jangan mengklaim test/build/deploy berhasil tanpa hasil eksekusi yang tercatat.

---

## Cara menggunakan roadmap ini

Setiap butir adalah tiket kerja AI dengan empat bagian: **sasaran**, **file/objek**, **langkah**, dan **kriteria selesai**. Tugas yang bisa dilakukan secara statis dikerjakan pada repository. Tugas Supabase dapat dikerjakan langsung hanya bila sesi AI memiliki koneksi database yang terotorisasi; jika tidak, AI menyiapkan migrasi/query dan menandainya menunggu eksekusi. Pekerjaan Cloudflare, browser manual, pengujian perangkat, backup off-site, dan restore operasional tetap ditandai sebagai verifikasi lingkungan, bukan dianggap selesai dari perubahan kode.

### Batas aman mutlak

- Jangan menjalankan baseline `supabase/migrations/20261106000100_baseline.sql` pada database yang sudah berisi data.
- Jangan menghapus, mengubah, atau menulis ulang migration historis yang sudah diterapkan. Perbaikan schema dibuat sebagai migration baru, aditif dan aman diulang.
- Sebelum mutasi Supabase: identifikasi project yang benar, baca schema/migration history dan definisi RPC terkini, ekspor backup CMS, dan pastikan target bukan production kecuali instruksi secara eksplisit mengizinkan.
- Jangan memasukkan data pribadi siswa, secret, token, atau payload backup ke log, issue, commit, atau laporan.
- SQL smoke test harus transaction-scoped dan diakhiri `ROLLBACK`; jangan menambah tes destruktif atau mengubah data nyata untuk pengujian.
- “Sudah ditulis” tidak sama dengan “sudah dijalankan”; pisahkan status kode, migrasi, tes, dan verifikasi eksternal.

### Label

- **P0 — integritas:** berpotensi kehilangan data, ketidakcocokan schema, atau kebocoran data.
- **P1 — keandalan:** mengurangi regresi dan kegagalan operasional.
- **P2 — kualitas/fitur:** pengalaman, performa, dan pemeliharaan setelah pagar pengaman tersedia.
- **Status:** `Belum dikerjakan`, `Dikerjakan`, `Menunggu akses`, atau `Selesai + bukti`.

---

# P0 — Integritas data dan kesesuaian Supabase

## DB-01 — Buat peta keadaan migration dan schema
**Status: Belum dikerjakan · Prioritas: P0**

**Sasaran:** mengetahui secara faktual migrasi mana yang sudah terpasang dan apakah schema aktif sesuai source.

**Sasaran file:** seluruh `supabase/migrations/*.sql`; `supabase/config.toml`; `docs/AUDIT.md`; `docs/RECONCILIATION-2026-11-13.md`.

**Langkah AI:**
1. Inventarisasi versi migration di Git dan bandingkan dengan tabel histori migration Supabase.
2. Bandingkan tabel, kolom, constraint, index, function/RPC, policy RLS, privilege, bucket, dan limit Storage dengan schema aktif.
3. Periksa migration bernama mirip: `20261109000100`/`20261113130505`, `20261109000200`/`20261113130520`, dan `20261109000300`/`20261113130543`.
4. Tentukan berdasarkan isi dan migration history, bukan nama saja, apakah file lama merupakan percobaan, duplikasi, atau perubahan yang masih diperlukan.
5. Jangan mengubah histori migration. Tulis hasil perbandingan, mismatch, dan tindakan aman selanjutnya.

**Kriteria selesai:** `docs/DATABASE-STATE.md` berisi tabel versi Git vs versi aktif, hasil schema check per objek, mismatch beserta tingkat risiko, dan instruksi provisioning bersih. Tidak ada migration yang dijalankan ulang hanya untuk “menyamakan” keadaan.

## DB-02 — Pastikan backup CMS mencakup domain pengumuman dan agenda
**Status: Belum dikerjakan · Prioritas: P0 · Dependensi: DB-01**

**Temuan awal:** API backup memvalidasi tabel `anggota`, `galeri`, `guru`, `skills`, halaman, draft, navigasi, section, media, revisi, dan audit. Daftar pada `src/pages/api/admin/backup.ts` tidak mencantumkan `announcements` maupun `agenda_events`. Migration modul pengumuman/agenda juga perlu dicocokkan dengan definisi RPC `export_tkj_cms_backup()` dan `restore_tkj_cms_backup()` yang benar-benar aktif. Jangan menyimpulkan fungsi database telah mencakup tabel baru tanpa memeriksa definisinya.

**Sasaran file/objek:** `src/pages/api/admin/backup.ts`; baseline dan migration pengumuman; definisi aktif `public.export_tkj_cms_backup()` dan `public.restore_tkj_cms_backup(jsonb)`; `supabase/smoke/cms-rpc-smoke.sql`; tes backup.

**Langkah AI:**
1. Baca definisi RPC aktif dan bentuk bundle backup aktual menggunakan akses Supabase yang tersedia, tanpa menampilkan payload privat.
2. Tentukan kebijakan apakah konten pengumuman/agenda ikut dalam backup admin CMS. Default roadmap: **ya**, sebab merupakan konten CMS yang dapat diedit dan hilang saat restore akan mengejutkan operator.
3. Jika fungsi belum mencakup dua tabel: buat migration baru yang memperbarui export dan restore secara transaksional, mempertahankan kompatibilitas format/version bundle, validasi isi, dan izin eksekusi hanya untuk service role.
4. Selaraskan `TABLES`, validasi payload, batas baris, serta pesan error API. Pastikan restore tidak menghapus data yang tidak ada di bundle tanpa kebijakan eksplisit.
5. Tambah pemeriksaan SQL rollback-only untuk round-trip data uji kedua tabel dan privilege RPC. Tambah tes validator untuk payload sah/tidak sah.
6. Bila fungsi database dan kode berbeda versi, susun urutan deploy kompatibel: schema/RPC aditif lebih dulu, aplikasi sesudahnya.

**Kriteria selesai:** ekspor memuat kedua tabel; restore mengembalikan record secara atomik; payload salah ditolak; akses publik ke RPC tetap ditolak; tes rollback menguji ekspor dan restore tanpa mengubah data setelah tes selesai. Catat versi format dan kompatibilitasnya.

## DB-03 — Uji migration berulang dan provisioning database kosong
**Status: Belum dikerjakan · Prioritas: P0 · Dependensi: DB-01**

**Sasaran:** memastikan project baru dan upgrade project lama mengikuti alur yang sama-sama dapat dipahami.

**Sasaran:** baseline hanya untuk database kosong; seluruh migration lanjutan harus mempunyai perilaku yang didokumentasikan untuk database sesuai versi sumber.

**Langkah AI:**
1. Gunakan project/database disposable, bukan database produksi.
2. Terapkan baseline dan migration secara berurutan hanya pada project kosong yang disiapkan untuk pengujian.
3. Untuk upgrade, gunakan salinan disposable dengan schema versi sebelum migration yang diuji.
4. Periksa hasil akhir berdasarkan query pemeriksaan objek dan `supabase/smoke/anon-access-smoke.sql` serta `supabase/smoke/cms-rpc-smoke.sql`.
5. Perbaiki migration baru yang tidak idempotent atau tidak memenuhi urutan, bukan mengedit histori yang sudah diterapkan.

**Kriteria selesai:** ada catatan perintah/urutan, versi schema sumber/tujuan, hasil pemeriksaan, dan perbedaan yang ditemukan. Jangan tulis “berhasil” bila hanya membaca SQL secara statis.

## DB-04 — Perkuat tes backup dan akses publik
**Status: Belum dikerjakan · Prioritas: P0 · Dependensi: DB-02**

**Sasaran file:** `supabase/smoke/anon-access-smoke.sql`, `supabase/smoke/cms-rpc-smoke.sql`, `tests/supabase-cms-rpc-smoke.sql`, `tests/public-data-policy.test.ts`.

**Langkah AI:**
- Pastikan smoke test mencakup visibilitas anon untuk anggota, galeri, pengumuman, dan agenda; akses tertolak ke NIS, draft, revisi, audit, login attempts, serta fungsi backup/restore.
- Tambahkan assertion eksplisit bahwa `anon`/`authenticated` tidak memiliki write privileges pada tabel aplikasi, bukan hanya komentar “jalankan satu per satu”.
- Uji keadaan pengumuman: draft, archived, scheduled, expired, published live; uji agenda: draft, archived, published, masa lalu/mendatang.
- Hindari mengembalikan data pribadi dari hasil query tes; cukup hasil boolean/count agregat.

**Kriteria selesai:** SQL test gagal bila kebijakan publik melemah atau data privat bocor; seluruh mutation tes di-rollback; hasil tidak memuat data siswa.

---

# P1 — Keandalan alur CMS dan rilis

## APP-01 — E2E alur admin dan publikasi
**Status: Belum dikerjakan · Prioritas: P1**

**Sasaran:** menutup celah antara tes helper dan interaksi nyata halaman admin.

**Sasaran file:** `src/pages/pengembang/admin.astro`; `src/scripts/admin/*.js`; `src/pages/api/admin/*.ts`; `src/pages/pengumuman.astro`; konfigurasi test dan dependency E2E bila disetujui.

**Langkah AI:**
1. Tambahkan E2E dengan database/fixture lokal terisolasi, bukan akun dan data produksi.
2. Uji login/logout, sesi invalid, create/edit/publish/archive pengumuman, create/edit agenda, dan tampil/tidak tampil di halaman publik.
3. Uji media upload valid, signature mismatch, tipe ditolak, batas ukuran, thumbnail gagal, serta perlindungan penghapusan aset yang masih dipakai.
4. Uji draft preview: perlu sesi admin, respons `no-store`, tidak terindeks, dan tidak pernah masuk cache service worker.
5. Gunakan fixture deterministik dan jam tetap untuk aturan jadwal.

**Kriteria selesai:** E2E menguji jalur sukses dan kegagalan utama tanpa menulis ke Supabase live; ada instruksi pelaksanaan; hasil eksekusi hanya dicatat setelah benar-benar dijalankan.

## APP-02 — Konsistensi kontrak API admin
**Status: Belum dikerjakan · Prioritas: P1**

**Temuan:** endpoint berbagi helper `isAdminRequest`, `readJsonRequest`, dan `logCmsAction`, namun keseragaman format error, no-store, validasi body, serta penanganan error database perlu dibuktikan lintas route.

**Sasaran file:** semua `src/pages/api/admin/*.ts`, `src/lib/admin-auth.ts`, `src/lib/cms-admin.ts`, tes API.

**Langkah AI:**
- Buat tabel kontrak per route: method, otorisasi, Origin, ukuran body, schema input, status sukses/error, cache policy, audit, serta invalidasi cache.
- Refaktor hanya pola berulang yang benar-benar ditemukan; jangan membuat abstraksi besar sebelum kebutuhan lintas route terkonfirmasi.
- Tambah tes bahwa seluruh respons admin—termasuk error dan 401—memiliki `Cache-Control: no-store`.
- Periksa batas body berdasarkan stream, bukan hanya `Content-Length`.
- Pastikan kegagalan audit/cache tidak mengubah hasil mutasi menjadi seolah rollback; dokumentasikan sifat best-effort.

**Kriteria selesai:** kontrak route terdokumentasi dan teruji; tidak ada endpoint admin mutasi yang melewati autentikasi/Origin atau validasi server.

## APP-03 — Perbaiki pencarian dan pengambilan daftar yang bisa tumbuh
**Status: Belum dikerjakan · Prioritas: P1**

**Temuan:** `getPublicAnnouncements()` membatasi 50/100 record dan melakukan pengurutan sebagian di aplikasi; endpoint media memiliki paging/batas, sedangkan daftar admin pengumuman/agenda membatasi 200. Batas tanpa pagination atau pengurutan database yang sesuai dapat menghilangkan record relevan seiring pertumbuhan.

**Sasaran file:** `src/lib/announcements.ts`; `src/pages/api/admin/announcements.ts`; `src/pages/api/admin/media.ts`; UI admin dan halaman publik yang memakai daftar.

**Langkah AI:**
1. Tentukan urutan dan filter yang diinginkan bagi pengumuman pinned/terbaru, agenda mendatang/lampau, dan daftar admin.
2. Pindahkan sorting/filter yang tepat ke query database bila aman dan cocok dengan RLS; tetapkan pagination dengan cursor atau range yang stabil.
3. UI harus memberi status halaman, jumlah hasil, dan keadaan kosong/error; jangan memuat ribuan record sekaligus.
4. Tambahkan tes batas halaman, record terakhir, stabilitas sort, dan filter jadwal.

**Kriteria selesai:** tidak ada record yang diam-diam hilang akibat limit tetap; pagination dan urutan konsisten; batas beban terdokumentasi.

## APP-04 — Verifikasi dan satukan policy media upload
**Status: Belum dikerjakan · Prioritas: P1**

**Temuan:** API upload memakai signature check yang menolak SVG, sedangkan `scripts/upload-media.mjs` mencantumkan MIME SVG. Ini bisa menjadi kebijakan berbeda untuk migrasi tepercaya, tetapi sekarang perbedaannya perlu disengaja, dibatasi, dan dijelaskan.

**Sasaran file:** `src/lib/media-validation.ts`; `src/pages/api/admin/media.ts`; `scripts/upload-media.mjs`; migration batas MIME Storage; tes media dan dokumentasi.

**Langkah AI:**
- Buat satu matriks ekstensi, MIME yang dipaksa, magic-byte validation, kategori, batas byte, dan apakah format boleh diunggah lewat API atau batch migration.
- Pastikan bucket allowlist sesuai format yang benar-benar didukung; jangan menambah SVG tanpa sanitizer SVG tepercaya dan tes yang relevan.
- Batasi path upload batch ke root yang ditentukan dan validasi setiap entry manifest sebelum membaca/unggah.
- Tambahkan mode dry-run dan ringkasan hasil tanpa mencetak credential atau informasi sensitif.
- Pastikan file gagal tidak membuat metadata CMS yang seolah valid.

**Kriteria selesai:** policy API, batch script, bucket, dan tes sejalan atau perbedaannya diberi alasan eksplisit; path manifest tidak dapat keluar dari direktori sumber yang diizinkan.

## APP-05 — Uji fallback dan kegagalan data Supabase
**Status: Belum dikerjakan · Prioritas: P1**

**Sasaran file:** `src/lib/data.ts`; `src/lib/supabase.ts`; `src/lib/announcements.ts`; halaman publik.

**Langkah AI:**
- Tes client tidak terkonfigurasi, query gagal, sebagian query gagal, hasil kosong, dan referensi storage lama.
- Pastikan fallback tidak memasukkan NIS atau aset lokal usang; periksa jalur `getSettings`, `getSiteData`, `getPageContent`, `getPageSEO`, navigasi, dan halaman pengumuman.
- Bedakan keadaan “belum ada konten” dengan “gagal membaca backend” bila UX/admin perlu mengetahuinya, tanpa membocorkan error database ke publik.
- Buat telemetry server yang aman: nama operasi, status, dan correlation ID; jangan log row, payload, URL bertoken, atau data pribadi.

**Kriteria selesai:** kegagalan parsial dan total punya perilaku yang terdokumentasi dan teruji; error terlihat oleh operator tanpa data sensitif masuk log.

---

# P1 — Privasi, aksesibilitas, dan cache

## UX-01 — Audit aksesibilitas halaman publik dan admin
**Status: Belum dikerjakan · Prioritas: P1**

**Sasaran:** modal anggota, menu navigasi, form admin, media library, pengumuman, dan halaman publik.

**Langkah AI:**
- Audit label, heading, landmark, fokus terlihat, urutan tab, keyboard Escape, fokus kembali setelah modal, status/loading/error announcement, dan kontras.
- Periksa `prefers-reduced-motion` terhadap reveal/animasi/canvas.
- Pastikan kontrol yang berperilaku sebagai tombol memakai elemen button, bukan elemen non-interaktif yang diberi `role="button"` bila dapat diperbaiki secara kompatibel.
- Tambahkan tes DOM/E2E untuk perilaku penting.

**Kriteria selesai:** checklist per halaman dan perbaikan prioritas tinggi masuk source; tes keyboard dasar tersedia. Pemeriksaan pembaca layar/perangkat nyata tetap diberi status verifikasi eksternal.

## UX-02 — CSP Report-Only dan pengurangan inline policy
**Status: Belum dikerjakan · Prioritas: P1**

**Sasaran file:** `src/middleware.ts`, `public/_headers`, `src/layouts/Layout.astro`, `public/offline.html`.

**Langkah AI:**
1. Inventarisasi inline script/style, iframe audio, font/CDN, storage, dan seluruh koneksi eksternal.
2. Tambahkan kebijakan Report-Only yang dapat dikonfigurasi untuk pengujian; jangan membuat CSP berbeda antara SSR dan static asset tanpa alasan.
3. Refaktor inline script/style ke file lokal atau mekanisme nonce/hash sesuai dukungan Astro/Cloudflare yang dibuktikan dari konfigurasi.
4. Kurangi wildcard `img-src`/`media-src`/`connect-src` ke origin yang diperlukan.
5. Simpan daftar violation yang sudah dianalisis; baru usulkan penegakan CSP setelah hasil browser tersedia.

**Kriteria selesai:** report-only tidak mematahkan fitur; aturan SSR dan aset statis konsisten; enforcement belum diaktifkan hanya berdasarkan inspeksi source.

## UX-03 — Audit cache Cloudflare dan service worker
**Status: Belum dikerjakan · Prioritas: P1**

**Sasaran file:** `src/middleware.ts`; `src/lib/cms-admin.ts`; `public/sw.js`; `public/_headers`; endpoint publik.

**Langkah AI:**
- Buat tabel kebijakan cache untuk HTML publik, API settings, seluruh admin API, admin page, draft preview, sitemap, robots, aset immutable, offline page.
- Telusuri invalidasi tag `site-html` setelah tiap jenis mutasi publik.
- Perbaiki mismatch antara nama route offline, fallback `/offline`, dan asset/version policy hanya jika dibuktikan oleh source/config.
- Tambahkan tes header untuk response public/private serta tes unit service worker bila lingkungan memungkinkan.

**Kriteria selesai:** tidak ada respons pribadi masuk cache; perubahan konten publik tidak dibiarkan stale melebihi kebijakan yang terdokumentasi; versi SW/cache naik secara sengaja saat perilaku cache berubah.

---

# P2 — Performa dan struktur codebase

## PERF-01 — Ukur sebelum optimasi
**Status: Belum dikerjakan · Prioritas: P2**

**Sasaran:** beranda, anggota, galeri, pengumuman, CMS media.

**Langkah AI statis:** petakan query, field, sort, limit, ukuran data fallback, dan gambar yang dimuat; dokumentasikan hipotesis serta potensi perbaikan. Tambahkan pagination atau query yang lebih hemat hanya bila kebutuhan dan perilaku lama jelas.

**Verifikasi yang perlu runtime:** waktu render, ukuran respons, query latency, gambar/LCP, cache hit, dan penggunaan Worker. Jangan mengklaim peningkatan performa dari refaktor tanpa pengukuran.

**Kriteria selesai:** baseline dan perubahan dapat dibandingkan; optimasi mempertahankan hasil fungsional dan akses publik.

## CODE-01 — Pecah data layer bertahap
**Status: Belum dikerjakan · Prioritas: P2**

**Sasaran file:** `src/lib/data.ts` dan consumer halaman.

**Langkah AI:**
- Petakan fungsi dan dependensi lalu pindahkan satu domain setiap perubahan: mapper, settings, member/gallery, page SEO/content, navigation/sections.
- Pertahankan API publik modul sementara atau ubah seluruh pemanggil dalam perubahan yang sama.
- Ganti `any` pada batas domain yang tersentuh dengan tipe eksplisit; jangan membuat big-bang migration seluruh proyek.
- Uji fallback, pemetaan storage, privasi NIS, dan navigasi setiap kali domain dipindah.

**Kriteria selesai:** modul memiliki tanggung jawab tunggal yang jelas, pemanggil tidak menggandakan aturan, seluruh tes terkait tetap mewakili kontrak lama.

## CODE-02 — Rapikan source dan dokumentasi berdasarkan bukti
**Status: Belum dikerjakan · Prioritas: P2**

**Sasaran file:** `README.md`, `ROADMAP.md`, `CHANGELOG.md`, `docs/*`, `libraries.txt`, `4.zip`, file yang terindikasi tidak dipakai.

**Langkah AI:**
- Cocokkan daftar API, routes, migrasi, fitur CMS, versi runtime, dan batasan backup dengan source terkini.
- Periksa referensi sebelum menyebut file dead code; jangan menghapus aset/cerita/data hanya karena tidak ditemukan dari satu pencarian string.
- Tinjau `4.zip` secara lokal pada lingkungan yang sesuai sebelum memutuskan hapus/pertahankan; kalau AI tidak dapat membaca arsip, tandai menunggu pemeriksaan, bukan menebak isinya.
- Tambahkan catatan status yang memisahkan “ada di source”, “migration diterapkan”, “tes lulus”, dan “terverifikasi di deployment”.

**Kriteria selesai:** docs sesuai source commit; klaim yang belum dibuktikan ditandai jelas; file misterius punya keputusan pemilik yang tercatat.

---

# P3 — Fitur produk setelah fondasi aman

Fitur berikut bukan prioritas sebelum DB-01 sampai DB-04 dan alur E2E inti beres. Ambil satu fitur berdasarkan kebutuhan pengelola kelas, bukan semuanya sekaligus.

## FEATURE-01 — Arsip dan pencarian pengumuman/agenda
- Pagination, filter status publik yang tepat, kategori, rentang waktu, dan urutan stabil.
- Status kosong, kesalahan jaringan, tanggal WIB, serta pengumuman tersemat.
- Tes bahwa konten draft/arsip/jadwal mendatang tidak pernah terlihat publik.

## FEATURE-02 — Publikasi karya/proyek siswa
- Tentukan persetujuan publikasi dan alur koreksi/penarikan sebelum skema.
- Model draft/published/archived, media terkait, alt text, SEO, revisi, dan backup.
- RLS, service-side mutasi, tes data privat, serta proses penghapusan/arsip.

## FEATURE-03 — Media library yang dapat dipelihara
- Paginasi server-side, penggunaan media, validasi referensi, dan daftar objek orphan sebagai laporan read-only.
- Penggantian objek yang tidak merusak referensi; konfirmasi eksplisit untuk operasi destruktif.
- Tidak menghapus otomatis objek Storage sampai audit referensi dan backup teruji.

## FEATURE-04 — Penyempurnaan editor CMS
- Indikator perubahan belum disimpan, validasi per field, pesan error yang bisa ditindaklanjuti, serta perlindungan kehilangan input.
- Preview aman dan konsisten dengan halaman publik.
- Simpan/restore tidak boleh melewati audit, auth, atau validasi server.

**Definition of Done setiap fitur:** sasaran pengguna dan pemilik konten jelas; perubahan schema berupa migration baru; data classification/RLS/backup diperbarui; tes unit, integrasi, dan E2E sesuai risiko; aksesibilitas/cache/SEO ditinjau; dokumentasi diperbarui.

---

# Urutan eksekusi AI yang disarankan

1. **DB-01:** audit migration/schema aktif dan tulis peta keadaan, tanpa mutasi.
2. **DB-02:** pastikan pengumuman/agenda masuk backup/restore; bila tidak, buat migration serta perubahan API dan tes.
3. **DB-03:** uji provisioning/upgrade hanya di lingkungan disposable; jangan jalankan baseline pada project berisi data.
4. **DB-04:** perkuat smoke test RLS, grant, RPC, dan visibility.
5. **APP-01:** tes E2E alur login, publish, agenda, media, dan draft.
6. **APP-02 sampai APP-05:** konsistensi endpoint, pagination, media policy, dan fallback.
7. **UX-01 sampai UX-03:** aksesibilitas, CSP report-only, dan cache.
8. **PERF/CODE:** ukur, lalu refaktor bertahap.
9. **FEATURE:** pilih satu pengembangan produk yang disepakati pengelola.

## Status pekerjaan eksternal (bukan selesai oleh edit source saja)

| Pemeriksaan | Mengapa terpisah | Bukti yang harus dilampirkan sebelum status selesai |
|---|---|---|
| `npm ci`, check, test, build | Memerlukan Node/dependency/runtime | Log perintah/CI pada SHA yang sama |
| E2E/browser/perangkat | Memerlukan browser dan lingkungan aplikasi | Hasil test + viewport dan alur yang diuji |
| Mutasi/migration Supabase | Mengubah keadaan database | Target project/versi, backup sebelumnya, log migration, verifikasi postcondition |
| Backup off-site/restore Storage | Infrastruktur eksternal di luar Git | Bukti salinan terpisah dan laporan restore drill |
| Deploy/rollback Cloudflare | Mengubah layanan live | Deployment ID, smoke test, dan status rollback |

## Definition of Done umum

- Perubahan sesuai ruang lingkup satu tiket dan tidak mengubah migration historis.
- Secret dan data pribadi tidak muncul di source, output tes, atau log.
- Unit/integration/E2E yang relevan ditambah atau alasannya dicatat.
- Perubahan database diuji dengan role anon dan server admin yang sesuai.
- Cache, RLS/grants, privasi, aksesibilitas, serta backup ditinjau sesuai dampak.
- Dokumentasi dan changelog diperbarui.
- Status menyebutkan bukti; pekerjaan yang tidak dijalankan diberi label **belum diverifikasi**.
