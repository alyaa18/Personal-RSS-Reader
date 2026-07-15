import { getToken, triggerUnauthorized } from './auth.js';

/** @type {string} */
export const API_BASE_URL = (window.__RSS_CONFIG__ && window.__RSS_CONFIG__.apiBaseUrl)
  || 'http://localhost:5001/api';

async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined && !('Content-Type' in headers)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token && !('Authorization' in headers)) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers, ...options });
  } catch (networkError) {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  if (response.status === 401) {
    triggerUnauthorized();
    throw new Error('Your session has expired. Please log in again.');
  }

  if (response.status === 204) {
    return null;
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = body && body.error ? body.error : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return body;
}

async function authRequest(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let responseBody = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const message = responseBody && responseBody.error ? responseBody.error : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return responseBody;
}

const api = {
  register: (email, password, displayName) => authRequest('/auth/register', { email, password, displayName }),
  login: (email, password) => authRequest('/auth/login', { email, password }),

  getFeeds: () => apiRequest('/feeds'),
  addFeed: (url) => apiRequest('/feeds', { method: 'POST', body: JSON.stringify({ url }) }),
  removeFeed: (id) => apiRequest(`/feeds/${id}`, { method: 'DELETE' }),
  refreshFeed: (id) => apiRequest(`/feeds/${id}/refresh`, { method: 'POST' }),
  refreshAllFeeds: () => apiRequest('/feeds/refresh', { method: 'POST' }),
  getArticles: () => apiRequest('/articles'),

  getFavorites: () => apiRequest('/favorites'),
  addFavorite: (articleId) => apiRequest('/favorites', { method: 'POST', body: JSON.stringify({ articleId }) }),
  removeFavorite: (articleId) => apiRequest(`/favorites/${articleId}`, { method: 'DELETE' }),

  getPlaylists: () => apiRequest('/playlists'),
  createPlaylist: (name) => apiRequest('/playlists', { method: 'POST', body: JSON.stringify({ name }) }),
  deletePlaylist: (id) => apiRequest(`/playlists/${id}`, { method: 'DELETE' }),
  getPlaylist: (id) => apiRequest(`/playlists/${id}`),
  addArticleToPlaylist: (id, articleId) => apiRequest(`/playlists/${id}/articles`, { method: 'POST', body: JSON.stringify({ articleId }) }),
  removeArticleFromPlaylist: (id, articleId) => apiRequest(`/playlists/${id}/articles/${articleId}`, { method: 'DELETE' }),

  updateLanguage: (language) => apiRequest('/auth/language', { method: 'PATCH', body: JSON.stringify({ language }) }),
  resendVerification: (email) => apiRequest('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),

  getDemoData: () => apiRequest('/demo'),
};

window.api = api;