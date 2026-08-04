// ---------- Del/print program ----------
// En ren, printbar udgave af hele rejseplanen — ikke et nyt format at
// vedligeholde, bare en anden visning af de samme data som Program-fanen
// (deler groupActivities/formatDayHeading derfra). "Del" betyder her
// browserens egen print-dialog (Gem som PDF / AirPrint / del-ark),
// bevidst uden endnu en Capacitor-plugin — den findes allerede overalt.
import { t } from '../i18n.js';
import { esc, formatMonoRange, kategoriNavn } from '../utils.js';
import { activitiesFor } from '../selectors.js';
import { navigate } from '../router.js';
import { groupActivities, formatDayHeading } from './program.js';

function renderPrintActivityLine(x) {
  const timeRange = [x.startTid, x.slutTid].filter(Boolean).join("–");
  const parts = [timeRange, kategoriNavn(x.kategori), x.stedNavn].filter(Boolean);
  return `
    <li class="print-activity">
      <span class="print-activity-name">${esc(x.navn)}</span>
      ${parts.length > 0 ? `<span class="print-activity-meta">${parts.map(esc).join(" · ")}</span>` : ""}
    </li>
  `;
}

export function renderPrintView(a) {
  const akt = activitiesFor(a.id).filter(x => !x.kilde);
  const { noDate, byDate, sortedDates } = groupActivities(a, akt);

  const daySections = sortedDates.map(iso => `
    <h3 class="print-day-heading">${formatDayHeading(iso)}</h3>
    ${(byDate.get(iso) || []).length > 0
      ? `<ul class="print-activity-list">${byDate.get(iso).map(renderPrintActivityLine).join("")}</ul>`
      : `<p class="print-empty-day">${t('nothingPlannedYet')}</p>`}
  `).join("");

  const noDateSection = noDate.length > 0 ? `
    <h3 class="print-day-heading">${t('unplacedSection')}</h3>
    <ul class="print-activity-list">${noDate.map(renderPrintActivityLine).join("")}</ul>
  ` : "";

  return `
    <div class="print-toolbar no-print">
      <button class="back-link" data-action="print-back">‹ ${t('backLabel')}</button>
      <button class="btn btn-rust" data-action="print-now">${t('printBtn')}</button>
    </div>
    <div class="print-sheet">
      <h1 class="print-title">${esc(a.navn)}</h1>
      ${a.startdato ? `<p class="print-dates">${formatMonoRange(a.startdato, a.slutdato)}</p>` : ""}
      ${daySections}
      ${noDateSection}
      ${sortedDates.length === 0 && noDate.length === 0 ? `<p class="print-empty-day">${t('planerEmptyText')}</p>` : ""}
    </div>
  `;
}

export function wirePrintView(a) {
  document.querySelector('[data-action="print-back"]')?.addEventListener("click", () => navigate(`/adventure/${a.id}`));
  document.querySelector('[data-action="print-now"]')?.addEventListener("click", () => window.print());
}
