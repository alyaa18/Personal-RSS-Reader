import { state } from './state.js';

const STORAGE_KEY = 'rss-reader:favorites';

export function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.favorites = new Set(raw ? JSON.parse(raw) : []);
  } catch {
    state.favorites = new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.favorites]));
  } catch {
    // localStorage unavailable (e.g. private browsing) — favorites just won't persist.
  }
}

export function isFavorite(articleId) {
  return state.favorites.has(articleId);
}

export function toggleFavorite(articleId) {
  if (state.favorites.has(articleId)) {
    state.favorites.delete(articleId);
  } else {
    state.favorites.add(articleId);
  }
  saveFavorites();
}