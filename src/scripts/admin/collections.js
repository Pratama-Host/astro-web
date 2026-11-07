/* Admin CMS — Guru dan keahlian */
import { $, api, setStatus, state } from "./core.js";
import { loadDashboard } from "./shell.js";

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

export async function loadCollections() {
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
