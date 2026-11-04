/* ================================================================
   pokok/skrip/alat.js — TKJ XI-9 | Utilities & Helper Functions
   ================================================================ */

/* URL VALIDATOR */
export const URLValidator = {
  isSafe(url) {
    if (
      !url ||
      typeof url !== "string"
    )
      return false;
    const trimmed = url.trim();
    if (
      trimmed
        .toLowerCase()
        .startsWith(
          "javascript:",
        ) ||
      trimmed
        .toLowerCase()
        .startsWith("data:")
    )
      return false;
    if (
      trimmed.startsWith(".") ||
      trimmed.startsWith("/")
    )
      return true;
    try {
      const parsed = new URL(
        trimmed,
      );
      return [
        "http:",
        "https:",
      ].includes(parsed.protocol);
    } catch {
      return !trimmed.includes(
        "://",
      );
    }
  },
  sanitize(url) {
    return this.isSafe(url)
      ? url.trim()
      : "";
  },
};

/* TYPING ANIMATION */
export function animateTyping(
  el,
  customText = null,
) {
  if (!el) return;
  const text =
    customText ||
    el.textContent ||
    "";
  if (!text) return;
  el.textContent = "";
  el.classList.add("typing");
  let i = 0;
  const speed = 28;
  const t = setInterval(
    () => {
      el.textContent +=
        text.charAt(i++);
      if (i >= text.length) {
        clearInterval(t);
        el.classList.remove(
          "typing",
        );
      }
    },
    speed +
      Math.floor(
        Math.random() * 20,
      ),
  );
}

export function mulaiKetikHero() {
  const el =
    document.getElementById(
      "slogan-pahlawan",
    );
  const text =
    el?.dataset?.fallback ||
    (el && el.textContent) ||
    "";
  animateTyping(el, text);
}

/* COUNTER ANIMATION */
export function animateCounter(
  el,
  target,
  duration = 1200,
) {
  if (!el) return;
  const start = performance.now();
  const startVal = 0;
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(
      elapsed / duration,
      1,
    );
    const eased =
      1 -
      Math.pow(1 - progress, 3);
    el.textContent = Math.round(
      startVal +
        (target - startVal) *
          eased,
    );
    if (progress < 1)
      requestAnimationFrame(
        update,
      );
    else el.textContent = target;
  }
  requestAnimationFrame(update);
}

/* MAKE INITIALS */
export function makeInitials(
  name = "",
) {
  return name
    .split(" ")
    .slice(0, 2)
    .map(
      (w) =>
        w[0]?.toUpperCase() || "",
    )
    .join("");
}

/* RENDER AVATAR */
export function renderAvatar(
  member,
  size = "lg",
) {
  const fragment = document.createDocumentFragment();
  const nama = String(member?.nama || "");
  const foto = member?.foto;
  const initials = document.createElement("span");
  initials.textContent = makeInitials(nama);

  if (foto && URLValidator.isSafe(foto)) {
    const image = document.createElement("img");
    image.src = foto;
    image.alt = nama;
    image.loading = "lazy";
    initials.style.display = "none";

    image.addEventListener("error", () => {
      image.style.display = "none";
      initials.style.display = "flex";
    });

    fragment.append(image, initials);
  } else {
    fragment.appendChild(initials);
  }

  return fragment;
}

/* SHOW NOTIFICATION TOAST */
export function showNotification(
  msg,
) {
  let toast =
    document.getElementById(
      "notif-toast",
    );
  if (!toast) {
    toast =
      document.createElement(
        "div",
      );
    toast.id = "notif-toast";
    toast.setAttribute(
      "role",
      "status",
    );
    toast.setAttribute(
      "aria-live",
      "polite",
    );
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "80px",
      left: "50%",
      transform:
        "translateX(-50%) translateY(12px)",
      background:
        "var(--surface-glass, rgba(0,0,0,0.85))",
      backdropFilter: "blur(12px)",
      color: "var(--text-1, #fff)",
      padding: "8px 18px",
      borderRadius: "20px",
      fontSize: "0.78rem",
      fontFamily:
        '"Fira Code", monospace',
      border:
        "1px solid var(--border-mid, rgba(255,255,255,0.1))",
      zIndex: "9000",
      opacity: "0",
      pointerEvents: "none",
      transition:
        "opacity 0.3s, transform 0.3s",
      whiteSpace: "nowrap",
    });
    document.body.appendChild(
      toast,
    );
  }
  toast.textContent = msg;
  toast.style.opacity = "1";
  toast.style.transform =
    "translateX(-50%) translateY(0)";
  clearTimeout(toast._tid);
  toast._tid = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform =
      "translateX(-50%) translateY(12px)";
  }, 2200);
}

/* FOCUS TRAP — supports stacked dialogs (e.g. photo lightbox inside member modal). */
const _focusTrapStack = [];
function _isElement(el) {
  return el && el.nodeType === 1;
}
function _getFocusable(wadah) {
  return Array.from(wadah.querySelectorAll(
    'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
  )).filter((el) => !el.hidden && el.getAttribute('aria-hidden') !== 'true' && el.getAttribute('tabindex') !== '-1');
}

export function enableFocusTrap(wadah) {
  if (!_isElement(wadah)) return;

  // Reopening an already registered dialog must not leave duplicate handlers.
  const existingIndex = _focusTrapStack.findIndex((entry) => entry.element === wadah);
  if (existingIndex !== -1) {
    const [existing] = _focusTrapStack.splice(existingIndex, 1);
    document.removeEventListener('keydown', existing.onKeydown);
  }

  const entry = {
    element: wadah,
    previousActive: document.activeElement,
    onKeydown: null,
  };

  entry.onKeydown = (event) => {
    if (_focusTrapStack[_focusTrapStack.length - 1] !== entry || event.key !== 'Tab') return;
    const focusable = _getFocusable(wadah);
    if (!focusable.length) {
      event.preventDefault();
      if (!wadah.hasAttribute('tabindex')) wadah.setAttribute('tabindex', '-1');
      wadah.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !wadah.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !wadah.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  _focusTrapStack.push(entry);
  document.addEventListener('keydown', entry.onKeydown);
  const first = _getFocusable(wadah)[0];
  if (first) first.focus();
  else {
    if (!wadah.hasAttribute('tabindex')) wadah.setAttribute('tabindex', '-1');
    wadah.focus();
  }
}

export function disableFocusTrap() {
  const entry = _focusTrapStack.pop();
  if (!entry) return;
  document.removeEventListener('keydown', entry.onKeydown);

  const previous = entry.previousActive;
  if (_isElement(previous) && previous.isConnected && !previous.hasAttribute('disabled')) {
    try { previous.focus(); } catch {}
  }

  // When closing a nested dialog, keep focus within the dialog underneath it.
  const parent = _focusTrapStack[_focusTrapStack.length - 1];
  if (parent && !parent.element.contains(document.activeElement)) {
    const first = _getFocusable(parent.element)[0];
    if (first) first.focus();
  }
}

/* REVEAL OBSERVER */
export const RevealObserver =
  (function () {
    let io = null;
    function getObserver() {
      if (!io)
        io =
          new IntersectionObserver(
            (entries) =>
              entries.forEach(
                (e) => {
                  if (
                    e.isIntersecting
                  ) {
                    e.target.classList.add(
                      "on",
                    );
                    io.unobserve(
                      e.target,
                    );
                  }
                },
              ),
            {
              threshold: 0.1,
              rootMargin:
                "0px 0px -40px 0px",
            },
          );
      return io;
    }
    return {
      observe(els) {
        const o = getObserver();
        (els instanceof NodeList ||
        Array.isArray(els)
          ? els
          : [els]
        ).forEach((el) => {
          if (
            el &&
            !el.classList.contains(
              "on",
            )
          )
            o.observe(el);
        });
      },
    };
  })();

export function initReveal() {
  RevealObserver.observe(
    document.querySelectorAll(
      ".reveal:not(.on)",
    ),
  );
}

/* SCROLL PROGRESS */
export function mulaiProgresGulir() {
  const bar =
    document.getElementById(
      "progres-gulir",
    );
  if (!bar) return;
  let ticking = false;
  function update() {
    const h =
      document.documentElement
        .scrollHeight -
      window.innerHeight;
    const pct =
      h > 0
        ? Math.min(
            100,
            Math.max(
              0,
              (window.scrollY /
                h) *
                100,
            ),
          )
        : 0;
    bar.style.width = pct + "%";
    ticking = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(
          update,
        );
        ticking = true;
      }
    },
    { passive: true },
  );
  update();
}

/* SECRET CODE */
export function mulaiKodeRahasia() {
  const seq = ["t", "k", "j"];
  let buf = [];
  document.addEventListener(
    "keydown",
    (e) => {
      buf.push(
        e.key.toLowerCase(),
      );
      if (buf.length > seq.length)
        buf.shift();
      if (
        buf.join("") ===
        seq.join("")
      ) {
        const root =
          document.documentElement;
        const current =
          getComputedStyle(root)
            .getPropertyValue(
              "--accent",
            )
            .trim() || "#ef4444";
        const alt =
          current === "#ef4444"
            ? "#0ea5a4"
            : "#ef4444";
        root.style.setProperty(
          "--accent",
          alt,
        );
        showNotification(
          "🎉 Rahasia ditemukan! Warna aksen diubah.",
        );
      }
    },
  );
}

/* PAGE PROGRESS BAR */
export function initProgressBar() {
  const bar =
    document.getElementById(
      "progres-halaman",
    );
  if (!bar) return;
  document
    .querySelectorAll("a[href]")
    .forEach((link) => {
      const href =
        link.getAttribute(
          "href",
        ) || "";
      if (
        href.startsWith("#") ||
        href.startsWith(
          "javascript",
        ) ||
        href.startsWith(
          "mailto",
        ) ||
        href.startsWith("http")
      )
        return;
      link.addEventListener(
        "click",
        (e) => {
          if (
            e.ctrlKey ||
            e.metaKey ||
            e.shiftKey
          )
            return;
          bar.style.width = "0%";
          bar.classList.add(
            "aktif",
          );
          let w = 0;
          const t = setInterval(
            () => {
              w = Math.min(
                w +
                  Math.random() *
                    15,
                80,
              );
              bar.style.width =
                w + "%";
            },
            80,
          );
          setTimeout(() => {
            clearInterval(t);
            bar.style.width =
              "100%";
            setTimeout(() => {
              bar.classList.remove(
                "aktif",
              );
              bar.style.width =
                "0%";
            }, 400);
          }, 400);
        },
      );
    });
}

/* CLOCK — Kini dikelola mandiri oleh src/components/GlobalClock.astro */
export function mulaiJam() {
  // Deprecated: GlobalClock.astro menangani jam & drag secara mandiri
}
