import { state } from './state.js';
import { dom } from './dom.js';
import { isLoggedIn } from './auth.js';
import { showBanner } from './banner.js';
import { renderSidebar, renderArticles, renderArticlesWithTransition } from './render.js';
import { confirmAction } from './confirmModal.js';
import { t } from './i18n.js';
import { redirectToAuth } from './authUI.js';

let isRefreshAllInFlight = false;
const refreshingFeedIds = new Set();

function requireLogin() {
  if (!isLoggedIn()) {
    showBanner(t('guest.login_required'), 'info');
    redirectToAuth();
    return false;
  }
  return true;
}

export async function handleRemoveFeed(feedId) {
  if (!requireLogin()) return;
  const feed = state.feeds.find((f) => f.id === feedId);
  if (!feed) return;

  const confirmed = await confirmAction({
    title: t('confirm.remove_feed_title'),
    message: t('confirm.remove_feed_message', { name: feed.title }),
    confirmLabel: t('confirm.remove_label'),
    danger: true,
  });
  if (!confirmed) return;

  try {
    await api.removeFeed(feedId);
    state.feeds = state.feeds.filter((f) => f.id !== feedId);
    state.articles = state.articles.filter((a) => a.feedId !== feedId);
    if (state.activeFeedId === feedId) state.activeFeedId = 'all';

    renderSidebar();
    await renderArticles();
    showBanner(t('banner.removed_feed', { name: feed.title }), 'success');
  } catch (error) {
    showBanner(error.message || 'Could not remove this feed.', 'error');
  }
}

export async function handleRefreshFeed(feedId, refreshBtnEl) {
  if (!requireLogin()) return;
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
      await renderArticlesWithTransition();
    }
    if (result.newArticlesCount > 0) {
      const bannerKey = result.newArticlesCount === 1 ? 'banner.new_articles_single' : 'banner.new_articles_plural';
      showBanner(t(bannerKey, { count: result.newArticlesCount, name: feed.title }), 'success');
    }
  } catch (error) {
    showBanner(error.message || `Could not refresh "${feed.title}".`, 'error');
  } finally {
    refreshingFeedIds.delete(feedId);
    refreshBtnEl.classList.remove('is-spinning');
    refreshBtnEl.disabled = false;
  }
}

export async function handleRefreshAll() {
  if (!requireLogin()) return;
  if (state.feeds.length === 0 || isRefreshAllInFlight) return;

  isRefreshAllInFlight = true;

  dom.refreshAllBtn.disabled = true;
  dom.refreshAllBtn.innerHTML = `<span class="spinner--sm" aria-hidden="true"></span> ${t('content.refreshing')}`;

  try {
    const result = await api.refreshAllFeeds();
    const totalNew = result.newArticlesCount ?? 0;
    const newArticles = result.articles ?? [];

    if (newArticles.length > 0) {
      state.articles = [...newArticles, ...state.articles].sort(
        (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
      );
      await renderArticlesWithTransition();
    }

    const failedCount = result.failedFeedsCount ?? 0;
    if (failedCount > 0) showBanner(t('banner.feeds_refresh_failed', { count: failedCount }), 'error');
    if (totalNew > 0) {
      showBanner(t('banner.new_articles_total', { count: totalNew }), 'success');
    }
  } catch (error) {
    showBanner(error.message || 'Could not refresh feeds.', 'error');
  } finally {
    dom.refreshAllBtn.disabled = false;
    dom.refreshAllBtn.innerHTML = `<span aria-hidden="true">&#8635;</span> ${t('content.refresh_all')}`;
    isRefreshAllInFlight = false;
  }
}
