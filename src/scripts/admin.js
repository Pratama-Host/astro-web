const $ = (id) => document.getElementById(id);
const state = {
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
const pageNames = {
  "/": "Beranda",
  "/anggota": "Anggota",
  "/galeri": "Galeri",
  "/struktur": "Struktur",
  "/keahlian": "Keahlian",
  "/tkj": "TKJ",
  "/pengembang": "Pengembang",
};
const viewTitles = {
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
let currentView = "dashboard";

async function api(url, options = {}) {
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
function setStatus(id, message, ok = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("ok", Boolean(ok));
}
function showLogin() {
  $("admin-shell").classList.add("hidden");
  $("login-screen").classList.remove("hidden");
  document
    .querySelector(".admin-skip-link")
    ?.setAttribute("href", "#login-screen");
  $("admin-password")?.focus();
}
function showAdmin() {
  $("login-screen").classList.add("hidden");
  $("admin-shell").classList.remove("hidden");
  document
    .querySelector(".admin-skip-link")
    ?.setAttribute("href", "#admin-main");
  $("view-title")?.focus();
}
function setSidebarOpen(open) {
  const sidebar = $("sidebar");
  const trigger = $("mobile-menu");
  if (!sidebar || !trigger) return;
  const wasOpen = sidebar.classList.contains("open");
  const isMobile = window.matchMedia("(max-width: 680px)").matches;
  sidebar.classList.toggle("open", open);
  sidebar.setAttribute("aria-hidden", String(isMobile && !open));
  sidebar.inert = Boolean(isMobile && !open);
  sidebar
    .querySelectorAll("a[href], button, input, select, textarea, [tabindex]")
    .forEach((element) => {
      if (isMobile && !open) {
        if (!element.hasAttribute("data-sidebar-original-tabindex")) {
          element.setAttribute(
            "data-sidebar-original-tabindex",
            element.getAttribute("tabindex") ?? "",
          );
        }
        element.setAttribute("tabindex", "-1");
      } else if (element.hasAttribute("data-sidebar-original-tabindex")) {
        const original =
          element.getAttribute("data-sidebar-original-tabindex") ?? "";
        if (original === "") element.removeAttribute("tabindex");
        else element.setAttribute("tabindex", original);
        element.removeAttribute("data-sidebar-original-tabindex");
      }
    });
  trigger.setAttribute("aria-expanded", String(open));
  trigger.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  if (isMobile) document.body.style.overflow = open ? "hidden" : "";
  if (open && isMobile && !wasOpen) sidebar.querySelector(".nav-btn")?.focus();
  if (!open && wasOpen && isMobile) trigger.focus();
}
function showView(name) {
  if (!viewTitles[name]) return;
  currentView = name;
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  document.querySelectorAll(".nav-btn").forEach((b) => {
    const active = b.dataset.view === name;
    b.classList.toggle("active", active);
    if (active) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
    b.setAttribute("aria-controls", `view-${b.dataset.view}`);
  });
  $("view-title").textContent = viewTitles[name][0];
  $("view-subtitle").textContent = viewTitles[name][1];
  setSidebarOpen(false);
  const loaders = {
    members: loadMembers,
    gallery: loadGallery,
    content: loadContent,
    collections: loadCollections,
    sections: loadSections,
    appearance: loadAppearance,
    navigation: loadNavigation,
    seo: async () => {
      await loadPages();
      await loadDeveloperStories();
    },
    media: loadMedia,
  };
  if (loaders[name]) loaders[name]().catch((e) => console.error(e));
}
document
  .querySelectorAll(".nav-btn")
  .forEach((button) =>
    button.addEventListener("click", () => showView(button.dataset.view)),
  );
document
  .querySelectorAll("[data-go]")
  .forEach((button) =>
    button.addEventListener("click", () => showView(button.dataset.go)),
  );
$("mobile-menu").addEventListener("click", () =>
  setSidebarOpen(!$("sidebar").classList.contains("open")),
);
$("admin-shell").addEventListener("click", (event) => {
  if (
    event.target === $("admin-shell") &&
    $("sidebar").classList.contains("open")
  )
    setSidebarOpen(false);
});
document.addEventListener("keydown", (event) => {
  const sidebar = $("sidebar");
  if (!sidebar.classList.contains("open")) return;
  if (event.key === "Escape") {
    setSidebarOpen(false);
    $("mobile-menu").focus();
    return;
  }
  if (event.key === "Tab") {
    const focusable = [
      ...sidebar.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter(
      (element) =>
        !element.hidden && element.getAttribute("aria-hidden") !== "true",
    );
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !sidebar.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        !sidebar.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
});
setSidebarOpen(false);
window.addEventListener(
  "resize",
  () => {
    const mobile = window.matchMedia("(max-width: 680px)").matches;
    const keepOpen = mobile && $("sidebar").classList.contains("open");
    setSidebarOpen(keepOpen);
  },
  { passive: true },
);

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("login-button").disabled = true;
  setStatus("login-status", "Memeriksa sesi admin…");
  try {
    await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: $("admin-password").value }),
    });
    $("admin-password").value = "";
    showAdmin();
    await loadDashboard();
    showView("dashboard");
  } catch (e) {
    setStatus("login-status", e.message);
  } finally {
    $("login-button").disabled = false;
  }
});
$("logout-button").addEventListener("click", async () => {
  try {
    await api("/api/admin/logout", { method: "POST" });
  } finally {
    showLogin();
  }
});

async function checkSession() {
  try {
    await api("/api/admin/cms");
    showAdmin();
    await loadDashboard();
  } catch {
    showLogin();
  }
}
function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}
function safeText(tag, value, className) {
  const el = document.createElement(tag);
  el.textContent = value ?? "";
  if (className) el.className = className;
  return el;
}
async function loadDashboard() {
  const data = await api("/api/admin/cms");
  state.dashboard = data;
  $("connection-status").textContent = "● Supabase terhubung";
  $("connection-status").className = "badge ok";
  const counts = data.counts;
  const cards = [
    ["Anggota", counts.members],
    ["Foto galeri", counts.gallery],
    ["Media library", counts.media],
    ["Konten terkelola", counts.content],
    ["Halaman SEO", counts.pages],
    ["Section", counts.sections],
  ];
  $("dashboard-stats").replaceChildren(
    ...cards.map(([label, value]) => {
      const card = document.createElement("div");
      card.className = "stats-card";
      card.append(
        safeText("span", label),
        safeText("strong", String(value ?? 0)),
      );
      return card;
    }),
  );
  $("activity-list").replaceChildren();
  if (!data.activities?.length)
    $("activity-list").append(
      safeText("div", "Belum ada aktivitas yang tercatat.", "empty"),
    );
  else
    for (const item of data.activities) {
      const row = document.createElement("div");
      row.style.cssText = "padding:11px 0;border-bottom:1px solid #292d39";
      row.append(
        safeText("strong", item.summary),
        safeText(
          "div",
          `${item.entity} · ${new Date(item.created_at).toLocaleString("id-ID")}`,
          "muted small",
        ),
      );
      $("activity-list").append(row);
    }
  $("dashboard-status").textContent =
    `Media tercatat: ${data.media.files} file · ${formatBytes(data.media.bytes)}. Kapasitas bucket total tidak disediakan oleh tabel metadata.`;
}

function resetMemberForm() {
  $("member-form").reset();
  $("original_nis").value = "";
  $("member-kelas").value = "XII-9";
  $("member-visible").checked = true;
  $("member-form-title").textContent = "Tambah anggota";
  $("save-member").textContent = "Simpan anggota";
  setStatus("member-status", "");
  $("member-dirty").classList.add("hidden");
}
$("reset-member").addEventListener("click", resetMemberForm);
async function loadMembers() {
  const payload = await api("/api/admin/anggota");
  state.members = payload.data || [];
  renderMembers();
}
function renderMembers() {
  const q = $("member-search").value.toLowerCase().trim();
  const rows = state.members.filter((m) =>
    [m.nama, m.nis, m.kelas, m.jabatan].join(" ").toLowerCase().includes(q),
  );
  $("members-count").textContent =
    `${state.members.length} anggota · ${rows.length} ditampilkan`;
  const body = $("members-table");
  body.replaceChildren();
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Tidak ada anggota yang cocok.";
    tr.append(td);
    body.append(tr);
    return;
  }
  for (const m of rows) {
    const tr = document.createElement("tr");
    for (const v of [m.nama, m.nis, m.kelas, m.jabatan || "Anggota"])
      tr.append(safeText("td", v || "—"));
    const status = document.createElement("td");
    status.append(
      safeText(
        "span",
        m.visible === false ? "Disembunyikan" : "Tampil",
        `badge ${m.visible === false ? "off" : "ok"}`,
      ),
    );
    tr.append(status);
    const actions = document.createElement("td");
    const edit = safeText("button", "Edit", "btn ghost small-btn");
    edit.type = "button";
    edit.setAttribute("aria-label", `Edit anggota ${m.nama}`);
    edit.addEventListener("click", () => editMember(m));
    const del = safeText("button", "Hapus", "btn danger small-btn");
    del.type = "button";
    del.setAttribute("aria-label", `Hapus anggota ${m.nama}`);
    del.addEventListener("click", () => deleteMember(m.nis));
    actions.append(edit, del);
    tr.append(actions);
    body.append(tr);
  }
}
$("member-search").addEventListener("input", renderMembers);
$("refresh-members").addEventListener("click", () =>
  loadMembers().catch((e) => setStatus("member-status", e.message)),
);
function editMember(m) {
  $("original_nis").value = m.nis || "";
  $("member-photo-file").value = "";
  $("member-nama").value = m.nama || "";
  $("member-nis").value = m.nis || "";
  $("member-kelas").value = m.kelas || "XII-9";
  $("member-jabatan").value = m.jabatan || "";
  $("member-foto").value = m.foto_url || m.foto || "";
  $("member-audio").value = m.audio_url || m.audio || "";
  $("member-audio-nama").value = m.audio_nama || m.namaAudio || "";
  $("member-foto-audio").value = m.foto_audio_url || m.fotoAudio || "";
  $("member-desc").value = m.deskripsi || m.desc || "";
  $("member-desc-audio").value = m.deskripsi_audio || m.descAudio || "";
  $("member-skills").value = Array.isArray(m.skills) ? m.skills.join(", ") : "";
  $("member-social").value = JSON.stringify(m.social || {}, null, 2);
  $("member-order").value = m.urutan ?? 0;
  $("member-visible").checked = m.visible !== false;
  $("member-form-title").textContent = `Edit anggota: ${m.nama}`;
  $("save-member").textContent = "Simpan perubahan";
  $("member-form").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("member-form").addEventListener("input", () =>
  $("member-dirty").classList.remove("hidden"),
);
$("member-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  let social = {};
  try {
    social = JSON.parse($("member-social").value || "{}");
    if (!social || Array.isArray(social) || typeof social !== "object")
      throw Error();
  } catch {
    setStatus(
      "member-status",
      "Format media sosial harus JSON object yang valid.",
    );
    return;
  }
  const old = $("original_nis").value;
  const photoFile = $("member-photo-file").files?.[0];
  const data = {
    nama: $("member-nama").value,
    nis: $("member-nis").value,
    kelas: $("member-kelas").value,
    jabatan: $("member-jabatan").value,
    foto_url: $("member-foto").value,
    audio_url: $("member-audio").value,
    audio_nama: $("member-audio-nama").value,
    foto_audio_url: $("member-foto-audio").value,
    deskripsi: $("member-desc").value,
    deskripsi_audio: $("member-desc-audio").value,
    skills: $("member-skills")
      .value.split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    social,
    urutan: Number($("member-order").value) || 0,
    visible: $("member-visible").checked,
    original_nis: old,
  };
  $("save-member").disabled = true;
  try {
    await api("/api/admin/anggota", {
      method: old ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (photoFile) {
      const form = new FormData();
      form.append("file", photoFile);
      form.append("category", "anggota");
      form.append("member_nis", data.nis);
      await appendImageThumbnail(form, photoFile);
      await api("/api/admin/media", { method: "POST", body: form });
    }
    setStatus("member-status", "Anggota berhasil disimpan.", true);
    resetMemberForm();
    await loadMembers();
    await loadDashboard();
  } catch (e) {
    setStatus("member-status", e.message);
  } finally {
    $("save-member").disabled = false;
  }
});
async function deleteMember(nis) {
  if (
    !confirm(
      `Hapus anggota dengan NIS ${nis}? Tindakan ini tidak dapat dibatalkan.`,
    )
  )
    return;
  try {
    await api("/api/admin/anggota", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nis, confirm: true }),
    });
    await loadMembers();
    await loadDashboard();
    setStatus("member-status", "Anggota berhasil dihapus.", true);
  } catch (e) {
    setStatus("member-status", e.message);
  }
}

async function loadGallery() {
  const payload = await api("/api/admin/gallery");
  state.gallery = payload.data || [];
  renderGallery();
}
function renderGallery() {
  $("gallery-count").textContent = `${state.gallery.length} item galeri`;
  const grid = $("gallery-grid");
  grid.replaceChildren();
  if (!state.gallery.length) {
    grid.append(safeText("div", "Belum ada foto galeri.", "empty"));
    return;
  }
  for (const g of state.gallery) {
    const card = document.createElement("article");
    card.className = "media-card";
    if (g.src && !String(g.src).startsWith("storage://")) {
      const img = document.createElement("img");
      img.src = g.src;
      img.alt = g.alt_text || g.caption || "Foto galeri";
      img.loading = "lazy";
      img.onerror = () => {
        const fallback = safeText(
          "div",
          "Pratinjau tidak tersedia",
          "file-preview",
        );
        img.replaceWith(fallback);
      };
      card.append(img);
    } else {
      card.append(safeText("div", "Pratinjau tidak tersedia", "file-preview"));
    }
    const body = document.createElement("div");
    body.className = "media-card-body";
    const title = safeText("strong", g.title || g.caption || "Tanpa judul");
    const meta = safeText(
      "small",
      `${g.category || "Kegiatan"} · urutan ${g.urutan ?? 0}`,
    );
    const actions = document.createElement("div");
    actions.className = "toolbar";
    const edit = safeText("button", "Edit metadata", "btn ghost small-btn");
    edit.type = "button";
    edit.setAttribute(
      "aria-label",
      `Edit metadata galeri ${g.title || g.caption || g.id}`,
    );
    edit.addEventListener("click", () => editGallery(g));
    const toggle = safeText(
      "button",
      g.visible === false ? "Tampilkan" : "Sembunyikan",
      "btn ghost small-btn",
    );
    toggle.type = "button";
    toggle.setAttribute(
      "aria-label",
      `${g.visible === false ? "Tampilkan" : "Sembunyikan"} item galeri ${g.title || g.caption || g.id}`,
    );
    toggle.addEventListener("click", () => toggleGallery(g));
    const del = safeText("button", "Hapus item", "btn danger small-btn");
    del.type = "button";
    del.setAttribute(
      "aria-label",
      `Hapus item galeri ${g.title || g.caption || g.id}`,
    );
    del.addEventListener("click", () => deleteGallery(g.id));
    actions.append(edit, toggle, del);
    body.append(title, meta, actions);
    card.append(body);
    grid.append(card);
  }
}
async function editGallery(g) {
  const title = prompt("Judul foto:", g.title || "");
  if (title === null) return;
  const caption = prompt("Caption:", g.caption || "");
  if (caption === null) return;
  const description = prompt("Deskripsi:", g.description || "");
  if (description === null) return;
  const category = prompt("Kategori:", g.category || "Kegiatan");
  if (category === null) return;
  const taken_at = prompt(
    "Tanggal (YYYY-MM-DD, kosongkan jika tidak ada):",
    g.taken_at || "",
  );
  if (taken_at === null) return;
  const urutan = prompt("Urutan:", String(g.urutan ?? 0));
  if (urutan === null) return;
  try {
    await api("/api/admin/gallery", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: g.id,
        title,
        caption,
        description,
        category,
        taken_at,
        urutan,
        alt_text: title,
        visible: g.visible !== false,
      }),
    });
    await loadGallery();
    await loadDashboard();
  } catch (e) {
    alert(e.message);
  }
}
async function toggleGallery(g) {
  try {
    await api("/api/admin/gallery", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: g.id, visible: g.visible === false }),
    });
    await loadGallery();
    await loadDashboard();
  } catch (e) {
    alert(e.message);
  }
}
async function deleteGallery(id) {
  if (
    !confirm(
      "Hapus item galeri dari website publik? File tetap disimpan di Media Library.",
    )
  )
    return;
  try {
    await api("/api/admin/gallery", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, confirm: true }),
    });
    await loadGallery();
    await loadDashboard();
  } catch (e) {
    alert(e.message);
  }
}
$("refresh-gallery").addEventListener("click", () =>
  loadGallery().catch((e) => setStatus("gallery-upload-status", e.message)),
);
$("gallery-upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const files = [...$("gallery-files").files];
  if (!files.length) return;
  $("gallery-upload-button").disabled = true;
  try {
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("category", "galeri");
      form.append("caption", $("gallery-caption-default").value.trim());
      await appendImageThumbnail(form, file);
      await api("/api/admin/media", { method: "POST", body: form });
    }
    $("gallery-files").value = "";
    setStatus(
      "gallery-upload-status",
      `${files.length} foto berhasil diunggah.`,
      true,
    );
    await loadGallery();
    await loadMedia();
    await loadDashboard();
  } catch (e) {
    setStatus("gallery-upload-status", e.message);
  } finally {
    $("gallery-upload-button").disabled = false;
  }
});

function writeIf(id, value) {
  const el = $(id);
  if (el) el.value = value ?? "";
}
function readJsonField(id, fallback) {
  try {
    return JSON.parse($(id).value || JSON.stringify(fallback));
  } catch {
    throw new Error(`JSON pada ${id} tidak valid.`);
  }
}
async function loadContent() {
  const payload = await api("/api/admin/content");
  state.content = payload.data || {};
  const c = state.content;
  for (const k of [
    "namaKelas",
    "jurusan",
    "namaSekolah",
    "tahunAjaran",
    "motto",
    "deskripsi",
    "sloganHero",
    "visi",
  ])
    writeIf(`c-${k}`, c[k]);
  writeIf("c-misi", Array.isArray(c.misi) ? c.misi.join("\n") : "");
  const hero = c.hero || {};
  for (const [id, key] of [
    ["eyebrow", "eyebrow"],
    ["school", "schoolPrefix"],
    ["highlight", "highlight"],
    ["class", "classLabel"],
    ["primary", "primaryText"],
    ["primary-href", "primaryHref"],
    ["secondary", "secondaryText"],
    ["secondary-href", "secondaryHref"],
  ])
    writeIf(`c-hero-${id}`, hero[key]);
  const wali = c.waliKelas || {};
  for (const [id, key] of [
    ["nama", "nama"],
    ["jabatan", "jabatan"],
    ["foto", "foto"],
    ["desc", "desc"],
  ])
    writeIf(`c-wali-${id}`, wali[key]);
  for (const [id, value] of [
    ["c-stats", c.stats || []],
    ["c-prestasi", c.prestasi || []],
    ["c-tkj", c.tkj || {}],
    ["c-social", c.sosmed || {}],
    ["c-footer", c.footer || {}],
  ])
    writeIf(id, JSON.stringify(value, null, 2));
  $("content-dirty").classList.add("hidden");
}
$("content-form").addEventListener("input", () =>
  $("content-dirty").classList.remove("hidden"),
);
$("content-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  let payload;
  try {
    payload = {};
    for (const k of [
      "namaKelas",
      "jurusan",
      "namaSekolah",
      "tahunAjaran",
      "motto",
      "deskripsi",
      "sloganHero",
      "visi",
    ])
      payload[k] = $(`c-${k}`).value;
    payload.misi = $("c-misi")
      .value.split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    payload.hero = {
      eyebrow: $("c-hero-eyebrow").value,
      schoolPrefix: $("c-hero-school").value,
      highlight: $("c-hero-highlight").value,
      classLabel: $("c-hero-class").value,
      primaryText: $("c-hero-primary").value,
      primaryHref: $("c-hero-primary-href").value,
      secondaryText: $("c-hero-secondary").value,
      secondaryHref: $("c-hero-secondary-href").value,
    };
    payload.waliKelas = {
      nama: $("c-wali-nama").value,
      jabatan: $("c-wali-jabatan").value,
      foto: $("c-wali-foto").value,
      desc: $("c-wali-desc").value,
    };
    payload.stats = readJsonField("c-stats", []);
    payload.prestasi = readJsonField("c-prestasi", []);
    payload.tkj = readJsonField("c-tkj", {});
    payload.sosmed = readJsonField("c-social", {});
    payload.footer = readJsonField("c-footer", {});
  } catch (err) {
    setStatus("content-status", err.message);
    return;
  }
  $("save-content").disabled = true;
  try {
    await api("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setStatus(
      "content-status",
      "Konten berhasil disimpan dan digunakan halaman publik yang terhubung.",
      true,
    );
    $("content-dirty").classList.add("hidden");
    await loadContent();
    await loadDashboard();
  } catch (err) {
    setStatus("content-status", err.message);
  } finally {
    $("save-content").disabled = false;
  }
});
$("reload-content").addEventListener("click", () =>
  loadContent().catch((e) => setStatus("content-status", e.message)),
);

async function loadCollection(type) {
  const payload = await api(`/api/admin/collections?type=${type}`);
  state[type === "guru" ? "teachers" : "skills"] = payload.data || [];
  state.collectionSnapshots[type] = structuredClone(payload.snapshot || payload.data || []);
  $(type === "guru" ? "guru-json" : "skills-json").value = JSON.stringify(
    payload.data || [],
    null,
    2,
  );
}
async function loadCollections() {
  await Promise.all([loadCollection("guru"), loadCollection("skills")]);
}
$("reload-guru").addEventListener("click", () =>
  loadCollection("guru").catch((e) => setStatus("guru-status", e.message)),
);
$("reload-skills").addEventListener("click", () =>
  loadCollection("skills").catch((e) => setStatus("skills-status", e.message)),
);
async function saveCollection(type) {
  const field = type === "guru" ? "guru-json" : "skills-json",
    status = type === "guru" ? "guru-status" : "skills-status",
    button = type === "guru" ? "save-guru" : "save-skills";
  let items;
  try {
    items = JSON.parse($(field).value);
    if (!Array.isArray(items)) throw Error("Data harus JSON array.");
  } catch (e) {
    setStatus(status, `JSON tidak valid: ${e.message}`);
    return;
  }
  const previous = state[type === "guru" ? "teachers" : "skills"];
  const nextNames = new Set(items.map((x) => String(x?.nama || "").trim()));
  const removed = previous.filter((x) => !nextNames.has(x.nama));
  if (
    removed.length &&
    !confirm(
      `Daftar ini menghapus ${removed.length} data ${type} lama (${removed.map((x) => x.nama).join(", ")}). Lanjutkan?`,
    )
  )
    return;
  $(button).disabled = true;
  try {
    await api(`/api/admin/collections?type=${type}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, confirmReplace: removed.length > 0, expectedSnapshot: state.collectionSnapshots[type] }),
    });
    setStatus(status, `${items.length} data ${type} berhasil disimpan.`, true);
    await loadCollection(type);
    await loadDashboard();
  } catch (e) {
    setStatus(status, e.message);
  } finally {
    $(button).disabled = false;
  }
}
$("save-guru").addEventListener("click", () => saveCollection("guru"));
$("save-skills").addEventListener("click", () => saveCollection("skills"));

const themePaletteDefaults = {
  dark: { accent_color: "#dc2626", background_color: "#0a0505" },
  light: { accent_color: "#0d9488", background_color: "#f8fafc" },
  blue: { accent_color: "#2563eb", background_color: "#020617" },
};
function syncAppearancePalette() {
  const app = state.content?.appearance || {};
  const theme = $("a-theme").value || "dark";
  const saved = (app.palettes || {})[theme] || {};
  const legacy = theme === (app.theme || "dark") ? app : {};
  const defaults = themePaletteDefaults[theme] || themePaletteDefaults.dark;
  writeIf(
    "a-accent",
    saved.accent_color || legacy.accent_color || defaults.accent_color,
  );
  writeIf(
    "a-background-color",
    saved.background_color ||
      legacy.background_color ||
      defaults.background_color,
  );
}
async function loadAppearance() {
  if (!Object.keys(state.content).length) await loadContent();
  const c = state.content,
    media = c.media || {},
    app = c.appearance || {};
  for (const [id, value] of [
    ["a-logo", media.logo_url],
    ["a-logo-alt", media.alternate_logo_url],
    ["a-favicon", media.favicon_url],
    ["a-background", app.background_image_url],
    ["a-og", c.ogImage],
    ["a-audio", media.audio_url],
  ])
    writeIf(id, value);
  writeIf("a-theme", app.theme || "dark");
  syncAppearancePalette();
  writeIf(
    "a-audio-volume",
    Math.round(Number(media.audio_volume ?? 0.8) * 100),
  );
  for (const [field, preview] of [
    ["a-logo", "preview-logo"],
    ["a-logo-alt", "preview-logo-alt"],
    ["a-favicon", "preview-favicon"],
    ["a-background", "preview-background"],
    ["a-og", "preview-og"],
  ])
    updatePreview(field, preview);
  await loadDeveloperTheme();
  await loadDeveloperStories();
}
$("a-theme").addEventListener("change", syncAppearancePalette);
function updatePreview(field, preview) {
  const img = $(preview),
    url = $(field).value.trim();
  if (url) {
    img.src = url;
    img.classList.remove("hidden");
  } else {
    img.removeAttribute("src");
    img.classList.add("hidden");
  }
}
for (const [field, preview] of [
  ["a-logo", "preview-logo"],
  ["a-logo-alt", "preview-logo-alt"],
  ["a-favicon", "preview-favicon"],
  ["a-background", "preview-background"],
  ["a-og", "preview-og"],
])
  $(field).addEventListener("input", () => updatePreview(field, preview));
$("appearance-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const c = state.content || {};
  const existing = c.appearance || {};
  const theme = $("a-theme").value || "dark";
  const media = {
    ...(c.media || {}),
    logo_url: $("a-logo").value,
    alternate_logo_url: $("a-logo-alt").value,
    favicon_url: $("a-favicon").value,
    audio_url: $("a-audio").value,
    audio_volume: Math.min(
      1,
      Math.max(0, Number($("a-audio-volume").value) / 100),
    ),
  };
  const palettes = { ...(existing.palettes || {}) };
  palettes[theme] = {
    ...(palettes[theme] || {}),
    accent_color: $("a-accent").value,
    background_color: $("a-background-color").value,
  };
  const appearance = {
    ...existing,
    theme,
    palettes,
    accent_color: $("a-accent").value,
    background_color: $("a-background-color").value,
    background_image_url: $("a-background").value,
  };
  const payload = { media, appearance, ogImage: $("a-og").value };
  $("save-appearance").disabled = true;
  try {
    await api("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setStatus(
      "appearance-status",
      "Pengaturan tampilan berhasil disimpan.",
      true,
    );
    await loadContent();
    await loadAppearance();
  } catch (e) {
    setStatus("appearance-status", e.message);
  } finally {
    $("save-appearance").disabled = false;
  }
});
const developerThemeDefaults = {
  preset: "brutalist-yellow",
  colors: {
    frame: "#0A0A0A",
    background: "#F4F1E8",
    surface: "#FFFDF8",
    text: "#111111",
    muted: "#686868",
    border: "#111111",
    primary: "#F5CD32",
    secondary: "#32CFC2",
    highlight: "#D90B46",
  },
};
const developerThemeFields = [
  "frame",
  "background",
  "surface",
  "text",
  "muted",
  "border",
  "primary",
  "secondary",
  "highlight",
];
const developerThemePresets = {
  "brutalist-yellow": {
    frame: "#0A0A0A",
    background: "#F4F1E8",
    surface: "#FFFDF8",
    text: "#111111",
    muted: "#686868",
    border: "#111111",
    primary: "#F5CD32",
    secondary: "#32CFC2",
    highlight: "#D90B46",
  },
  monochrome: {
    frame: "#171717",
    background: "#ECECEC",
    surface: "#FFFFFF",
    text: "#111111",
    muted: "#555555",
    border: "#111111",
    primary: "#D5D5D5",
    secondary: "#8A8A8A",
    highlight: "#222222",
  },
  "electric-pop": {
    frame: "#241B35",
    background: "#F8F4FF",
    surface: "#FFFFFF",
    text: "#17112B",
    muted: "#5B5470",
    border: "#17112B",
    primary: "#B7F34A",
    secondary: "#45D7E8",
    highlight: "#D90B46",
  },
};
function setDeveloperThemeInputs(colors) {
  for (const key of developerThemeFields) {
    const input = $(`developer-theme-${key}`);
    if (input)
      input.value = /^#[0-9a-f]{6}$/i.test(String(colors?.[key] || ""))
        ? colors[key]
        : developerThemeDefaults.colors[key];
  }
  updateDeveloperThemePreview();
}
function readDeveloperThemeInputs() {
  const colors = {};
  for (const key of developerThemeFields) {
    const value = $(`developer-theme-${key}`)?.value || "";
    if (!/^#[0-9a-f]{6}$/i.test(value))
      throw Error(`Warna ${key} tidak valid.`);
    colors[key] = value.toUpperCase();
  }
  const issues = getDeveloperThemeContrastIssues(colors);
  if (issues.length)
    throw Error(
      `Warna tidak disimpan karena kontras belum cukup (target 4.5:1): ${issues.join(" · ")}`,
    );
  return colors;
}
function contrastRatio(first, second) {
  const luminance = (hex) => {
    const rgb = hex
      .replace("#", "")
      .match(/.{2}/g)
      .map((value) => parseInt(value, 16) / 255)
      .map((value) =>
        value <= 0.04045
          ? value / 12.92
          : Math.pow((value + 0.055) / 1.055, 2.4),
      );
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function getDeveloperThemeContrastIssues(colors) {
  const pairs = [
    ["Teks / background", colors.text, colors.background, 4.5],
    ["Teks / surface", colors.text, colors.surface, 4.5],
    ["Teks sekunder / background", colors.muted, colors.background, 4.5],
    ["Teks sekunder / surface", colors.muted, colors.surface, 4.5],
    ["Teks / primary", colors.text, colors.primary, 4.5],
    ["Teks / secondary", colors.text, colors.secondary, 4.5],
    ["Tombol highlight", "#FFFFFF", colors.highlight, 4.5],
    ["Border / background", colors.border, colors.background, 3],
    ["Border / surface", colors.border, colors.surface, 3],
  ];
  return pairs
    .filter(
      ([, foreground, background, target]) =>
        contrastRatio(foreground, background) < target,
    )
    .map(
      ([label, foreground, background, target]) =>
        `${label}: ${contrastRatio(foreground, background).toFixed(2)}:1 (minimum ${target}:1)`,
    );
}
function updateDeveloperThemePreview() {
  const preview = $("developer-theme-preview");
  if (!preview) return;
  const colors = {};
  for (const key of developerThemeFields)
    colors[key] =
      $(`developer-theme-${key}`)?.value || developerThemeDefaults.colors[key];
  preview.style.setProperty("--preview-frame", colors.frame);
  preview.style.setProperty("--preview-bg", colors.background);
  preview.style.setProperty("--preview-surface", colors.surface);
  preview.style.setProperty("--preview-text", colors.text);
  preview.style.setProperty("--preview-muted", colors.muted);
  preview.style.setProperty("--preview-border", colors.border);
  preview.style.setProperty("--preview-primary", colors.primary);
  preview.style.setProperty("--preview-secondary", colors.secondary);
  preview.style.setProperty("--preview-highlight", colors.highlight);
  const issues = getDeveloperThemeContrastIssues(colors);
  setStatus(
    "developer-theme-contrast",
    issues.length
      ? `Kontras perlu diperbaiki (target 4.5:1): ${issues.join(" · ")}`
      : "Kontras dasar teks: lulus pemeriksaan 4.5:1.",
    issues.length === 0,
  );
}
async function getDeveloperThemeSource() {
  const pages = await api("/api/admin/pages");
  state.pages = pages.data || [];
  const page = state.pages.find((item) => item.slug === "/pengembang") || {};
  let draft = null;
  try {
    draft = (await api("/api/admin/drafts?slug=%2Fpengembang")).data;
  } catch (error) {
    setStatus(
      "developer-theme-status",
      `Draft belum dapat dibaca: ${error.message}`,
    );
  }
  if (!draft) {
    state.developerThemeSource = page;
    return page;
  }
  // Overlay partial draft fields on the published/fallback page so saving
  // a theme never drops older content or metadata that was not in the draft.
  const publishedContent =
    page.content && typeof page.content === "object" ? page.content : {};
  const draftContent =
    draft.content && typeof draft.content === "object" ? draft.content : {};
  const publishedDeveloper =
    publishedContent.developer && typeof publishedContent.developer === "object"
      ? publishedContent.developer
      : {};
  const draftDeveloper =
    draftContent.developer && typeof draftContent.developer === "object"
      ? draftContent.developer
      : {};
  const publishedTheme =
    publishedDeveloper.theme && typeof publishedDeveloper.theme === "object"
      ? publishedDeveloper.theme
      : {};
  const draftTheme =
    draftDeveloper.theme && typeof draftDeveloper.theme === "object"
      ? draftDeveloper.theme
      : {};
  const mergedDeveloper = {
    ...publishedDeveloper,
    ...draftDeveloper,
    profile: {
      ...(publishedDeveloper.profile || {}),
      ...(draftDeveloper.profile || {}),
    },
    theme: {
      ...publishedTheme,
      ...draftTheme,
      colors: {
        ...(publishedTheme.colors || {}),
        ...(draftTheme.colors || {}),
      },
    },
    stories:
      Array.isArray(draftDeveloper.stories) && draftDeveloper.stories.length
        ? draftDeveloper.stories
        : publishedDeveloper.stories || [],
    legacyTimeline:
      Array.isArray(draftDeveloper.legacyTimeline) &&
      draftDeveloper.legacyTimeline.length
        ? draftDeveloper.legacyTimeline
        : publishedDeveloper.legacyTimeline || [],
  };
  state.developerThemeSource = {
    ...page,
    ...draft,
    content: {
      ...publishedContent,
      ...draftContent,
      developer: mergedDeveloper,
    },
  };
  return state.developerThemeSource;
}
async function saveDeveloperPageDraft(nextDeveloper, statusId, message) {
  const source =
    state.developerThemeSource || (await getDeveloperThemeSource());
  const content =
    source?.content && typeof source.content === "object"
      ? JSON.parse(JSON.stringify(source.content))
      : {};
  content.developer =
    content.developer && typeof content.developer === "object"
      ? content.developer
      : {};
  Object.assign(content.developer, nextDeveloper);
  const body = {
    slug: "/pengembang",
    title: source?.title || "Portofolio Pengembang — Alfredo Pratama",
    description:
      source?.description ||
      "Profil, karya, perjalanan belajar, prinsip, dan catatan pengembang.",
    og_image: source?.og_image || null,
    noindex: source?.noindex === true,
    content,
  };
  const result = await api("/api/admin/drafts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  state.developerThemeSource = result.data;
  setStatus(statusId, message, true);
  return result.data;
}
async function loadDeveloperTheme() {
  const source = await getDeveloperThemeSource();
  const content =
    source?.content && typeof source.content === "object" ? source.content : {};
  const developer =
    content.developer && typeof content.developer === "object"
      ? content.developer
      : {};
  const theme =
    developer.theme && typeof developer.theme === "object"
      ? developer.theme
      : {};
  const preset = [
    "brutalist-yellow",
    "monochrome",
    "electric-pop",
    "custom",
  ].includes(theme.preset)
    ? theme.preset
    : "brutalist-yellow";
  $("developer-theme-preset").value = preset;
  setDeveloperThemeInputs({
    ...developerThemeDefaults.colors,
    ...(theme.colors || {}),
  });
  setStatus(
    "developer-theme-status",
    source?.updated_at
      ? `Memuat konfigurasi draft terakhir: ${new Date(source.updated_at).toLocaleString("id-ID")}.`
      : "Memuat fallback awal. Belum ada tema pengembang yang tersimpan.",
    true,
  );
}
$("developer-theme-preset").addEventListener("change", () => {
  const preset = $("developer-theme-preset").value;
  if (developerThemePresets[preset])
    setDeveloperThemeInputs(developerThemePresets[preset]);
  else updateDeveloperThemePreview();
});
for (const key of developerThemeFields)
  $(`developer-theme-${key}`).addEventListener("input", () => {
    $("developer-theme-preset").value = "custom";
    updateDeveloperThemePreview();
  });
$("reset-developer-theme").addEventListener("click", () => {
  $("developer-theme-preset").value = "brutalist-yellow";
  setDeveloperThemeInputs(developerThemeDefaults.colors);
  setStatus(
    "developer-theme-status",
    "Preset awal dipulihkan di preview. Simpan sebagai draft untuk menyimpan perubahan.",
    true,
  );
});
$("save-developer-theme").addEventListener("click", async () => {
  const button = $("save-developer-theme");
  button.disabled = true;
  try {
    const colors = readDeveloperThemeInputs();
    await saveDeveloperPageDraft(
      { theme: { preset: $("developer-theme-preset").value, colors } },
      "developer-theme-status",
      "Tema tersimpan sebagai draft. Halaman publik belum berubah; buka preview untuk memeriksanya.",
    );
  } catch (error) {
    setStatus("developer-theme-status", error.message);
  } finally {
    button.disabled = false;
  }
});
$("preview-developer-theme").addEventListener("click", () =>
  window.open("/pengembang?previewDraft=1", "_blank", "noopener,noreferrer"),
);
$("publish-developer-theme").addEventListener("click", async () => {
  if (
    !confirm(
      "Publikasikan draft tema Pengembang? Perubahan akan terlihat pada halaman publik.",
    )
  )
    return;
  const button = $("publish-developer-theme");
  button.disabled = true;
  try {
    const result = await api("/api/admin/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "/pengembang", action: "publish" }),
    });
    setStatus(
      "developer-theme-status",
      result.message || "Tema dipublikasikan.",
      true,
    );
    await loadDeveloperTheme();
  } catch (error) {
    setStatus(
      "developer-theme-status",
      `Publikasi belum tersedia: ${error.message}. Periksa migrations/0001_baseline.sql pada database terlebih dahulu.`,
    );
  } finally {
    button.disabled = false;
  }
});

let developerStories = [];
let selectedDeveloperStory = 0;
const storyTextToBlocks = (value) => {
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };
  for (const raw of String(value || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "heading", text: line.slice(3).trim() });
    } else if (line.startsWith("- ")) {
      flush();
      blocks.push({ type: "list", text: line.slice(2).trim() });
    } else paragraph.push(line);
  }
  flush();
  return blocks;
};
const storyBlocksToText = (blocks) =>
  (blocks || [])
    .map((block) =>
      block.type === "heading"
        ? `## ${block.text}`
        : block.type === "list"
          ? `- ${block.text}`
          : block.text,
    )
    .join("\n\n");
function renderDeveloperStorySelect() {
  const select = $("developer-story-select");
  select.replaceChildren();
  developerStories.forEach((story, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = story.title || `Bab ${index + 1}`;
    select.append(option);
  });
  if (!developerStories.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Belum ada bab";
    select.append(option);
  }
  select.value = String(
    Math.min(selectedDeveloperStory, Math.max(0, developerStories.length - 1)),
  );
  fillDeveloperStoryForm();
}
function fillDeveloperStoryForm() {
  const story = developerStories[selectedDeveloperStory] || {};
  writeIf("developer-story-title", story.title || "");
  writeIf("developer-story-subtitle", story.subtitle || "");
  writeIf("developer-story-body", storyBlocksToText(story.blocks));
  writeIf("developer-story-code-title", story.codeTitle || "");
  writeIf("developer-story-code-language", story.codeLanguage || "JavaScript");
  writeIf("developer-story-code", story.code || "");
  writeIf("developer-story-quote", story.quote || "");
  $("developer-story-remove").disabled = developerStories.length === 0;
}
async function loadDeveloperStories() {
  await getDeveloperThemeSource();
  const content = state.developerThemeSource?.content || {};
  const developer = content.developer || {};
  developerStories =
    Array.isArray(developer.stories) && developer.stories.length
      ? JSON.parse(JSON.stringify(developer.stories))
      : [];
  selectedDeveloperStory = 0;
  renderDeveloperStorySelect();
  setStatus(
    "developer-story-status",
    developerStories.length
      ? `${developerStories.length} bab siap diedit. Naskah sumber lama disertakan sebagai fallback.`
      : "Belum ada bab yang dapat diedit. Muat ulang halaman.",
    true,
  );
}
$("developer-story-select").addEventListener("change", () => {
  selectedDeveloperStory = Number($("developer-story-select").value) || 0;
  fillDeveloperStoryForm();
});
$("developer-story-add").addEventListener("click", () => {
  developerStories.push({
    key: `chapter-${developerStories.length + 1}`,
    title: "Bab baru",
    subtitle: "",
    blocks: [],
  });
  selectedDeveloperStory = developerStories.length - 1;
  renderDeveloperStorySelect();
  $("developer-story-title").focus();
});
$("developer-story-remove").addEventListener("click", () => {
  if (!developerStories.length) return;
  if (!confirm("Hapus bab ini dari draft Pengembang?")) return;
  developerStories.splice(selectedDeveloperStory, 1);
  selectedDeveloperStory = Math.max(0, selectedDeveloperStory - 1);
  renderDeveloperStorySelect();
});
$("save-developer-story").addEventListener("click", async () => {
  const button = $("save-developer-story");
  button.disabled = true;
  try {
    if (!developerStories.length)
      throw Error("Tambahkan minimal satu bab terlebih dahulu.");
    const title = $("developer-story-title").value.trim();
    if (!title) throw Error("Judul bab wajib diisi.");
    const current = developerStories[selectedDeveloperStory] || {};
    developerStories[selectedDeveloperStory] = {
      ...current,
      title,
      subtitle: $("developer-story-subtitle").value.trim(),
      blocks: storyTextToBlocks($("developer-story-body").value),
      codeTitle: $("developer-story-code-title").value.trim(),
      codeLanguage: $("developer-story-code-language").value.trim() || "text",
      code: $("developer-story-code").value,
      quote: $("developer-story-quote").value.trim(),
    };
    await saveDeveloperPageDraft(
      { stories: developerStories },
      "developer-story-status",
      "Bab tersimpan sebagai draft. Naskah publik belum berubah.",
    );
    renderDeveloperStorySelect();
  } catch (error) {
    setStatus("developer-story-status", error.message);
  } finally {
    button.disabled = false;
  }
});
$("preview-developer-story").addEventListener("click", () =>
  window.open("/pengembang?previewDraft=1", "_blank", "noopener,noreferrer"),
);

async function appendImageThumbnail(form, file) {
  if (
    !file?.type?.startsWith("image/") ||
    ["image/svg+xml", "image/gif"].includes(file.type)
  )
    return;
  if (typeof createImageBitmap !== "function") return;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.78),
    );
    if (blob instanceof Blob && blob.size > 0 && blob.size < file.size)
      form.append(
        "thumbnail",
        blob,
        `${file.name.replace(/\.[^.]+$/, "")}.thumb.webp`,
      );
  } catch (error) {
    console.warn("Thumbnail tidak dibuat; file asli tetap diunggah.", error);
  } finally {
    bitmap?.close?.();
  }
}
async function uploadSingle(file, category, globalType = "") {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  if (globalType) form.append("global_type", globalType);
  await appendImageThumbnail(form, file);
  return api("/api/admin/media", { method: "POST", body: form });
}
$("global-upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = $("global-file").files?.[0];
  if (!file) return;
  $("global-upload-button").disabled = true;
  try {
    const result = await uploadSingle(
      file,
      "assets-global",
      $("global-kind").value,
    );
    $("global-file").value = "";
    setStatus(
      "global-upload-status",
      result.warning || "Aset berhasil diunggah dan pengaturan diperbarui.",
      true,
    );
    state.content = {};
    await loadContent();
    await loadAppearance();
    await loadMedia();
    await loadDashboard();
  } catch (e) {
    setStatus("global-upload-status", e.message);
  } finally {
    $("global-upload-button").disabled = false;
  }
});

async function loadNavigation() {
  const payload = await api("/api/admin/navigation");
  state.navigation = payload.data || [];
  state.navigationOriginal = state.navigation.map((item) => item.id);
  state.navigationSnapshot = structuredClone(payload.snapshot || payload.data || []);
  renderNavigation();
}
function renderNavigation() {
  const root = $("navigation-list");
  root.replaceChildren();
  if (!state.navigation.length)
    root.append(safeText("div", "Belum ada item menu.", "empty"));
  state.navigation.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "editor-row";
    const label = document.createElement("input");
    label.className = "control";
    label.placeholder = "Label";
    label.value = item.label || "";
    label.dataset.field = "label";
    const href = document.createElement("input");
    href.className = "control";
    href.placeholder = "/halaman";
    href.value = item.href || "";
    href.dataset.field = "href";
    const icon = document.createElement("input");
    icon.className = "control";
    icon.placeholder = "fa-house / fa-code / fa-users";
    icon.value = item.icon || "";
    icon.dataset.field = "icon";
    const controls = document.createElement("div");
    controls.className = "toolbar";
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = item.enabled !== false;
    enabled.title = "Tampilkan menu";
    enabled.setAttribute(
      "aria-label",
      `Tampilkan item menu ${item.label || index + 1}`,
    );
    enabled.dataset.field = "enabled";
    const up = safeText("button", "↑", "btn ghost small-btn");
    up.type = "button";
    up.setAttribute("aria-label", `Naikkan menu ${item.label || index + 1}`);
    up.disabled = index === 0;
    up.addEventListener("click", () => moveNav(index, -1));
    const down = safeText("button", "↓", "btn ghost small-btn");
    down.type = "button";
    down.setAttribute("aria-label", `Turunkan menu ${item.label || index + 1}`);
    down.disabled = index === state.navigation.length - 1;
    down.addEventListener("click", () => moveNav(index, 1));
    const remove = safeText("button", "×", "btn danger small-btn");
    remove.type = "button";
    remove.setAttribute("aria-label", `Hapus menu ${item.label || index + 1}`);
    remove.addEventListener("click", () => {
      if (confirm(`Hapus menu ${item.label}?`)) {
        state.navigation.splice(index, 1);
        renderNavigation();
      }
    });
    controls.append(enabled, up, down, remove);
    row.append(label, href, icon, controls);
    root.append(row);
  });
}
function moveNav(index, delta) {
  const next = index + delta;
  if (next < 0 || next >= state.navigation.length) return;
  [state.navigation[index], state.navigation[next]] = [
    state.navigation[next],
    state.navigation[index],
  ];
  renderNavigation();
}
$("add-navigation").addEventListener("click", () => {
  const id = prompt("ID unik menu (huruf kecil, angka, tanda -):");
  if (!id) return;
  if (state.navigation.some((x) => x.id === id)) {
    alert("ID sudah digunakan.");
    return;
  }
  state.navigation.push({
    id,
    label: "Menu baru",
    href: "/",
    icon: "fa-link",
    enabled: true,
  });
  renderNavigation();
});
$("save-navigation").addEventListener("click", async () => {
  const items = [...$("navigation-list").children].map((row, index) => ({
    id: state.navigation[index]?.id,
    label: row.querySelector("[data-field=label]").value,
    href: row.querySelector("[data-field=href]").value,
    icon: row.querySelector("[data-field=icon]").value,
    enabled: row.querySelector("[data-field=enabled]").checked,
  }));
  const nextIds = new Set(items.map((item) => item.id));
  const removed = state.navigationOriginal.filter((id) => !nextIds.has(id));
  if (
    removed.length &&
    !confirm(
      `Hapus ${removed.length} menu dari website publik? (${removed.join(", ")})`,
    )
  )
    return;
  try {
    await api("/api/admin/navigation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, confirmDelete: removed.length > 0, expectedSnapshot: state.navigationSnapshot }),
    });
    setStatus("navigation-status", "Navigasi berhasil disimpan.", true);
    await loadNavigation();
  } catch (e) {
    setStatus("navigation-status", e.message);
  }
});
$("reload-navigation").addEventListener("click", () =>
  loadNavigation().catch((e) => setStatus("navigation-status", e.message)),
);

async function loadPages() {
  const payload = await api("/api/admin/pages");
  state.pages = payload.data || [];
  renderSeoList();
  await fillSeoForm();
}
async function fillSeoForm() {
  const slug = $("seo-page").value;
  const page = state.pages.find((x) => x.slug === slug);
  let draft = null;
  try {
    draft = (await api(`/api/admin/drafts?slug=${encodeURIComponent(slug)}`))
      .data;
  } catch (e) {
    setStatus("seo-status", e.message);
  }
  const source = draft || page;
  writeIf("seo-title", source?.title);
  writeIf("seo-description", source?.description);
  writeIf("seo-og", source?.og_image);
  writeIf("seo-content", JSON.stringify(source?.content || {}, null, 2));
  $("seo-noindex").checked = source?.noindex === true;
  $("publish-page-draft").disabled = !draft;
  $("preview-page-draft").disabled = !draft;
  $("discard-page-draft").disabled = !draft;
  setStatus(
    "seo-status",
    draft
      ? `Draft terakhir diperbarui ${new Date(draft.updated_at).toLocaleString("id-ID")}.`
      : "Tidak ada draft. Form menampilkan konten yang sedang dipublikasikan.",
    Boolean(draft),
  );
}
function renderSeoList() {
  const root = $("seo-list");
  root.replaceChildren();
  for (const p of state.pages) {
    const row = document.createElement("div");
    row.style.cssText =
      "padding:10px 0;border-bottom:1px solid #292d39;display:flex;justify-content:space-between;gap:10px;align-items:center";
    row.append(
      safeText("strong", pageNames[p.slug] || p.slug),
      safeText("span", p.title || "Belum ada title", "muted small"),
    );
    const button = safeText("button", "Edit", "btn ghost small-btn");
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `Edit SEO ${pageNames[p.slug] || p.slug}`,
    );
    button.addEventListener("click", () => {
      $("seo-page").value = p.slug;
      fillSeoForm();
    });
    row.append(button);
    root.append(row);
  }
}
$("seo-page").addEventListener("change", () =>
  fillSeoForm().catch((e) => setStatus("seo-status", e.message)),
);
$("reload-seo").addEventListener("click", () =>
  loadPages().catch((e) => setStatus("seo-status", e.message)),
);
function readSeoForm() {
  let content;
  try {
    content = JSON.parse($("seo-content").value || "{}");
    if (!content || Array.isArray(content) || typeof content !== "object")
      throw Error();
  } catch {
    throw Error("Konten halaman harus berupa JSON object yang valid.");
  }
  return {
    slug: $("seo-page").value,
    title: $("seo-title").value,
    description: $("seo-description").value,
    og_image: $("seo-og").value,
    noindex: $("seo-noindex").checked,
    content,
  };
}
$("seo-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  let data;
  try {
    data = readSeoForm();
  } catch (error) {
    setStatus("seo-status", error.message);
    return;
  }
  try {
    await api("/api/admin/drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setStatus(
      "seo-status",
      "Draft tersimpan. Halaman publik belum berubah.",
      true,
    );
    await fillSeoForm();
  } catch (error) {
    setStatus("seo-status", error.message);
  }
});
$("publish-page-draft").addEventListener("click", async () => {
  const slug = $("seo-page").value;
  if (
    !confirm(
      `Publikasikan draft untuk ${pageNames[slug] || slug}? Konten publik akan berubah.`,
    )
  )
    return;
  try {
    const result = await api("/api/admin/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, action: "publish" }),
    });
    setStatus(
      "seo-status",
      [result.message, ...(result.warnings || [])].join(" "),
      true,
    );
    await loadPages();
    await loadDashboard();
  } catch (error) {
    setStatus("seo-status", error.message);
  }
});
$("preview-page-draft").addEventListener("click", () => {
  const slug = $("seo-page").value;
  window.open(
    `${slug === "/" ? "/" : slug}?previewDraft=1`,
    "_blank",
    "noopener,noreferrer",
  );
});
$("discard-page-draft").addEventListener("click", async () => {
  const slug = $("seo-page").value;
  if (!confirm(`Buang draft untuk ${pageNames[slug] || slug}?`)) return;
  try {
    await api("/api/admin/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, action: "discard" }),
    });
    setStatus(
      "seo-status",
      "Draft dibuang. Konten publik tidak berubah.",
      true,
    );
    await fillSeoForm();
  } catch (error) {
    setStatus("seo-status", error.message);
  }
});

async function loadSections() {
  const payload = await api("/api/admin/sections");
  state.sections = payload.data || [];
  renderSections();
}
function renderSections() {
  const root = $("sections-list");
  root.replaceChildren();
  for (const item of state.sections) {
    const row = document.createElement("div");
    row.className = "editor-row";
    row.style.gridTemplateColumns = "minmax(0,1fr) 130px 100px";
    row.append(
      safeText(
        "strong",
        `${pageNames[item.page_slug] || item.page_slug} · ${item.label}`,
      ),
    );
    const order = document.createElement("input");
    order.type = "number";
    order.min = "0";
    order.value = item.sort_order;
    order.className = "control";
    order.dataset.field = "sort_order";
    const visible = document.createElement("label");
    visible.className = "checkline";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = item.enabled !== false;
    check.dataset.field = "enabled";
    visible.append(check, document.createTextNode(" Tampil"));
    row.append(order, visible);
    row.dataset.page = item.page_slug;
    row.dataset.key = item.section_key;
    root.append(row);
  }
}
$("save-sections").addEventListener("click", async () => {
  const items = [...$("sections-list").children].map((row) => ({
    page_slug: row.dataset.page,
    section_key: row.dataset.key,
    label: state.sections.find(
      (x) =>
        x.page_slug === row.dataset.page && x.section_key === row.dataset.key,
    )?.label,
    sort_order: Number(row.querySelector("[data-field=sort_order]").value) || 0,
    enabled: row.querySelector("[data-field=enabled]").checked,
  }));
  try {
    await api("/api/admin/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setStatus("sections-status", "Pengaturan section berhasil disimpan.", true);
    await loadSections();
  } catch (e) {
    setStatus("sections-status", e.message);
  }
});
$("reload-sections").addEventListener("click", () =>
  loadSections().catch((e) => setStatus("sections-status", e.message)),
);

async function loadMedia() {
  const params = new URLSearchParams();
  if ($("media-filter").value) params.set("category", $("media-filter").value);
  if ($("media-search").value.trim())
    params.set("q", $("media-search").value.trim());
  const payload = await api(`/api/admin/media?${params}`);
  state.media = payload.data || [];
  renderMedia();
}
function renderMedia() {
  const root = $("media-grid");
  root.replaceChildren();
  $("media-count").textContent =
    `${state.media.length} file · ${formatBytes(state.media.reduce((s, x) => s + Number(x.size_bytes || 0), 0))}`;
  if (!state.media.length) {
    root.append(safeText("div", "Belum ada file yang cocok.", "empty"));
    return;
  }
  for (const item of state.media) {
    const card = document.createElement("article");
    card.className = "media-card";
    if ((item.mime_type || "").startsWith("image/")) {
      const img = document.createElement("img");
      img.src = item.thumbnail_url || item.public_url;
      img.alt = item.alt_text || item.title || item.filename;
      img.loading = "lazy";
      card.append(img);
    } else {
      const preview = safeText(
        "div",
        (item.mime_type || "").startsWith("audio/")
          ? "♫"
          : item.mime_type === "application/pdf"
            ? "PDF"
            : "FILE",
        "file-preview",
      );
      card.append(preview);
    }
    const body = document.createElement("div");
    body.className = "media-card-body";
    body.append(
      safeText("strong", item.title || item.filename),
      safeText(
        "small",
        `${item.category} · ${formatBytes(item.size_bytes)} · ${item.mime_type}`,
      ),
    );
    const edit = safeText("button", "Edit metadata", "btn ghost small-btn");
    edit.type = "button";
    edit.setAttribute(
      "aria-label",
      `Edit metadata ${item.title || item.filename}`,
    );
    edit.addEventListener("click", () => editMedia(item));
    const replace = safeText("button", "Ganti file", "btn ghost small-btn");
    replace.type = "button";
    replace.setAttribute("aria-label", `Ganti file ${item.filename}`);
    const picker = document.createElement("input");
    picker.type = "file";
    picker.hidden = true;
    picker.accept = (item.mime_type || "").startsWith("image/")
      ? "image/*"
      : (item.mime_type || "").startsWith("audio/")
        ? "audio/*"
        : ".pdf";
    picker.addEventListener("change", () => {
      const file = picker.files?.[0];
      if (file) replaceMedia(item, file);
    });
    replace.addEventListener("click", () => picker.click());
    const del = safeText("button", "Hapus", "btn danger small-btn");
    del.type = "button";
    del.setAttribute("aria-label", `Hapus file ${item.filename}`);
    del.addEventListener("click", () => deleteMedia(item));
    body.append(edit, replace, del, picker);
    card.append(body);
    root.append(card);
  }
}
async function editMedia(item) {
  const title = prompt("Nama/metadata media:", item.title || item.filename);
  if (title === null) return;
  const alt = prompt("Alt text (untuk gambar):", item.alt_text || "");
  if (alt === null) return;
  try {
    await api("/api/admin/media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        object_path: item.object_path,
        title,
        alt_text: alt,
        category: item.category,
        mime_type: item.mime_type,
        size_bytes: item.size_bytes,
      }),
    });
    await loadMedia();
  } catch (e) {
    alert(e.message);
  }
}
async function replaceMedia(item, file) {
  if (
    !confirm(
      `Ganti isi file ${item.filename}? URL tetap sama sehingga semua halaman yang memakai file ini akan ikut diperbarui.`,
    )
  )
    return;
  const form = new FormData();
  form.append("file", file);
  form.append("category", item.category);
  form.append("replace_path", item.object_path);
  await appendImageThumbnail(form, file);
  try {
    const result = await api("/api/admin/media", {
      method: "POST",
      body: form,
    });
    if (result.warning) alert(result.warning);
    await loadMedia();
    await loadDashboard();
  } catch (e) {
    alert(e.message);
  }
}
async function deleteMedia(item) {
  if (
    !confirm(
      `Hapus file ${item.filename} dari Storage? Jika masih digunakan, sistem akan menolak penghapusan.`,
    )
  )
    return;
  try {
    await api("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        object_path: item.object_path,
        confirm: true,
      }),
    });
    await loadMedia();
    await loadDashboard();
  } catch (e) {
    alert(e.message);
  }
}
$("media-search").addEventListener("input", () =>
  loadMedia().catch((e) => setStatus("media-upload-status", e.message)),
);
$("media-filter").addEventListener("change", () =>
  loadMedia().catch((e) => setStatus("media-upload-status", e.message)),
);
$("refresh-media").addEventListener("click", () =>
  loadMedia().catch((e) => setStatus("media-upload-status", e.message)),
);
$("media-upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const files = [...$("media-files").files];
  if (!files.length) return;
  $("media-upload-button").disabled = true;
  let done = 0;
  try {
    for (const file of files) {
      await uploadSingle(file, $("media-category").value);
      done++;
    }
    $("media-files").value = "";
    setStatus("media-upload-status", `${done} file berhasil diunggah.`, true);
    await loadMedia();
    await loadDashboard();
  } catch (e) {
    setStatus(
      "media-upload-status",
      `${done} file berhasil diunggah sebelum terjadi kendala: ${e.message}`,
    );
  } finally {
    $("media-upload-button").disabled = false;
  }
});

$("export-backup").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/admin/backup", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw Error(err.error || "Ekspor gagal.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tkj-xi9-cms-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("backup-status", "Backup JSON berhasil dibuat.", true);
  } catch (e) {
    setStatus("backup-status", e.message);
  }
});
$("import-backup-file").addEventListener("change", async () => {
  const file = $("import-backup-file").files?.[0];
  if (!file) return;
  try {
    if (file.size > 20 * 1024 * 1024)
      throw Error("File backup maksimum 20 MB.");
    const bundle = JSON.parse(await file.text());
    if (
      !confirm(
        "Impor data dari backup? Baris yang cocok akan diperbarui, baris yang tidak ada tetap dipertahankan. Seluruh impor dibatalkan otomatis bila satu bagian gagal.",
      )
    )
      return;
    bundle.confirm = true;
    await api("/api/admin/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
    });
    setStatus("backup-status", "Data backup berhasil diimpor.", true);
    await loadDashboard();
  } catch (e) {
    setStatus("backup-status", e.message);
  } finally {
    $("import-backup-file").value = "";
  }
});
async function loadRevisions() {
  const slug = $("revision-page").value;
  const payload = await api(
    `/api/admin/revisions?slug=${encodeURIComponent(slug)}`,
  );
  const root = $("revision-list");
  root.replaceChildren();
  if (!payload.data?.length) {
    root.append(safeText("div", "Belum ada riwayat versi.", "empty"));
    return;
  }
  for (const revision of payload.data) {
    const row = document.createElement("div");
    row.style.cssText =
      "display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px;border:1px solid #303544;border-radius:11px";
    const info = document.createElement("div");
    info.append(
      safeText("strong", `Versi ${revision.version}`),
      safeText(
        "div",
        new Date(revision.created_at).toLocaleString("id-ID"),
        "muted small",
      ),
    );
    const button = safeText("button", "Pulihkan", "btn ghost small-btn");
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `Pulihkan versi ${revision.version} halaman ${slug}`,
    );
    button.addEventListener("click", async () => {
      if (
        !confirm(
          `Pulihkan versi ${revision.version} untuk ${slug}? Konten sekarang akan diganti.`,
        )
      )
        return;
      try {
        await api("/api/admin/revisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: revision.id, confirm: true }),
        });
        setStatus(
          "revision-status",
          "Versi berhasil dipulihkan. Muat ulang halaman publik untuk melihat hasilnya.",
          true,
        );
        await loadDashboard();
      } catch (e) {
        setStatus("revision-status", e.message);
      }
    });
    row.append(info, button);
    root.append(row);
  }
}
$("revision-page").addEventListener("change", () =>
  loadRevisions().catch((e) => setStatus("revision-status", e.message)),
);
document.querySelector('[data-view="system"]').addEventListener("click", () => {
  loadRevisions().catch((e) => setStatus("revision-status", e.message));
  loadAudit(0).catch((e) => setStatus("audit-status", e.message));
});

let auditOffset = 0,
  auditHasMore = false;
async function loadAudit(offset = auditOffset) {
  auditOffset = Math.max(0, offset);
  const params = new URLSearchParams({
    limit: "25",
    offset: String(auditOffset),
  });
  if ($("audit-search").value.trim())
    params.set("q", $("audit-search").value.trim());
  if ($("audit-entity").value) params.set("entity", $("audit-entity").value);
  if ($("audit-action").value) params.set("action", $("audit-action").value);
  const payload = await api(`/api/admin/audit?${params}`);
  auditHasMore = payload.hasMore === true;
  const root = $("audit-list");
  root.replaceChildren();
  if (!payload.data?.length)
    root.append(safeText("div", "Belum ada aktivitas yang cocok.", "empty"));
  else
    for (const item of payload.data) {
      const row = document.createElement("article");
      row.style.cssText =
        "padding:12px;border:1px solid #303544;border-radius:11px;background:#11141c";
      row.append(
        safeText("strong", item.summary),
        safeText(
          "div",
          `${item.action} · ${item.entity}${item.entity_id ? ` · ${item.entity_id}` : ""}`,
          "muted small",
        ),
        safeText(
          "div",
          new Date(item.created_at).toLocaleString("id-ID"),
          "muted small",
        ),
      );
      root.append(row);
    }
  const page = Math.floor(auditOffset / 25) + 1;
  $("audit-page-label").textContent =
    `Halaman ${page} · ${payload.count || 0} catatan`;
  $("audit-prev").disabled = auditOffset === 0;
  $("audit-next").disabled = !auditHasMore;
}
$("refresh-audit").addEventListener("click", () =>
  loadAudit(0).catch((e) => setStatus("audit-status", e.message)),
);
$("audit-prev").addEventListener("click", () =>
  loadAudit(Math.max(0, auditOffset - 25)).catch((e) =>
    setStatus("audit-status", e.message),
  ),
);
$("audit-next").addEventListener("click", () => {
  if (auditHasMore)
    loadAudit(auditOffset + 25).catch((e) =>
      setStatus("audit-status", e.message),
    );
});
["audit-search", "audit-entity", "audit-action"].forEach((id) =>
  $(id).addEventListener(id === "audit-search" ? "change" : "change", () =>
    loadAudit(0).catch((e) => setStatus("audit-status", e.message)),
  ),
);

checkSession();
