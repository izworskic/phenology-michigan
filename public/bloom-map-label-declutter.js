(() => {
  'use strict';

  const MOBILE_MAX = 600;
  const PADDING = 3;
  let scheduled = false;

  function overlaps(a, b) {
    return a.left < b.right + PADDING
      && a.right + PADDING > b.left
      && a.top < b.bottom + PADDING
      && a.bottom + PADDING > b.top;
  }

  function declutter() {
    scheduled = false;
    const tooltips = [...document.querySelectorAll('.bloom-map-tooltip')];
    if (!tooltips.length) return;

    tooltips.forEach((node) => {
      node.style.visibility = '';
      node.style.pointerEvents = '';
      node.removeAttribute('aria-hidden');
    });

    if (window.innerWidth > MOBILE_MAX) return;

    // Leaflet creates tooltip DOM in marker insertion order. Bloom Tracker
    // inserts ranked/current opportunities first, so a simple greedy pass
    // preserves the most decision-relevant labels and suppresses only labels
    // that would collide with one already kept. Every marker remains tappable.
    const kept = [];
    for (const node of tooltips) {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (kept.some((other) => overlaps(rect, other))) {
        node.style.visibility = 'hidden';
        node.style.pointerEvents = 'none';
        node.setAttribute('aria-hidden', 'true');
      } else {
        kept.push(rect);
      }
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(declutter);
  }

  const observer = new MutationObserver(schedule);

  function boot() {
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
