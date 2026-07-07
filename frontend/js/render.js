import { state } from './state.js';
import { dom } from './dom.js';
import { cloneTemplate, formatDate, setFaviconWithFallback, truncateText } from './utils.js';
import { isFavorite, toggleFavorite } from './favorites.js';
import { renderPagination } from './pagination.js';

const SUMMARY_LIMIT = 240;

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

// ---------- Loading / empty state (Commit 6) ----------

export function setArticleListState(mode) {
  // mode: 'loading' | 'empty' | 'content'
  dom.stateEmpty.classList.toggle('is-hidden', mode !== 'empty');
  dom.stateLoading.classList.toggle('is-hidden', mode !== 'loading');
}

// ---------- Main article list render ----------

export function renderArticles() {
  dom.articleList.querySelectorAll('.article-card, .article-group-label').forEach((el) => el.remove());

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

  // Commit 8: group label whenever the feed changes, only in the mixed "All Articles" view.
  let lastFeedId = null;
  pageItems.forEach((article) => {
    if (state.activeView === 'all' && state.activeFeedId === 'all' && article.feedId !== lastFeedId) {
      dom.articleList.appendChild(buildFeedGroupLabel(article));
      lastFeedId = article.feedId;
    }
    dom.articleList.appendChild(buildArticleCard(article));
  });

  renderPagination(filtered.length);
}

function buildFeedGroupLabel(article) {
  const label = document.createElement('div');
  label.className = 'article-group-label';
  label.textContent = article.feedTitle;
  return label;
}

function buildArticleCard(article) {
  const card = cloneTemplate(dom.articleItemTemplate);
  card.dataset.articleId = article.id;

  const feed = state.feeds.find((f) => f.id === article.feedId);
  setFaviconWithFallback(card.querySelector('.article-card__favicon'), feed ? feed.url : '');

  card.querySelector('.article-card__feed-title').textContent = article.feedTitle;

  const dateEl = card.querySelector('.article-card__date');
  dateEl.textContent = formatDate(article.publishedAt);
  dateEl.setAttribute('datetime', article.publishedAt);

  const link = card.querySelector('.article-card__link');
  link.href = article.link;
  link.textContent = article.title;

  card.querySelector('.article-card__read-original').href = article.link;

  // Commit 4: Read More / Read Less truncation.
  const summaryEl = card.querySelector('.article-card__summary');
  const cleanHtml = DOMPurify.sanitize(article.summary || '', {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });

  const plainTextHolder = document.createElement('div');
  plainTextHolder.innerHTML = cleanHtml;
  const fullText = plainTextHolder.textContent;
  const { truncated, isTruncated } = truncateText(fullText, SUMMARY_LIMIT);
  const isExpanded = state.expandedArticleIds.has(article.id);

  if (!isTruncated || isExpanded) {
    summaryEl.innerHTML = cleanHtml;
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

  // Commit 10: favorites star.
  const starBtn = card.querySelector('.article-card__star');
  const favorited = isFavorite(article.id);
  starBtn.textContent = favorited ? '★' : '☆';
  starBtn.classList.toggle('is-favorited', favorited);
  starBtn.setAttribute('aria-pressed', String(favorited));
  starBtn.addEventListener('click', () => {
    toggleFavorite(article.id);
    const nowFavorited = isFavorite(article.id);
    starBtn.textContent = nowFavorited ? '★' : '☆';
    starBtn.classList.toggle('is-favorited', nowFavorited);
    starBtn.setAttribute('aria-pressed', String(nowFavorited));
    if (state.activeView === 'starred' && !nowFavorited) {
      renderArticles();
    }
  });

  return card;
}