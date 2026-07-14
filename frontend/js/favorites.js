import { state } from './state.js';

export async function loadFavorites() {
  try {
    const favoriteArticles = await api.getFavorites();
    state.favorites = new Set(favoriteArticles.map((a) => a.id));
  } catch {
    // Non-fatal — app still works, just starts with no favorites known
    // until the next successful load.
    state.favorites = new Set();
  }
}

export function isFavorite(articleId) {
  return state.favorites.has(articleId);
}

/**
 * Flips local state immediately (so the star responds instantly), then
 * confirms with the server. On failure, rolls back and re-throws so the
 * caller (render.js) can revert the icon and show an error.
 * Returns the new favorited state on success.
 */
export async function toggleFavorite(articleId) {
  const wasFavorited = state.favorites.has(articleId);

  if (wasFavorited) {
    state.favorites.delete(articleId);
  } else {
    state.favorites.add(articleId);
  }

  try {
    if (wasFavorited) {
      await api.removeFavorite(articleId);
    } else {
      await api.addFavorite(articleId);
    }
    return !wasFavorited;
  } catch (error) {
    if (wasFavorited) {
      state.favorites.add(articleId);
    } else {
      state.favorites.delete(articleId);
    }
    throw error;
  }
}