import { state } from './state.js';
import { dom } from './dom.js';
import { cloneTemplate, formatDateTime, setFaviconWithFallback, truncateText, copyToClipboard } from './utils.js';
import { isFavorite, toggleFavorite } from './favorites.js';
import { renderPagination } from './pagination.js';
import { showBanner } from './banner.js';
import { t, translateArticles } from './i18n.js';

const SUMMARY_WORD_LIMIT = 42;

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

// Set by app.js to avoid a circular import with playlistUI.js — same
// indirection pattern pagination.js already uses for its rerender callback.
let openPlaylistPickerCallback = () => {};
export function setPlaylistPickerHandler(fn) {
  openPlaylistPickerCallback = fn;
}

// ---------- Sidebar mode switching ----------

export function renderSidebar() {
  const isPlaylists = state.sidebarMode === 'playlists';
  dom.sidebarFeedsSection.classList.toggle('is-hidden', isPlaylists);
  dom.sidebarPlaylistsSection.classList.toggle('is-hidden', !isPlaylists);

  if (isPlaylists) {
    renderPlaylistList();
  } else {
    renderFeedList();
  }

  updateActiveStyles();
}

// ---------- Feed list (sidebar) ----------

export function renderFeedList() {
  dom.feedList.querySelectorAll('.feed-item').forEach((el) => el.remove());
  dom.feedListEmpty.classList.toggle('is-hidden', state.feeds.length > 0);
  state.feeds.forEach((feed) => dom.feedList.appendChild(buildFeedItem(feed)));
  updateArticleCounts();
}

function buildFeedItem(feed) {
  const li = cloneTemplate(dom.feedItemTemplate);
  li.dataset.feedId = feed.id;
  setFaviconWithFallback(li.querySelector('.feed-item__favicon'), feed.url);
  li.querySelector('.feed-item__title').textContent = feed.title;
  return li;
}

export function updateArticleCounts() {
  const total = getFilteredArticles().length;
  dom.countAllArticles.textContent = total > 0 ? total : '';

  state.feeds.forEach((feed) => {
    const count = state.articles.filter((a) => a.feedId === feed.id).length;
    const li = dom.feedList.querySelector(`[data-feed-id="${feed.id}"]`);
    if (li) {
      const countEl = li.querySelector('.feed-item__count');
      if (countEl) countEl.textContent = count > 0 ? count : '';
    }
  });
}

// ---------- Playlist list (sidebar) ----------

export function renderPlaylistList() {
  dom.playlistList.querySelectorAll('.playlist-item').forEach((el) => el.remove());
  dom.playlistListEmpty.classList.add('is-hidden');
  state.playlists.forEach((playlist) => dom.playlistList.appendChild(buildPlaylistItem(playlist)));
  updateActiveStyles();
}

function buildPlaylistItem(playlist) {
  const li = cloneTemplate(dom.playlistItemTemplate);
  li.dataset.playlistId = playlist.id;
  li.querySelector('.playlist-item__title').textContent = playlist.name;
  return li;
}

export function updateActiveStyles() {
  dom.navAllArticles.classList.toggle('is-active', state.activeView === 'all' && state.activeFeedId === 'all');
  dom.navStarred.classList.toggle('is-active', state.activeView === 'starred');
  dom.navPlaylists.classList.toggle('is-active', state.activeView === 'playlist');
  dom.feedList.querySelectorAll('.feed-item').forEach((li) => {
    li.classList.toggle('is-active', state.activeView === 'all' && li.dataset.feedId === state.activeFeedId);
  });
  dom.playlistList.querySelectorAll('.playlist-item').forEach((li) => {
    li.classList.toggle('is-active', state.activeView === 'playlist' && li.dataset.playlistId === state.activePlaylistId);
  });
}

export function updateContentHeader() {
  if (state.activeView === 'starred') {
    dom.contentTitle.textContent = t('content.starred');
  } else if (state.activeView === 'playlist') {
    dom.contentTitle.textContent = state.currentPlaylistMeta ? state.currentPlaylistMeta.name : t('content.playlist');
  } else if (state.activeFeedId === 'all') {
    dom.contentTitle.textContent = t('content.all_articles');
  } else {
    const feed = state.feeds.find((f) => f.id === state.activeFeedId);
    dom.contentTitle.textContent = feed ? feed.title : t('content.all_articles');
  }
}

// ---------- Filtering pipeline: view -> feed/playlist -> search ----------

export function getFilteredArticles() {
  let list;

  if (state.activeView === 'starred') {
    list = state.articles.filter((a) => state.favorites.has(a.id));
  } else if (state.activeView === 'playlist') {
    list = state.playlistArticles;
  } else if (state.activeFeedId !== 'all') {
    list = state.articles.filter((a) => a.feedId === state.activeFeedId);
  } else {
    list = state.articles;
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

  if (mode === 'empty') {
    if (state.activeView === 'playlist') {
      if (state.playlists.length === 0) {
        dom.stateEmpty.querySelector('.state__title').textContent = t('state.no_playlists_title');
        dom.stateEmpty.querySelector('.state__body').textContent = t('state.no_playlists_body');
      } else {
        dom.stateEmpty.querySelector('.state__title').textContent = t('state.playlist_empty_title');
        dom.stateEmpty.querySelector('.state__body').textContent = t('state.playlist_empty_body');
      }
      dom.stateEmptyCta.classList.add('is-hidden');
    } else {
      // Restore default content from data-i18n attributes
      const titleEl = dom.stateEmpty.querySelector('.state__title');
      const bodyEl = dom.stateEmpty.querySelector('.state__body');
      const titleKey = titleEl.getAttribute('data-i18n');
      const bodyKey = bodyEl.getAttribute('data-i18n');
      if (titleKey) titleEl.textContent = t(titleKey);
      if (bodyKey) bodyEl.textContent = t(bodyKey);
      dom.stateEmptyCta.classList.remove('is-hidden');
    }
  }
}

export async function renderArticles() {
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

  // Translate articles if Arabic language is active
  const translated = await translateArticles(pageItems);

  translated.forEach((article) => {
    dom.articleList.appendChild(buildArticleCard(article));
  });

  renderPagination(filtered.length);
  updateArticleCounts();
}

export function renderArticlesSync() {
  // Non-translating version used during transitions
  dom.articleList.querySelectorAll('.article-card').forEach((el) => el.remove());

  const filtered = getFilteredArticles();
  const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  if (filtered.length === 0) {
    setArticleListState('empty');
    renderPagination(0);
    updateArticleCounts();
    return;
  }

  setArticleListState('content');

  const start = (state.currentPage - 1) * state.pageSize;
  const pageItems = filtered.slice(start, start + state.pageSize);

  pageItems.forEach((article) => {
    dom.articleList.appendChild(buildArticleCard(article));
  });

  renderPagination(filtered.length);
  updateArticleCounts();
}

export async function renderArticlesWithTransition() {
  if (dom.articleList.classList.contains('is-refreshing')) {
    await renderArticles();
    return;
  }
  dom.articleList.classList.add('is-refreshing');
  await renderArticles();
  requestAnimationFrame(() => dom.articleList.classList.remove('is-refreshing'));
}

// Non-async version for use as rerender callback by pagination
export function renderArticlesSyncWrapper() {
  renderArticlesSync();
}

function buildArticleCard(article) {
  const card = cloneTemplate(dom.articleItemTemplate);
  card.dataset.articleId = article.id;

  const feed = state.feeds.find((f) => f.id === article.feedId);
  setFaviconWithFallback(card.querySelector('.article-card__favicon'), feed ? feed.url : '');

  card.querySelector('.article-card__feed-title').textContent = article.feedTitle;

  const authorEl = card.querySelector('.article-card__author');
  if (article.author) {
    authorEl.textContent = article.author;
    authorEl.classList.remove('is-hidden');
  }

  const dateEl = card.querySelector('.article-card__date');
  dateEl.textContent = formatDateTime(article.publishedAt);
  dateEl.setAttribute('datetime', article.publishedAt);

  const link = card.querySelector('.article-card__link');
  link.href = article.link;
  link.textContent = article.title;

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

  summaryEl.textContent = (!isTruncated || isExpanded) ? fullText : truncated;

  const toggleBtn = card.querySelector('.article-card__toggle');
  if (isTruncated) {
    toggleBtn.classList.remove('is-hidden');
    toggleBtn.textContent = isExpanded ? t('article.show_less') : t('article.show_more');
    toggleBtn.addEventListener('click', () => {
      isExpanded ? state.expandedArticleIds.delete(article.id) : state.expandedArticleIds.add(article.id);
      renderArticles();
    });
  } else {
    toggleBtn.classList.add('is-hidden');
  }

  const imageEl = card.querySelector('.article-card__image');
  if (article.imageUrl) {
    imageEl.src = article.imageUrl;
    imageEl.alt = article.title;
    imageEl.classList.remove('is-hidden');
    imageEl.onerror = () => imageEl.classList.add('is-hidden');
  }

  const audioEl = card.querySelector('.article-card__audio');
  if (article.enclosureUrl && article.enclosureType && article.enclosureType.startsWith('audio/')) {
    audioEl.src = article.enclosureUrl;
    audioEl.classList.remove('is-hidden');
  }

  card.setAttribute('dir', detectDirection(article.language, fullText || article.title));

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
      if (state.activeView === 'starred' && !nowFavorited) renderArticles();
    } catch (error) {
      showBanner(error.message || t('banner.favorite_error'), 'error');
    } finally {
      starBtn.disabled = false;
    }
  });

  const shareBtn = card.querySelector('.article-card__share');
  shareBtn.addEventListener('click', async () => {
    try {
      await copyToClipboard(article.link);
      shareBtn.textContent = t('article.copied');
      setTimeout(() => { shareBtn.textContent = t('article.copy_link'); }, 1500);
    } catch {
      showBanner(t('banner.copy_error'), 'error');
    }
  });

  const playlistAddBtn = card.querySelector('.article-card__playlist-add');
  playlistAddBtn.addEventListener('click', () => openPlaylistPickerCallback(article.id));

  return card;
}