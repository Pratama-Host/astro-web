/* Admin CMS — Util dasar, state bersama, dan pemanggil API */

export const ui = {
  currentView: "dashboard",
  developerStories: /** @type {any[]} */ ([]),
  selectedDeveloperStory: 0,
  auditOffset: 0,
  auditHasMore: false,
};
/** Diisi oleh admin.js (entry) agar shell tidak bergantung pada modul fitur. */
export const registry = { loaders: {} };

export const $ = (id) => document.getElementById(id);

export const state = {
  members: [],
  gallery: [],
  content: {},
  teachers: [],
  skills: [],
  navigation: [],
  navigationOriginal: [],
  navigationSnapshot: [],
  collectionSnapshots: { guru: [], skills: [] },
  pages: [],
  sections: [],
  media: [],
  dashboard: null,
  developerThemeSource: null,
};

export const pageNames = {
  "/": "Beranda",
  "/anggota": "Anggota",
  "/galeri": "Galeri",
  "/struktur": "Struktur",
  "/keahlian": "Keahlian",
  "/tkj": "TKJ",
  "/pengembang": "Pengembang",
};

export const viewTitles = {
  dashboard: ["Dashboard", "Ringkasan kondisi website TKJ XII-9."],
  members: ["Anggota", "Kelola data anggota dan struktur organisasi."],
  gallery: ["Galeri", "Kelola dokumentasi dan foto kelas."],
  content: [
    "Konten & profil",
    "Identitas, hero, visi-misi, wali kelas, developer, dan konten TKJ.",
  ],
  collections: [
    "Guru & keahlian",
    "Kelola daftar pengajar dan kompetensi kelas.",
  ],
  sections: [
    "Section halaman",
    "Atur section yang ditampilkan di halaman publik.",
  ],
  appearance: [
    "Tampilan, media & Theme Studio",
    "Kelola tema global dan palet warna khusus halaman pengembang.",
  ],
  navigation: ["Navigasi", "Kelola menu website publik."],
  seo: [
    "Pengembang & SEO",
    "Kelola narasi pengembang, draft halaman, dan metadata SEO.",
  ],
  media: ["Media library", "Kelola semua aset yang diunggah ke Storage."],
  system: [
    "Sistem & backup",
    "Ekspor, impor, dan pulihkan riwayat versi konten.",
  ],
};

export async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.error || `Permintaan gagal (${response.status})`);
  return payload;
}

export function setStatus(id, message, ok = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("ok", Boolean(ok));
}

export function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

export function safeText(tag, value, className) {
  const el = document.createElement(tag);
  el.textContent = value ?? "";
  if (className) el.className = className;
  return el;
}

export function writeIf(id, value) {
  const el = $(id);
  if (el) el.value = value ?? "";
}

export function readJsonField(id, fallback) {
  try {
    return JSON.parse($(id).value || JSON.stringify(fallback));
  } catch {
    throw new Error(`JSON pada ${id} tidak valid.`);
  }
}
