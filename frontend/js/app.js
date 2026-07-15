import { state } from './state.js';
import { dom } from './dom.js';
import { isLoggedIn } from './auth.js';
import { loadFavorites } from './favorites.js';
import { loadPlaylists } from './playlists.js';
import {
  renderSidebar, renderArticles, clearArticleRiver,
  renderArticlesSyncWrapper,
  updateActiveStyles, updateContentHeader, setArticleListState,
  setPlaylistPickerHandler,
} from './render.js';
import { setRerenderCallback } from './pagination.js';
import { initSearch } from './search.js';
import { initAddFeedModal } from './modal.js';
import { handleRemoveFeed, handleRefreshFeed, handleRefreshAll } from './feedActions.js';
import { showBanner, clearBanners } from './banner.js';
import { initAuthUI, enterGuestMode } from './authUI.js';
import {
  initPlaylistUI, openPlaylistPicker, updatePlaylistToolbar,
  handleDeletePlaylist, setOnPlaylistDeleted,
} from './playlistUI.js';
import { loadPlaylistDetail } from './playlists.js';
import { t, getCurrentLang, initLangSwitch, setOnLangChanged, updateUILanguage } from './i18n.js';

// ── Constants ──

const DEMO_FEED_URLS = [
  'https://github.blog/feed/',
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://news.mit.edu/rss/feed',
];

// ── DOMPurify ──

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

setRerenderCallback(renderArticlesSyncWrapper);
setPlaylistPickerHandler(openPlaylistPicker);

// ── Navigation ──

function resetNavigationState() {
  state.activeView = 'all';
  state.activeFeedId = 'all';
  state.activePlaylistId = null;
  state.currentPlaylistMeta = null;
  state.playlistArticles = [];
  state.currentPage = 1;
  state.sidebarMode = 'feeds';
}

async function setActiveFeed(feedId) {
  resetNavigationState();
  state.activeFeedId = feedId;
  renderSidebar();
  updateContentHeader();
  updatePlaylistToolbar();
  await renderArticles();

  // Auto-refresh: silently fetch new articles for this feed
  const feed = state.feeds.find((f) => f.id === feedId);
  if (feed && isLoggedIn()) {
    const refreshBtn = dom.feedList.querySelector(`[data-feed-id="${feedId}"] .feed-item__refresh`);
    if (refreshBtn && !refreshBtn.disabled) {
      handleRefreshFeed(feedId, refreshBtn);
    }
  }
}

async function setActiveView(view) {
  resetNavigationState();
  state.activeView = view;
  renderSidebar();
  updateContentHeader();
  updatePlaylistToolbar();
  await renderArticles();
}

async function setActivePlaylist(playlistId) {
  clearArticleRiver();
  state.activeView = 'playlist';
  state.activeFeedId = 'all';
  state.activePlaylistId = playlistId;
  state.currentPage = 1;
  state.sidebarMode = 'playlists';
  renderSidebar();
  setArticleListState('loading');

  try {
    await loadPlaylistDetail(playlistId);
  } catch (error) {
    state.playlistArticles = [];
    state.currentPlaylistMeta = null;
    showBanner(error.message || 'Could not load playlist.', 'error');
  }

  updateContentHeader();
  updatePlaylistToolbar();
  await renderArticles();
}

setOnPlaylistDeleted((deletedPlaylistId) => {
  if (state.activePlaylistId === deletedPlaylistId) {
    setActiveView('all');
  }
});

// ── Event listeners ──

dom.navAllArticles.addEventListener('click', () => setActiveFeed('all'));
dom.navStarred.addEventListener('click', () => setActiveView('starred'));
dom.navPlaylists.addEventListener('click', () => {
  state.sidebarMode = 'playlists';
  clearArticleRiver();
  if (state.playlists.length > 0) {
    setActivePlaylist(state.playlists[0].id);
  } else {
    // Show playlist view with empty state (no article river visible)
    state.activeView = 'playlist';
    state.activePlaylistId = null;
    state.currentPlaylistMeta = null;
    state.playlistArticles = [];
    state.currentPage = 1;
    renderSidebar();
    updateContentHeader();
    updatePlaylistToolbar();
    setArticleListState('empty');
  }
});

dom.feedScrollLeftBtn?.addEventListener('click', () => {
  const isRtl = getCurrentLang() === 'ar';
  dom.feedList.scrollBy({ left: isRtl ? 180 : -180, behavior: 'smooth' });
});
dom.feedScrollRightBtn?.addEventListener('click', () => {
  const isRtl = getCurrentLang() === 'ar';
  dom.feedList.scrollBy({ left: isRtl ? -180 : 180, behavior: 'smooth' });
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

dom.playlistList.addEventListener('click', (event) => {
  const li = event.target.closest('.playlist-item');
  if (!li) return;
  const playlistId = li.dataset.playlistId;

  const removeBtn = event.target.closest('.playlist-item__remove');
  if (removeBtn) {
    const playlist = state.playlists.find((p) => p.id === playlistId);
    if (playlist) handleDeletePlaylist(playlistId, playlist.name);
    return;
  }

  setActivePlaylist(playlistId);
});

dom.refreshAllBtn.addEventListener('click', handleRefreshAll);

// ── Data loading ──

async function loadFeeds() {
  if (!isLoggedIn()) return;
  state.feeds = await api.getFeeds();
}

async function loadArticles() {
  if (!isLoggedIn()) return;
  state.articles = await api.getArticles();
  await renderArticles();
}

async function loadAppData() {
  setArticleListState('loading');
  clearBanners();
  try {
    await Promise.all([loadFeeds(), loadArticles(), loadFavorites(), loadPlaylists()]);
    renderSidebar();
    await renderArticles();
  } catch (error) {
    setArticleListState('empty');
    showBanner(error.message || t('banner.load_error'), 'error');
  }
}

// ── Guest mode ──

async function loadGuestData() {
  setArticleListState('loading');
  clearBanners();
  try {
    const demo = await api.getDemoData();
    // Build mock feeds
    state.feeds = demo.feeds.map((f) => ({ id: f.id, title: f.title, url: f.url }));
    state.articles = demo.articles.map((a) => ({
      id: a.id,
      feedId: a.feedId,
      feedTitle: a.feedTitle,
      title: a.title,
      link: a.link,
      summary: a.summary,
      publishedAt: a.publishedAt,
      fetchedAt: a.fetchedAt,
      imageUrl: null,
      enclosureUrl: null,
      enclosureType: null,
      language: null,
      author: a.author,
    }));
    state.favorites = new Set();
    state.playlists = [];
    state.sidebarMode = 'feeds';
    renderSidebar();
    await renderArticles();
  } catch (error) {
    setArticleListState('empty');
    showBanner(error.message || 'Could not load demo data.', 'error');
  }
}

// ── Language change ──

async function onLanguageChanged() {
  updateUILanguage();
  updateContentHeader();
  await renderArticles();
  updatePlaylistToolbar();
}

// ── Back to top ──

function initBackToTop() {
  let ticking = false;
  dom.backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        dom.backToTopBtn.classList.toggle('is-hidden', window.scrollY < 300);
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ── Init ──

function init() {
  initSearch();
  initAddFeedModal();
  initPlaylistUI();
  initAuthUI(loadAppData, loadGuestData);
  initBackToTop();

  setOnLangChanged(onLanguageChanged);

  const langSwitchContainer = document.getElementById('lang-switch-container');
  if (langSwitchContainer) {
    initLangSwitch(langSwitchContainer);
  }

  updateUILanguage();
}

init();