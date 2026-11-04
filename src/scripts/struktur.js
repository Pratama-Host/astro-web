/* ================================================================
   halaman/struktur/skrip.js — TKJ XI-9
   Optimized for Astro - Pre-rendered content
   ================================================================ */
"use strict";

import { initReveal, enableFocusTrap, disableFocusTrap } from "./alat.js";

document.addEventListener("DOMContentLoaded", () => {
  initReveal();
  initStructureLightbox();
});

function initStructureLightbox() {
  const lightbox = document.getElementById("structure-photo-lightbox");
  const tutupBtn = document.getElementById("structure-photo-lightbox-tutup");
  const img = document.getElementById("structure-photo-lightbox-img");
  const wrap = document.getElementById("org-wrap");

  if (!lightbox || !tutupBtn || !img || !wrap) return;

  let captionDiv = document.getElementById("structure-lightbox-caption");
  let placeholder = document.getElementById("structure-lightbox-placeholder");
  if (!placeholder) {
    placeholder = document.createElement("div");
    placeholder.id = "structure-lightbox-placeholder";
    placeholder.className = "structure-lightbox-placeholder";
    placeholder.hidden = true;
    lightbox.insertBefore(placeholder, img);
  }
  if (!captionDiv) {
    captionDiv = document.createElement("div");
    captionDiv.id = "structure-lightbox-caption";
    captionDiv.className = "bilah-keterangan-jendela";
    captionDiv.style.textAlign = "center";
    captionDiv.style.padding = "16px";
    captionDiv.style.background = "rgba(0,0,0,0.85)";
    captionDiv.style.borderTop = "1px solid var(--border-mid)";
    lightbox.appendChild(captionDiv);
  }

  function terbukaLightboxStruktur(src, nama, jabatan, profil) {
    img.hidden = !src;
    if (src) {
      img.src = src;
      img.alt = `Foto ${nama || "pengurus kelas"}`;
      placeholder.hidden = true;
      placeholder.textContent = "";
    } else {
      img.removeAttribute("src");
      placeholder.hidden = false;
      placeholder.textContent = String(nama || "?").trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase() || "").join("") || "?";
    }
    captionDiv.replaceChildren();

    const namaElement = document.createElement("div");
    namaElement.style.cssText = "font-weight:700;font-size:1.25rem;color:white;margin-bottom:4px;";
    namaElement.textContent = String(nama || "");

    const jabatanElement = document.createElement("div");
    jabatanElement.style.cssText = "color:var(--accent);font-family:monospace;font-size:0.9rem;margin-bottom:12px;letter-spacing:0.05em;text-transform:uppercase;";
    jabatanElement.textContent = String(jabatan || "");

    captionDiv.append(namaElement, jabatanElement);

    if (profil) {
      const profilElement = document.createElement("div");
      profilElement.style.cssText = "font-size:0.9rem;color:var(--text-2);max-width:500px;margin:0 auto;line-height:1.5;";
      profilElement.textContent = String(profil);
      captionDiv.appendChild(profilElement);
    }

    lightbox.classList.add("terbuka");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    enableFocusTrap(lightbox);
  }

  function tutupLightbox() {
    lightbox.classList.remove("terbuka");
    lightbox.setAttribute("aria-hidden", "true");
    img.hidden = false;
    img.removeAttribute("src");
    placeholder.hidden = true;
    document.body.style.overflow = "";
    disableFocusTrap();
  }

  wrap.addEventListener("click", (e) => {
    const card = e.target.closest(".org-card");
    if (!card) return;
    const { nama, jabatan, foto, desc } = card.dataset;
    terbukaLightboxStruktur(foto, nama, jabatan, desc);
  });

  wrap.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".org-card");
    if (!card) return;
    e.preventDefault();
    const { nama, jabatan, foto, desc } = card.dataset;
    terbukaLightboxStruktur(foto, nama, jabatan, desc);
  });

  tutupBtn.addEventListener("click", tutupLightbox);
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) tutupLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("terbuka")) tutupLightbox();
  });
}
