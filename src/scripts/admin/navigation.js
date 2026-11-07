/* Admin CMS — Navigasi */
import { $, api, safeText, setStatus, state } from "./core.js";

export async function loadNavigation() {
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
