(() => {
  'use strict';

  const card = document.getElementById('developer-card');
  if (!card) return;

  const $ = (selector, scope = card) => scope.querySelector(selector);
  const $$ = (selector, scope = card) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pages = $$('.page');
  const navItems = $$('[data-nav]');
  const drawer = $('#drawer');
  const overlay = $('#overlay');
  const menuButton = $('[data-action="menu"]');
  let previousFocus = null;
  let quoteIndex = 0;
  let quoteTimer = null;
  let typingTimer = null;
  let glitchTimer = null;
  let revealObserver = null;
  let skillsAnimated = false;

  const safeUrl = (value) => {
    if (typeof value !== 'string' || value.length > 2048) return null;
    try {
      const url = new URL(value, window.location.href);
      return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  };

  const showToast = (message) => {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  };

  const showSound = () => {
    if (reducedMotion.matches) return;
    const words = [
      ['POW!', '#ff0044', '#fff'], ['BAM!', '#ffd700', '#000'],
      ['WHAM!', '#00ffdd', '#000'], ['ZAP!', '#00ff88', '#000'],
      ['BOOM!', '#ff6600', '#fff'], ['NICE!', '#00ffdd', '#000'],
    ];
    const [label, background, color] = words[Math.floor(Math.random() * words.length)];
    const element = document.createElement('div');
    element.className = 'sound-fx';
    element.textContent = label;
    element.style.background = background;
    element.style.color = color;
    element.setAttribute('aria-hidden', 'true');
    const maxLeft = Math.max(0, card.clientWidth - 150);
    element.style.left = `${Math.round(Math.random() * maxLeft)}px`;
    element.style.top = `${Math.max(70, window.scrollY - card.getBoundingClientRect().top + 120)}px`;
    card.append(element);
    window.setTimeout(() => element.remove(), 1100);
  };

  const shakeCard = () => {
    if (reducedMotion.matches) return;
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    window.setTimeout(() => card.classList.remove('shake'), 420);
  };

  const openDrawer = () => {
    if (!drawer || !overlay) return;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    drawer.classList.add('open');
    overlay.classList.add('on');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    menuButton?.setAttribute('aria-expanded', 'true');
    $('[data-action="close-menu"]', drawer)?.focus();
  };

  const closeDrawer = () => {
    if (!drawer || !overlay) return;
    drawer.classList.remove('open');
    overlay.classList.remove('on');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (previousFocus?.isConnected) previousFocus.focus();
  };

  const triggerReveal = (scope = card) => {
    const targets = $$('[data-reveal]', scope);
    if (!('IntersectionObserver' in window) || reducedMotion.matches) {
      targets.forEach((item) => item.classList.add('in'));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          revealObserver?.unobserve(entry.target);
        });
      }, { threshold: 0.12 });
    }
    targets.forEach((item) => {
      item.classList.remove('in');
      revealObserver?.observe(item);
    });
  };

  const animateSkills = () => {
    if (skillsAnimated) return;
    skillsAnimated = true;
    $$('.sr-progress').forEach((circle) => {
      window.requestAnimationFrame(() => circle.classList.add('animate'));
    });
    $$('[data-countup]').forEach((element) => {
      const target = Math.min(100, Math.max(0, Number.parseInt(element.getAttribute('data-countup') || '0', 10) || 0));
      const valueElement = element.closest('.skill-radial-ring')?.querySelector('.sr-val');
      if (!valueElement) return;
      if (reducedMotion.matches) {
        valueElement.textContent = String(target);
        return;
      }
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min(1, (now - start) / 900);
        const eased = 1 - Math.pow(1 - progress, 3);
        valueElement.textContent = String(Math.round(target * eased));
        if (progress < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    });
  };

  const showPage = (pageId, navId = pageId) => {
    const target = $(`#page-${CSS.escape(pageId)}`);
    if (!target) return;
    pages.forEach((page) => {
      const active = page === target;
      page.classList.toggle('active', active);
      page.hidden = !active;
      page.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    navItems.forEach((item) => {
      const active = item.getAttribute('data-nav') === navId;
      item.classList.toggle('on', active);
      item.setAttribute('aria-current', active ? 'page' : 'false');
    });
    closeDrawer();
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    triggerReveal(target);
    if (pageId === 'skills') animateSkills();
    if (pageId === 'quotes') startQuoteCarousel();
    else stopQuoteCarousel();
  };

  const updateProgress = () => {
    const bar = $('#scroll-progress');
    if (!bar) return;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = range > 0 ? (window.scrollY / range) * 100 : 0;
    bar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
  };

  const updateClock = () => {
    const clock = $('#clock');
    if (!clock) return;
    try {
      const now = new Date();
      const time = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(now);
      const date = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
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
    } catch { /* Use the legacy fallback below. */ }
    if (!copied) {
      try {
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.append(field);
        field.select();
        copied = document.execCommand('copy');
        field.remove();
      } catch { copied = false; }
    }
    if (!copied) {
      showToast('GAGAL MENYALIN');
      return;
    }
    showToast('TERSALIN ✓');
    if (button) {
      const original = button.textContent;
      button.textContent = '✓';
      window.setTimeout(() => { if (button.isConnected) button.textContent = original || '📋'; }, 1500);
    }
    showSound();
  };

  const quoteCarousel = $('[data-carousel]');
  const changeQuote = (index) => {
    if (!quoteCarousel) return;
    const track = $('.quote-track', quoteCarousel);
    const cards = $$('.quote-card', quoteCarousel);
    if (!track || cards.length === 0) return;
    quoteIndex = ((index % cards.length) + cards.length) % cards.length;
    track.style.transform = `translateX(-${quoteIndex * 100}%)`;
    $$('[data-dot]', quoteCarousel).forEach((dot, dotIndex) => {
      const active = dotIndex === quoteIndex;
      dot.classList.toggle('on', active);
      dot.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };

  const stopQuoteCarousel = () => {
    if (quoteTimer !== null) window.clearTimeout(quoteTimer);
    quoteTimer = null;
  };

  const startQuoteCarousel = () => {
    stopQuoteCarousel();
    if (!quoteCarousel) return;
    const cards = $$('.quote-card', quoteCarousel);
    if (cards.length < 2 || quoteCarousel.getAttribute('data-auto') !== 'true' || reducedMotion.matches) return;
    quoteTimer = window.setTimeout(() => {
      changeQuote(quoteIndex + 1);
      startQuoteCarousel();
    }, 5200);
  };

  const runTyping = () => {
    const target = $('#typing');
    if (!target) return;
    let lines = [];
    try {
      const parsed = JSON.parse(card.getAttribute('data-taglines') || '[]');
      if (Array.isArray(parsed)) lines = parsed.filter((line) => typeof line === 'string' && line.trim()).slice(0, 12);
    } catch { /* Retain the server-rendered fallback line. */ }
    if (!lines.length) lines = [target.textContent?.trim() || 'Keep learning.'];
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
      target.replaceChildren(document.createTextNode(phrase.slice(0, Math.max(0, character))));
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      cursor.setAttribute('aria-hidden', 'true');
      target.append(cursor);
      let delay = deleting ? 30 : 58;
      if (!deleting && character >= phrase.length) { deleting = true; delay = 1700; }
      else if (deleting && character <= 0) { deleting = false; phraseIndex = (phraseIndex + 1) % lines.length; delay = 360; }
      typingTimer = window.setTimeout(tick, delay);
    };
    typingTimer = window.setTimeout(tick, 380);
  };

  const scrambleName = () => {
    const element = $('#nameEl');
    if (!element || reducedMotion.matches) return;
    const target = element.textContent || '';
    const alphabet = '!@#$%^&*()_+|{}[]<>ABCDEFGHIJKLMNOP';
    let iteration = 0;
    const interval = window.setInterval(() => {
      let output = '';
      for (let index = 0; index < target.length; index += 1) {
        if (index < iteration) output += target[index];
        else output += target[index] === ' ' ? ' ' : alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      element.textContent = output;
      iteration += Math.max(1, Math.ceil(target.length / 14));
      if (iteration >= target.length) {
        window.clearInterval(interval);
        element.textContent = target;
      }
    }, 38);
  };

  card.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-action], [data-copy], [data-page], [data-link], [data-dot], [data-sound]') : null;
    if (!target || !card.contains(target)) return;

    if (target.hasAttribute('data-sound')) {
      showSound();
      if (target.hasAttribute('data-shake')) shakeCard();
    }

    if (target.hasAttribute('data-dot')) {
      const dotIndex = Number.parseInt(target.getAttribute('data-dot') || '0', 10);
      changeQuote(Number.isFinite(dotIndex) ? dotIndex : 0);
      startQuoteCarousel();
      return;
    }

    if (target.hasAttribute('data-copy')) {
      const text = target.getAttribute('data-copy') || '';
      copyText(text, target.classList.contains('ctc-action') ? target : $('.ctc-action', target));
      return;
    }

    if (target.hasAttribute('data-link')) {
      const destination = safeUrl(target.getAttribute('data-link') || '');
      if (!destination) return;
      const anchor = document.createElement('a');
      anchor.href = destination;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      return;
    }

    if (target.hasAttribute('data-page')) {
      const page = target.getAttribute('data-page') || 'about';
      const nav = target.getAttribute('data-nav') || page;
      showPage(page, nav);
      return;
    }

    const action = target.getAttribute('data-action');
    if (action === 'menu') openDrawer();
    else if (action === 'close-menu') closeDrawer();
  });

  overlay?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer?.classList.contains('open')) closeDrawer();
  });
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopQuoteCarousel();
    else if ($('#page-quotes')?.classList.contains('active')) startQuoteCarousel();
  });

  navItems.forEach((item) => {
    item.setAttribute('aria-current', item.classList.contains('on') ? 'page' : 'false');
  });
  if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
  drawer?.setAttribute('aria-hidden', 'true');
  overlay?.setAttribute('aria-hidden', 'true');
  pages.forEach((page) => {
    const active = page.classList.contains('active');
    page.hidden = !active;
    page.setAttribute('aria-hidden', active ? 'false' : 'true');
  });

  $$('[data-link]').forEach((element) => {
    const url = safeUrl(element.getAttribute('data-link') || '');
    if (!url) {
      element.setAttribute('aria-disabled', 'true');
      element.classList.add('is-disabled');
    }
  });

  triggerReveal();
  updateClock();
  updateProgress();
  window.setInterval(updateClock, 60000);
  runTyping();
  window.setTimeout(scrambleName, 450);
  if ($('#page-skills')?.classList.contains('active')) animateSkills();
  if ($('#page-quotes')?.classList.contains('active')) startQuoteCarousel();

  if (!reducedMotion.matches) {
    glitchTimer = window.setInterval(() => {
      const visiblePage = $('.page.active');
      const candidates = visiblePage ? $$('[data-glitch]', visiblePage) : [];
      if (!candidates.length) return;
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      selected.classList.add('glitching');
      window.setTimeout(() => selected.classList.remove('glitching'), 420);
    }, 7600);
  }

  reducedMotion.addEventListener?.('change', (event) => {
    if (!event.matches) return;
    window.clearTimeout(typingTimer);
    window.clearInterval(glitchTimer);
    stopQuoteCarousel();
    $$('.page [data-reveal]').forEach((item) => item.classList.add('in'));
  });
})();
