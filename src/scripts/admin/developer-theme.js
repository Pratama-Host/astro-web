/* Admin CMS — Tema halaman pengembang */
import { $, api, setStatus, state } from "./core.js";

const developerThemeDefaults = {
  preset: "brutalist-yellow",
  colors: {
    frame: "#0A0A0A",
    background: "#F4F1E8",
    surface: "#FFFDF8",
    text: "#111111",
    muted: "#686868",
    border: "#111111",
    primary: "#F5CD32",
    secondary: "#32CFC2",
    highlight: "#D90B46",
  },
};

const developerThemeFields = [
  "frame",
  "background",
  "surface",
  "text",
  "muted",
  "border",
  "primary",
  "secondary",
  "highlight",
];

const developerThemePresets = {
  "brutalist-yellow": {
    frame: "#0A0A0A",
    background: "#F4F1E8",
    surface: "#FFFDF8",
    text: "#111111",
    muted: "#686868",
    border: "#111111",
    primary: "#F5CD32",
    secondary: "#32CFC2",
    highlight: "#D90B46",
  },
  monochrome: {
    frame: "#171717",
    background: "#ECECEC",
    surface: "#FFFFFF",
    text: "#111111",
    muted: "#555555",
    border: "#111111",
    primary: "#D5D5D5",
    secondary: "#8A8A8A",
    highlight: "#222222",
  },
  "electric-pop": {
    frame: "#241B35",
    background: "#F8F4FF",
    surface: "#FFFFFF",
    text: "#17112B",
    muted: "#5B5470",
    border: "#17112B",
    primary: "#B7F34A",
    secondary: "#45D7E8",
    highlight: "#D90B46",
  },
};

function setDeveloperThemeInputs(colors) {
  for (const key of developerThemeFields) {
    const input = $(`developer-theme-${key}`);
    if (input)
      input.value = /^#[0-9a-f]{6}$/i.test(String(colors?.[key] || ""))
        ? colors[key]
        : developerThemeDefaults.colors[key];
  }
  updateDeveloperThemePreview();
}

function readDeveloperThemeInputs() {
  const colors = {};
  for (const key of developerThemeFields) {
    const value = $(`developer-theme-${key}`)?.value || "";
    if (!/^#[0-9a-f]{6}$/i.test(value))
      throw Error(`Warna ${key} tidak valid.`);
    colors[key] = value.toUpperCase();
  }
  const issues = getDeveloperThemeContrastIssues(colors);
  if (issues.length)
    throw Error(
      `Warna tidak disimpan karena kontras belum cukup (target 4.5:1): ${issues.join(" · ")}`,
    );
  return colors;
}

function contrastRatio(first, second) {
  const luminance = (hex) => {
    const rgb = hex
      .replace("#", "")
      .match(/.{2}/g)
      .map((value) => parseInt(value, 16) / 255)
      .map((value) =>
        value <= 0.04045
          ? value / 12.92
          : Math.pow((value + 0.055) / 1.055, 2.4),
      );
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function getDeveloperThemeContrastIssues(colors) {
  const pairs = [
    ["Teks / background", colors.text, colors.background, 4.5],
    ["Teks / surface", colors.text, colors.surface, 4.5],
    ["Teks sekunder / background", colors.muted, colors.background, 4.5],
    ["Teks sekunder / surface", colors.muted, colors.surface, 4.5],
    ["Teks / primary", colors.text, colors.primary, 4.5],
    ["Teks / secondary", colors.text, colors.secondary, 4.5],
    ["Tombol highlight", "#FFFFFF", colors.highlight, 4.5],
    ["Border / background", colors.border, colors.background, 3],
    ["Border / surface", colors.border, colors.surface, 3],
  ];
  return pairs
    .filter(
      ([, foreground, background, target]) =>
        contrastRatio(foreground, background) < target,
    )
    .map(
      ([label, foreground, background, target]) =>
        `${label}: ${contrastRatio(foreground, background).toFixed(2)}:1 (minimum ${target}:1)`,
    );
}

function updateDeveloperThemePreview() {
  const preview = $("developer-theme-preview");
  if (!preview) return;
  const colors = {};
  for (const key of developerThemeFields)
    colors[key] =
      $(`developer-theme-${key}`)?.value || developerThemeDefaults.colors[key];
  preview.style.setProperty("--preview-frame", colors.frame);
  preview.style.setProperty("--preview-bg", colors.background);
  preview.style.setProperty("--preview-surface", colors.surface);
  preview.style.setProperty("--preview-text", colors.text);
  preview.style.setProperty("--preview-muted", colors.muted);
  preview.style.setProperty("--preview-border", colors.border);
  preview.style.setProperty("--preview-primary", colors.primary);
  preview.style.setProperty("--preview-secondary", colors.secondary);
  preview.style.setProperty("--preview-highlight", colors.highlight);
  const issues = getDeveloperThemeContrastIssues(colors);
  setStatus(
    "developer-theme-contrast",
    issues.length
      ? `Kontras perlu diperbaiki (target 4.5:1): ${issues.join(" · ")}`
      : "Kontras dasar teks: lulus pemeriksaan 4.5:1.",
    issues.length === 0,
  );
}

export async function getDeveloperThemeSource() {
  const pages = await api("/api/admin/pages");
  state.pages = pages.data || [];
  const page = state.pages.find((item) => item.slug === "/pengembang") || {};
  let draft = null;
  try {
    draft = (await api("/api/admin/drafts?slug=%2Fpengembang")).data;
  } catch (error) {
    setStatus(
      "developer-theme-status",
      `Draft belum dapat dibaca: ${error.message}`,
    );
  }
  if (!draft) {
    state.developerThemeSource = page;
    return page;
  }
  // Overlay partial draft fields on the published/fallback page so saving
  // a theme never drops older content or metadata that was not in the draft.
  const publishedContent =
    page.content && typeof page.content === "object" ? page.content : {};
  const draftContent =
    draft.content && typeof draft.content === "object" ? draft.content : {};
  const publishedDeveloper =
    publishedContent.developer && typeof publishedContent.developer === "object"
      ? publishedContent.developer
      : {};
  const draftDeveloper =
    draftContent.developer && typeof draftContent.developer === "object"
      ? draftContent.developer
      : {};
  const publishedTheme =
    publishedDeveloper.theme && typeof publishedDeveloper.theme === "object"
      ? publishedDeveloper.theme
      : {};
  const draftTheme =
    draftDeveloper.theme && typeof draftDeveloper.theme === "object"
      ? draftDeveloper.theme
      : {};
  const mergedDeveloper = {
    ...publishedDeveloper,
    ...draftDeveloper,
    profile: {
      ...(publishedDeveloper.profile || {}),
      ...(draftDeveloper.profile || {}),
    },
    theme: {
      ...publishedTheme,
      ...draftTheme,
      colors: {
        ...(publishedTheme.colors || {}),
        ...(draftTheme.colors || {}),
      },
    },
    stories:
      Array.isArray(draftDeveloper.stories) && draftDeveloper.stories.length
        ? draftDeveloper.stories
        : publishedDeveloper.stories || [],
    legacyTimeline:
      Array.isArray(draftDeveloper.legacyTimeline) &&
      draftDeveloper.legacyTimeline.length
        ? draftDeveloper.legacyTimeline
        : publishedDeveloper.legacyTimeline || [],
  };
  state.developerThemeSource = {
    ...page,
    ...draft,
    content: {
      ...publishedContent,
      ...draftContent,
      developer: mergedDeveloper,
    },
  };
  return state.developerThemeSource;
}

export async function saveDeveloperPageDraft(nextDeveloper, statusId, message) {
  const source =
    state.developerThemeSource || (await getDeveloperThemeSource());
  const content =
    source?.content && typeof source.content === "object"
      ? JSON.parse(JSON.stringify(source.content))
      : {};
  content.developer =
    content.developer && typeof content.developer === "object"
      ? content.developer
      : {};
  Object.assign(content.developer, nextDeveloper);
  const body = {
    slug: "/pengembang",
    title: source?.title || "Portofolio Pengembang — Alfredo Pratama",
    description:
      source?.description ||
      "Profil, karya, perjalanan belajar, prinsip, dan catatan pengembang.",
    og_image: source?.og_image || null,
    noindex: source?.noindex === true,
    content,
  };
  const result = await api("/api/admin/drafts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  state.developerThemeSource = result.data;
  setStatus(statusId, message, true);
  return result.data;
}

export async function loadDeveloperTheme() {
  const source = await getDeveloperThemeSource();
  const content =
    source?.content && typeof source.content === "object" ? source.content : {};
  const developer =
    content.developer && typeof content.developer === "object"
      ? content.developer
      : {};
  const theme =
    developer.theme && typeof developer.theme === "object"
      ? developer.theme
      : {};
  const preset = [
    "brutalist-yellow",
    "monochrome",
    "electric-pop",
    "custom",
  ].includes(theme.preset)
    ? theme.preset
    : "brutalist-yellow";
  $("developer-theme-preset").value = preset;
  setDeveloperThemeInputs({
    ...developerThemeDefaults.colors,
    ...(theme.colors || {}),
  });
  setStatus(
    "developer-theme-status",
    source?.updated_at
      ? `Memuat konfigurasi draft terakhir: ${new Date(source.updated_at).toLocaleString("id-ID")}.`
      : "Memuat fallback awal. Belum ada tema pengembang yang tersimpan.",
    true,
  );
}

$("developer-theme-preset").addEventListener("change", () => {
  const preset = $("developer-theme-preset").value;
  if (developerThemePresets[preset])
    setDeveloperThemeInputs(developerThemePresets[preset]);
  else updateDeveloperThemePreview();
});

for (const key of developerThemeFields)
  $(`developer-theme-${key}`).addEventListener("input", () => {
    $("developer-theme-preset").value = "custom";
    updateDeveloperThemePreview();
  });

$("reset-developer-theme").addEventListener("click", () => {
  $("developer-theme-preset").value = "brutalist-yellow";
  setDeveloperThemeInputs(developerThemeDefaults.colors);
  setStatus(
    "developer-theme-status",
    "Preset awal dipulihkan di preview. Simpan sebagai draft untuk menyimpan perubahan.",
    true,
  );
});

$("save-developer-theme").addEventListener("click", async () => {
  const button = $("save-developer-theme");
  button.disabled = true;
  try {
    const colors = readDeveloperThemeInputs();
    await saveDeveloperPageDraft(
      { theme: { preset: $("developer-theme-preset").value, colors } },
      "developer-theme-status",
      "Tema tersimpan sebagai draft. Halaman publik belum berubah; buka preview untuk memeriksanya.",
    );
  } catch (error) {
    setStatus("developer-theme-status", error.message);
  } finally {
    button.disabled = false;
  }
});

$("preview-developer-theme").addEventListener("click", () =>
  window.open("/pengembang?previewDraft=1", "_blank", "noopener,noreferrer"),
);

$("publish-developer-theme").addEventListener("click", async () => {
  if (
    !confirm(
      "Publikasikan draft tema Pengembang? Perubahan akan terlihat pada halaman publik.",
    )
  )
    return;
  const button = $("publish-developer-theme");
  button.disabled = true;
  try {
    const result = await api("/api/admin/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "/pengembang", action: "publish" }),
    });
    setStatus(
      "developer-theme-status",
      result.message || "Tema dipublikasikan.",
      true,
    );
    await loadDeveloperTheme();
  } catch (error) {
    setStatus(
      "developer-theme-status",
      `Publikasi belum tersedia: ${error.message}. Periksa supabase/migrations/20261106000100_baseline.sql pada database terlebih dahulu.`,
    );
  } finally {
    button.disabled = false;
  }
});
