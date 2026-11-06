/* ================================================================
   pokok/skrip/tema.js — TKJ XI-9 | Theme Management
   ================================================================ */

const validThemes = ["light", "dark", "blue"];
const defaultTheme =
  document.documentElement.getAttribute("data-theme") || "light";
let themeListenerAttached = false;

function ambilTombolTema() {
  return document.getElementById("tombol-tema");
}

export function perbaruiIkonTombol(t) {
  const tombol = ambilTombolTema();
  if (!tombol) return;
  tombol.setAttribute(
    "aria-label",
    t === "dark"
      ? "Aktifkan mode terang"
      : t === "light"
        ? "Aktifkan mode biru"
        : "Aktifkan mode gelap",
  );
}

export function terapkanTema(t, persist = true) {
  const root = document.documentElement;
  root.setAttribute("data-theme", t);
  if (persist) { try { localStorage.setItem("tkj-theme", t); } catch {} }
  perbaruiIkonTombol(t);
  const tombol = ambilTombolTema();
  if (!tombol) return;
  tombol.setAttribute("data-switching", "true");
  document.body.classList.add("theme-switching");
  setTimeout(() => {
    tombol.removeAttribute("data-switching");
    document.body.classList.remove("theme-switching");
  }, 600);
}

export function pasangPendengarTema() {
  if (themeListenerAttached) return;
  const tombol = ambilTombolTema();
  if (!tombol) return;
  tombol.addEventListener("click", (e) => {
    e.stopPropagation();
    const root = document.documentElement;
    const current = root.getAttribute("data-theme") || defaultTheme;
    const idx = validThemes.indexOf(current);
    terapkanTema(validThemes[(idx + 1) % validThemes.length]);
  });
  themeListenerAttached = true;
  const root = document.documentElement;
  perbaruiIkonTombol(root.getAttribute("data-theme") || defaultTheme);
}

export function mulaiTema() {
  let saved = null;
  try { saved = localStorage.getItem("tkj-theme"); } catch {}
  if (!validThemes.includes(saved)) saved = defaultTheme;
  terapkanTema(saved, false);

  const buttonObserver = new MutationObserver(() => {
    if (!themeListenerAttached && ambilTombolTema()) {
      pasangPendengarTema();
      buttonObserver.disconnect();
    }
  });
  buttonObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  return { pasangPendengarTema };
}
