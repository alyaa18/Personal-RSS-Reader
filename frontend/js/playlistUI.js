import { state } from './state.js';
import { dom } from './dom.js';
import { isLoggedIn } from './auth.js';
import { showBanner } from './banner.js';
import { copyToClipboard } from './utils.js';
import { confirmAction } from './confirmModal.js';
import { renderSidebar, updateContentHeader, updateActiveStyles } from './render.js';
import { createPlaylist, deletePlaylist, addArticleToPlaylist, getPlaylistFeedUrl } from './playlists.js';
import { t } from './i18n.js';
import { showLoginPromptModal } from './authUI.js';

function requireLogin() {
  if (!isLoggedIn()) {
    showLoginPromptModal();
    return false;
  }
  return true;
}

let pendingArticleIdForPicker = null;
let onPlaylistCreated = () => {}; // wired by app.js to its navigation reset logic when needed

export function initPlaylistUI() {
  dom.newPlaylistBtn.addEventListener('click', () => {
    if (!isLoggedIn()) {
      showLoginPromptModal();
      return;
    }
    openCreatePlaylistDialog(null);
  });
  dom.sidebarNewPlaylistBtn?.addEventListener('click', () => {
    if (!isLoggedIn()) {
      showLoginPromptModal();
      return;
    }
    openCreatePlaylistDialog(null);
  });
  dom.stateEmptyPlaylistCta?.addEventListener('click', () => {
    if (!isLoggedIn()) {
      showLoginPromptModal();
      return;
    }
    openCreatePlaylistDialog(null);
  });
  dom.playlistPickerNewBtn.addEventListener('click', () => {
    if (!isLoggedIn()) {
      showLoginPromptModal();
      return;
    }
    dom.playlistPickerDialog.close();
    openCreatePlaylistDialog(pendingArticleIdForPicker);
  });
  dom.cancelCreatePlaylistBtn.addEventListener('click', () => dom.createPlaylistDialog.close());
  dom.createPlaylistForm.addEventListener('submit', handleCreatePlaylistSubmit);

  dom.playlistPickerDoneBtn.addEventListener('click', () => dom.playlistPickerDialog.close());

  dom.copyPlaylistFeedUrlBtn.addEventListener('click', handleCopyFeedUrl);
  dom.deletePlaylistBtn.addEventListener('click', handleDeletePlaylistFromToolbar);
}

function openCreatePlaylistDialog(reopenPickerForArticleId) {
  dom.playlistNameInput.value = '';
  dom.createPlaylistError.classList.add('is-hidden');
  dom.createPlaylistDialog.dataset.reopenPickerFor = reopenPickerForArticleId || '';
  dom.createPlaylistDialog.showModal();
  dom.playlistNameInput.focus();
}

async function handleCreatePlaylistSubmit(event) {
  event.preventDefault();
  if (!requireLogin()) return;
  const name = dom.playlistNameInput.value.trim();
  if (!name) return;

  dom.submitCreatePlaylistBtn.disabled = true;
  dom.submitCreatePlaylistBtn.textContent = t('modal.creating');

  try {
    await createPlaylist(name);
    renderSidebar();
    dom.createPlaylistDialog.close();
    showBanner(t('banner.created_playlist', { name }), 'success');

    const reopenFor = dom.createPlaylistDialog.dataset.reopenPickerFor;
    if (reopenFor) {
      openPlaylistPicker(reopenFor);
    }
  } catch (error) {
    dom.createPlaylistError.textContent = error.message || 'Could not create playlist.';
    dom.createPlaylistError.classList.remove('is-hidden');
  } finally {
    dom.submitCreatePlaylistBtn.disabled = false;
    dom.submitCreatePlaylistBtn.textContent = t('modal.create');
  }
}

export function openPlaylistPicker(articleId) {
  if (!requireLogin()) return;
  pendingArticleIdForPicker = articleId;
  dom.playlistPickerList.innerHTML = '';
  dom.playlistPickerEmpty.classList.toggle('is-hidden', state.playlists.length > 0);

  state.playlists.forEach((playlist) => {
    const li = document.createElement('li');
    li.className = 'playlist-picker-item';

    const label = document.createElement('span');
    label.textContent = playlist.name;

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn--ghost btn--sm';
    addBtn.textContent = t('modal.add');
    addBtn.addEventListener('click', async () => {
      addBtn.disabled = true;
      try {
        await addArticleToPlaylist(playlist.id, articleId);
        addBtn.textContent = t('modal.added');
      } catch (error) {
        addBtn.disabled = false;
        showBanner(error.message || t('banner.add_to_playlist_error'), 'error');
      }
    });

    li.appendChild(label);
    li.appendChild(addBtn);
    dom.playlistPickerList.appendChild(li);
  });

  dom.playlistPickerDialog.showModal();
}

export function updatePlaylistToolbar() {
  if (state.activeView !== 'playlist' || !state.currentPlaylistMeta) {
    dom.playlistToolbar.classList.add('is-hidden');
    return;
  }
  dom.playlistToolbar.classList.remove('is-hidden');
  dom.playlistFeedUrl.textContent = getPlaylistFeedUrl(state.currentPlaylistMeta.slug);
}

async function handleCopyFeedUrl() {
  if (!state.currentPlaylistMeta) return;
  try {
    await copyToClipboard(getPlaylistFeedUrl(state.currentPlaylistMeta.slug));
    dom.copyPlaylistFeedUrlBtn.textContent = t('article.copied');
    setTimeout(() => { dom.copyPlaylistFeedUrlBtn.textContent = t('playlist.copy_url'); }, 1500);
  } catch {
    showBanner(t('banner.copy_url_error'), 'error');
  }
}

export function setOnPlaylistDeleted(fn) {
  onPlaylistCreated = fn; // reused as generic post-delete callback
}

async function handleDeletePlaylistFromToolbar() {
  if (!state.currentPlaylistMeta) return;
  await handleDeletePlaylist(state.currentPlaylistMeta.id, state.currentPlaylistMeta.name);
}

export async function handleDeletePlaylist(playlistId, playlistName) {
  if (!requireLogin()) return;
  const confirmed = await confirmAction({
    title: t('confirm.delete_playlist_title'),
    message: t('confirm.delete_playlist_message', { name: playlistName }),
    confirmLabel: t('confirm.delete_label'),
    danger: true,
  });
  if (!confirmed) return;

  try {
    await deletePlaylist(playlistId);
    renderSidebar();
    showBanner(t('banner.deleted_playlist', { name: playlistName }), 'success');
    onPlaylistCreated(playlistId); // lets app.js reset navigation if the deleted playlist was active
  } catch (error) {
    showBanner(error.message || 'Could not delete playlist.', 'error');
  }
}