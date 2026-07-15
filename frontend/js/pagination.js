import { state } from './state.js';
import { dom } from './dom.js';
import { t } from './i18n.js';

let rerenderCallback = () => {};

export function setRerenderCallback(fn) {
  rerenderCallback = fn;
}

export function goToPage(page) {
  state.currentPage = page;
  rerenderCallback();
}

export function renderPagination(totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
  dom.pagination.innerHTML = '';

  if (totalItems === 0) {
    dom.pagination.classList.add('is-hidden');
    return;
  }
  dom.pagination.classList.remove('is-hidden');

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'pagination__btn';
  prevBtn.textContent = t('pagination.previous');
  prevBtn.disabled = state.currentPage <= 1;
  prevBtn.addEventListener('click', () => goToPage(state.currentPage - 1));
  dom.pagination.appendChild(prevBtn);

  const pageNumbers = document.createElement('div');
  pageNumbers.className = 'pagination__numbers';
  getPageRange(state.currentPage, totalPages).forEach((entry) => {
    if (entry === '…') {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination__ellipsis';
      ellipsis.textContent = '…';
      pageNumbers.appendChild(ellipsis);
      return;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pagination__number';
    btn.textContent = entry;
    btn.classList.toggle('is-active', entry === state.currentPage);
    btn.addEventListener('click', () => goToPage(entry));
    pageNumbers.appendChild(btn);
  });
  dom.pagination.appendChild(pageNumbers);

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'pagination__btn';
  nextBtn.textContent = t('pagination.next');
  nextBtn.disabled = state.currentPage >= totalPages;
  nextBtn.addEventListener('click', () => goToPage(state.currentPage + 1));
  dom.pagination.appendChild(nextBtn);

  const jumpForm = document.createElement('form');
  jumpForm.className = 'pagination__jump';
  jumpForm.innerHTML = `
    <label for="pagination-jump-input">${t('pagination.go_to')}</label>
    <input type="number" id="pagination-jump-input" min="1" max="${totalPages}" value="${state.currentPage}">
  `;
  jumpForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = jumpForm.querySelector('#pagination-jump-input');
    const target = Math.min(Math.max(1, Number(input.value) || 1), totalPages);
    goToPage(target);
  });
  dom.pagination.appendChild(jumpForm);
}

function getPageRange(current, total) {
  const delta = 1;
  const range = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    } else if (range[range.length - 1] !== '…') {
      range.push('…');
    }
  }
  return range;
}