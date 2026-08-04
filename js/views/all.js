// ---------- Alle eventyr ----------
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { upcomingAdventures, ideaAdventures, pastAdventures } from '../selectors.js';
import { navigate } from '../router.js';
import { openAppMenu } from '../modals/sheet.js';
import { renderTripRow, renderIdeaRow } from './list.js';

export function renderAllTab() {
  const upcoming = upcomingAdventures();
  const ideas = ideaAdventures();
  const past = pastAdventures();
  const isEmpty = upcoming.length === 0 && ideas.length === 0 && past.length === 0;

  return `
    <div class="detail-top">
      <button class="back-link" data-action="back-home">‹ ${t('backLabel')}</button>
      <button class="icon-only" data-action="all-menu" aria-label="${t('menu')}">${icon("more")}</button>
    </div>
    <div class="detail-hero">
      <h1 class="detail-name">${t('allAdventures')}</h1>
    </div>
    ${isEmpty ? `
      <p style="color:var(--ink-soft);font-size:14px;margin:24px 4px 0">${t('noAdventuresYet')}</p>
    ` : `
      ${upcoming.length > 0 ? `
        <p class="section-eyebrow">${t('sectionUpcoming')}</p>
        <div class="trip-list">${upcoming.map(renderTripRow).join("")}</div>
      ` : ""}
      ${ideas.length > 0 ? `
        <p class="section-eyebrow">${t('sectionIdeas')}</p>
        <div class="trip-list ideer">${ideas.map(renderIdeaRow).join("")}</div>
      ` : ""}
      ${past.length > 0 ? `
        <p class="section-eyebrow">${t('sectionMemories')}</p>
        <div class="trip-list minder">${past.map(renderTripRow).join("")}</div>
      ` : ""}
    `}
  `;
}

export function wireAllTab() {
  document.querySelector('[data-action="back-home"]')?.addEventListener("click", () => navigate("/"));
  document.querySelector('[data-action="all-menu"]')?.addEventListener("click", openAppMenu);
  document.querySelectorAll(".trip-row").forEach(el => {
    el.addEventListener("click", () => navigate(`/adventure/${el.dataset.id}`));
  });
}
