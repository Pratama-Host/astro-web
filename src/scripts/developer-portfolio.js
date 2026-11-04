(() => {
  "use strict";

  const card = document.getElementById("developer-card");
  if (!card) return;

  const $ = (selector, scope = card) => scope.querySelector(selector);
  const $$ = (selector, scope = card) =>
    Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pages = $$(".page");
  const navItems = $$("[data-nav]");
  const drawer = $("#drawer");
  const overlay = $("#overlay");
  const menuButton = $('[data-action="menu"]');
  let previousFocus = null;
  if (drawer) drawer.inert = true;
  let quoteIndex = 0;
  let quoteTimer = null;
  let typingTimer = null;
  let glitchTimer = null;
  let revealObserver = null;
  let quotePaused = false;
  let quoteInteracting = false;
  let touchStartX = 0;
  let statsAnimated = false;
  let paletteIndex = 0;
  const paletteSets = [
    ["#F5CD32", "#32CFC2", "#D90B46"],
    ["#9BE7FF", "#FFB4A2", "#5B3A9E"],
    ["#B7E4C7", "#FFD6A5", "#7B2CBF"],
  ];

  const safeUrl = (value) => {
    if (typeof value !== "string" || value.length > 2048) return null;
    try {
      const url = new URL(value, window.location.href);
      return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol)
        ? url.href
        : null;
    } catch {
      return null;
    }
  };

  const showToast = (message) => {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(
      () => toast.classList.remove("show"),
      2200,
    );
  };

  const showSound = () => {
    if (reducedMotion.matches) return;
    const words = [
      ["POW!", "var(--dev-highlight, #D90B46)", "var(--dev-surface, #FFFDF8)"],
      ["BAM!", "var(--dev-primary, #F5CD32)", "var(--dev-text, #111111)"],
      ["WHAM!", "var(--dev-secondary, #32CFC2)", "var(--dev-text, #111111)"],
      ["ZAP!", "var(--dev-primary, #F5CD32)", "var(--dev-text, #111111)"],
      ["BOOM!", "var(--dev-highlight, #D90B46)", "var(--dev-surface, #FFFDF8)"],
      ["NICE!", "var(--dev-secondary, #32CFC2)", "var(--dev-text, #111111)"],
    ];
    const [label, background, color] =
      words[Math.floor(Math.random() * words.length)];
    const element = document.createElement("div");
    element.className = "sound-fx";
    element.textContent = label;
    element.style.background = background;
    element.style.color = color;
    element.setAttribute("aria-hidden", "true");
    const maxLeft = Math.max(0, card.clientWidth - 150);
    element.style.left = `${Math.round(Math.random() * maxLeft)}px`;
    element.style.top = `${Math.max(70, window.scrollY - card.getBoundingClientRect().top + 120)}px`;
    card.append(element);
    window.setTimeout(() => element.remove(), 1100);
  };

  const shakeCard = () => {
    if (reducedMotion.matches) return;
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
    window.setTimeout(() => card.classList.remove("shake"), 420);
  };

  const openDrawer = () => {
    if (!drawer || !overlay) return;
    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    drawer.inert = false;
    drawer.classList.add("open");
    overlay.classList.add("on");
    drawer.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
    menuButton?.setAttribute("aria-expanded", "true");
    $('[data-action="close-menu"]', drawer)?.focus();
  };

  const closeDrawer = () => {
    if (!drawer || !overlay) return;
    const wasOpen = drawer.classList.contains("open");
    drawer.classList.remove("open");
    overlay.classList.remove("on");
    drawer.inert = true;
    drawer.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
    menuButton?.setAttribute("aria-expanded", "false");
    if (wasOpen && previousFocus?.isConnected) previousFocus.focus();
    previousFocus = null;
  };

  const triggerReveal = (scope = card) => {
    const targets = $$("[data-reveal]", scope);
    if (!("IntersectionObserver" in window) || reducedMotion.matches) {
      targets.forEach((item) => item.classList.add("in"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("in");
            if (
              entry.target.classList.contains("proj") &&
              !entry.target.dataset.stampAngle
            ) {
              const angle = (Math.random() * 1.2 - 0.6).toFixed(2);
              entry.target.dataset.stampAngle = angle;
              entry.target.style.setProperty("--stamp-angle", `${angle}deg`);
            }
            revealObserver?.unobserve(entry.target);
          });
        },
        { threshold: 0.12 },
      );
    }
    targets.forEach((item) => {
      item.classList.remove("in");
      revealObserver?.observe(item);
    });
  };

  const animateStats = () => {
    if (statsAnimated) return;
    const counters = $$("[data-countup]");
    if (!counters.length) return;
    statsAnimated = true;
    const animate = (element) => {
      const target = Math.max(
        0,
        Number.parseInt(element.getAttribute("data-countup") || "0", 10) || 0,
      );
      if (reducedMotion.matches || !("requestAnimationFrame" in window)) {
        element.textContent = String(target);
        return;
      }
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min(1, (now - start) / 750);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = String(Math.round(target * eased));
        if (progress < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) {
      counters.forEach(animate);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate(entry.target);
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.2 },
    );
    counters.forEach((element) => observer.observe(element));
  };

  const showPage = (pageId, navId = pageId, updateHistory = true) => {
    const target = $(`#page-${CSS.escape(pageId)}`);
    if (!target) return;
    pages.forEach((page) => {
      const active = page === target;
      page.classList.toggle("active", active);
      page.hidden = !active;
      page.setAttribute("aria-hidden", active ? "false" : "true");
    });
    navItems.forEach((item) => {
      const active = item.getAttribute("data-nav") === navId;
      item.classList.toggle("on", active);
      item.setAttribute("aria-current", active ? "page" : "false");
    });
    const mobilePageName = $(".mobile-page-name");
    const activeNav = navItems.find(
      (item) =>
        item.getAttribute("data-nav") === navId &&
        item.hasAttribute("data-nav-label"),
    );
    if (mobilePageName && activeNav)
      mobilePageName.textContent =
        activeNav.getAttribute("data-nav-label") || "Portofolio";
    closeDrawer();
    if (updateHistory) {
      const next = `#page-${pageId}`;
      if (window.location.hash !== next)
        window.history.pushState({ pageId }, "", next);
    }
    window.scrollTo({
      top: 0,
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
    triggerReveal(target);
    if (pageId === "skills" || pageId === "work") animateStats();
    if (pageId === "quotes") startQuoteCarousel();
    else stopQuoteCarousel();
  };

  const updateProgress = () => {
    const bar = $("#scroll-progress");
    if (!bar) return;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = range > 0 ? (window.scrollY / range) * 100 : 0;
    bar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
  };

  const updateClock = () => {
    const clock = $("#clock-time");
    if (!clock) return;
    try {
      const now = new Date();
      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now);
      const date = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(now);
      clock.textContent = `${date} · ${time} WIB`;
    } catch {
      clock.textContent = new Date().toLocaleTimeString();
    }
  };

  const copyText = async (text, button) => {
    if (!text) return;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      /* Use the legacy fallback below. */
    }
    if (!copied) {
      try {
        const field = document.createElement("textarea");
        field.value = text;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        copied = document.execCommand("copy");
        field.remove();
      } catch {
        copied = false;
      }
    }
    if (!copied) {
      showToast("GAGAL MENYALIN");
      return;
    }
    showToast("TERSALIN");
    if (button) {
      const originalLabel =
        button.getAttribute("aria-label") || "Salin informasi";
      button.classList.add("copied");
      button.setAttribute("aria-label", "Berhasil disalin");
      window.setTimeout(() => {
        if (button.isConnected) {
          button.classList.remove("copied");
          button.setAttribute("aria-label", originalLabel);
        }
      }, 1500);
    }
    showSound();
  };

  const quoteCarousel = $("[data-carousel]");
  const quoteSlides = quoteCarousel
    ? $$("[data-quote-slide]", quoteCarousel)
    : [];
  const updateQuoteStatus = () => {
    if (!quoteCarousel) return;
    const counter = $(".quote-count", quoteCarousel);
    if (counter)
      counter.textContent = `${String(quoteIndex + 1).padStart(2, "0")} / ${String(quoteSlides.length).padStart(2, "0")}`;
    quoteSlides.forEach((slide, index) => {
      const active = index === quoteIndex;
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      slide.inert = !active;
    });
  };
  const changeQuote = (index) => {
    if (!quoteCarousel || quoteSlides.length === 0) return;
    quoteIndex =
      ((index % quoteSlides.length) + quoteSlides.length) % quoteSlides.length;
    const track = $(".quote-track", quoteCarousel);
    if (track) track.style.transform = `translateX(-${quoteIndex * 100}%)`;
    $$("[data-dot]", quoteCarousel).forEach((dot, dotIndex) => {
      const active = dotIndex === quoteIndex;
      dot.classList.toggle("on", active);
      dot.setAttribute("aria-pressed", active ? "true" : "false");
    });
    updateQuoteStatus();
  };
  const stopQuoteCarousel = () => {
    if (quoteTimer !== null) window.clearTimeout(quoteTimer);
    quoteTimer = null;
  };
  const startQuoteCarousel = () => {
    stopQuoteCarousel();
    if (
      !quoteCarousel ||
      quotePaused ||
      quoteInteracting ||
      quoteSlides.length < 2 ||
      quoteCarousel.getAttribute("data-auto") !== "true" ||
      reducedMotion.matches ||
      document.visibilityState === "hidden"
    )
      return;
    quoteTimer = window.setTimeout(() => {
      changeQuote(quoteIndex + 1);
      startQuoteCarousel();
    }, 5200);
  };
  if (quoteCarousel) {
    quoteCarousel.addEventListener("mouseenter", () => {
      quoteInteracting = true;
      stopQuoteCarousel();
    });
    quoteCarousel.addEventListener("mouseleave", () => {
      quoteInteracting = false;
      startQuoteCarousel();
    });
    quoteCarousel.addEventListener("focusin", () => {
      quoteInteracting = true;
      stopQuoteCarousel();
    });
    quoteCarousel.addEventListener("focusout", (event) => {
      if (!quoteCarousel.contains(event.relatedTarget)) {
        quoteInteracting = false;
        startQuoteCarousel();
      }
    });
    quoteCarousel.addEventListener(
      "pointerdown",
      (event) => {
        touchStartX = event.clientX;
        quoteInteracting = true;
        stopQuoteCarousel();
      },
      { passive: true },
    );
    const finishQuoteTouch = () =>
      window.setTimeout(() => {
        quoteInteracting =
          quoteCarousel.matches(":hover") ||
          quoteCarousel.contains(document.activeElement);
        startQuoteCarousel();
      }, 900);
    quoteCarousel.addEventListener(
      "pointerup",
      (event) => {
        const delta = event.clientX - touchStartX;
        if (Math.abs(delta) > 45)
          changeQuote(quoteIndex + (delta < 0 ? 1 : -1));
        finishQuoteTouch();
      },
      { passive: true },
    );
    quoteCarousel.addEventListener("pointercancel", finishQuoteTouch, {
      passive: true,
    });
    quoteCarousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        changeQuote(quoteIndex - 1);
        stopQuoteCarousel();
      }
      if (event.key === "ArrowRight") {
        changeQuote(quoteIndex + 1);
        stopQuoteCarousel();
      }
    });
    $("[data-quote-prev]", quoteCarousel)?.addEventListener("click", () => {
      changeQuote(quoteIndex - 1);
      startQuoteCarousel();
    });
    $("[data-quote-next]", quoteCarousel)?.addEventListener("click", () => {
      changeQuote(quoteIndex + 1);
      startQuoteCarousel();
    });
    $("[data-quote-pause]", quoteCarousel)?.addEventListener(
      "click",
      (event) => {
        quotePaused = !quotePaused;
        const button = event.currentTarget;
        button.textContent = quotePaused ? "Lanjutkan" : "Jeda";
        button.setAttribute(
          "aria-label",
          quotePaused ? "Lanjutkan otomatis" : "Jeda otomatis",
        );
        button.setAttribute("aria-pressed", String(quotePaused));
        if (quotePaused) stopQuoteCarousel();
        else startQuoteCarousel();
      },
    );
    updateQuoteStatus();
  }

  const runTyping = () => {
    const target = $("#typing");
    if (!target) return;
    let lines = [];
    try {
      const parsed = JSON.parse(card.getAttribute("data-taglines") || "[]");
      if (Array.isArray(parsed))
        lines = parsed
          .filter((line) => typeof line === "string" && line.trim())
          .slice(0, 12);
    } catch {
      /* Retain the server-rendered fallback line. */
    }
    if (!lines.length) lines = [target.textContent?.trim() || "Keep learning."];
    if (reducedMotion.matches) {
      target.textContent = lines[0];
      return;
    }
    let phraseIndex = 0;
    let character = 0;
    let deleting = false;
    const tick = () => {
      const phrase = lines[phraseIndex] || lines[0];
      character += deleting ? -1 : 1;
      target.replaceChildren(
        document.createTextNode(phrase.slice(0, Math.max(0, character))),
      );
      const cursor = document.createElement("span");
      cursor.className = "cursor";
      cursor.setAttribute("aria-hidden", "true");
      target.append(cursor);
      let delay = deleting ? 30 : 58;
      if (!deleting && character >= phrase.length) {
        deleting = true;
        delay = 1700;
      } else if (deleting && character <= 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % lines.length;
        delay = 360;
      }
      typingTimer = window.setTimeout(tick, delay);
    };
    typingTimer = window.setTimeout(tick, 380);
  };

  const scrambleName = () => {
    const element = $("#nameEl");
    if (!element || reducedMotion.matches) return;
    const target = element.textContent || "";
    const alphabet = "!@#$%^&*()_+|{}[]<>ABCDEFGHIJKLMNOP";
    let iteration = 0;
    const interval = window.setInterval(() => {
      let output = "";
      for (let index = 0; index < target.length; index += 1) {
        if (index < iteration) output += target[index];
        else
          output +=
            target[index] === " "
              ? " "
              : alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      element.textContent = output;
      iteration += Math.max(1, Math.ceil(target.length / 14));
      if (iteration >= target.length) {
        window.clearInterval(interval);
        element.textContent = target;
      }
    }, 38);
  };

  card.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest(
            "[data-action], [data-copy], [data-page], [data-link], [data-dot], [data-sound]",
          )
        : null;
    if (!target || !card.contains(target)) return;

    if (target.hasAttribute("data-sound")) {
      showSound();
      if (target.hasAttribute("data-shake")) shakeCard();
    }

    if (target.hasAttribute("data-dot")) {
      const dotIndex = Number.parseInt(
        target.getAttribute("data-dot") || "0",
        10,
      );
      changeQuote(Number.isFinite(dotIndex) ? dotIndex : 0);
      startQuoteCarousel();
      return;
    }

    if (target.hasAttribute("data-copy")) {
      const text = target.getAttribute("data-copy") || "";
      copyText(
        text,
        target.classList.contains("ctc-action")
          ? target
          : $(".ctc-action", target),
      );
      return;
    }

    if (target.hasAttribute("data-link")) {
      const destination = safeUrl(target.getAttribute("data-link") || "");
      if (!destination) return;
      const anchor = document.createElement("a");
      anchor.href = destination;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      return;
    }

    if (target.hasAttribute("data-page")) {
      const page = target.getAttribute("data-page") || "about";
      const nav = target.getAttribute("data-nav") || page;
      showPage(page, nav);
      return;
    }

    const action = target.getAttribute("data-action");
    if (action === "menu") openDrawer();
    else if (action === "close-menu") closeDrawer();
  });

  // Exclusive story accordion with deep-link support.
  const avatarImage = $(".av img");
  const fallbackAvatar = () => {
    const avatar = $(".av");
    const initials = card.getAttribute("data-initials") || "AP";
    avatarImage?.remove();
    if (avatar) avatar.textContent = initials;
  };
  avatarImage?.addEventListener("error", fallbackAvatar);
  if (avatarImage?.complete && avatarImage.naturalWidth === 0) fallbackAvatar();
  const storyAccordion = $("[data-story-accordion]");
  const storyItems = storyAccordion
    ? $$("[data-story-item]", storyAccordion)
    : [];
  const setStoryOpen = (item, open, scroll = false, exclusive = true) => {
    const button = $(".story-toggle", item);
    const panel = $(".story-panel", item);
    if (!button || !panel) return;
    if (open && exclusive)
      storyItems
        .filter((other) => other !== item)
        .forEach((other) => setStoryOpen(other, false, false, false));
    button.setAttribute("aria-expanded", String(open));
    const instruction = $(".story-heading-copy em", button);
    if (instruction)
      instruction.textContent = open
        ? "Ketuk untuk menutup"
        : "Ketuk untuk membuka";
    panel.setAttribute("aria-hidden", String(!open));
    panel.inert = !open;
    panel.classList.toggle("open", open);
    const icon = $(".story-toggle-icon svg", button);
    if (icon)
      icon.innerHTML = open
        ? '<path d="M5 12h14"/>'
        : '<path d="M12 5v14M5 12h14"/>';
    if (open && exclusive) {
      const key = item.id;
      if (key && window.location.hash !== `#${key}`)
        window.history.pushState({ story: key }, "", `#${key}`);
    }
    if (scroll && open)
      window.setTimeout(
        () =>
          item.scrollIntoView({
            behavior: reducedMotion.matches ? "auto" : "smooth",
            block: "start",
          }),
        80,
      );
  };
  storyItems.forEach((item) =>
    $(".story-toggle", item)?.addEventListener("click", () =>
      setStoryOpen(
        item,
        $(".story-toggle", item).getAttribute("aria-expanded") !== "true",
        true,
      ),
    ),
  );
  $("[data-story-expand]")?.addEventListener("click", () =>
    storyItems.forEach((item) => setStoryOpen(item, true, false, false)),
  );
  $("[data-story-collapse]")?.addEventListener("click", () =>
    storyItems.forEach((item) => setStoryOpen(item, false)),
  );
  const openStoryFromHash = () => {
    const match = window.location.hash.match(/^#legacy-story-(.+)$/);
    if (!match) return false;
    const item = document.getElementById(`legacy-story-${match[1]}`);
    if (!item) return false;
    showPage("story", "story", false);
    setStoryOpen(item, true, true);
    return true;
  };

  // Project filters and expandable details.
  $$("[data-project-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      const filter = button.getAttribute("data-project-filter") || "Semua";
      $$("[data-project-filter]").forEach((chip) => {
        const active = chip === button;
        chip.classList.toggle("active", active);
        chip.setAttribute("aria-pressed", String(active));
      });
      $$(".proj").forEach((project) => {
        window.clearTimeout(project.filterTimer);
        const hide =
          filter !== "Semua" &&
          project.getAttribute("data-project-category") !== filter;
        if (hide) {
          project.classList.add("filter-out");
          project.filterTimer = window.setTimeout(
            () => {
              project.hidden = true;
            },
            reducedMotion.matches ? 0 : 180,
          );
        } else {
          project.hidden = false;
          if (reducedMotion.matches) project.classList.remove("filter-out");
          else
            window.requestAnimationFrame(() =>
              project.classList.remove("filter-out"),
            );
        }
      });
    }),
  );
  $$(".project-detail-toggle").forEach((button) =>
    button.addEventListener("click", () => {
      const detail = button.parentElement?.querySelector(".project-detail");
      if (!detail) return;
      const open = detail.hidden;
      detail.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      button.textContent = open ? "Tutup detail" : "Detail proyek";
    }),
  );

  // Small, bounded extras: Konami comic burst, palette clock, pointer tilt and hover medal.
  const konami = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  let konamiIndex = 0;
  document.addEventListener("keydown", (event) => {
    if (reducedMotion.matches) return;
    konamiIndex =
      event.key.toLowerCase() === konami[konamiIndex].toLowerCase()
        ? konamiIndex + 1
        : 0;
    if (konamiIndex === konami.length) {
      for (let i = 0; i < 5; i++) window.setTimeout(showSound, i * 120);
      konamiIndex = 0;
    }
  });
  let paletteTimer = null;
  $("#clock")?.addEventListener("click", () => {
    if (reducedMotion.matches) return;
    paletteIndex = (paletteIndex + 1) % paletteSets.length;
    const [yellow, cyan, red] = paletteSets[paletteIndex];
    card.style.setProperty("--yellow", yellow);
    card.style.setProperty("--cyan", cyan);
    card.style.setProperty("--red", red);
    window.clearTimeout(paletteTimer);
    paletteTimer = window.setTimeout(() => {
      card.style.removeProperty("--yellow");
      card.style.removeProperty("--cyan");
      card.style.removeProperty("--red");
    }, 12000);
  });
  if (
    window.matchMedia("(hover:hover) and (pointer:fine)").matches &&
    !reducedMotion.matches
  )
    $$(".proj").forEach((project) => {
      project.addEventListener("pointermove", (event) => {
        const rect = project.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        project.style.transform = `perspective(700px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 3).toFixed(2)}deg)`;
        project.style.setProperty(
          "--glare-x",
          `${((x + 0.5) * 100).toFixed(1)}%`,
        );
        project.style.setProperty(
          "--glare-y",
          `${((y + 0.5) * 100).toFixed(1)}%`,
        );
      });
      project.addEventListener("pointerleave", () => {
        project.style.transform = "";
        project.style.removeProperty("--glare-x");
        project.style.removeProperty("--glare-y");
      });
    });

  overlay?.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (event) => {
    if (!drawer?.classList.contains("open")) return;
    if (event.key === "Escape") {
      closeDrawer();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = $$(
      'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])',
      drawer,
    ).filter((element) => !element.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  window.addEventListener("popstate", () => {
    const page = window.location.hash.match(/^#page-(.+)$/)?.[1];
    if (page) showPage(page, page, false);
    else if (!openStoryFromHash()) showPage("about", "about", false);
  });
  window.addEventListener("hashchange", openStoryFromHash);
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") stopQuoteCarousel();
    else if ($("#page-quotes")?.classList.contains("active"))
      startQuoteCarousel();
  });

  navItems.forEach((item) => {
    item.setAttribute(
      "aria-current",
      item.classList.contains("on") ? "page" : "false",
    );
  });
  if (menuButton) menuButton.setAttribute("aria-expanded", "false");
  drawer?.setAttribute("aria-hidden", "true");
  overlay?.setAttribute("aria-hidden", "true");
  pages.forEach((page) => {
    const active = page.classList.contains("active");
    page.hidden = !active;
    page.setAttribute("aria-hidden", active ? "false" : "true");
  });

  $$("[data-link]").forEach((element) => {
    const url = safeUrl(element.getAttribute("data-link") || "");
    if (!url) {
      element.setAttribute("aria-disabled", "true");
      element.classList.add("is-disabled");
    }
  });

  triggerReveal();
  if (window.location.hash.startsWith("#legacy-story-")) openStoryFromHash();
  else {
    const initialHashPage = window.location.hash.match(/^#page-(.+)$/)?.[1];
    if (initialHashPage) showPage(initialHashPage, initialHashPage, false);
  }
  updateClock();
  updateProgress();
  window.setInterval(updateClock, 60000);
  runTyping();
  window.setTimeout(scrambleName, 450);
  if (
    $("#page-skills")?.classList.contains("active") ||
    $("#page-work")?.classList.contains("active")
  )
    animateStats();
  if ($("#page-quotes")?.classList.contains("active")) startQuoteCarousel();

  if (!reducedMotion.matches) {
    glitchTimer = window.setInterval(() => {
      const visiblePage = $(".page.active");
      const candidates = visiblePage ? $$("[data-glitch]", visiblePage) : [];
      if (!candidates.length) return;
      const selected =
        candidates[Math.floor(Math.random() * candidates.length)];
      selected.classList.add("glitching");
      window.setTimeout(() => selected.classList.remove("glitching"), 420);
    }, 14000);
  }

  reducedMotion.addEventListener?.("change", (event) => {
    if (!event.matches) return;
    window.clearTimeout(typingTimer);
    window.clearInterval(glitchTimer);
    stopQuoteCarousel();
    quotePaused = true;
    $$(".page [data-reveal]").forEach((item) => item.classList.add("in"));
  });
})();
