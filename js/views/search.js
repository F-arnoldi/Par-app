// ---------- Søgning ----------
// mount()/paint()-mønster (samme som datepicker.js) — kun resultatlisten
// genskabes ved hvert tastetryk, aldrig selve søgefeltet. En almindelig
// fuld render() ville ellers ødelægge input-elementet på hvert tastetryk
// og dermed fokus/markør, så brugeren ikke kunne skrive sammenhængende.
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, kategoriIkon } from '../utils.js';
import { state } from '../data.js';
import { navigate } from '../router.js';
import { renderTripRow } from './list.js';
import { openActivityModal } from '../modals/activity.js';

let query = "";

function matchingAdventures(q) {
  return state.adventures.filter(a => !a.deletedAt && a.navn.toLowerCase().includes(q));
}

function matchingActivities(q) {
  return state.activities.filter(x => !x.deletedAt && !x.kilde && (
    x.navn.toLowerCase().includes(q) ||
    (x.stedNavn || "").toLowerCase().includes(q) ||
    (x.noter || "").toLowerCase().includes(q)
  ));
}

function renderActivitySearchRow(x) {
  const parent = state.adventures.find(a => a.id === x.adventureId);
  return `
    <div class="item" data-open-search-activity="${x.id}" role="button" tabindex="0" aria-label="${esc(x.navn)}">
      <div class="item-icon">${icon(kategoriIkon(x.kategori))}</div>
      <div class="item-body">
        <p class="item-title">${esc(x.navn)}</p>
        <p class="item-meta">${esc(parent?.navn || "")}${x.stedNavn ? " · " + esc(x.stedNavn) : ""}</p>
      </div>
    </div>
  `;
}

function buildResultsHtml(qRaw) {
  const q = qRaw.trim().toLowerCase();
  if (!q) return `<p class="search-hint">${t('searchHint')}</p>`;

  const advs = matchingAdventures(q);
  const acts = matchingActivities(q);
  if (advs.length === 0 && acts.length === 0) {
    return `<p class="search-hint">${t('searchNoResults')}</p>`;
  }

  return `
    ${advs.length > 0 ? `
      <p class="section-eyebrow">${t('sectionAdventures')}</p>
      <div class="trip-list">${advs.map(renderTripRow).join("")}</div>
    ` : ""}
    ${acts.length > 0 ? `
      <p class="section-eyebrow">${t('sectionActivities')}</p>
      <div class="item-list">${acts.map(renderActivitySearchRow).join("")}</div>
    ` : ""}
  `;
}

function wireResultClicks() {
  document.querySelectorAll(".trip-row").forEach(el => {
    el.addEventListener("click", () => navigate(`/adventure/${el.dataset.id}`));
  });
  document.querySelectorAll("[data-open-search-activity]").forEach(el => {
    el.addEventListener("click", () => {
      const x = state.activities.find(a => a.id === el.dataset.openSearchActivity);
      const adv = x && state.adventures.find(a => a.id === x.adventureId);
      if (!x || !adv) return;
      navigate(`/adventure/${adv.id}/program`);
      openActivityModal(adv, x);
    });
  });
}

export function renderSearchView() {
  return `
    <div class="detail-top">
      <button class="back-link" data-action="back-home">‹ ${t('backLabel')}</button>
    </div>
    <div class="detail-hero"><h1 class="detail-name">${t('searchTitle')}</h1></div>
    <div class="field">
      <input type="search" id="search-input" placeholder="${t('searchPlaceholder')}" value="${esc(query)}" />
    </div>
    <div id="search-results"></div>
  `;
}

export function wireSearchView() {
  document.querySelector('[data-action="back-home"]')?.addEventListener("click", () => navigate("/"));

  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");

  function paint() {
    query = input.value;
    results.innerHTML = buildResultsHtml(query);
    wireResultClicks();
  }

  input.addEventListener("input", paint);
  input.focus();
  paint();
}
