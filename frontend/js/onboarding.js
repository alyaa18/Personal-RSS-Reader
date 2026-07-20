import { dom } from './dom.js';
import { showBanner } from './banner.js';
import { renderSidebar, renderArticles } from './render.js';
import { state } from './state.js';
import { t } from './i18n.js';

const DEMO_FEEDS = [
  { url: 'https://github.blog/feed/', label: 'GitHub Blog' },
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', label: 'BBC News' },
  { url: 'https://news.mit.edu/rss/feed', label: 'MIT News' },
];

export function showOnboarding() {
  // Ensure close button exists (defensive — it's in index.html, but just in case)
  let closeBtn = dom.onboardingDialog.querySelector('.onboarding-close');
  if (!closeBtn) {
    closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'onboarding-close';
    closeBtn.innerHTML = '&#10005;';
    closeBtn.setAttribute('aria-label', 'Close');
    dom.onboardingDialog.querySelector('.modal__form').appendChild(closeBtn);
  }

  dom.onboardingList.innerHTML = '';

  let addedCount = 0;

  DEMO_FEEDS.forEach((feed) => {
    const li = document.createElement('li');
    li.className = 'onboarding-item';
    li.dataset.url = feed.url;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'onboarding-item__title';
    labelSpan.textContent = feed.label;

    const urlSpan = document.createElement('span');
    urlSpan.className = 'onboarding-item__url';
    urlSpan.textContent = feed.url;

    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;';
    textWrap.appendChild(labelSpan);
    textWrap.appendChild(urlSpan);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn--primary btn--sm';
    addBtn.textContent = t('onboarding.add_feed');
    addBtn.addEventListener('click', async () => {
      addBtn.disabled = true;
      addBtn.textContent = t('onboarding.added');
      try {
        const result = await api.addFeed(feed.url);
        state.feeds.push(result);
        renderSidebar();
        addedCount++;
        if (addedCount === DEMO_FEEDS.length) {
          setTimeout(() => dom.onboardingDialog.close(), 600);
        }
      } catch {
        addBtn.disabled = false;
        addBtn.textContent = t('onboarding.add_feed');
      }
    });

    li.appendChild(textWrap);
    li.appendChild(addBtn);
    dom.onboardingList.appendChild(li);
  });

  // Remove any previous listener to avoid stacking
  dom.onboardingDialog.removeEventListener('close', refreshAfterOnboarding);
  dom.onboardingDialog.addEventListener('close', refreshAfterOnboarding, { once: true });

  // Re-bind skip button (removeEventListener with once:true removes it)
  dom.onboardingSkipBtn.addEventListener('click', () => dom.onboardingDialog.close(), { once: true });

  // Wire close button the same way as skip button
  closeBtn.addEventListener('click', () => dom.onboardingDialog.close(), { once: true });

  dom.onboardingDialog.showModal();
}

async function refreshAfterOnboarding() {
  try {
    state.articles = await api.getArticles();
    await renderArticles();
  } catch {
    // Non-fatal
  }
}
