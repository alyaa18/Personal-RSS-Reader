import { state } from './state.js';
import { dom } from './dom.js';
import { debounce } from './utils.js';
import { renderArticles } from './render.js';

export function initSearch() {
  const handleInput = debounce((value) => {
    state.searchQuery = value;
    state.currentPage = 1;
    renderArticles();
  }, 200);

  dom.searchInput.addEventListener('input', (event) => handleInput(event.target.value));
}