/* Admin CMS — Section halaman */
import { $, api, pageNames, safeText, setStatus, state } from "./core.js";

export async function loadSections() {
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
