/* Admin CMS — Cerita pengembang */
import { $, setStatus, state, ui, writeIf } from "./core.js";
import { getDeveloperThemeSource, saveDeveloperPageDraft } from "./developer-theme.js";

const storyTextToBlocks = (value) => {
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };
  for (const raw of String(value || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "heading", text: line.slice(3).trim() });
    } else if (line.startsWith("- ")) {
      flush();
      blocks.push({ type: "list", text: line.slice(2).trim() });
    } else paragraph.push(line);
  }
  flush();
  return blocks;
};

const storyBlocksToText = (blocks) =>
  (blocks || [])
    .map((block) =>
      block.type === "heading"
        ? `## ${block.text}`
        : block.type === "list"
          ? `- ${block.text}`
          : block.text,
    )
    .join("\n\n");

function renderDeveloperStorySelect() {
  const select = $("developer-story-select");
  select.replaceChildren();
  ui.developerStories.forEach((story, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = story.title || `Bab ${index + 1}`;
    select.append(option);
  });
  if (!ui.developerStories.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Belum ada bab";
    select.append(option);
  }
  select.value = String(
    Math.min(ui.selectedDeveloperStory, Math.max(0, ui.developerStories.length - 1)),
  );
  fillDeveloperStoryForm();
}

function fillDeveloperStoryForm() {
  const story = ui.developerStories[ui.selectedDeveloperStory] || {};
  writeIf("developer-story-title", story.title || "");
  writeIf("developer-story-subtitle", story.subtitle || "");
  writeIf("developer-story-body", storyBlocksToText(story.blocks));
  writeIf("developer-story-code-title", story.codeTitle || "");
  writeIf("developer-story-code-language", story.codeLanguage || "JavaScript");
  writeIf("developer-story-code", story.code || "");
  writeIf("developer-story-quote", story.quote || "");
  $("developer-story-remove").disabled = ui.developerStories.length === 0;
}

export async function loadDeveloperStories() {
  await getDeveloperThemeSource();
  const content = state.developerThemeSource?.content || {};
  const developer = content.developer || {};
  ui.developerStories =
    Array.isArray(developer.stories) && developer.stories.length
      ? JSON.parse(JSON.stringify(developer.stories))
      : [];
  ui.selectedDeveloperStory = 0;
  renderDeveloperStorySelect();
  setStatus(
    "developer-story-status",
    ui.developerStories.length
      ? `${ui.developerStories.length} bab siap diedit. Naskah sumber lama disertakan sebagai fallback.`
      : "Belum ada bab yang dapat diedit. Muat ulang halaman.",
    true,
  );
}

$("developer-story-select").addEventListener("change", () => {
  ui.selectedDeveloperStory = Number($("developer-story-select").value) || 0;
  fillDeveloperStoryForm();
});

$("developer-story-add").addEventListener("click", () => {
  ui.developerStories.push({
    key: `chapter-${ui.developerStories.length + 1}`,
    title: "Bab baru",
    subtitle: "",
    blocks: [],
  });
  ui.selectedDeveloperStory = ui.developerStories.length - 1;
  renderDeveloperStorySelect();
  $("developer-story-title").focus();
});

$("developer-story-remove").addEventListener("click", () => {
  if (!ui.developerStories.length) return;
  if (!confirm("Hapus bab ini dari draft Pengembang?")) return;
  ui.developerStories.splice(ui.selectedDeveloperStory, 1);
  ui.selectedDeveloperStory = Math.max(0, ui.selectedDeveloperStory - 1);
  renderDeveloperStorySelect();
});

$("save-developer-story").addEventListener("click", async () => {
  const button = $("save-developer-story");
  button.disabled = true;
  try {
    if (!ui.developerStories.length)
      throw Error("Tambahkan minimal satu bab terlebih dahulu.");
    const title = $("developer-story-title").value.trim();
    if (!title) throw Error("Judul bab wajib diisi.");
    const current = ui.developerStories[ui.selectedDeveloperStory] || {};
    ui.developerStories[ui.selectedDeveloperStory] = {
      ...current,
      title,
      subtitle: $("developer-story-subtitle").value.trim(),
      blocks: storyTextToBlocks($("developer-story-body").value),
      codeTitle: $("developer-story-code-title").value.trim(),
      codeLanguage: $("developer-story-code-language").value.trim() || "text",
      code: $("developer-story-code").value,
      quote: $("developer-story-quote").value.trim(),
    };
    await saveDeveloperPageDraft(
      { stories: ui.developerStories },
      "developer-story-status",
      "Bab tersimpan sebagai draft. Naskah publik belum berubah.",
    );
    renderDeveloperStorySelect();
  } catch (error) {
    setStatus("developer-story-status", error.message);
  } finally {
    button.disabled = false;
  }
});

$("preview-developer-story").addEventListener("click", () =>
  window.open("/pengembang?previewDraft=1", "_blank", "noopener,noreferrer"),
);
