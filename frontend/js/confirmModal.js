import { dom } from './dom.js';

export function confirmAction({ title, message, confirmLabel = 'Confirm', danger = true }) {
  return new Promise((resolve) => {
    dom.confirmTitle.textContent = title;
    dom.confirmMessage.textContent = message;
    dom.confirmActionBtn.textContent = confirmLabel;
    dom.confirmActionBtn.classList.toggle('btn--danger', danger);

    function cleanup(result) {
      dom.confirmActionBtn.removeEventListener('click', onConfirm);
      dom.confirmCancelBtn.removeEventListener('click', onCancel);
      dom.confirmDialog.removeEventListener('close', onClose);
      dom.confirmDialog.close();
      resolve(result);
    }

    function onConfirm() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onClose() { resolve(false); }

    dom.confirmActionBtn.addEventListener('click', onConfirm);
    dom.confirmCancelBtn.addEventListener('click', onCancel);
    dom.confirmDialog.addEventListener('close', onClose, { once: true });

    dom.confirmDialog.showModal();
  });
}