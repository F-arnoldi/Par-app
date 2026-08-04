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

  let tabContent = "";
  if (tab === "program")         tabContent = renderProgramTab(a);
  else if (tab === "opsparing")  tabContent = renderOpsparingTab(a);
  else if (tab === "pakkeliste") tabContent = renderPakkelisteTab(a);
  else                           tabContent = renderOversigtTab(a);

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

  if (tab === "program") wireProgram(a);
  else if (tab === "opsparing") wireOpsparing(a);
  else if (tab === "pakkeliste") wirePakkelisteTab(a);
  else wireOversigt(a);
}
