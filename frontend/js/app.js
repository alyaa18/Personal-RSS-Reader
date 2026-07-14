import { state } from './state.js';
import { dom } from './dom.js';
import { loadFavorites } from './favorites.js';
import { loadPlaylists } from './playlists.js';
import {
  renderFeedList, renderPlaylistList, renderArticles,
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

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

setRerenderCallback(renderArticles);
setPlaylistPickerHandler(openPlaylistPicker);

function resetNavigationState() {
  state.activeView = 'all';
  state.activeFeedId = 'all';
  state.activePlaylistId = null;
  state.currentPlaylistMeta = null;
  state.playlistArticles = [];
  state.currentPage = 1;
}

function setActiveFeed(feedId) {
  resetNavigationState();
  state.activeFeedId = feedId;
  updateActiveStyles();
  updateContentHeader();
  updatePlaylistToolbar();
  renderArticles();
}

function setActiveView(view) {
  resetNavigationState();
  state.activeView = view;
  updateActiveStyles();
  updateContentHeader();
  updatePlaylistToolbar();
  renderArticles();
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
  renderArticles();
}

setOnPlaylistDeleted((deletedPlaylistId) => {
  if (state.activePlaylistId === deletedPlaylistId) {
    setActiveView('all');
  }
});

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
  renderArticles();
}

async function loadAppData() {
  setArticleListState('loading');
  clearBanners();
  try {
    await Promise.all([loadFeeds(), loadArticles(), loadFavorites(), loadPlaylists()]);
    renderPlaylistList();
    renderArticles();
  } catch (error) {
    setArticleListState('empty');
    showBanner(error.message || 'Something went wrong loading your feeds.', 'error');
  }
}

function init() {
  initSearch();
  initAddFeedModal();
  initPlaylistUI();
  initAuthUI(loadAppData);
}

init();