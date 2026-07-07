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

const addFeedDialog = document.getElementById('add-feed-dialog');
const addFeedForm = document.getElementById('add-feed-form');
const feedUrlInput = document.getElementById('feed-url-input');
const addFeedErrorEl = document.getElementById('add-feed-error');
const openAddFeedBtn = document.getElementById('open-add-feed');
const cancelAddFeedBtn = document.getElementById('cancel-add-feed');
const submitAddFeedBtn = document.getElementById('submit-add-feed');
const stateEmptyCtaBtn = document.getElementById('state-empty-cta');
const refreshAllBtn = document.getElementById('refresh-all-feeds');

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

// ---------- Add Feed modal ----------

function openAddFeedDialog() {
  feedUrlInput.value = '';
  hideAddFeedError();
  addFeedDialog.showModal();
  feedUrlInput.focus();
}

function hideAddFeedError() {
  addFeedErrorEl.classList.add('is-hidden');
  addFeedErrorEl.textContent = '';
}

function showAddFeedError(message) {
  addFeedErrorEl.textContent = message;
  addFeedErrorEl.classList.remove('is-hidden');
}

async function handleAddFeedSubmit(event) {
  event.preventDefault();
  const url = feedUrlInput.value.trim();
  if (!url) return;

  hideAddFeedError();
  submitAddFeedBtn.disabled = true;
  submitAddFeedBtn.textContent = 'Adding…';

  try {
    const newFeed = await api.addFeed(url);
    state.feeds.push(newFeed);
    renderFeedList();
    await loadArticles();
    addFeedDialog.close();
    showBanner(`Added "${newFeed.title}".`, 'success');
  } catch (error) {
    showAddFeedError(error.message || 'Could not add this feed.');
  } finally {
    submitAddFeedBtn.disabled = false;
    submitAddFeedBtn.textContent = 'Add Feed';
  }
}

openAddFeedBtn.addEventListener('click', openAddFeedDialog);
stateEmptyCtaBtn.addEventListener('click', openAddFeedDialog);
cancelAddFeedBtn.addEventListener('click', () => addFeedDialog.close());
addFeedForm.addEventListener('submit', handleAddFeedSubmit);

// ---------- Remove / Refresh feed ----------

feedListEl.addEventListener('click', handleFeedListClick);

function handleFeedListClick(event) {
  const li = event.target.closest('.feed-item');
  if (!li) return;
  const feedId = li.dataset.feedId;

  const removeBtn = event.target.closest('.feed-item__remove');
  if (removeBtn) {
    handleRemoveFeed(feedId);
    return;
  }

  const refreshBtn = event.target.closest('.feed-item__refresh');
  if (refreshBtn) {
    handleRefreshFeed(feedId, refreshBtn);
    return;
  }
  // Feed selection/filtering added in Step 11.
}

async function handleRemoveFeed(feedId) {
  const feed = state.feeds.find((f) => f.id === feedId);
  if (!feed) return;

  const confirmed = window.confirm(`Remove "${feed.title}"? This also deletes its saved articles.`);
  if (!confirmed) return;

  try {
    await api.removeFeed(feedId);
    state.feeds = state.feeds.filter((f) => f.id !== feedId);
    state.articles = state.articles.filter((a) => a.feedId !== feedId);
    renderFeedList();
    renderArticles();
    showBanner(`Removed "${feed.title}".`, 'success');
  } catch (error) {
    showBanner(error.message || 'Could not remove this feed.', 'error');
  }
}

async function handleRefreshFeed(feedId, refreshBtnEl) {
  const feed = state.feeds.find((f) => f.id === feedId);
  if (!feed) return;

  refreshBtnEl.classList.add('is-spinning');
  refreshBtnEl.disabled = true;

  try {
    const result = await api.refreshFeed(feedId);

    if (result.articles.length > 0) {
      state.articles = [...result.articles, ...state.articles].sort(
        (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
      );
      renderArticles();
    }

    showBanner(
      result.newArticlesCount > 0
        ? `${result.newArticlesCount} new article${result.newArticlesCount === 1 ? '' : 's'} from "${feed.title}".`
        : `No new articles from "${feed.title}".`,
      'success'
    );
  } catch (error) {
    showBanner(error.message || `Could not refresh "${feed.title}".`, 'error');
  } finally {
    refreshBtnEl.classList.remove('is-spinning');
    refreshBtnEl.disabled = false;
  }
}

async function handleRefreshAll() {
  if (state.feeds.length === 0) return;

  refreshAllBtn.disabled = true;
  refreshAllBtn.textContent = 'Refreshing…';

  const results = await Promise.allSettled(state.feeds.map((feed) => api.refreshFeed(feed.id)));

  let totalNew = 0;
  let newArticles = [];
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      totalNew += result.value.newArticlesCount;
      newArticles = newArticles.concat(result.value.articles);
    }
  });

  if (newArticles.length > 0) {
    state.articles = [...newArticles, ...state.articles].sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );
    renderArticles();
  }

  const failedCount = results.filter((r) => r.status === 'rejected').length;
  if (failedCount > 0) {
    showBanner(`${failedCount} feed(s) could not be refreshed.`, 'error');
  }
  showBanner(totalNew > 0 ? `${totalNew} new article(s) found.` : 'No new articles found.', 'success');

  refreshAllBtn.disabled = false;
  refreshAllBtn.innerHTML = '&#8635; Refresh All';
}

refreshAllBtn.addEventListener('click', handleRefreshAll);

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