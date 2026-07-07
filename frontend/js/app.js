const feedListEl = document.getElementById('feed-list');
const feedListEmptyEl = document.getElementById('feed-list-empty');
const articleListEl = document.getElementById('article-list');
const stateEmptyEl = document.getElementById('state-empty');
const stateLoadingEl = document.getElementById('state-loading');
const bannerRegionEl = document.getElementById('banner-region');
const contentTitleEl = document.getElementById('content-title');
const contentSubtitleEl = document.getElementById('content-subtitle');
const feedItemTemplate = document.getElementById('feed-item-template');
const articleItemTemplate = document.getElementById('article-item-template');

const state = {
  feeds: [],
  articles: [],
};

function cloneTemplate(tpl) {
  return tpl.content.firstElementChild.cloneNode(true);
}

function getDefaultFaviconDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9B968A" stroke-width="2"><circle cx="5" cy="19" r="2" fill="#9B968A" stroke="none"/><path d="M4 4a16 16 0 0 1 16 16M4 11a9 9 0 0 1 9 9" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function showBanner(message, type = 'error') {
  const banner = document.createElement('div');
  banner.className = `banner banner--${type}`;
  banner.textContent = message;
  bannerRegionEl.appendChild(banner);
  if (type === 'success') {
    setTimeout(() => banner.remove(), 4000);
  }
  return banner;
}

function clearBanners() {
  bannerRegionEl.innerHTML = '';
}

function setArticleListState(mode) {
  // mode: 'loading' | 'empty' | 'content'
  stateEmptyEl.classList.toggle('is-hidden', mode !== 'empty');
  stateLoadingEl.classList.toggle('is-hidden', mode !== 'loading');
}

function renderFeedList() {
  feedListEl.querySelectorAll('.feed-item').forEach((el) => el.remove());
  feedListEmptyEl.classList.toggle('is-hidden', state.feeds.length > 0);

  state.feeds.forEach((feed) => {
    feedListEl.appendChild(buildFeedItem(feed));
  });
}

function buildFeedItem(feed) {
  const li = cloneTemplate(feedItemTemplate);
  li.dataset.feedId = feed.id;

  const favicon = li.querySelector('.feed-item__favicon');
  favicon.src = getDefaultFaviconDataUri();
  favicon.alt = '';

  li.querySelector('.feed-item__title').textContent = feed.title;
  return li;
}

function renderArticles() {
  articleListEl.querySelectorAll('.article-card').forEach((el) => el.remove());

  if (state.articles.length === 0) {
    setArticleListState('empty');
    return;
  }

  setArticleListState('content');
  state.articles.forEach((article) => {
    articleListEl.appendChild(buildArticleCard(article));
  });
}

function buildArticleCard(article) {
  const card = cloneTemplate(articleItemTemplate);

  const favicon = card.querySelector('.article-card__favicon');
  favicon.src = getDefaultFaviconDataUri();
  favicon.alt = '';

  card.querySelector('.article-card__feed-title').textContent = article.feedTitle;

  const dateEl = card.querySelector('.article-card__date');
  dateEl.textContent = formatDate(article.publishedAt);
  dateEl.setAttribute('datetime', article.publishedAt);

  const link = card.querySelector('.article-card__link');
  link.href = article.link;
  link.textContent = article.title;

  // textContent (not innerHTML) is a deliberate safety default: any HTML tags
  // in the summary show up as literal text instead of executing. Step 13
  // upgrades this to sanitized HTML rendering via DOMPurify.
  card.querySelector('.article-card__summary').textContent = article.summary;

  return card;
}

async function loadFeeds() {
  state.feeds = await api.getFeeds();
  renderFeedList();
}

async function loadArticles() {
  state.articles = await api.getArticles();
  renderArticles();
}

async function init() {
  setArticleListState('loading');
  clearBanners();
  try {
    await Promise.all([loadFeeds(), loadArticles()]);
  } catch (error) {
    setArticleListState('empty');
    showBanner(error.message || 'Something went wrong loading your feeds.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);