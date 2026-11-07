/* Admin CMS — Backup, riwayat versi, dan audit */
import { $, api, safeText, setStatus, ui } from "./core.js";
import { loadDashboard } from "./shell.js";

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

async function loadAudit(offset = ui.auditOffset) {
  ui.auditOffset = Math.max(0, offset);
  const params = new URLSearchParams({
    limit: "25",
    offset: String(ui.auditOffset),
  });
  if ($("audit-search").value.trim())
    params.set("q", $("audit-search").value.trim());
  if ($("audit-entity").value) params.set("entity", $("audit-entity").value);
  if ($("audit-action").value) params.set("action", $("audit-action").value);
  const payload = await api(`/api/admin/audit?${params}`);
  ui.auditHasMore = payload.hasMore === true;
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
  const page = Math.floor(ui.auditOffset / 25) + 1;
  $("audit-page-label").textContent =
    `Halaman ${page} · ${payload.count || 0} catatan`;
  $("audit-prev").disabled = ui.auditOffset === 0;
  $("audit-next").disabled = !ui.auditHasMore;
}

$("refresh-audit").addEventListener("click", () =>
  loadAudit(0).catch((e) => setStatus("audit-status", e.message)),
);

$("audit-prev").addEventListener("click", () =>
  loadAudit(Math.max(0, ui.auditOffset - 25)).catch((e) =>
    setStatus("audit-status", e.message),
  ),
);

$("audit-next").addEventListener("click", () => {
  if (ui.auditHasMore)
    loadAudit(ui.auditOffset + 25).catch((e) =>
      setStatus("audit-status", e.message),
    );
});

["audit-search", "audit-entity", "audit-action"].forEach((id) =>
  $(id).addEventListener(id === "audit-search" ? "change" : "change", () =>
    loadAudit(0).catch((e) => setStatus("audit-status", e.message)),
  ),
);
