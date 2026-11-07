/* Admin CMS — Galeri */
import { $, api, safeText, setStatus, state } from "./core.js";
import { loadDashboard } from "./shell.js";
import { appendImageThumbnail } from "./assets.js";
import { loadMedia } from "./media.js";

export async function loadGallery() {
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
