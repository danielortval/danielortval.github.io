// ---------- Paper project page behavior ----------
// Shared by papers/<slug>/index.html. Handles: theme toggle (same
// localStorage key as the main site, so it stays in sync), story-nav
// scroll-spy, and play/pause of inline videos based on visibility
// so a long page with many looping clips doesn't tax the CPU/battery.

document.documentElement.classList.add('js');

// Height of the sticky top bar + story nav, measured rather than guessed,
// so a section heading never lands underneath it.
function stickyOffset() {
  const bar = document.querySelector('.pp-stickytop');
  return (bar ? bar.offsetHeight : 96) + 14;
}

// ---------- Apply the deep-link hash once layout has settled ----------
// The inline script at the top of <head> already stripped location.hash
// into window.__ppPendingHash before the browser could act on it. Apply
// it for real here, after fonts + (likely) video metadata have arrived,
// so the scroll lands on the actual target instead of wherever the page
// happened to measure mid-layout.
(function () {
  const hash = window.__ppPendingHash;
  if (!hash) return;
  const applyHash = () => {
    const target = document.querySelector(hash);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - stickyOffset();
    window.scrollTo({ top, behavior: 'auto' });
    history.replaceState(null, '', location.pathname + location.search + hash);
  };
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    window.addEventListener('load', () => {
      applyHash();
      // video metadata can still arrive slightly after `load`
      setTimeout(applyHash, 400);
    });
    // `load` may already have fired by the time fonts resolve
    if (document.readyState === 'complete') {
      applyHash();
      setTimeout(applyHash, 400);
    }
  }).catch(() => {});
})();

// ---------- Theme toggle (shared with main site) ----------
(function () {
  const root = document.documentElement;
  const STORAGE_KEY = 'dov-theme';
  const stored = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } })();
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', stored || (prefersDark ? 'dark' : 'light'));

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

// ---------- Story-nav scroll-spy ----------
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = [...document.querySelectorAll('.pp-storynav a')];
  const sections = navLinks
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = navLinks.find((a) => a.getAttribute('href') === '#' + entry.target.id);
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach((a) => a.classList.remove('is-active'));
            link.classList.add('is-active');
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
  }

  navLinks.forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - stickyOffset();
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ---------- Play inline videos only while visible ----------
  const clips = [...document.querySelectorAll('.pp-video video, .pp-hero video')];
  if ('IntersectionObserver' in window && clips.length) {
    const vio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.play().catch(() => {});
          else entry.target.pause();
        });
      },
      { threshold: 0.15 }
    );
    clips.forEach((v) => vio.observe(v));
  }
});
