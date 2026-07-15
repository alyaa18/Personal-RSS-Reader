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

function showVerificationNotice(email) {
  // Switch to a simple inline notice on the auth screen
  dom.loginForm.classList.add('is-hidden');
  dom.registerForm.classList.add('is-hidden');
  dom.authTabLogin.style.display = 'none';
  dom.authTabRegister.style.display = 'none';
  document.querySelectorAll('.guest-try-btn').forEach((el) => el.classList.add('is-hidden'));

  // Create or show verification notice
  let notice = document.getElementById('verification-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'verification-notice';
    notice.className = 'auth-form';
    dom.authScreen.querySelector('.auth-card').appendChild(notice);
  }
  notice.innerHTML = `
    <div style="text-align:center;padding:var(--space-4) 0;">
      <div style="font-size:40px;margin-bottom:var(--space-3);">&#9993;</div>
      <h3 style="margin:0 0 var(--space-2);font-size:var(--text-lg);">${t('auth.verify_title')}</h3>
      <p style="margin:0 0 var(--space-3);color:var(--color-text-secondary);font-size:var(--text-sm);">
        ${t('auth.verify_body').replace('{email}', email)}
      </p>
      <button type="button" class="btn btn--primary btn--block" id="resend-verify-btn">${t('auth.resend_verify')}</button>
      <button type="button" class="btn btn--ghost btn--block" id="back-to-auth-btn" style="margin-top:var(--space-2);">${t('auth.back_to_login')}</button>
    </div>
  `;
  notice.classList.remove('is-hidden');

  document.getElementById('resend-verify-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('resend-verify-btn');
    btn.disabled = true;
    btn.textContent = t('auth.sending');
    try {
      await api.resendVerification(email);
      btn.textContent = t('auth.resent');
    } catch {
      btn.disabled = false;
      btn.textContent = t('auth.resend_verify');
    }
  });

  document.getElementById('back-to-auth-btn')?.addEventListener('click', () => {
    notice?.classList.add('is-hidden');
    dom.authTabLogin.style.display = '';
    dom.authTabRegister.style.display = '';
    document.querySelectorAll('.guest-try-btn').forEach((el) => el.classList.remove('is-hidden'));
    switchTab('login');
  });
}

async function handleLogin(event) {
  event.preventDefault();
  setFieldError(dom.loginError, '');
  dom.loginSubmit.disabled = true;
  dom.loginSubmit.textContent = t('auth.logging_in');

  try {
    const result = await api.login(dom.loginEmail.value.trim(), dom.loginPassword.value);
    if (result.emailVerificationRequired) {
      showVerificationNotice(result.email);
      return;
    }
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
    if (result.emailVerificationRequired) {
      showVerificationNotice(result.email);
      return;
    }
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