import { state } from './state.js';
import { dom } from './dom.js';
import { loadFavorites } from './favorites.js';
import { renderFeedList, renderArticles, updateActiveStyles, updateContentHeader, setArticleListState } from './render.js';
import { setRerenderCallback } from './pagination.js';
import { initSearch } from './search.js';
import { initAddFeedModal } from './modal.js';
import { handleRemoveFeed, handleRefreshFeed, handleRefreshAll } from './feedActions.js';
import { showBanner, clearBanners } from './banner.js';
import { initAuthUI } from './authUI.js';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

setRerenderCallback(renderArticles);

function navigateTo(feedId, view) {
  state.activeView = view;
  state.activeFeedId = feedId;
  state.currentPage = 1;
  updateActiveStyles();
  updateContentHeader();
  renderArticles();
}

function setActiveFeed(feedId) {
  navigateTo(feedId, 'all');
}

function setActiveView(view) {
  navigateTo('all', view);
}

dom.navAllArticles.addEventListener('click', () => setActiveFeed('all'));
dom.navStarred.addEventListener('click', () => setActiveView('starred'));

dom.feedScrollLeftBtn?.addEventListener('click', () => {
  dom.feedList.scrollBy({ left: -180, behavior: 'smooth' });
});

dom.feedScrollRightBtn?.addEventListener('click', () => {
  dom.feedList.scrollBy({ left: 180, behavior: 'smooth' });
});

dom.feedList.addEventListener('click', (event) => {
  const li = event.target.closest('.feed-item');
  if (!li) return;
  const feedId = li.dataset.feedId;

  const removeBtn = event.target.closest('.feed-item__remove');
  if (removeBtn) return handleRemoveFeed(feedId);

  const refreshBtn = event.target.closest('.feed-item__refresh');
  if (refreshBtn) return handleRefreshFeed(feedId, refreshBtn);

  setActiveFeed(feedId);
});

dom.refreshAllBtn.addEventListener('click', handleRefreshAll);

async function loadFeeds() {
  state.feeds = await api.getFeeds();
  renderFeedList();
}

async function loadArticles() {
  state.articles = await api.getArticles();
  renderArticles();
}

// Runs once per successful login/register, and once at startup if a
// valid session already exists in sessionStorage.
async function loadAppData() {
  loadFavorites();
  setArticleListState('loading');
  clearBanners();
  try {
    await Promise.all([loadFeeds(), loadArticles()]);
  } catch (error) {
    setArticleListState('empty');
    showBanner(error.message || 'Something went wrong loading your feeds.', 'error');
  }
}

function init() {
  initSearch();
  initAddFeedModal();
  // initAuthUI shows either the login screen or the app shell depending on
  // whether a valid session exists, and calls loadAppData() once logged in
  // (either immediately, on existing session, or after a successful
  // login/register submission).
  initAuthUI(loadAppData);
}

init();