import { dom } from './dom.js';

// ── Deduplication ─────────────────────────────────────────────
// Prevents identical messages from being shown multiple times.
const _recentMessages = new Set();

// ── Auto-dismiss ──────────────────────────────────────────────
const DISMISS_MS = 5000;
const FADE_MS = 300;

export function showBanner(message, type = 'error', durationMs = DISMISS_MS) {
  // Deduplicate: ignore if the same message + type is already visible
  const dedupKey = `${message}|${type}`;
  if (_recentMessages.has(dedupKey)) return;

  const banner = document.createElement('div');
  banner.className = `banner banner--${type}`;
  banner.dataset.dedupKey = dedupKey;

  // ── Content ──
  const textSpan = document.createElement('span');
  textSpan.className = 'banner__text';
  textSpan.textContent = message;
  banner.appendChild(textSpan);

  // ── Close button ──
  const closeBtn = document.createElement('button');
  closeBtn.className = 'banner__close';
  closeBtn.setAttribute('aria-label', 'Dismiss');
  closeBtn.innerHTML = '&times;';
  banner.appendChild(closeBtn);

  dom.bannerRegion.appendChild(banner);
  _recentMessages.add(dedupKey);

  // ── Auto-dismiss ──
  let dismissTimer = setTimeout(() => dismiss(banner), durationMs);
  let dismissed = false;

  function dismiss(el) {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(dismissTimer);
    el.classList.add('banner--fading');
    setTimeout(() => {
      el.remove();
      _recentMessages.delete(dedupKey);
    }, FADE_MS);
  }

  // Manual close cancels the timer
  closeBtn.addEventListener('click', () => dismiss(banner));

  return banner;
}

export function clearBanners() {
  dom.bannerRegion.querySelectorAll('.banner').forEach((el) => {
    const key = el.dataset.dedupKey;
    if (key) _recentMessages.delete(key);
    el.remove();
  });
}
