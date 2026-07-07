import { dom } from './dom.js';

export function showBanner(message, type = 'error', durationMs = 4000) {
  const banner = document.createElement('div');
  banner.className = `banner banner--${type}`;
  banner.textContent = message;
  dom.bannerRegion.appendChild(banner);
  if (type === 'success') {
    setTimeout(() => banner.remove(), durationMs);
  }
  return banner;
}

export function clearBanners() {
  dom.bannerRegion.innerHTML = '';
}
