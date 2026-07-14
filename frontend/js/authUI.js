import { dom } from './dom.js';
import { saveSession, clearSession, isLoggedIn, getCurrentUser, setOnUnauthorized } from './auth.js';

let onLoginSuccess = () => {};

export function initAuthUI(onLoginSuccessCallback) {
  onLoginSuccess = onLoginSuccessCallback;

  dom.authTabLogin.addEventListener('click', () => switchTab('login'));
  dom.authTabRegister.addEventListener('click', () => switchTab('register'));
  dom.loginForm.addEventListener('submit', handleLogin);
  dom.registerForm.addEventListener('submit', handleRegister);
  dom.logoutBtn.addEventListener('click', handleLogout);

  setOnUnauthorized(() => showAuthScreen());

  if (isLoggedIn()) {
    showApp();
  } else {
    showAuthScreen();
  }
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  dom.authTabLogin.classList.toggle('is-active', isLogin);
  dom.authTabRegister.classList.toggle('is-active', !isLogin);
  dom.loginForm.classList.toggle('is-hidden', !isLogin);
  dom.registerForm.classList.toggle('is-hidden', isLogin);
}

function showAuthScreen() {
  dom.authScreen.classList.remove('is-hidden');
  dom.appRoot.classList.add('is-hidden');
}

function showApp() {
  dom.authScreen.classList.add('is-hidden');
  dom.appRoot.classList.remove('is-hidden');

  const user = getCurrentUser();
  if (user) {
    dom.sidebarUserName.textContent = user.displayName;
  }
}

function setFieldError(errorEl, message) {
  errorEl.textContent = message;
  errorEl.classList.toggle('is-hidden', !message);
}

async function handleLogin(event) {
  event.preventDefault();
  setFieldError(dom.loginError, '');
  dom.loginSubmit.disabled = true;
  dom.loginSubmit.textContent = 'Logging in…';

  try {
    const result = await api.login(dom.loginEmail.value.trim(), dom.loginPassword.value);
    saveSession(result);
    dom.loginForm.reset();
    showApp();
    await onLoginSuccess();
  } catch (error) {
    setFieldError(dom.loginError, error.message || 'Could not log in.');
  } finally {
    dom.loginSubmit.disabled = false;
    dom.loginSubmit.textContent = 'Log in';
  }
}

async function handleRegister(event) {
  event.preventDefault();
  setFieldError(dom.registerError, '');
  dom.registerSubmit.disabled = true;
  dom.registerSubmit.textContent = 'Creating account…';

  try {
    const result = await api.register(
      dom.registerEmail.value.trim(),
      dom.registerPassword.value,
      dom.registerName.value.trim()
    );
    saveSession(result);
    dom.registerForm.reset();
    showApp();
    await onLoginSuccess();
  } catch (error) {
    setFieldError(dom.registerError, error.message || 'Could not create account.');
  } finally {
    dom.registerSubmit.disabled = false;
    dom.registerSubmit.textContent = 'Create account';
  }
}

function handleLogout() {
  clearSession();
  showAuthScreen();
}