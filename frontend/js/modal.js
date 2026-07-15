import { state } from './state.js';
import { dom } from './dom.js';
import { isLoggedIn } from './auth.js';
import { renderFeedList, renderArticles, updateActiveStyles, updateContentHeader } from './render.js';
import { showBanner } from './banner.js';
import { t } from './i18n.js';
import { redirectToAuth } from './authUI.js';

export function initAddFeedModal() {
  dom.openAddFeedBtn.addEventListener('click', openAddFeedDialog);
  dom.stateEmptyCta.addEventListener('click', openAddFeedDialog);
  dom.cancelAddFeedBtn.addEventListener('click', () => dom.addFeedDialog.close());
  dom.addFeedForm.addEventListener('submit', handleAddFeedSubmit);
}

function openAddFeedDialog() {
  if (!isLoggedIn()) {
    showLoginRequired();
    return;
  }
  dom.feedUrlInput.value = '';
  hideAddFeedError();
  dom.addFeedDialog.showModal();
  dom.feedUrlInput.focus();
}

function hideAddFeedError() {
  dom.addFeedError.classList.add('is-hidden');
  dom.addFeedError.textContent = '';
}

function showAddFeedError(message) {
  dom.addFeedError.textContent = message;
  dom.addFeedError.classList.remove('is-hidden');
}

function showLoginRequired() {
  showBanner(t('guest.login_required'), 'info');
  redirectToAuth();
}

async function handleAddFeedSubmit(event) {
  event.preventDefault();
  const url = dom.feedUrlInput.value.trim();
  if (!url) return;

  hideAddFeedError();
  dom.submitAddFeedBtn.disabled = true;
  dom.submitAddFeedBtn.textContent = t('modal.adding');

  try {
    const result = await api.addFeed(url);

    // Handle duplicate feed — navigate to it and highlight
    if (result.duplicate && result.feed) {
      const feed = result.feed;
      dom.addFeedDialog.close();
      showBanner(t('banner.feed_exists', { name: feed.title }), 'info');

      // Navigate to the feed
      state.activeFeedId = feed.id;
      state.activeView = 'all';
      state.activePlaylistId = null;
      state.currentPage = 1;
      updateActiveStyles();
      updateContentHeader();

      // Highlight the feed item in the sidebar
      const feedItems = dom.feedList.querySelectorAll('.feed-item');
      feedItems.forEach((el) => {
        el.classList.remove('is-highlighted');
        if (el.dataset.feedId === feed.id) {
          el.classList.add('is-highlighted');
          // Scroll into view if needed
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      await renderArticles();
      return;
    }

    state.feeds.push(result);
    renderFeedList();
    state.articles = await api.getArticles();
    await renderArticles();
    dom.addFeedDialog.close();
    showBanner(t('banner.added_feed', { name: result.title }), 'success');
  } catch (error) {
    showAddFeedError(error.message || 'Could not add this feed.');
  } finally {
    dom.submitAddFeedBtn.disabled = false;
    dom.submitAddFeedBtn.textContent = t('modal.add_feed');
  }
}