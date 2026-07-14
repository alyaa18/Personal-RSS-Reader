import { state } from './state.js';
import { API_BASE_URL } from './api.js';

export async function loadPlaylists() {
  try {
    state.playlists = await api.getPlaylists();
  } catch {
    state.playlists = [];
  }
}

export async function createPlaylist(name) {
  const playlist = await api.createPlaylist(name);
  state.playlists.push(playlist);
  return playlist;
}

export async function deletePlaylist(id) {
  await api.deletePlaylist(id);
  state.playlists = state.playlists.filter((p) => p.id !== id);
}

export async function loadPlaylistDetail(id) {
  const playlist = await api.getPlaylist(id);
  state.currentPlaylistMeta = { id: playlist.id, name: playlist.name, slug: playlist.slug };
  state.playlistArticles = playlist.articles;
  return playlist;
}

export async function addArticleToPlaylist(playlistId, articleId) {
  await api.addArticleToPlaylist(playlistId, articleId);
}

export function getPlaylistFeedUrl(slug) {
  // API_BASE_URL already ends in /api — the RSS route lives under it too.
  return `${API_BASE_URL}/playlists/${slug}/rss`;
}