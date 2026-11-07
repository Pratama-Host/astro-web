/* Admin CMS — SEO dan draft halaman */
import { $, api, pageNames, safeText, setStatus, state, writeIf } from "./core.js";
import { loadDashboard } from "./shell.js";

export async function loadPages() {
  const payload = await api("/api/admin/pages");
  state.pages = payload.data || [];
  renderSeoList();
  await fillSeoForm();
}

async function fillSeoForm() {
  const slug = $("seo-page").value;
  const page = state.pages.find((x) => x.slug === slug);
  let draft = null;
  try {
    draft = (await api(`/api/admin/drafts?slug=${encodeURIComponent(slug)}`))
      .data;
  } catch (e) {
    setStatus("seo-status", e.message);
  }
  const source = draft || page;
  writeIf("seo-title", source?.title);
  writeIf("seo-description", source?.description);
  writeIf("seo-og", source?.og_image);
  writeIf("seo-content", JSON.stringify(source?.content || {}, null, 2));
  $("seo-noindex").checked = source?.noindex === true;
  $("publish-page-draft").disabled = !draft;
  $("preview-page-draft").disabled = !draft;
  $("discard-page-draft").disabled = !draft;
  setStatus(
    "seo-status",
    draft
      ? `Draft terakhir diperbarui ${new Date(draft.updated_at).toLocaleString("id-ID")}.`
      : "Tidak ada draft. Form menampilkan konten yang sedang dipublikasikan.",
    Boolean(draft),
  );
}

function renderSeoList() {
  const root = $("seo-list");
  root.replaceChildren();
  for (const p of state.pages) {
    const row = document.createElement("div");
    row.style.cssText =
      "padding:10px 0;border-bottom:1px solid #292d39;display:flex;justify-content:space-between;gap:10px;align-items:center";
    row.append(
      safeText("strong", pageNames[p.slug] || p.slug),
      safeText("span", p.title || "Belum ada title", "muted small"),
    );
    const button = safeText("button", "Edit", "btn ghost small-btn");
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `Edit SEO ${pageNames[p.slug] || p.slug}`,
    );
    button.addEventListener("click", () => {
      $("seo-page").value = p.slug;
      fillSeoForm();
    });
    row.append(button);
    root.append(row);
  }
}

$("seo-page").addEventListener("change", () =>
  fillSeoForm().catch((e) => setStatus("seo-status", e.message)),
);

$("reload-seo").addEventListener("click", () =>
  loadPages().catch((e) => setStatus("seo-status", e.message)),
);

function readSeoForm() {
  let content;
  try {
    content = JSON.parse($("seo-content").value || "{}");
    if (!content || Array.isArray(content) || typeof content !== "object")
      throw Error();
  } catch {
    throw Error("Konten halaman harus berupa JSON object yang valid.");
  }
  return {
    slug: $("seo-page").value,
    title: $("seo-title").value,
    description: $("seo-description").value,
    og_image: $("seo-og").value,
    noindex: $("seo-noindex").checked,
    content,
  };
}

$("seo-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  let data;
  try {
    data = readSeoForm();
  } catch (error) {
    setStatus("seo-status", error.message);
    return;
  }
  try {
    await api("/api/admin/drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setStatus(
      "seo-status",
      "Draft tersimpan. Halaman publik belum berubah.",
      true,
    );
    await fillSeoForm();
  } catch (error) {
    setStatus("seo-status", error.message);
  }
});

$("publish-page-draft").addEventListener("click", async () => {
  const slug = $("seo-page").value;
  if (
    !confirm(
      `Publikasikan draft untuk ${pageNames[slug] || slug}? Konten publik akan berubah.`,
    )
  )
    return;
  try {
    const result = await api("/api/admin/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, action: "publish" }),
    });
    setStatus(
      "seo-status",
      [result.message, ...(result.warnings || [])].join(" "),
      true,
    );
    await loadPages();
    await loadDashboard();
  } catch (error) {
    setStatus("seo-status", error.message);
  }
});

$("preview-page-draft").addEventListener("click", () => {
  const slug = $("seo-page").value;
  window.open(
    `${slug === "/" ? "/" : slug}?previewDraft=1`,
    "_blank",
    "noopener,noreferrer",
  );
});

$("discard-page-draft").addEventListener("click", async () => {
  const slug = $("seo-page").value;
  if (!confirm(`Buang draft untuk ${pageNames[slug] || slug}?`)) return;
  try {
    await api("/api/admin/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, action: "discard" }),
    });
    setStatus(
      "seo-status",
      "Draft dibuang. Konten publik tidak berubah.",
      true,
    );
    await fillSeoForm();
  } catch (error) {
    setStatus("seo-status", error.message);
  }
});
