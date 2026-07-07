import { state } from './state.js';
import { dom } from './dom.js';
import { showBanner } from './banner.js';
import { renderFeedList, renderArticles, renderArticlesWithTransition } from './render.js';
import { confirmAction } from './confirmModal.js';

let isRefreshAllInFlight = false;
const refreshingFeedIds = new Set();

export async function handleRemoveFeed(feedId) {
  const feed = state.feeds.find((f) => f.id === feedId);
  if (!feed) return;

  const confirmed = await confirmAction({
    title: 'Remove feed?',
    message: `Remove "${feed.title}"? This also deletes its saved articles.`,
    confirmLabel: 'Remove',
    danger: true,
  });
  if (!confirmed) return;

  try {
    await api.removeFeed(feedId);
    state.feeds = state.feeds.filter((f) => f.id !== feedId);
    state.articles = state.articles.filter((a) => a.feedId !== feedId);
    if (state.activeFeedId === feedId) state.activeFeedId = 'all';

    renderFeedList();
    renderArticles();
    showBanner(`Removed "${feed.title}".`, 'success');
  } catch (error) {
    showBanner(error.message || 'Could not remove this feed.', 'error');
  }
}

export async function handleRefreshFeed(feedId, refreshBtnEl) {
  if (isRefreshAllInFlight || refreshingFeedIds.has(feedId)) return;

  const feed = state.feeds.find((f) => f.id === feedId);
  if (!feed) return;

  refreshingFeedIds.add(feedId);
  refreshBtnEl.classList.add('is-spinning');
  refreshBtnEl.disabled = true;

  try {
    const result = await api.refreshFeed(feedId);
    if (result.articles.length > 0) {
      state.articles = [...result.articles, ...state.articles].sort(
        (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
      );
      renderArticlesWithTransition();
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
    refreshingFeedIds.delete(feedId);
    refreshBtnEl.classList.remove('is-spinning');
    refreshBtnEl.disabled = false;
  }
}

export async function handleRefreshAll() {
  if (state.feeds.length === 0 || isRefreshAllInFlight) return;

  isRefreshAllInFlight = true;

  dom.refreshAllBtn.disabled = true;
  const originalLabel = dom.refreshAllBtn.innerHTML;
  dom.refreshAllBtn.innerHTML = '<span class="spinner--sm" aria-hidden="true"></span> Refreshing…';

  try {
    const result = await api.refreshAllFeeds();
    const totalNew = result.newArticlesCount ?? 0;
    const newArticles = result.articles ?? [];

    if (newArticles.length > 0) {
      state.articles = [...newArticles, ...state.articles].sort(
        (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
      );
      renderArticlesWithTransition();
    }

    const failedCount = result.failedFeedsCount ?? 0;
    if (failedCount > 0) showBanner(`${failedCount} feed(s) could not be refreshed.`, 'error');
    showBanner(
      totalNew > 0 ? `${totalNew} new article(s) found.` : 'No new articles found.',
      'success',
      totalNew > 0 ? 4000 : 6500
    );
  } catch (error) {
    showBanner(error.message || 'Could not refresh feeds.', 'error');
  } finally {
    dom.refreshAllBtn.disabled = false;
    dom.refreshAllBtn.innerHTML = originalLabel;
    isRefreshAllInFlight = false;
  }
}