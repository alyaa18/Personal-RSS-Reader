import { dom } from './dom.js';
import { state } from './state.js';
import { saveSession, clearSession, isLoggedIn, getCurrentUser, setOnUnauthorized } from './auth.js';
import { t, setLanguage, getCurrentLang } from './i18n.js';
import { showOnboarding } from './onboarding.js';

let onLoginSuccess = () => {};
let onGuestMode = () => {};
let isFirstLogin = false;

export function initAuthUI(onLoginSuccessCallback, onGuestModeCallback) {
  onLoginSuccess = onLoginSuccessCallback;
  onGuestMode = onGuestModeCallback;

  dom.authTabLogin.addEventListener('click', () => switchTab('login'));
  dom.authTabRegister.addEventListener('click', () => switchTab('register'));
  dom.loginForm.addEventListener('submit', handleLogin);
  dom.registerForm.addEventListener('submit', handleRegister);
  dom.logoutBtn.addEventListener('click', handleLogout);

  // Sidebar: "Sign in" → show auth screen
  dom.sidebarLoginBtn.addEventListener('click', redirectToAuth);
  // Auth screen: "Try as Guest" → enter guest mode
  document.querySelectorAll('.guest-try-btn').forEach((btn) => {
    btn.addEventListener('click', enterGuestMode);
  });

  setOnUnauthorized(() => showAuthScreen());

  if (isLoggedIn()) {
    showApp();
    onLoginSuccess();
  } else {
    // Start in guest mode by default — no auth screen shown first
    enterGuestMode();
  }
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  dom.authTabLogin.classList.toggle('is-active', isLogin);
  dom.authTabRegister.classList.toggle('is-active', !isLogin);
  dom.loginForm.classList.toggle('is-hidden', !isLogin);
  dom.registerForm.classList.toggle('is-hidden', isLogin);
}

function updateUserRow(loggedIn) {
  const user = getCurrentUser();
  dom.guestBadge.classList.toggle('is-hidden', loggedIn);
  dom.sidebarLoginBtn.classList.toggle('is-hidden', loggedIn);
  dom.sidebarUserName.classList.toggle('is-hidden', !loggedIn);
  dom.logoutBtn.classList.toggle('is-hidden', !loggedIn);

  if (user) {
    dom.sidebarUserName.textContent = user.displayName;
  }
}

export function showAuthScreen() {
  dom.authScreen.classList.remove('is-hidden');
  dom.appRoot.classList.add('is-hidden');
}

export function showApp() {
  dom.authScreen.classList.add('is-hidden');
  dom.appRoot.classList.remove('is-hidden');

  const user = getCurrentUser();
  const loggedIn = isLoggedIn();

  updateUserRow(loggedIn);

  if (user && user.preferredLanguage && user.preferredLanguage !== getCurrentLang()) {
    setLanguage(user.preferredLanguage);
  }

  // Show onboarding on first login/register (only if user has no feeds yet)
  if (isFirstLogin && loggedIn) {
    isFirstLogin = false;
    setTimeout(() => {
      if (state.feeds.length === 0) {
        showOnboarding();
      }
    }, 500);
  }
}

export function enterGuestMode() {
  isFirstLogin = false;
  showApp();
  onGuestMode();
}

export function redirectToAuth() {
  showAuthScreen();
}

function setFieldError(errorEl, message) {
  errorEl.textContent = message;
  errorEl.classList.toggle('is-hidden', !message);
}

async function handleLogin(event) {
  event.preventDefault();
  setFieldError(dom.loginError, '');
  dom.loginSubmit.disabled = true;
  dom.loginSubmit.textContent = t('auth.logging_in');

  try {
    const result = await api.login(dom.loginEmail.value.trim(), dom.loginPassword.value);
    saveSession(result);
    dom.loginForm.reset();
    isFirstLogin = false;
    showApp();
    await onLoginSuccess();
  } catch (error) {
    setFieldError(dom.loginError, error.message || t('auth.login_error'));
  } finally {
    dom.loginSubmit.disabled = false;
    dom.loginSubmit.textContent = t('auth.login');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  setFieldError(dom.registerError, '');
  dom.registerSubmit.disabled = true;
  dom.registerSubmit.textContent = t('auth.creating_account');

  try {
    const result = await api.register(
      dom.registerEmail.value.trim(),
      dom.registerPassword.value,
      dom.registerName.value.trim()
    );
    saveSession(result);
    dom.registerForm.reset();
    isFirstLogin = true;
    showApp();
    await onLoginSuccess();
  } catch (error) {
    setFieldError(dom.registerError, error.message || t('auth.register_error'));
  } finally {
    dom.registerSubmit.disabled = false;
    dom.registerSubmit.textContent = t('auth.create_account');
  }
}

function handleLogout() {
  clearSession();
  updateUserRow(false);
  enterGuestMode();
  // Reload guest data
  onGuestMode();
}