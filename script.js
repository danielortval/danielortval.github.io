// ---------- Enable JS-only entrance animation ----------
// Adding this class is what allows .reveal elements to start hidden. If this
// script never runs, content stays fully visible (CSS default).
document.documentElement.classList.add('js');

// ---------- Theme toggle (light / dark) ----------
(function () {
  const root = document.documentElement;
  const STORAGE_KEY = 'dov-theme';
  const stored = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } })();
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  root.setAttribute('data-theme', initial);

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    });
  });
})();

// ---------- Year ----------
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Header scroll shadow ----------
const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------- Generate subproject media slots ----------
// If data-media is present (JSON array of {src,caption,type}), render real
// images/videos. Otherwise fall back to styled placeholder slots.
document.querySelectorAll('.sub-photos').forEach((grid) => {
  const label = grid.dataset.label || 'Photo';
  let media = [];
  if (grid.dataset.media) {
    try { media = JSON.parse(grid.dataset.media); } catch (e) { media = []; }
  }

  if (media.length) {
    if (media.length === 2) grid.classList.add('two');
    media.forEach((m) => {
      const fig = document.createElement('figure');
      fig.className = 'media-slot';
      let el;
      if (m.type === 'video') {
        el = document.createElement('video');
        el.src = m.src; el.muted = true; el.loop = true; el.playsInline = true;
        el.preload = 'metadata'; el.controls = true;
        fig.classList.add('is-video');
      } else {
        el = document.createElement('img');
        el.src = m.src; el.loading = 'lazy'; el.alt = m.caption || label;
      }
      el.className = 'media-el';
      // On load error, show a small placeholder instead of a broken icon.
      el.addEventListener('error', () => {
        fig.classList.add('media-missing');
        fig.innerHTML = '<div class="photo-slot">' + label + '</div>';
      });
      fig.appendChild(el);
      if (m.caption) {
        const cap = document.createElement('figcaption');
        cap.textContent = m.caption;
        fig.appendChild(cap);
      }
      grid.appendChild(fig);
    });
  } else if (grid.dataset.note) {
    // Intentional documentation card (used when no image exists for a subsystem).
    const card = document.createElement('div');
    card.className = 'doc-note';
    card.innerHTML =
      '<span class="doc-note-icon" aria-hidden="true">▤</span>' +
      '<span class="doc-note-title">' + label + '</span>' +
      '<span class="doc-note-body">' + grid.dataset.note + '</span>';
    grid.appendChild(card);
  } else {
    const n = parseInt(grid.dataset.photos || '2', 10);
    if (n === 2) grid.classList.add('two');
    for (let i = 1; i <= n; i++) {
      const slot = document.createElement('div');
      slot.className = 'photo-slot';
      slot.innerHTML = label + '<br><small>photo ' + i + '</small>';
      grid.appendChild(slot);
    }
  }
});

// ---------- Paper video slots (show video if file exists) ----------
document.querySelectorAll('.paper-visual[data-video]').forEach((box) => {
  const src = box.dataset.video;
  const v = document.createElement('video');
  v.src = src; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata';
  v.addEventListener('loadeddata', () => {
    box.querySelector('.ph')?.remove();
    box.classList.add('has-video');
    box.appendChild(v);
    box.addEventListener('mouseenter', () => v.play().catch(() => {}));
    box.addEventListener('mouseleave', () => v.pause());
  });
  // if it errors, the placeholder stays - nothing to do
});

// ---------- Car accordion ----------
// Multiple project cards can be open at the same time (no auto-close).

// ---------- Scroll reveal ----------
const revealEls = document.querySelectorAll('.reveal');
const showAll = () => revealEls.forEach((el) => el.classList.add('in'));

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0, rootMargin: '0px 0px 200px 0px' });
  revealEls.forEach((el) => {
    // Already in view on load (e.g. above the fold)? show immediately.
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight) el.classList.add('in');
    else io.observe(el);
  });
} else {
  showAll();
}

// Safety net: never leave content hidden. Reveal everything shortly after load
// regardless of observer behavior.
window.addEventListener('load', () => setTimeout(showAll, 600));
setTimeout(showAll, 2500);

// ---------- Smooth nav ----------
document.querySelectorAll('.nav a, .brand').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (href && href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    }
  });
});

// ---------- Neural network background ----------
(function () {
  const canvas = document.getElementById('neural-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const MAX_DIST = 170;
  const SPEED = 0.38;
  let W, H, particles, raf;

  function particleCount() {
    return Math.min(Math.floor((W * H) / 10000), 110);
  }

  function getColors() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark
      ? { dot: [255, 255, 255], dotA: 0.55, lineA: 0.22 }
      : { dot: [180, 95, 20],   dotA: 0.30, lineA: 0.13 };
  }

  function mkParticle() {
    const angle = Math.random() * Math.PI * 2;
    const speed = SPEED * (0.4 + Math.random() * 0.6);
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1.5 + Math.random() * 1.8,
    };
  }

  function init() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    particles = Array.from({ length: particleCount() }, mkParticle);
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    const c = getColors();
    const [r, g, b] = c.dot;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // move & bounce
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0)  { p.x = 0;  p.vx *= -1; }
      if (p.x > W)  { p.x = W;  p.vx *= -1; }
      if (p.y < 0)  { p.y = 0;  p.vy *= -1; }
      if (p.y > H)  { p.y = H;  p.vy *= -1; }

      // dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${c.dotA})`;
      ctx.fill();

      // lines to closer particles
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * c.lineA;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    raf = requestAnimationFrame(frame);
  }

  init();
  frame();

  window.addEventListener('resize', () => { cancelAnimationFrame(raf); init(); frame(); });
})();

// ---------- Attachment placeholder links ----------
document.querySelectorAll('[data-attachment]').forEach((a) => {
  a.addEventListener('click', (e) => {
    if (a.getAttribute('href') === '#') { e.preventDefault(); a.style.opacity = '0.6'; a.title = 'Document will be linked once uploaded'; }
  });
});

// ---------- Paper reader (modal document viewer) ----------
// Each paper card carries data-paper-open="<slug>". The readable body lives in
// a <template id="pdoc-<slug>"> at the bottom of index.html, so everything works
// from file:// with no fetch. Falls back to the PDF link if JS is unavailable.
(function () {
  const overlay = document.getElementById('pdoc');
  const zoom = document.getElementById('pzoom');
  if (!overlay || !zoom) return;

  const panel    = overlay.querySelector('.pdoc-panel');
  const scroller = document.getElementById('pdoc-scroll');
  const bodyEl   = document.getElementById('pdoc-body');
  const kickerEl = document.getElementById('pdoc-kicker');
  const titleEl  = document.getElementById('pdoc-title');
  const venueEl  = document.getElementById('pdoc-venue');
  const pdfEl    = document.getElementById('pdoc-pdf');
  const barEl    = document.getElementById('pdoc-progress-bar');

  const zoomImg = document.getElementById('pzoom-img');
  const zoomCap = document.getElementById('pzoom-cap');

  let lastFocus = null;

  const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function openPaper(slug) {
    const tpl = document.getElementById('pdoc-' + slug);
    if (!tpl) return false;

    kickerEl.textContent = tpl.dataset.kicker || '';
    titleEl.textContent  = tpl.dataset.title  || '';
    venueEl.textContent  = tpl.dataset.venue  || '';
    if (tpl.dataset.pdf) {
      pdfEl.href = tpl.dataset.pdf;
      pdfEl.hidden = false;
    } else {
      pdfEl.hidden = true;
    }

    bodyEl.replaceChildren(tpl.content.cloneNode(true));

    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('pdoc-open');
    scroller.scrollTop = 0;
    barEl.style.width = '0%';
    // Focus the panel itself so Esc and Tab are captured immediately.
    panel.querySelector('.pdoc-close').focus();
    return true;
  }

  function closePaper() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    bodyEl.replaceChildren();
    if (zoom.hidden) document.body.classList.remove('pdoc-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function openZoom(img) {
    zoomImg.src = img.currentSrc || img.src;
    zoomImg.alt = img.alt || '';
    const cap = img.closest('figure')?.querySelector('figcaption');
    zoomCap.textContent = cap ? cap.textContent : '';
    zoom.hidden = false;
    document.body.classList.add('pdoc-open');
    zoom.querySelector('.pzoom-close').focus();
  }

  function closeZoom() {
    if (zoom.hidden) return;
    zoom.hidden = true;
    zoomImg.src = '';
    if (overlay.hidden) document.body.classList.remove('pdoc-open');
    else panel.querySelector('.pdoc-close').focus();
  }

  // ---- Open triggers (title, visual, "read paper" link) ----
  document.querySelectorAll('[data-paper-open]').forEach((el) => {
    el.addEventListener('click', (e) => {
      // Let modified clicks (new tab / download) fall through to the PDF href.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (openPaper(el.dataset.paperOpen)) e.preventDefault();
    });
    // .paper-visual is a div with role="button" - support keyboard activation.
    if (el.getAttribute('role') === 'button') {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPaper(el.dataset.paperOpen);
        }
      });
    }
  });

  // ---- Close triggers ----
  overlay.querySelectorAll('[data-pdoc-close]').forEach((el) => {
    el.addEventListener('click', closePaper);
  });
  zoom.querySelector('.pzoom-close').addEventListener('click', closeZoom);
  zoom.addEventListener('click', (e) => { if (e.target === zoom) closeZoom(); });

  // ---- Figure click to zoom ----
  bodyEl.addEventListener('click', (e) => {
    const img = e.target.closest('.pd-fig img');
    if (img) openZoom(img);
  });

  // ---- Keyboard: Esc closes the topmost layer, Tab stays inside the panel ----
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!zoom.hidden) { closeZoom(); return; }
      if (!overlay.hidden) closePaper();
      return;
    }
    if (e.key !== 'Tab' || overlay.hidden || !zoom.hidden) return;
    const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // ---- Reading progress ----
  scroller.addEventListener('scroll', () => {
    const max = scroller.scrollHeight - scroller.clientHeight;
    barEl.style.width = (max > 0 ? (scroller.scrollTop / max) * 100 : 0) + '%';
  }, { passive: true });
})();
