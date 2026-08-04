// ---------- Detalje-visning ----------
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, formatMonoRange } from '../utils.js';
import { allowedTabsFor } from '../selectors.js';
import { navigate } from '../router.js';
import { openDetailMenu } from '../modals/sheet.js';
import { renderOversigtTab, wireOversigt } from './oversigt.js';
import { renderProgramTab, wireProgram } from './program.js';
import { renderOpsparingTab, wireOpsparing } from './opsparing.js';
import { renderPakkelisteTab, wirePakkelisteTab } from './pakkeliste.js';

export function renderDetail(a, tab) {
  const range = a.startdato
    ? formatMonoRange(a.startdato, a.slutdato)
    : "";

  const tabs = allowedTabsFor(a);
  const showsProgram = tabs.some(tb => tb.id === "program");

  let tabContent = "";
  if (tab === "opsparing")       tabContent = renderOpsparingTab(a);
  else if (tab === "pakkeliste") tabContent = renderPakkelisteTab(a);
  else if (showsProgram) {
    // Oversigt og Program vises side om side ved ≥768px (se
    // .detail-wide-grid i styles.css) — begge tegnes altid, is-active
    // styrer hvilken der reelt er synlig under den bredde. Kun "rejse"
    // har en Program-fane overhovedet (allowedTabsFor); en "oplevelse"
    // falder til den rene Oversigt nedenfor, samme som før.
    tabContent = `
      <div class="detail-wide-grid">
        <div class="detail-col ${tab !== "program" ? "is-active" : ""}">${renderOversigtTab(a)}</div>
        <div class="detail-col ${tab === "program" ? "is-active" : ""}">${renderProgramTab(a)}</div>
      </div>
    `;
  } else {
    tabContent = renderOversigtTab(a);
  }

  return `
    <div class="detail-top">
      <button class="back-link" data-action="back">‹ ${t('backLabel')}</button>
      <button class="icon-only" data-action="detail-menu" aria-label="${t('menu')}">${icon("more")}</button>
    </div>
    <div class="detail-hero">
      <div class="detail-glyph">${icon(a.icon)}</div>
      <h1 class="detail-name">${esc(a.navn)}</h1>
      ${range
        ? `<p class="detail-mono">${range}</p>`
        : `<p class="detail-mono faint">${t('ideaNoDateHeading')}</p>`}
    </div>
    <div class="tabs">
      ${tabs.map(tb => `
        <button class="tab ${tb.id === tab ? "active" : ""}" data-tab="${tb.id}">${tb.label}</button>
      `).join("")}
    </div>
    ${tabContent}
  `;
}

export function wireDetail(a, tab) {
  document.querySelector('[data-action="back"]')?.addEventListener("click", () => navigate("/"));
  document.querySelector('[data-action="detail-menu"]')?.addEventListener("click", () => openDetailMenu(a));
  document.querySelectorAll(".tab").forEach(el => {
    el.addEventListener("click", () => navigate(`/adventure/${a.id}/${el.dataset.tab}`));
  });

  if (tab === "opsparing") wireOpsparing(a);
  else if (tab === "pakkeliste") wirePakkelisteTab(a);
  else if (allowedTabsFor(a).some(tb => tb.id === "program")) {
    // Begge er i DOM'en samtidig (se renderDetail) — begge skal derfor
    // også have deres lyttere, uanset hvilken der er is-active lige nu.
    // Ingen af de to's forespørgselsvælgere overlapper hinandens markup.
    wireOversigt(a);
    wireProgram(a);
  } else {
    wireOversigt(a);
  }
}
