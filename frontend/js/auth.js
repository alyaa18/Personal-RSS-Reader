const TOKEN_KEY = 'rss-reader:token';
const USER_KEY = 'rss-reader:user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getToken();
}

export function saveSession(authResponse) {
  if (authResponse.token) {
    localStorage.setItem(TOKEN_KEY, authResponse.token);
  }
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      id: authResponse.userId,
      email: authResponse.email,
      displayName: authResponse.displayName,
      preferredLanguage: authResponse.preferredLanguage || null,
      emailVerified: authResponse.emailVerified || false,
    })
  );
}

export function isEmailVerified() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return false;
    const user = JSON.parse(raw);
    return user.emailVerified === true;
  } catch {
    return false;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Called by app.js once, at startup, to react to token expiry mid-session
// (e.g. api.js gets a 401 from any call after the 7-day JWT expires).
let onUnauthorizedCallback = () => {};
export function setOnUnauthorized(callback) {
  onUnauthorizedCallback = callback;
}
export function triggerUnauthorized() {
  clearSession();
  onUnauthorizedCallback();
}