import { state } from './state.js';
import { dom } from './dom.js';
import { renderFeedList, renderArticles } from './render.js';
import { showBanner } from './banner.js';

export function initAddFeedModal() {
  dom.openAddFeedBtn.addEventListener('click', openAddFeedDialog);
  dom.stateEmptyCta.addEventListener('click', openAddFeedDialog);
  dom.cancelAddFeedBtn.addEventListener('click', () => dom.addFeedDialog.close());
  dom.addFeedForm.addEventListener('submit', handleAddFeedSubmit);
}

function openAddFeedDialog() {
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

async function handleAddFeedSubmit(event) {
  event.preventDefault();
  const url = dom.feedUrlInput.value.trim();
  if (!url) return;

  hideAddFeedError();
  dom.submitAddFeedBtn.disabled = true;
  dom.submitAddFeedBtn.textContent = 'Adding…';

  try {
    const newFeed = await api.addFeed(url);
    state.feeds.push(newFeed);
    renderFeedList();
    state.articles = await api.getArticles();
    renderArticles();
    dom.addFeedDialog.close();
    showBanner(`Added "${newFeed.title}".`, 'success');
  } catch (error) {
    showAddFeedError(error.message || 'Could not add this feed.');
  } finally {
    dom.submitAddFeedBtn.disabled = false;
    dom.submitAddFeedBtn.textContent = 'Add Feed';
  }
}