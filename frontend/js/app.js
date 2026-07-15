import { state } from './state.js';
import { dom } from './dom.js';
import { loadFavorites } from './favorites.js';
import { loadPlaylists } from './playlists.js';
import {
  renderFeedList, renderPlaylistList, renderArticles,
  renderArticlesSyncWrapper,
  updateActiveStyles, updateContentHeader, setArticleListState,
  setPlaylistPickerHandler,
} from './render.js';
import { setRerenderCallback } from './pagination.js';
import { initSearch } from './search.js';
import { initAddFeedModal } from './modal.js';
import { handleRemoveFeed, handleRefreshFeed, handleRefreshAll } from './feedActions.js';
import { showBanner, clearBanners } from './banner.js';
import { initAuthUI } from './authUI.js';
import {
  initPlaylistUI, openPlaylistPicker, updatePlaylistToolbar,
  handleDeletePlaylist, setOnPlaylistDeleted,
} from './playlistUI.js';
import { loadPlaylistDetail } from './playlists.js';
import { t, getCurrentLang, initLangSwitch, setOnLangChanged, updateUILanguage } from './i18n.js';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

setRerenderCallback(renderArticlesSyncWrapper);
setPlaylistPickerHandler(openPlaylistPicker);

function resetNavigationState() {
  state.activeView = 'all';
  state.activeFeedId = 'all';
  state.activePlaylistId = null;
  state.currentPlaylistMeta = null;
  state.playlistArticles = [];
  state.currentPage = 1;
}

async function setActiveFeed(feedId) {
  resetNavigationState();
  state.activeFeedId = feedId;
  updateActiveStyles();
  updateContentHeader();
  updatePlaylistToolbar();
  await renderArticles();
}

async function setActiveView(view) {
  resetNavigationState();
  state.activeView = view;
  updateActiveStyles();
  updateContentHeader();
  updatePlaylistToolbar();
  await renderArticles();
}

async function setActivePlaylist(playlistId) {
  state.activeView = 'playlist';
  state.activeFeedId = 'all';
  state.activePlaylistId = playlistId;
  state.currentPage = 1;
  updateActiveStyles();
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

dom.navAllArticles.addEventListener('click', () => setActiveFeed('all'));
dom.navStarred.addEventListener('click', () => setActiveView('starred'));

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

async function loadFeeds() {
  state.feeds = await api.getFeeds();
  renderFeedList();
}

async function loadArticles() {
  state.articles = await api.getArticles();
  await renderArticles();
}

async function loadAppData() {
  setArticleListState('loading');
  clearBanners();
  try {
    await Promise.all([loadFeeds(), loadArticles(), loadFavorites(), loadPlaylists()]);
    renderPlaylistList();
    await renderArticles();
  } catch (error) {
    setArticleListState('empty');
    showBanner(error.message || t('banner.load_error'), 'error');
  }
}

// Called when language changes — re-render dynamic content
async function onLanguageChanged() {
  updateUILanguage();
  updateContentHeader();
  await renderArticles();
  updatePlaylistToolbar();
}

function init() {
  initSearch();
  initAddFeedModal();
  initPlaylistUI();
  initAuthUI(loadAppData);

  // Register language change listener to re-render
  setOnLangChanged(onLanguageChanged);

  // Add language switch button in the content header (top-right corner)
  const langSwitchContainer = document.getElementById('lang-switch-container');
  if (langSwitchContainer) {
    initLangSwitch(langSwitchContainer);
  }

  // Apply initial static translations
  updateUILanguage();
}

init();