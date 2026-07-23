// ---------- Kalender-visning ----------
import { t, locale } from '../i18n.js';
import { icon } from '../icons.js';
import { WEEKDAYS } from '../constants.js';
import { state } from '../data.js';
import { toISO, todayISO, cap } from '../utils.js';
import { navigate, render } from '../router.js';
import { openAppMenu } from '../modals/sheet.js';
import { renderTripRow } from './list.js';

let calCursor = null;

export function getCalCursor() {
  if (!calCursor) {
    calCursor = new Date();
    calCursor.setDate(1);
  }
  return calCursor;
}

export function renderCalendar() {
  const cursor = getCalCursor();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cap(cursor.toLocaleDateString(locale(), { month: "long" }));

  const first = new Date(year, month, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(year, month, 1 - firstWeekday);

  // Only include planned events (has startdato) that overlap this grid
  const events = state.adventures.filter(a => !a.deletedAt && !!a.startdato);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + 41);

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = toISO(d);
    const inCurrent = d.getMonth() === month;
    const isToday = iso === todayISO();
    const col = i % 7; // 0=Mon .. 6=Sun

    let cellCls = "cal-cell";
    if (!inCurrent) cellCls += " cal-out";
    if (isToday) cellCls += " cal-today";

    const matches = events.filter(a => {
      const start = a.startdato;
      const end = a.slutdato || a.startdato;
      return iso >= start && iso <= end;
    }).slice(0, 3); // op til 3 markører pr. celle

    let dotsHtml = "";
    let advId = null;

    matches.forEach((a, i) => {
      if (advId === null) advId = a.id; // klik navigerer til den første match
      const start = a.startdato;
      const end = a.slutdato || a.startdato;
      if (i === 0 && start !== end) {
        // Første match med en rigtig datointerval -> bånd-styling på selve cellen
        if (iso === start) cellCls += " cal-band-start";
        else if (iso === end) cellCls += " cal-band-end";
        else cellCls += " cal-band-mid";
      } else {
        dotsHtml += '<span class="cal-dot"></span>';
      }
    });

    cells.push(`
      <div class="${cellCls}" ${advId ? `data-adv-id="${advId}"` : ""}>
        <span class="cal-num">${d.getDate()}</span>
        ${dotsHtml ? `<div class="cal-dots-row">${dotsHtml}</div>` : ""}
      </div>
    `);
  }

  // "Denne måned" list: any event whose interval overlaps this month
  const monthStart = first;
  const monthEnd = new Date(year, month + 1, 0);
  const thisMonthEvents = events.filter(a => {
    const s = new Date(a.startdato + "T00:00:00");
    const e = new Date((a.slutdato || a.startdato) + "T00:00:00");
    return e >= monthStart && s <= monthEnd;
  }).sort((a, b) => a.startdato.localeCompare(b.startdato));

  return `
    <div class="detail-top">
      <button class="back-link" data-action="back-home">‹ ${t('backLabel')}</button>
      <button class="icon-only" data-action="cal-menu" aria-label="${t('menu')}">${icon("more")}</button>
    </div>
    <div class="cal-hero">
      <p class="cal-year">${year}</p>
      <h1 class="cal-month-name">${monthName}</h1>
    </div>
    <div class="cal-nav">
      <button class="btn-ghost" data-cal="prev">‹ ${t('prev')}</button>
      <button class="btn-ghost" data-cal="today">${t('today')}</button>
      <button class="btn-ghost" data-cal="next">${t('next')} ›</button>
    </div>
    <div class="cal-weekdays">
      ${(WEEKDAYS[state.lang] || WEEKDAYS.da).map(w => `<span>${w}</span>`).join("")}
    </div>
    <div class="cal-grid">${cells.join("")}</div>
    <div class="cal-legend">
      <span class="legend-item"><span class="legend-band"></span> ${t('legendTrip')}</span>
      <span class="legend-item"><span class="legend-dot"></span> ${t('legendExperience')}</span>
    </div>
    ${thisMonthEvents.length > 0 ? `
      <p class="section-eyebrow">${t('thisMonth')}</p>
      <div class="trip-list">
        ${thisMonthEvents.map(renderTripRow).join("")}
      </div>
    ` : `
      <p style="color:var(--ink-soft);font-size:13px;margin:24px 4px 0">${t('noEventsInMonth', monthName.toLowerCase())}</p>
    `}
  `;
}

export function wireCalendar() {
  document.querySelector('[data-action="back-home"]')?.addEventListener("click", () => navigate("/"));
  document.querySelector('[data-action="cal-menu"]')?.addEventListener("click", openAppMenu);
  document.querySelector('[data-cal="prev"]')?.addEventListener("click", () => {
    const c = getCalCursor();
    c.setMonth(c.getMonth() - 1);
    render();
  });
  document.querySelector('[data-cal="next"]')?.addEventListener("click", () => {
    const c = getCalCursor();
    c.setMonth(c.getMonth() + 1);
    render();
  });
  document.querySelector('[data-cal="today"]')?.addEventListener("click", () => {
    calCursor = new Date();
    calCursor.setDate(1);
    render();
  });
  document.querySelectorAll(".cal-cell[data-adv-id]").forEach(el => {
    el.addEventListener("click", () => navigate(`/adventure/${el.dataset.advId}`));
  });
  document.querySelectorAll(".trip-row").forEach(el => {
    el.addEventListener("click", () => navigate(`/adventure/${el.dataset.id}`));
  });
}
