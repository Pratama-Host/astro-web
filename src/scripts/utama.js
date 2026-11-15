/* ================================================================
   pokok/skrip/utama.js — TKJ XI-9 | Main Entry Point (ESM)
   Optimized for Astro - Zero Injection UI
   ================================================================ */
"use strict";

import { mulaiTema, pasangPendengarTema } from "./tema.js";
import {
  tampilkanStatusKanvasJaringan,
  aturStatusKanvas,
  ambilStatusKanvas,
} from "./kanvas.js";
import {
  inisialisasiAudio,
  tampilkanStatusAudio,
  aturStatusAudio,
  ambilStatusAudio,
} from "./audio.js";
import {
  initReveal,
  mulaiProgresGulir,
  mulaiKodeRahasia,
  initProgressBar,
  enableFocusTrap,
  disableFocusTrap,
} from "./alat.js";

document.addEventListener("DOMContentLoaded", () => {
  inisialisasiUtama();
});

function inisialisasiUtama() {
  // 1. Theme
  mulaiTema();
  pasangPendengarTema();

  // 2. Canvas
  tampilkanStatusKanvasJaringan();
  const btnKanvas = document.getElementById("tombol-kanvas");
  if (btnKanvas) {
    btnKanvas.addEventListener("click", () => {
      const enabled = !ambilStatusKanvas();
      aturStatusKanvas(enabled);
      tampilkanStatusKanvasJaringan();
    });
  }

  // 3. Audio
  inisialisasiAudio();
  const btnAudio = document.getElementById("tombol-audio");
  if (btnAudio) {
    btnAudio.addEventListener("click", () => {
      const enabled = !ambilStatusAudio();
      aturStatusAudio(enabled);
      tampilkanStatusAudio();
    });
  }

  // 4. Global UI
  initHamburger();
  initReveal();
  mulaiProgresGulir();
  mulaiKodeRahasia();
  initProgressBar();
  // Catatan: Jam (clock) dan Offline Badge dikelola oleh komponen Astro-nya
  // masing-masing (GlobalClock.astro & OfflineBadge.astro) agar tidak duplikasi.
  initBackToTop();
  initLogoLightbox();
  initKeyboardShortcuts();
  initReplayIntro();

  console.log("🚀 TKJ XI-9 (Astro) Initialized");
}

function initHamburger() {
  const btn = document.getElementById("hamburger-tombol");
  const nav = document.getElementById("menu-hamburger");
  const panel = nav?.querySelector(".panel-menu-hamburger");
  const tutupBtn = nav?.querySelector(".tutup-menu-hamburger");
  if (!btn || !nav) return;

  let isOpen = false;
  nav.inert = true;

  function open() {
    isOpen = true;
    nav.inert = false;
    nav.setAttribute("aria-hidden", "false");
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-label", "Tutup menu");
    document.body.classList.add("menu-terbuka");
    document.body.style.overflow = "hidden";
    if (panel) enableFocusTrap(panel);
  }

  function close() {
    isOpen = false;
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Buka menu");
    nav.setAttribute("aria-hidden", "true");
    nav.inert = true;
    document.body.classList.remove("menu-terbuka");
    document.body.style.overflow = "";
    disableFocusTrap();
    btn.focus();
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  btn.addEventListener("click", toggle);

  // Klik overlay (luar panel) untuk menutup
  nav.addEventListener("click", (e) => {
    if (panel && !panel.contains(e.target)) close();
  });

  // Tombol tutup di dalam panel
  tutupBtn?.addEventListener("click", close);

  // Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) close();
  });

  // Kontrol tampilan di dalam menu (ponsel): meneruskan klik ke tombol header asli
  // dan mencerminkan statusnya, sehingga logika animasi/audio tidak diduplikasi.
  nav.querySelectorAll("[data-proxy-for]").forEach((proxy) => {
    const source = document.getElementById(proxy.getAttribute("data-proxy-for"));
    if (!source) {
      proxy.hidden = true;
      return;
    }
    const status = proxy.querySelector("[data-proxy-status]");
    const sync = () => {
      const on = source.classList.contains("aktif");
      proxy.setAttribute("aria-pressed", String(on));
      if (status) status.textContent = on ? "Aktif" : "Mati";
    };
    proxy.addEventListener("click", () => {
      source.click();
      sync();
    });
    new MutationObserver(sync).observe(source, { attributes: true, attributeFilter: ["class"] });
    sync();
  });

  // Highlight link aktif berdasarkan URL saat ini
  const currentPath = window.location.pathname;
  nav.querySelectorAll("a.tautan-menu-hamburger").forEach((link) => {
    const href = link.getAttribute("href");
    const isActive =
      href === currentPath || (href !== "/" && currentPath.startsWith(href));
    link.classList.toggle("aktif", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
  });
}

function initReplayIntro() {
  const btn = document.getElementById("replay-intro-tombol");
  if (!btn) return;
  // Tampilkan tombol replay hanya di halaman beranda
  if (
    window.location.pathname === "/" ||
    window.location.pathname.endsWith("index.html")
  ) {
    btn.classList.add("terlihat");
  }
  btn.addEventListener("click", () => {
    sessionStorage.removeItem("tkj-intro-done");
    window.location.href = "/";
  });
}

function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;
  window.addEventListener(
    "scroll",
    () => btn.classList.toggle("terlihat", window.scrollY > 300),
    { passive: true },
  );
  btn.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" }),
  );
}

function initLogoLightbox() {
  const logo = document.getElementById("brand-logo");
  const lightbox = document.getElementById("logo-jendela");
  const closeBtn = document.getElementById("tutup-logo-jendela");
  if (!logo || !lightbox || !closeBtn) return;

  const open = () => {
    lightbox.inert = false;
    lightbox.classList.add("terbuka");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
    enableFocusTrap(lightbox);
  };
  const close = () => {
    lightbox.classList.remove("terbuka");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.inert = true;
    document.body.style.overflow = "";
    disableFocusTrap();
  };

  logo.addEventListener("click", open);
  // <button> native: Enter/Spasi memicu "click" sehingga tidak perlu penangan keydown.
  closeBtn.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("terbuka")) close();
  });
}

function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (e.key === "t" && !e.ctrlKey && !e.metaKey)
      document.getElementById("tombol-tema")?.click();
  });
}
