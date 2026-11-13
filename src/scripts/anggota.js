/* ================================================================
   halaman/anggota/skrip.js — TKJ XI-9
   Optimized for Astro - Pre-rendered content
   ================================================================ */
"use strict";

import {
  initReveal,
  enableFocusTrap,
  disableFocusTrap,
  renderAvatar,
  URLValidator,
} from "./alat.js";

import { buatIkon } from "./ikon.js";

const SOCIAL_ICON_CLASSES = Object.freeze({
  instagram: "fa-instagram",
  youtube: "fa-youtube",
  tiktok: "fa-tiktok",
  facebook: "fa-facebook-f",
  twitter: "fa-twitter",
  x: "fa-x-twitter",
  github: "fa-github",
  linkedin: "fa-linkedin-in",
  whatsapp: "fa-whatsapp",
});

function safeSocialUrl(value) {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (!input || input === "#") return null;

  try {
    const parsed = new URL(input);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initReveal();
  initMembersInteractions();
});

function initMembersInteractions() {
  const grid = document.getElementById("members-grid");
  const search = document.getElementById("member-search");
  const clearBtn = document.getElementById("hapus-pencarian");
  const countEl = document.getElementById("member-count");
  const modal = document.getElementById("member-modal");
  const modalClose = document.getElementById("member-modal-tutup");

  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll(".member-card"));
  const emptyState = document.createElement("p");
  emptyState.className = "members-empty-state";
  emptyState.setAttribute("role", "status");
  emptyState.textContent = cards.length ? "Tidak ada anggota yang cocok dengan pencarian." : "Belum ada data anggota yang ditampilkan.";
  emptyState.hidden = cards.length > 0;
  grid.closest(".members-slider-container")?.insertAdjacentElement("afterend", emptyState);
  let G = { namaSiswa: [], strukturOrg: [] };

  try {
    const source = document.getElementById("members-data");
    G = source ? JSON.parse(source.dataset.json || "{}") : G;
  } catch (error) {
    console.warn("Data anggota tidak dapat dibaca.", error);
  }

  const totalSiswa = G?.namaSiswa?.length || cards.length;

  // Filter, Search, Sort & View State
  let currentFilter = "all";
  let currentSort = "default";
  let currentQuery = "";

  function applyFiltersAndSort() {
    let matchCount = 0;

    cards.forEach((card) => {
      const name = card.dataset.nama || card.querySelector(".member-card-name")?.textContent || "";
      const nis = card.dataset.nis || "";
      const role = card.dataset.role || card.querySelector(".member-card-role")?.textContent || "";
      const isOrg = card.dataset.isOrg === "true";
      const hasPhoto = card.dataset.hasPhoto === "true";
      const hasAudio = card.dataset.hasAudio === "true";

      const searchable = `${name} ${nis} ${role}`.toLocaleLowerCase("id-ID");
      const matchSearch = !currentQuery || searchable.includes(currentQuery);

      let matchFilter = true;
      if (currentFilter === "pengurus") matchFilter = isOrg;
      else if (currentFilter === "foto") matchFilter = hasPhoto;
      else if (currentFilter === "audio") matchFilter = hasAudio;

      const visible = matchSearch && matchFilter;
      card.style.display = visible ? "" : "none";
      if (visible) matchCount++;
    });

    const sortedCards = [...cards].sort((a, b) => {
      if (currentSort === "name-asc") {
        return (a.dataset.nama || "").localeCompare(b.dataset.nama || "", "id");
      }
      if (currentSort === "name-desc") {
        return (b.dataset.nama || "").localeCompare(a.dataset.nama || "", "id");
      }
      if (currentSort === "nis-asc") {
        return (Number(a.dataset.nis) || 0) - (Number(b.dataset.nis) || 0);
      }
      if (currentSort === "nis-desc") {
        return (Number(b.dataset.nis) || 0) - (Number(a.dataset.nis) || 0);
      }
      return (Number(a.dataset.urutan) || 0) - (Number(b.dataset.urutan) || 0);
    });

    sortedCards.forEach((card) => grid.appendChild(card));

    if (countEl) {
      if (currentQuery || currentFilter !== "all") {
        countEl.textContent = `Menampilkan ${matchCount} dari ${totalSiswa} anggota`;
      } else {
        countEl.textContent = `Semua ${totalSiswa} anggota`;
      }
    }
    emptyState.hidden = matchCount > 0;
    emptyState.textContent = cards.length ? "Tidak ada anggota yang cocok dengan filter atau pencarian." : "Belum ada data anggota yang ditampilkan.";
    grid.setAttribute("aria-label", `Daftar anggota kelas (${matchCount} ditampilkan)`);
    clearBtn?.classList.toggle("terlihat", currentQuery.length > 0);
  }

  // Search Logic
  if (search) {
    search.addEventListener("input", () => {
      currentQuery = search.value.toLowerCase().trim();
      applyFiltersAndSort();
    });

    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (e.key === "/" && tag !== "input" && tag !== "textarea") {
        e.preventDefault();
        search.focus();
      }
    });
  }

  clearBtn?.addEventListener("click", () => {
    if (search) {
      search.value = "";
      currentQuery = "";
      applyFiltersAndSort();
      search.focus();
    }
  });

  // Filter Pills Logic
  const filterPills = document.querySelectorAll(".filter-pill");
  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.forEach((p) => {
        p.classList.remove("active");
        p.setAttribute("aria-selected", "false");
      });
      pill.classList.add("active");
      pill.setAttribute("aria-selected", "true");
      currentFilter = pill.dataset.filter || "all";
      applyFiltersAndSort();
    });
  });

  // Sort Dropdown Logic
  const sortSelect = document.getElementById("member-sort");
  sortSelect?.addEventListener("change", () => {
    currentSort = sortSelect.value || "default";
    applyFiltersAndSort();
  });

  // View Mode Toggle (Grid vs List)
  const viewGridBtn = document.getElementById("view-grid-btn");
  const viewListBtn = document.getElementById("view-list-btn");

  function setViewMode(mode) {
    if (mode === "list") {
      grid.classList.add("is-compact-view");
      viewGridBtn?.classList.remove("active");
      viewGridBtn?.setAttribute("aria-pressed", "false");
      viewListBtn?.classList.add("active");
      viewListBtn?.setAttribute("aria-pressed", "true");
    } else {
      grid.classList.remove("is-compact-view");
      viewListBtn?.classList.remove("active");
      viewListBtn?.setAttribute("aria-pressed", "false");
      viewGridBtn?.classList.add("active");
      viewGridBtn?.setAttribute("aria-pressed", "true");
    }
    try { localStorage.setItem("tkj-member-view", mode); } catch {}
  }

  try {
    const savedView = localStorage.getItem("tkj-member-view");
    if (savedView === "list") setViewMode("list");
  } catch {}

  viewGridBtn?.addEventListener("click", () => setViewMode("grid"));
  viewListBtn?.addEventListener("click", () => setViewMode("list"));

  // Slider Logic
  grid.addEventListener("wheel", (e) => {
    if (grid.scrollWidth <= grid.clientWidth + 2) return;
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    grid.scrollBy({ left: e.deltaY > 0 ? 80 : -80, behavior: "smooth" });
  }, { passive: true });

  document.querySelector(".members-prev")?.addEventListener("click", () => grid.scrollBy({ left: -200, behavior: "smooth" }));
  document.querySelector(".members-next")?.addEventListener("click", () => grid.scrollBy({ left: 200, behavior: "smooth" }));

  // Modal Logic
  let currentAudioInstance = null;

  function terbukaMemberModal(key) {
    const data = G.namaSiswa[Number(key)];
    if (!data || !modal) return;

    if (currentAudioInstance) {
      currentAudioInstance.pause();
      currentAudioInstance = null;
    }

    const modalName = document.getElementById("modal-name");
    const modalNis = document.getElementById("modal-nis");
    const modalDesc = document.getElementById("modal-desc");
    if (modalName) modalName.textContent = data.nama || "—";
    if (modalNis && data.nis) modalNis.textContent = `NIS: ${data.nis || ""}`;

    const roleEl = document.getElementById("modal-role");
    if (roleEl) {
      const org = G.strukturOrg?.find((s) => s.nama === data.nama);
      roleEl.textContent = org?.jabatan || "Anggota";
    }

    const avatarEl = document.getElementById("modal-avatar");
    if (avatarEl) {
      avatarEl.replaceChildren(renderAvatar(data));
      avatarEl.style.cursor = data.foto ? "pointer" : "default";
    }

    if (modalDesc) modalDesc.textContent = data.desc || "";

    // Social links
    const socialEl = document.getElementById("modal-social");
    if (socialEl) {
      socialEl.replaceChildren();
      if (data.social && typeof data.social === "object" && !Array.isArray(data.social)) {
        Object.entries(data.social).forEach(([platform, value]) => {
          const iconClass = Object.prototype.hasOwnProperty.call(SOCIAL_ICON_CLASSES, platform)
            ? SOCIAL_ICON_CLASSES[platform]
            : null;
          const safeUrl = safeSocialUrl(value);
          if (!iconClass || !safeUrl) return;

          const link = document.createElement("a");
          link.href = safeUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.setAttribute("aria-label", `Buka ${platform} anggota`);

          link.appendChild(buatIkon(platform));
          socialEl.appendChild(link);
        });
      }
    }

    // Audio
    const audioEl = document.getElementById("modal-audio");
    if (audioEl) {
      audioEl.replaceChildren();
      const player = buildAudioPlayer(data);
      if (player) {
        audioEl.appendChild(player);
        initAudioPlayer(audioEl, (audio) => {
          currentAudioInstance = audio;
        });
      }
    }

    modal.classList.add("terbuka");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    enableFocusTrap(modal);
    modalClose?.focus();
  }

  function tutupMemberModal() {
    if (photoLightbox?.classList.contains("terbuka")) {
      photoLightbox.classList.remove("terbuka");
      photoLightbox.setAttribute("aria-hidden", "true");
      photoLightboxImg?.removeAttribute("src");
      disableFocusTrap();
    }
    if (currentAudioInstance) {
      currentAudioInstance.pause();
      currentAudioInstance = null;
    }
    modal?.classList.remove("terbuka");
    modal?.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    disableFocusTrap();
  }

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".member-card");
    if (card) terbukaMemberModal(card.dataset.key);
  });

  grid.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const card = e.target.closest(".member-card");
      if (card) {
        e.preventDefault();
        terbukaMemberModal(card.dataset.key);
      }
    }
  });

  modalClose?.addEventListener("click", tutupMemberModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) tutupMemberModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const lb = document.getElementById("member-photo-lightbox");
      if (lb?.classList.contains("terbuka")) {
        tutupPhotoLightbox();
      } else {
        tutupMemberModal();
      }
    }
  });

  // Photo lightbox is a nested dialog, so keep its own focus trap and return focus to the member modal.
  const photoLightbox = document.getElementById("member-photo-lightbox");
  const photoLightboxImg = document.getElementById("member-photo-lightbox-img");
  const photoLightboxClose = document.getElementById("member-photo-lightbox-tutup");

  function tutupPhotoLightbox() {
    if (!photoLightbox?.classList.contains("terbuka")) return;
    photoLightbox.classList.remove("terbuka");
    photoLightbox.setAttribute("aria-hidden", "true");
    if (photoLightboxImg) photoLightboxImg.removeAttribute("src");
    // Parent member dialog remains open underneath the photo overlay.
    document.body.style.overflow = modal?.classList.contains("terbuka") ? "hidden" : "";
    disableFocusTrap();
  }

  document.getElementById("modal-avatar")?.addEventListener("click", () => {
    const name = document.getElementById("modal-name")?.textContent;
    const data = G.namaSiswa.find((s) => s.nama === name);
    if (!data?.foto || !URLValidator.isSafe(data.foto)) return;
    if (photoLightbox && photoLightboxImg) {
      photoLightboxImg.src = data.foto;
      photoLightbox.classList.add("terbuka");
      photoLightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      enableFocusTrap(photoLightbox);
    }
  });

  photoLightboxClose?.addEventListener("click", tutupPhotoLightbox);
  photoLightbox?.addEventListener("click", (event) => {
    if (event.target === photoLightbox) tutupPhotoLightbox();
  });
}

function buildAudioPlayer(member) {
  if (!member.audio) return null;
  const safe = URLValidator.sanitize(member.audio);
  if (!safe) return null;

  const root = document.createElement("div");
  root.className = "whatsapp-audio-player";
  root.dataset.src = safe;

  const trackInfo = document.createElement("div");
  trackInfo.className = "audio-track-info";

  const trackTitle = document.createElement("div");
  trackTitle.className = "player-track-title";
  trackTitle.textContent = member.namaAudio || member.nama || "";

  const trackArtist = document.createElement("p");
  trackArtist.className = "player-track-artist";
  trackArtist.textContent = member.descAudio || member.desc || "";
  trackInfo.append(trackTitle, trackArtist);

  const controls = document.createElement("div");
  controls.className = "audio-controls";

  const playButton = document.createElement("button");
  playButton.className = "audio-play-btn";
  playButton.type = "button";
  const playIcon = document.createElement("span");
  playIcon.className = "play-icon";
  playIcon.textContent = "▶";
  playButton.appendChild(playIcon);

  const waveform = document.createElement("div");
  waveform.className = "audio-waveform";
  for (let index = 0; index < 20; index++) {
    const bar = document.createElement("span");
    bar.style.height = `${20 + Math.random() * 80}%`;
    waveform.appendChild(bar);
  }

  const audioInfo = document.createElement("div");
  audioInfo.className = "audio-info";
  const duration = document.createElement("span");
  duration.className = "audio-duration";
  duration.textContent = "0:00";
  const speed = document.createElement("span");
  speed.className = "audio-speed";
  speed.textContent = "1x";
  audioInfo.append(duration, " ", speed);
  controls.append(playButton, waveform, audioInfo);

  const progress = document.createElement("div");
  progress.className = "audio-progress";
  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";
  const progressFill = document.createElement("div");
  progressFill.className = "progress-fill";
  progressBar.appendChild(progressFill);
  progress.appendChild(progressBar);

  const speedControls = document.createElement("div");
  speedControls.className = "audio-speed-controls";
  for (const value of ["1", "1.5", "2"]) {
    const button = document.createElement("button");
    button.className = "speed-btn";
    button.type = "button";
    button.dataset.speed = value;
    button.textContent = `${value}x`;
    speedControls.appendChild(button);
  }

  root.append(trackInfo, controls, progress, speedControls);
  return root;
}

function initAudioPlayer(container, setAudio) {
  const player = container.querySelector(".whatsapp-audio-player");
  if (!player) return;

  const audio = new Audio(player.dataset.src);
  setAudio(audio);

  const playBtn = player.querySelector(".audio-play-btn");
  const playIcon = player.querySelector(".play-icon");
  const durEl = player.querySelector(".audio-duration");
  const speedEl = player.querySelector(".audio-speed");
  const fill = player.querySelector(".progress-fill");

  audio.addEventListener("loadedmetadata", () => {
    if (durEl) durEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (fill && Number.isFinite(audio.duration) && audio.duration > 0) {
      fill.style.width = `${audio.currentTime / audio.duration * 100}%`;
    }
    if (durEl) durEl.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener("ended", () => {
    if (playIcon) playIcon.textContent = "▶";
    player.classList.remove("playing");
  });

  playBtn?.addEventListener("click", () => {
    if (audio.paused) {
      void audio.play().catch(() => {
        if (playIcon) playIcon.textContent = "▶";
        player.classList.remove("playing");
      });
      if (playIcon) playIcon.textContent = "❚❚";
      player.classList.add("playing");
    } else {
      audio.pause();
      if (playIcon) playIcon.textContent = "▶";
      player.classList.remove("playing");
    }
  });

  player.querySelectorAll(".speed-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.dataset.speed);
      if (!Number.isFinite(value) || value <= 0) return;
      audio.playbackRate = value;
      if (speedEl) speedEl.textContent = `${value}x`;
    });
  });
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
