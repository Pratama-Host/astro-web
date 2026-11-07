/* Admin CMS — Tampilan */
import { $, api, setStatus, state, writeIf } from "./core.js";
import { loadContent } from "./content.js";
import { loadDeveloperTheme } from "./developer-theme.js";
import { loadDeveloperStories } from "./developer-stories.js";

const themePaletteDefaults = {
  dark: { accent_color: "#dc2626", background_color: "#0a0505" },
  light: { accent_color: "#0d9488", background_color: "#f8fafc" },
  blue: { accent_color: "#2563eb", background_color: "#020617" },
};

function syncAppearancePalette() {
  const app = state.content?.appearance || {};
  const theme = $("a-theme").value || "dark";
  const saved = (app.palettes || {})[theme] || {};
  const legacy = theme === (app.theme || "dark") ? app : {};
  const defaults = themePaletteDefaults[theme] || themePaletteDefaults.dark;
  writeIf(
    "a-accent",
    saved.accent_color || legacy.accent_color || defaults.accent_color,
  );
  writeIf(
    "a-background-color",
    saved.background_color ||
      legacy.background_color ||
      defaults.background_color,
  );
}

export async function loadAppearance() {
  if (!Object.keys(state.content).length) await loadContent();
  const c = state.content,
    media = c.media || {},
    app = c.appearance || {};
  for (const [id, value] of [
    ["a-logo", media.logo_url],
    ["a-logo-alt", media.alternate_logo_url],
    ["a-favicon", media.favicon_url],
    ["a-background", app.background_image_url],
    ["a-og", c.ogImage],
    ["a-audio", media.audio_url],
  ])
    writeIf(id, value);
  writeIf("a-theme", app.theme || "dark");
  syncAppearancePalette();
  writeIf(
    "a-audio-volume",
    Math.round(Number(media.audio_volume ?? 0.8) * 100),
  );
  for (const [field, preview] of [
    ["a-logo", "preview-logo"],
    ["a-logo-alt", "preview-logo-alt"],
    ["a-favicon", "preview-favicon"],
    ["a-background", "preview-background"],
    ["a-og", "preview-og"],
  ])
    updatePreview(field, preview);
  await loadDeveloperTheme();
  await loadDeveloperStories();
}

$("a-theme").addEventListener("change", syncAppearancePalette);

function updatePreview(field, preview) {
  const img = $(preview),
    url = $(field).value.trim();
  if (url) {
    img.src = url;
    img.classList.remove("hidden");
  } else {
    img.removeAttribute("src");
    img.classList.add("hidden");
  }
}

for (const [field, preview] of [
  ["a-logo", "preview-logo"],
  ["a-logo-alt", "preview-logo-alt"],
  ["a-favicon", "preview-favicon"],
  ["a-background", "preview-background"],
  ["a-og", "preview-og"],
])
  $(field).addEventListener("input", () => updatePreview(field, preview));

$("appearance-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const c = state.content || {};
  const existing = c.appearance || {};
  const theme = $("a-theme").value || "dark";
  const media = {
    ...(c.media || {}),
    logo_url: $("a-logo").value,
    alternate_logo_url: $("a-logo-alt").value,
    favicon_url: $("a-favicon").value,
    audio_url: $("a-audio").value,
    audio_volume: Math.min(
      1,
      Math.max(0, Number($("a-audio-volume").value) / 100),
    ),
  };
  const palettes = { ...(existing.palettes || {}) };
  palettes[theme] = {
    ...(palettes[theme] || {}),
    accent_color: $("a-accent").value,
    background_color: $("a-background-color").value,
  };
  const appearance = {
    ...existing,
    theme,
    palettes,
    accent_color: $("a-accent").value,
    background_color: $("a-background-color").value,
    background_image_url: $("a-background").value,
  };
  const payload = { media, appearance, ogImage: $("a-og").value };
  $("save-appearance").disabled = true;
  try {
    await api("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setStatus(
      "appearance-status",
      "Pengaturan tampilan berhasil disimpan.",
      true,
    );
    await loadContent();
    await loadAppearance();
  } catch (e) {
    setStatus("appearance-status", e.message);
  } finally {
    $("save-appearance").disabled = false;
  }
});
