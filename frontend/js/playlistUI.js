import { state } from './state.js';
import { dom } from './dom.js';
import { showBanner } from './banner.js';
import { copyToClipboard } from './utils.js';
import { confirmAction } from './confirmModal.js';
import { renderPlaylistList, updateContentHeader, updateActiveStyles } from './render.js';
import { createPlaylist, deletePlaylist, addArticleToPlaylist, getPlaylistFeedUrl } from './playlists.js';

let pendingArticleIdForPicker = null;
let onPlaylistCreated = () => {}; // wired by app.js to its navigation reset logic when needed

export function initPlaylistUI() {
  dom.newPlaylistBtn.addEventListener('click', () => openCreatePlaylistDialog(null));
  dom.playlistPickerNewBtn.addEventListener('click', () => {
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
  const name = dom.playlistNameInput.value.trim();
  if (!name) return;

  dom.submitCreatePlaylistBtn.disabled = true;
  dom.submitCreatePlaylistBtn.textContent = 'Creating…';

  try {
    await createPlaylist(name);
    renderPlaylistList();
    dom.createPlaylistDialog.close();
    showBanner(`Created playlist "${name}".`, 'success');

    const reopenFor = dom.createPlaylistDialog.dataset.reopenPickerFor;
    if (reopenFor) {
      openPlaylistPicker(reopenFor);
    }
  } catch (error) {
    dom.createPlaylistError.textContent = error.message || 'Could not create playlist.';
    dom.createPlaylistError.classList.remove('is-hidden');
  } finally {
    dom.submitCreatePlaylistBtn.disabled = false;
    dom.submitCreatePlaylistBtn.textContent = 'Create';
  }
}

export function openPlaylistPicker(articleId) {
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
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', async () => {
      addBtn.disabled = true;
      try {
        await addArticleToPlaylist(playlist.id, articleId);
        addBtn.textContent = 'Added ✓';
      } catch (error) {
        addBtn.disabled = false;
        showBanner(error.message || 'Could not add to playlist.', 'error');
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
    const original = dom.copyPlaylistFeedUrlBtn.textContent;
    dom.copyPlaylistFeedUrlBtn.textContent = 'Copied!';
    setTimeout(() => { dom.copyPlaylistFeedUrlBtn.textContent = original; }, 1500);
  } catch {
    showBanner('Could not copy — select and copy the URL manually.', 'error');
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
  const confirmed = await confirmAction({
    title: 'Delete playlist?',
    message: `Delete "${playlistName}"? This does not delete the articles themselves, only the playlist.`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  try {
    await deletePlaylist(playlistId);
    renderPlaylistList();
    showBanner(`Deleted "${playlistName}".`, 'success');
    onPlaylistCreated(playlistId); // lets app.js reset navigation if the deleted playlist was active
  } catch (error) {
    showBanner(error.message || 'Could not delete playlist.', 'error');
  }
}