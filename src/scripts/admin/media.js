/* Admin CMS — Media library */
import { $, api, formatBytes, safeText, setStatus, state } from "./core.js";
import { loadDashboard } from "./shell.js";
import { appendImageThumbnail, uploadSingle } from "./assets.js";

export async function loadMedia() {
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
