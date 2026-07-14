import { state } from './state.js';
import { dom } from './dom.js';
import { cloneTemplate, formatDateTime, setFaviconWithFallback, truncateText } from './utils.js';
import { isFavorite, toggleFavorite } from './favorites.js';
import { renderPagination } from './pagination.js';
import { showBanner } from './banner.js';

const SUMMARY_WORD_LIMIT = 42;

// RTL detection: prefer the feed-declared language (from backend Milestone
// 5); fall back to sniffing the text itself when no language is declared.
// This governs only the article's own content direction, independent of
// whatever UI language the interface is displayed in.
const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);
const RTL_CHAR_PATTERN = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;

function detectDirection(languageCode, sampleText) {
  if (languageCode) {
    const primary = languageCode.split('-')[0].toLowerCase();
    if (RTL_LANGS.has(primary)) return 'rtl';
    if (primary) return 'ltr';
  }
  return RTL_CHAR_PATTERN.test(sampleText || '') ? 'rtl' : 'ltr';
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for non-secure contexts / older browsers.
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// ---------- Feed list (sidebar) ----------

export function renderFeedList() {
  dom.feedList.querySelectorAll('.feed-item').forEach((el) => el.remove());
  dom.feedListEmpty.classList.toggle('is-hidden', state.feeds.length > 0);
  state.feeds.forEach((feed) => dom.feedList.appendChild(buildFeedItem(feed)));
  updateActiveStyles();
}

function buildFeedItem(feed) {
  const li = cloneTemplate(dom.feedItemTemplate);
  li.dataset.feedId = feed.id;
  setFaviconWithFallback(li.querySelector('.feed-item__favicon'), feed.url);
  li.querySelector('.feed-item__title').textContent = feed.title;
  return li;
}

export function updateActiveStyles() {
  dom.navAllArticles.classList.toggle('is-active', state.activeView === 'all' && state.activeFeedId === 'all');
  dom.navStarred.classList.toggle('is-active', state.activeView === 'starred');
  dom.feedList.querySelectorAll('.feed-item').forEach((li) => {
    li.classList.toggle('is-active', state.activeView === 'all' && li.dataset.feedId === state.activeFeedId);
  });
}

export function updateContentHeader() {
  if (state.activeView === 'starred') {
    dom.contentTitle.textContent = 'Starred';
  } else if (state.activeFeedId === 'all') {
    dom.contentTitle.textContent = 'All Articles';
  } else {
    const feed = state.feeds.find((f) => f.id === state.activeFeedId);
    dom.contentTitle.textContent = feed ? feed.title : 'All Articles';
  }
}

// ---------- Filtering pipeline: view -> feed -> search ----------

export function getFilteredArticles() {
  let list = state.articles;

  if (state.activeView === 'starred') {
    list = list.filter((a) => state.favorites.has(a.id));
  } else if (state.activeFeedId !== 'all') {
    list = list.filter((a) => a.feedId === state.activeFeedId);
  }

  const query = state.searchQuery.trim().toLowerCase();
  if (query) {
    list = list.filter(
      (a) => a.title.toLowerCase().includes(query) || (a.summary && a.summary.toLowerCase().includes(query))
    );
  }

  return list;
}

export function setArticleListState(mode) {
  dom.stateEmpty.classList.toggle('is-hidden', mode !== 'empty');
  dom.stateLoading.classList.toggle('is-hidden', mode !== 'loading');
}

export function renderArticles() {
  dom.articleList.querySelectorAll('.article-card').forEach((el) => el.remove());

  const filtered = getFilteredArticles();
  const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  if (filtered.length === 0) {
    setArticleListState('empty');
    renderPagination(0);
    return;
  }

  setArticleListState('content');

  const start = (state.currentPage - 1) * state.pageSize;
  const pageItems = filtered.slice(start, start + state.pageSize);

  pageItems.forEach((article) => {
    dom.articleList.appendChild(buildArticleCard(article));
  });

  renderPagination(filtered.length);
}

export function renderArticlesWithTransition() {
  if (dom.articleList.classList.contains('is-refreshing')) {
    renderArticles();
    return;
  }

  dom.articleList.classList.add('is-refreshing');
  renderArticles();
  requestAnimationFrame(() => {
    dom.articleList.classList.remove('is-refreshing');
  });
}

function buildArticleCard(article) {
  const card = cloneTemplate(dom.articleItemTemplate);
  card.dataset.articleId = article.id;

  const feed = state.feeds.find((f) => f.id === article.feedId);
  setFaviconWithFallback(card.querySelector('.article-card__favicon'), feed ? feed.url : '');

  card.querySelector('.article-card__feed-title').textContent = article.feedTitle;

  const dateEl = card.querySelector('.article-card__date');
  dateEl.textContent = formatDateTime(article.publishedAt);
  dateEl.setAttribute('datetime', article.publishedAt);

  const link = card.querySelector('.article-card__link');
  link.href = article.link;
  link.textContent = article.title;

  // Summary + Show more/less
  const summaryEl = card.querySelector('.article-card__summary');
  const cleanHtml = DOMPurify.sanitize(article.summary || '', {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });

  const plainTextHolder = document.createElement('div');
  plainTextHolder.innerHTML = cleanHtml;
  const fullText = (plainTextHolder.textContent || '').trim();
  const { truncated, isTruncated } = truncateText(fullText, SUMMARY_WORD_LIMIT);
  const isExpanded = state.expandedArticleIds.has(article.id);

  if (!isTruncated || isExpanded) {
    summaryEl.textContent = fullText;
  } else {
    summaryEl.textContent = truncated;
  }

  const toggleBtn = card.querySelector('.article-card__toggle');
  if (isTruncated) {
    toggleBtn.classList.remove('is-hidden');
    toggleBtn.textContent = isExpanded ? 'Show less' : 'Show more';
    toggleBtn.addEventListener('click', () => {
      if (isExpanded) {
        state.expandedArticleIds.delete(article.id);
      } else {
        state.expandedArticleIds.add(article.id);
      }
      renderArticles();
    });
  } else {
    toggleBtn.classList.add('is-hidden');
  }

  // Image (Milestone 5)
  const imageEl = card.querySelector('.article-card__image');
  if (article.imageUrl) {
    imageEl.src = article.imageUrl;
    imageEl.alt = article.title;
    imageEl.classList.remove('is-hidden');
    imageEl.onerror = () => imageEl.classList.add('is-hidden');
  }

  // Podcast audio (Milestone 5)
  const audioEl = card.querySelector('.article-card__audio');
  if (article.enclosureUrl && article.enclosureType && article.enclosureType.startsWith('audio/')) {
    audioEl.src = article.enclosureUrl;
    audioEl.classList.remove('is-hidden');
  }

  // Per-article content direction (Milestone 7, content-level)
  card.setAttribute('dir', detectDirection(article.language, fullText || article.title));

  // Favorites star
  const starBtn = card.querySelector('.article-card__star');
  const favorited = isFavorite(article.id);
  starBtn.textContent = favorited ? '★' : '☆';
  starBtn.classList.toggle('is-favorited', favorited);
  starBtn.setAttribute('aria-pressed', String(favorited));
  starBtn.addEventListener('click', async () => {
    starBtn.disabled = true;
    try {
      const nowFavorited = await toggleFavorite(article.id);
      starBtn.textContent = nowFavorited ? '★' : '☆';
      starBtn.classList.toggle('is-favorited', nowFavorited);
      starBtn.setAttribute('aria-pressed', String(nowFavorited));
      if (state.activeView === 'starred' && !nowFavorited) {
        renderArticles();
      }
    } catch (error) {
      showBanner(error.message || 'Could not update favorite.', 'error');
    } finally {
      starBtn.disabled = false;
    }
  });

  // Share/copy link (Milestone 9)
  const shareBtn = card.querySelector('.article-card__share');
  shareBtn.addEventListener('click', async () => {
    try {
      await copyToClipboard(article.link);
      shareBtn.textContent = 'Copied!';
      setTimeout(() => {
        shareBtn.innerHTML = '&#128279; Copy link';
      }, 1500);
    } catch {
      showBanner('Could not copy link — copy it manually from the address bar instead.', 'error');
    }
  });

  return card;
}