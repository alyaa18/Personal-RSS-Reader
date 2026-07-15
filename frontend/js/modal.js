import { state } from './state.js';
import { dom } from './dom.js';
import { isLoggedIn } from './auth.js';
import { renderSidebar, renderArticles, updateActiveStyles, updateContentHeader } from './render.js';
import { showBanner } from './banner.js';
import { t } from './i18n.js';
import { redirectToAuth } from './authUI.js';

const SUGGESTED_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', labelKey: 'modal.suggestions_bbc' },
  { url: 'https://github.blog/feed/', labelKey: 'modal.suggestions_github' },
  { url: 'https://news.mit.edu/rss/feed', labelKey: 'modal.suggestions_mit' },
  { url: 'https://hnrss.org/frontpage', labelKey: 'modal.suggestions_hackernews' },
];

export function initAddFeedModal() {
  dom.openAddFeedBtn.addEventListener('click', openAddFeedDialog);
  dom.stateEmptyCta.addEventListener('click', openAddFeedDialog);
  dom.cancelAddFeedBtn.addEventListener('click', () => dom.addFeedDialog.close());
  dom.addFeedForm.addEventListener('submit', handleAddFeedSubmit);

  // Build suggestion chips
  const list = document.getElementById('feed-suggestions-list');
  if (list) {
    SUGGESTED_FEEDS.forEach((feed) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'feed-suggestion-chip';
      chip.textContent = t(feed.labelKey);
      chip.dataset.url = feed.url;
      chip.addEventListener('click', () => {
        dom.feedUrlInput.value = feed.url;
        dom.addFeedForm.requestSubmit();
      });
      list.appendChild(chip);
    });
  }
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
    renderSidebar();
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