/* ================================================================
   halaman/galeri/skrip.js — TKJ XI-9
   Optimized for Astro - Pre-rendered content
   ================================================================ */
"use strict";

import { initReveal, RevealObserver, enableFocusTrap, disableFocusTrap } from "./alat.js";

document.addEventListener("DOMContentLoaded", () => {
  initGalleryImageLoading();
  initGalleryProgressiveLoading();
  initGallery();
  initReveal();
  initGalleryLightbox();
});

let carouselIndex = 0;
let carouselItemsData = [];

function initGalleryImageLoading(root = document) {
  const images = root.querySelectorAll(".item-galeri img");
  images.forEach((img) => {
    const show = () => img.classList.add("loaded");

    if (img.complete && img.naturalWidth > 0) {
      show();
    } else {
      img.addEventListener("load", show, { once: true });
      img.addEventListener("error", () => img.classList.add("loaded"), {
        once: true,
      });
    }
  });
}


function initGalleryProgressiveLoading() {
  const grid = document.getElementById("grid-galeri");
  const template = document.getElementById("gallery-more-template");
  const button = document.getElementById("load-more-gallery");
  const status = document.getElementById("gallery-load-more-status");
  if (!grid || !template || !button) return;

  const batchSize = 8;
  button.addEventListener("click", () => {
    let appended = 0;
    const fragment = document.createDocumentFragment();
    while (appended < batchSize && template.content.firstElementChild) {
      fragment.appendChild(template.content.firstElementChild);
      appended++;
    }
    if (!appended) {
      button.hidden = true;
      return;
    }

    const addedItems = Array.from(fragment.children);
    grid.appendChild(fragment);
    addedItems.forEach((item) => initGalleryImageLoading(item));
    RevealObserver.observe(addedItems);
    const remaining = template.content.children.length;
    if (remaining > 0 && remaining < batchSize) button.textContent = `Muat ${remaining} foto lagi`;
    if (status) status.textContent = `${appended} foto ditambahkan. ${remaining} foto tersisa.`;
    if (remaining === 0) {
      button.hidden = true;
      template.remove();
      addedItems[addedItems.length - 1]?.focus();
    }
  });
}

function initGallery() {
  const carousel = document.getElementById("carousel-3d");
  const dotsContainer = document.getElementById("carousel-3d-dots");
  if (!carousel || !dotsContainer) return;

  const items = carousel.querySelectorAll(".carousel-item");
  carouselItemsData = Array.from(items).map((item) => ({
    src: item.querySelector("img")?.src || "",
    caption: item.querySelector("img")?.alt || "",
  }));
  if (carouselItemsData.length === 0) return;

  carousel.setAttribute("role", "region");
  carousel.setAttribute("aria-roledescription", "carousel");
  updateCarousel();

  document
    .getElementById("carousel-3d-prev")
    ?.addEventListener("click", () => moveCarousel(-1));
  document
    .getElementById("carousel-3d-next")
    ?.addEventListener("click", () => moveCarousel(1));
  dotsContainer.addEventListener("click", (event) => {
    const dot = event.target.closest(".carousel-dot");
    if (!dot) return;
    const nextIndex = Number.parseInt(dot.dataset.index, 10);
    if (Number.isInteger(nextIndex)) {
      carouselIndex = nextIndex;
      updateCarousel();
    }
  });

  // Auto-rotation must pause for reduced-motion users, pointer hover, keyboard focus,
  // and hidden tabs. A single timer prevents duplicated autoplay intervals.
  const wrapper = document.querySelector(".carousel-3d-wrapper");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const canHover = Boolean(window.matchMedia?.("(hover: hover)").matches);
  let autoPlay = null;
  let userPaused = false;
  const autoPlayButton = document.getElementById("carousel-autoplay-toggle");
  const refreshAutoPlayButton = () => {
    if (!autoPlayButton) return;
    const motionBlocked = Boolean(reducedMotion?.matches);
    autoPlayButton.disabled = motionBlocked;
    autoPlayButton.textContent = motionBlocked
      ? "Gerak otomatis nonaktif"
      : userPaused
        ? "Lanjutkan otomatis"
        : "Jeda otomatis";
    autoPlayButton.setAttribute(
      "aria-label",
      motionBlocked
        ? "Gerak otomatis dinonaktifkan oleh preferensi perangkat"
        : userPaused
          ? "Lanjutkan pergantian foto otomatis"
          : "Jeda pergantian foto otomatis",
    );
    autoPlayButton.setAttribute("aria-pressed", String(userPaused));
  };
  const stopAutoPlay = () => {
    if (autoPlay !== null) window.clearInterval(autoPlay);
    autoPlay = null;
  };
  const startAutoPlay = () => {
    stopAutoPlay();
    if (
      !wrapper ||
      reducedMotion?.matches ||
      userPaused ||
      document.hidden ||
      (canHover && wrapper.matches(":hover")) ||
      document.activeElement?.matches?.(":focus-visible") && wrapper.contains(document.activeElement)
    )
      return;
    autoPlay = window.setInterval(() => moveCarousel(1), 5000);
  };

  autoPlayButton?.addEventListener("click", () => {
    userPaused = !userPaused;
    refreshAutoPlayButton();
    if (userPaused) stopAutoPlay();
    else startAutoPlay();
  });
  refreshAutoPlayButton();
  wrapper?.addEventListener("mouseenter", () => { if (canHover) stopAutoPlay(); });
  wrapper?.addEventListener("mouseleave", startAutoPlay);
  wrapper?.addEventListener("focusin", (e) => { if (e.target.matches?.(":focus-visible")) stopAutoPlay(); });
  wrapper?.addEventListener("focusout", (event) => {
    if (!wrapper.contains(event.relatedTarget)) startAutoPlay();
  });
  document.addEventListener("visibilitychange", () =>
    document.hidden ? stopAutoPlay() : startAutoPlay(),
  );
  reducedMotion?.addEventListener?.("change", () => {
    refreshAutoPlayButton();
    reducedMotion.matches ? stopAutoPlay() : startAutoPlay();
  });
  startAutoPlay();

  carousel.addEventListener("click", (event) => {
    const item = event.target.closest(".carousel-item");
    if (!item) return;
    if (item.classList.contains("active")) {
      const idx = Number.parseInt(item.dataset.index, 10);
      const data = carouselItemsData[idx];
      if (data && typeof window.terbukaLightbox === "function")
        window.terbukaLightbox(data.src, data.caption);
    } else {
      carouselIndex = Number.parseInt(item.dataset.index, 10);
      updateCarousel();
    }
  });
  let swipeX = null;
  let swiped = false;
  carousel.addEventListener("pointerdown", (e) => { swipeX = e.clientX; swiped = false; });
  carousel.addEventListener("pointerup", (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 50) { swiped = true; moveCarousel(dx < 0 ? 1 : -1); }
  });
  carousel.addEventListener("click", (e) => { if (swiped) { swiped = false; e.stopImmediatePropagation(); } }, true);
  carousel.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const item = event.target.closest(".carousel-item");
    if (!item) return;
    event.preventDefault();
    item.click();
  });
}

function moveCarousel(direction) {
  const max = carouselItemsData.length;
  if (max === 0) return;
  carouselIndex = (carouselIndex + direction + max) % max;
  updateCarousel();
}

function updateCarousel() {
  const items = document.querySelectorAll(".carousel-item");
  const dots = document.querySelectorAll(".carousel-dot");
  const max = items.length;

  items.forEach((item, idx) => {
    item.className = "carousel-item";
    item.setAttribute("tabindex", idx === carouselIndex ? "0" : "-1");
    item.setAttribute(
      "aria-label",
      `Slide ${idx + 1} dari ${max}: ${carouselItemsData[idx]?.caption || "Foto galeri"}`,
    );
    item.setAttribute("aria-current", idx === carouselIndex ? "true" : "false");
    if (idx === carouselIndex) item.classList.add("active");
    else if (idx === (carouselIndex - 1 + max) % max)
      item.classList.add("prev");
    else if (idx === (carouselIndex + 1) % max) item.classList.add("next");
    else if (idx === (carouselIndex - 2 + max) % max)
      item.classList.add("prev-hidden");
    else item.classList.add("next-hidden");
  });

  dots.forEach((dot, idx) => {
    const active = idx === carouselIndex;
    dot.classList.toggle("active", active);
    dot.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function initGalleryLightbox() {
  const grid = document.getElementById("grid-galeri");
  const lightbox = document.getElementById("jendela-gambar");
  const tutupBtn = document.getElementById("tutup-jendela");
  const img = document.getElementById("lightbox-img");
  const caption = document.getElementById("lb-caption-bar");
  const prevBtn = document.getElementById("lb-prev");
  const nextBtn = document.getElementById("lb-next");
  if (!lightbox || !tutupBtn || !img || !caption) return;

  let list = [];
  let pos = 0;
  let clearTimer = null;
  const dataOf = (item) => ({
    src: item.querySelector("img")?.src || "",
    text: item.querySelector(".keterangan-galeri span")?.textContent || item.querySelector("img")?.alt || "",
  });
  const show = () => {
    const d = list[pos];
    if (!d) return;
    img.src = d.src;
    img.alt = d.text || "Pratinjau foto galeri";
    caption.textContent = d.text;
    const multi = list.length > 1;
    if (prevBtn) prevBtn.hidden = !multi;
    if (nextBtn) nextBtn.hidden = !multi;
  };
  const step = (n) => {
    if (list.length < 2) return;
    pos = (pos + n + list.length) % list.length;
    show();
  };

  window.terbukaLightbox = function (src, text) {
    if (!src) return;
    list = Array.from(document.querySelectorAll("#grid-galeri .item-galeri")).map(dataOf).filter((d) => d.src);
    pos = list.findIndex((d) => d.src === src);
    if (pos < 0) { list = [{ src, text: text || "" }]; pos = 0; }
    clearTimeout(clearTimer);
    show();
    lightbox.inert = false;
    lightbox.classList.add("terbuka");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    enableFocusTrap(lightbox);
  };

  function tutupLightbox() {
    lightbox.classList.remove("terbuka");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.inert = true;
    document.body.style.overflow = "";
    disableFocusTrap();
    // Kosongkan gambar setelah fade selesai agar ikon gambar rusak tidak berkedip.
    clearTimer = setTimeout(() => { img.removeAttribute("src"); caption.textContent = ""; }, 450);
  }

  if (grid) {
    const open = (item) => {
      const d = dataOf(item);
      if (d.src) window.terbukaLightbox(d.src, d.text);
    };
    grid.addEventListener("click", (e) => {
      const item = e.target.closest(".item-galeri");
      if (item) open(item);
    });
    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const item = e.target.closest(".item-galeri");
      if (!item) return;
      e.preventDefault();
      open(item);
    });
  }

  tutupBtn.addEventListener("click", tutupLightbox);
  prevBtn?.addEventListener("click", () => step(-1));
  nextBtn?.addEventListener("click", () => step(1));
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) tutupLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("terbuka")) return;
    if (e.key === "Escape") tutupLightbox();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });
}
