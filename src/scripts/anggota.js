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
  let G = { namaSiswa: [], strukturOrg: [] };

  try {
    const source = document.getElementById("members-data");
    G = source ? JSON.parse(source.dataset.json || "{}") : G;
  } catch (error) {
    console.warn("Data anggota tidak dapat dibaca.", error);
  }

  const totalSiswa = G?.namaSiswa?.length || cards.length;

  // Search Logic
  if (search) {
    search.addEventListener("input", () => {
      const q = search.value.toLowerCase().trim();
      let matchCount = 0;

      cards.forEach((card) => {
        const name = card.querySelector(".member-card-name")?.textContent.toLowerCase() || "";
        const match = !q || name.includes(q);
        card.style.display = match ? "" : "none";
        if (match) matchCount++;
      });

      if (countEl) countEl.textContent = q ? `Menampilkan ${matchCount} dari ${totalSiswa} anggota` : `Semua ${totalSiswa} anggota`;
      clearBtn?.classList.toggle("terlihat", search.value.length > 0);
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
      search.dispatchEvent(new Event("input"));
      search.focus();
    }
  });

  // Slider Logic
  grid.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    grid.scrollBy({ left: e.deltaY > 0 ? 80 : -80, behavior: "smooth" });
  }, { passive: true });

  document.querySelector(".members-prev")?.addEventListener("click", () => grid.scrollBy({ left: -200, behavior: "smooth" }));
  document.querySelector(".members-next")?.addEventListener("click", () => grid.scrollBy({ left: 200, behavior: "smooth" }));

  // Modal Logic
  let currentAudioInstance = null;

  function terbukaMemberModal(nis) {
    const data = G.namaSiswa.find((s) => s.nis === nis);
    if (!data || !modal) return;

    if (currentAudioInstance) {
      currentAudioInstance.pause();
      currentAudioInstance = null;
    }

    const modalName = document.getElementById("modal-name");
    const modalNis = document.getElementById("modal-nis");
    const modalDesc = document.getElementById("modal-desc");
    if (modalName) modalName.textContent = data.nama || "—";
    if (modalNis) modalNis.textContent = `NIS: ${data.nis || ""}`;

    const roleEl = document.getElementById("modal-role");
    if (roleEl) {
      const org = G.strukturOrg?.find((s) => s.nama === data.nama);
      roleEl.textContent = org?.jabatan || "Anggota";
    }

    const avatarEl = document.getElementById("modal-avatar");
    if (avatarEl) {
      avatarEl.replaceChildren(renderAvatar(data, "lg"));
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

          const icon = document.createElement("i");
          icon.classList.add("fab", iconClass);
          icon.setAttribute("aria-hidden", "true");
          link.appendChild(icon);
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
    if (card) terbukaMemberModal(card.dataset.nis);
  });

  grid.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const card = e.target.closest(".member-card");
      if (card) {
        e.preventDefault();
        terbukaMemberModal(card.dataset.nis);
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
        lb.classList.remove("terbuka");
        document.body.style.overflow = "";
      } else {
        tutupMemberModal();
      }
    }
  });

  // Avatar Click to Lightbox
  document.getElementById("modal-avatar")?.addEventListener("click", () => {
    const name = document.getElementById("modal-name")?.textContent;
    const data = G.namaSiswa.find((s) => s.nama === name);
    if (!data?.foto || !URLValidator.isSafe(data.foto)) return;

    const lb = document.getElementById("member-photo-lightbox");
    const lbImg = document.getElementById("member-photo-lightbox-img");
    if (lb && lbImg) {
      lbImg.src = data.foto;
      lb.classList.add("terbuka");
      document.body.style.overflow = "hidden";
    }
  });

  document.getElementById("member-photo-lightbox-tutup")?.addEventListener("click", () => {
    document.getElementById("member-photo-lightbox")?.classList.remove("terbuka");
    // Modal anggota masih terbuka.
    document.body.style.overflow = "hidden";
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
