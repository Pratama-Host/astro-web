# Reformasi UI/UX — 15 November 2026

Dokumen ini mencatat keputusan desain dan cara memeliharanya.

## Token warna (dihitung di `Layout.astro` per tema)
| Token | Fungsi |
| --- | --- |
| `--accent` | Warna merek untuk isian/dekorasi (nilai pilihan CMS, tidak diubah). |
| `--accent-text` | Aksen untuk **teks**; otomatis digeser sampai kontras ≥ 4,5:1 terhadap `--bg`. |
| `--on-accent` | Warna teks di atas isian aksen (putih atau `#0b1220`, mana yang lebih kontras). |
| `--btn-end` | Ujung gradien tombol utama; menjaga kontras teks di seluruh gradien. |

Aturan: `color: var(--accent)` dilarang untuk teks (tes `css-quality` akan gagal). Gunakan `var(--accent-text, var(--accent))`.

## Ergonomi
- Font minimum 12px (`--text-xs`).
- Kontrol header 44px pada layar sentuh (40px pada ≤ 360px).
- Di ≤ 480px, tombol animasi & musik pindah ke menu hamburger (meneruskan klik ke tombol asli; status disinkronkan).
- Logo header adalah `<button>` sungguhan.

## Performa
- `getSettings` dan `getNavigation` memakai cache TTL 3 detik + de-duplikasi (`src/lib/ttl-cache.ts`). Hasil fallback akibat error tidak disimpan. `resetSharedDataCache()` tersedia untuk tes.
- Google Fonts non-blocking; animasi kanvas berhenti saat tab tidak terlihat.

## Guardrail CI
`tests/css-quality.test.ts` mengunci: jumlah `!important` per file tidak boleh naik (turunkan angka baseline saat membersihkan), tidak ada font < 12px, tidak ada teks beraksen mentah, token kontras tetap ada.

## Utang yang disengaja
Sekitar 325 `!important` belum dihapus: menghapusnya tanpa pemeriksaan visual berisiko merusak tampilan. Kerjakan per file (mulai `animasi.css`, `ui.css`, `tombol.css`, `anggota.css`) dengan tangkapan layar sebelum/sesudah, lalu turunkan baseline.
