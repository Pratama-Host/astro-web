/* Admin CMS — Unggah aset global */
import { $, api, setStatus, state } from "./core.js";
import { loadDashboard } from "./shell.js";
import { loadContent } from "./content.js";
import { loadAppearance } from "./appearance.js";
import { loadMedia } from "./media.js";

export async function appendImageThumbnail(form, file) {
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

export async function uploadSingle(file, category, globalType = "") {
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
