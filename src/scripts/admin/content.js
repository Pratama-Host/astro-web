/* Admin CMS — Konten situs */
import { $, api, readJsonField, setStatus, state, writeIf } from "./core.js";
import { loadDashboard } from "./shell.js";

export async function loadContent() {
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
