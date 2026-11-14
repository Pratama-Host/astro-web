/* Admin CMS — Pengumuman dan agenda kegiatan */
import { $, api, safeText, setStatus } from "./core.js";

const state = {
  kind: "announcements",
  items: [],
  requestId: 0,
};

const isAgenda = () => state.kind === "agenda";
const endpoint = () => `/api/admin/announcements?type=${state.kind}`;
const statusLabels = {
  draft: "Draft",
  published: "Terbit",
  archived: "Arsip",
};

function formatDate(value) {
  if (!value) return "Tidak dijadwalkan";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Waktu tidak valid"
    : date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/** Convert ISO timestamps to the browser-local datetime-local input format. */
function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

/** datetime-local values are local wall time; serialize them as UTC ISO strings. */
function fromLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function setKind(kind) {
  state.kind = kind === "agenda" ? "agenda" : "announcements";
  const newsButton = $("announcement-kind-news");
  const agendaButton = $("announcement-kind-agenda");
  newsButton.className = `btn${isAgenda() ? " ghost" : ""}`;
  agendaButton.className = `btn${isAgenda() ? "" : " ghost"}`;
  newsButton.setAttribute("aria-pressed", String(!isAgenda()));
  agendaButton.setAttribute("aria-pressed", String(isAgenda()));

  $("announcement-only-fields").hidden = isAgenda();
  $("agenda-only-fields").hidden = !isAgenda();
  $("agenda-starts-at").required = isAgenda();
  $("announcement-body-label").textContent = isAgenda()
    ? "Deskripsi kegiatan"
    : "Isi pengumuman";
  $("announcement-body").maxLength = isAgenda() ? 3000 : 5000;
  $("announcement-body").placeholder = isAgenda()
    ? "Tuliskan gambaran kegiatan…"
    : "Tuliskan informasi yang perlu diketahui kelas…";
  $("announcement-form-title").textContent = isAgenda()
    ? "Buat agenda kegiatan"
    : "Buat pengumuman";
  $("announcement-list-title").textContent = isAgenda()
    ? "Daftar agenda kegiatan"
    : "Daftar pengumuman";
  $("announcement-save").textContent = isAgenda()
    ? "Simpan agenda"
    : "Simpan pengumuman";
  resetForm();
}

function resetForm() {
  $("announcement-form").reset();
  $("announcement-id").value = "";
  $("announcement-status-select").value = "draft";
  $("announcement-category").value = "Kelas";
  $("announcement-form-mode").textContent = "Item baru";
  $("announcement-form-title").textContent = isAgenda()
    ? "Buat agenda kegiatan"
    : "Buat pengumuman";
  $("announcement-save").textContent = isAgenda()
    ? "Simpan agenda"
    : "Simpan pengumuman";
  setStatus("announcement-status", "");
}

function renderItems() {
  const root = $("announcement-list");
  root.replaceChildren();
  const count = state.items.length;
  $("announcement-count").textContent = `${count} item · maksimum 200 item per daftar`;

  if (!count) {
    root.append(
      safeText(
        "div",
        isAgenda()
          ? "Belum ada agenda kegiatan. Buat agenda pertama melalui formulir di atas."
          : "Belum ada pengumuman. Buat informasi pertama melalui formulir di atas.",
        "empty",
      ),
    );
    return;
  }

  for (const item of state.items) {
    const card = document.createElement("article");
    card.className = "cms-entry";

    const head = document.createElement("div");
    head.className = "cms-entry-head";
    head.append(safeText("h3", item.title));
    const statusClass = item.status === "published" ? "badge ok" : item.status === "archived" ? "badge off" : "badge";
    head.append(safeText("span", statusLabels[item.status] || "Status tidak dikenal", statusClass));

    const parts = [item.category || "Kelas"];
    if (isAgenda()) {
      parts.push(`Mulai: ${formatDate(item.starts_at)}`);
      if (item.ends_at) parts.push(`Selesai: ${formatDate(item.ends_at)}`);
      if (item.location) parts.push(`Lokasi: ${item.location}`);
    } else {
      parts.push(item.pinned ? "Disematkan" : "Tidak disematkan");
      parts.push(item.publish_at ? `Terbit: ${formatDate(item.publish_at)}` : "Terbit tanpa jadwal");
      if (item.expires_at) parts.push(`Berakhir: ${formatDate(item.expires_at)}`);
    }

    const copy = safeText(
      "p",
      (isAgenda() ? item.description : item.body) || "(Belum ada deskripsi.)",
      "cms-entry-copy",
    );

    const actions = document.createElement("div");
    actions.className = "cms-entry-actions";
    const edit = safeText("button", "Ubah", "btn ghost small-btn");
    edit.type = "button";
    edit.setAttribute("aria-label", `Ubah ${item.title || "item"}`);
    edit.addEventListener("click", () => fillForm(item));
    actions.append(edit);

    card.append(head, safeText("div", parts.join(" · "), "cms-entry-meta"), copy);
    if (!isAgenda() && item.link_url) {
      let safeHref = null;
      try {
        const parsed = new URL(item.link_url);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
          safeHref = parsed.href;
        }
      } catch {
        safeHref = null;
      }
      if (safeHref) {
        const link = document.createElement("a");
        link.href = safeHref;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Buka tautan tambahan ↗";
        link.className = "muted small";
        card.append(link);
      }
    }
    card.append(actions);
    root.append(card);
  }
}

function fillForm(item) {
  $("announcement-id").value = item.id;
  $("announcement-title").value = item.title || "";
  $("announcement-category").value = item.category || "Kelas";
  $("announcement-status-select").value = item.status || "draft";
  $("announcement-body").value = isAgenda()
    ? item.description || ""
    : item.body || "";
  $("announcement-form-mode").textContent = "Sedang mengubah item";
  $("announcement-form-title").textContent = isAgenda()
    ? "Ubah agenda kegiatan"
    : "Ubah pengumuman";

  if (isAgenda()) {
    $("agenda-starts-at").value = toLocalInput(item.starts_at);
    $("agenda-ends-at").value = toLocalInput(item.ends_at);
    $("agenda-location").value = item.location || "";
  } else {
    $("announcement-publish-at").value = toLocalInput(item.publish_at);
    $("announcement-expires-at").value = toLocalInput(item.expires_at);
    $("announcement-link-url").value = item.link_url || "";
    $("announcement-pinned").checked = item.pinned === true;
  }
  $("announcement-title").focus();
}

export async function loadAnnouncements() {
  const root = $("announcement-list");
  const kind = state.kind;
  const requestId = ++state.requestId;
  root.replaceChildren(safeText("div", "Memuat konten…", "empty"));
  try {
    const payload = await api(`/api/admin/announcements?type=${kind}`);
    if (requestId !== state.requestId || kind !== state.kind) return;
    state.items = Array.isArray(payload.data) ? payload.data : [];
    renderItems();
    setStatus("announcement-status", "Daftar berhasil dimuat.", true);
  } catch (error) {
    if (requestId !== state.requestId || kind !== state.kind) return;
    state.items = [];
    renderItems();
    setStatus(
      "announcement-status",
      error instanceof Error ? error.message : "Gagal memuat daftar.",
    );
  }
}

$("announcement-kind-news").addEventListener("click", () => {
  if (state.kind === "announcements") return;
  setKind("announcements");
  loadAnnouncements();
});

$("announcement-kind-agenda").addEventListener("click", () => {
  if (state.kind === "agenda") return;
  setKind("agenda");
  loadAnnouncements();
});

$("announcement-reset").addEventListener("click", resetForm);
$("announcement-refresh").addEventListener("click", () =>
  loadAnnouncements(),
);

$("announcement-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = $("announcement-title").value.trim();
  if (!title) {
    setStatus("announcement-status", "Judul wajib diisi.");
    $("announcement-title").focus();
    return;
  }

  let payload = {
    title,
    category: $("announcement-category").value.trim() || "Kelas",
    status: $("announcement-status-select").value,
  };
  const id = $("announcement-id").value.trim();
  if (id) payload.id = id;

  if (isAgenda()) {
    const startsAt = fromLocalInput($("agenda-starts-at").value);
    const endsAt = fromLocalInput($("agenda-ends-at").value);
    if (!startsAt) {
      setStatus("announcement-status", "Waktu mulai wajib diisi.");
      $("agenda-starts-at").focus();
      return;
    }
    if (endsAt && endsAt < startsAt) {
      setStatus("announcement-status", "Waktu selesai harus setelah waktu mulai.");
      $("agenda-ends-at").focus();
      return;
    }
    payload = {
      ...payload,
      description: $("announcement-body").value,
      starts_at: startsAt,
      ends_at: endsAt,
      location: $("agenda-location").value.trim() || null,
    };
  } else {
    const publishAt = fromLocalInput($("announcement-publish-at").value);
    const expiresAt = fromLocalInput($("announcement-expires-at").value);
    if (publishAt && expiresAt && expiresAt <= publishAt) {
      setStatus("announcement-status", "Waktu akhir harus setelah jadwal terbit.");
      $("announcement-expires-at").focus();
      return;
    }
    payload = {
      ...payload,
      body: $("announcement-body").value,
      pinned: $("announcement-pinned").checked,
      publish_at: publishAt,
      expires_at: expiresAt,
      link_url: $("announcement-link-url").value.trim() || null,
    };
  }

  const button = $("announcement-save");
  button.disabled = true;
  setStatus("announcement-status", id ? "Menyimpan perubahan…" : "Menyimpan item…");
  try {
    await api(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    resetForm();
    await loadAnnouncements();
    setStatus("announcement-status", "Item berhasil disimpan.", true);
  } catch (error) {
    setStatus(
      "announcement-status",
      error instanceof Error ? error.message : "Item gagal disimpan.",
    );
  } finally {
    button.disabled = false;
  }
});

setKind("announcements");
