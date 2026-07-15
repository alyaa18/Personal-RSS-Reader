/**
 * Frontend configuration.
 *
 * Environment variables are NOT available at runtime in a static site.
 * Instead, adjust the values below per deployment.
 *
 * In production (e.g. Railway), set these via deployment environment variables
 * and serve a generated config.js. For local dev, just edit here or in your .env.
 */
(function () {
  const hostname = window.location.hostname;
  const isLocal = ['localhost', '127.0.0.1'].includes(hostname);

  window.__RSS_CONFIG__ = {
    // The base URL of the backend API
    apiBaseUrl: isLocal
      ? 'http://localhost:5001/api'
      : 'https://personal-rss-reader-production-feb0.up.railway.app/api',
  };
})();
