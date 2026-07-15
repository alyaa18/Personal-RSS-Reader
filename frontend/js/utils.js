export function cloneTemplate(tpl) {
  return tpl.content.firstElementChild.cloneNode(true);
}

const FAVICON_DENYLIST = new Set([
  'feeds.arstechnica.com',
]);

export function formatDate(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const dateText = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeText = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${dateText} ${timeText}`;
}

export function getFaviconUrl(feedUrl) {
  try {
    const normalizedUrl = new URL(feedUrl);
    if (FAVICON_DENYLIST.has(normalizedUrl.hostname)) return null;
    // Use only the domain origin — Google's favicon service doesn't
    // resolve favicons for full feed URLs, just for site domains.
    const domain = `${normalizedUrl.protocol}//${normalizedUrl.hostname}`;
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(domain)}`;
  } catch {
    return null;
  }
}

// A solid, always-visible default icon (accent-colored circle + white RSS waves)
// instead of a faint gray icon that can blend into either background.
export function getDefaultFaviconDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="16" fill="#B5542A"/>
    <circle cx="10" cy="22" r="2.2" fill="#fff"/>
    <path d="M8 15a9 9 0 0 1 9 9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M8 9a15 15 0 0 1 15 15" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function setFaviconWithFallback(imgEl, feedUrl) {
  const url = getFaviconUrl(feedUrl);
  imgEl.src = url || getDefaultFaviconDataUri();
  imgEl.onerror = function () {
    this.onerror = null;
    this.src = getDefaultFaviconDataUri();
  };
}

export function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function truncateText(text, maxWords = 42) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { truncated: text, isTruncated: false };
  return { truncated: words.slice(0, maxWords).join(' ') + '…', isTruncated: true };
}

export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}