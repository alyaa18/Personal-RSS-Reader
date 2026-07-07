const API_BASE_URL = 'http://localhost:5001/api';

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch (networkError) {
    throw new Error('Could not reach the server. Is the backend running?');
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

const api = {
  getFeeds: () => apiRequest('/feeds'),
  addFeed: (url) => apiRequest('/feeds', { method: 'POST', body: JSON.stringify({ url }) }),
  removeFeed: (id) => apiRequest(`/feeds/${id}`, { method: 'DELETE' }),
  refreshFeed: (id) => apiRequest(`/feeds/${id}/refresh`, { method: 'POST' }),
  getArticles: () => apiRequest('/articles'),
};