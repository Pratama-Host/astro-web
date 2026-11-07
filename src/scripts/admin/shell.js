/* Admin CMS — Kerangka admin: login, sidebar, navigasi tampilan, dasbor */
import { $, api, formatBytes, registry, safeText, setStatus, state, ui, viewTitles } from "./core.js";

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
  ui.currentView = name;
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
  const loaders = registry.loaders;
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

export async function checkSession() {
  try {
    await api("/api/admin/cms");
    showAdmin();
    await loadDashboard();
  } catch {
    showLogin();
  }
}

export async function loadDashboard() {
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
