import { dom } from './dom.js';

export function showBanner(message, type = 'error') {
  const banner = document.createElement('div');
  banner.className = `banner banner--${type}`;
  banner.textContent = message;
  dom.bannerRegion.appendChild(banner);
  if (type === 'success') {
    setTimeout(() => banner.remove(), 4000);
  }
  return banner;
}

export function clearBanners() {
  dom.bannerRegion.innerHTML = '';
}