// ---------- Kalender-visning ----------
import { t, locale } from '../i18n.js';
import { icon } from '../icons.js';
import { WEEKDAYS } from '../constants.js';
import { state } from '../data.js';
import { toISO, todayISO, cap } from '../utils.js';
import { navigate, render } from '../router.js';
import { openAppMenu, openSheet, closeSheet } from '../modals/sheet.js';
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
    });

    // Signaturforklaringen lover "bånd = rejse, prik = oplevelse" — bånd
    // kan kun tegnes for én rejse ad gangen (det er cellens egen baggrund/
    // cirkel-markør), så den FØRSTE RIGTIGE REJSE blandt matches vælges,
    // uanset hvor i listen den ligger. Alt andet (oplevelser og evt.
    // øvrige rejser i samme celle) bliver prikker i stedet — op til 3.
    const bandEvent = matches.find(a => a.type === "rejse");
    const dotEvents = matches.filter(a => a !== bandEvent).slice(0, 3);

    if (bandEvent) {
      const start = bandEvent.startdato;
      const end = bandEvent.slutdato || bandEvent.startdato;
      // Begge klasser samtidig ved en étdags-rejse (start === end === iso)
      // giver bevidst en "solo"-cirkel uden bånd-fyldet, samme mønster som
      // datepicker.js's dp-start.dp-end.
      if (iso === start) cellCls += " cal-band-start";
      if (iso === end) cellCls += " cal-band-end";
      if (iso !== start && iso !== end) cellCls += " cal-band-mid";
    }
    const dotsHtml = dotEvents.map(() => '<span class="cal-dot"></span>').join("");

    // Alle matches (ikke kun bånd-eventyret) skal kunne nås ved klik — se
    // wireCalendar, som viser et lille valg-sheet, når der er mere end én.
    const cellAdvIds = matches.map(a => a.id);

    cells.push(`
      <div class="${cellCls}" ${cellAdvIds.length > 0 ? `data-adv-ids="${cellAdvIds.join(",")}"` : ""}>
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
    <div class="cal-wide-grid">
      <div class="cal-col-grid">
        <div class="cal-weekdays">
          ${(WEEKDAYS[state.lang] || WEEKDAYS.da).map(w => `<span>${w}</span>`).join("")}
        </div>
        <div class="cal-grid">${cells.join("")}</div>
        <div class="cal-legend">
          <span class="legend-item"><span class="legend-band"></span> ${t('legendTrip')}</span>
          <span class="legend-item"><span class="legend-dot"></span> ${t('legendExperience')}</span>
        </div>
      </div>
      <div class="cal-col-list">
        ${thisMonthEvents.length > 0 ? `
          <p class="section-eyebrow">${t('thisMonth')}</p>
          <div class="trip-list">
            ${thisMonthEvents.map(renderTripRow).join("")}
          </div>
        ` : `
          <p style="color:var(--ink-soft);font-size:13px;margin:24px 4px 0">${t('noEventsInMonth', monthName.toLowerCase())}</p>
        `}
      </div>
    </div>
  `;
}

// En celle kan dække flere eventyr samtidig (fx en rejse der overlapper en
// oplevelse, eller to rejser i træk) — et klik skal kunne nå dem alle, ikke
// kun den ene, der blev valgt til cellens bånd/første prik.
function openCalendarCellPicker(ids) {
  const advs = ids.map(id => state.adventures.find(a => a.id === id)).filter(Boolean);
  openSheet(`
    <p class="sheet-title">${t('whichAdventure')}</p>
    <div class="trip-list" style="padding:0 24px 12px">
      ${advs.map(renderTripRow).join("")}
    </div>
  `);
  document.querySelectorAll(".trip-row").forEach(el => {
    el.addEventListener("click", () => {
      closeSheet();
      navigate(`/adventure/${el.dataset.id}`);
    });
  });
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
  document.querySelectorAll(".cal-cell[data-adv-ids]").forEach(el => {
    el.addEventListener("click", () => {
      const ids = el.dataset.advIds.split(",");
      if (ids.length === 1) {
        navigate(`/adventure/${ids[0]}`);
      } else {
        openCalendarCellPicker(ids);
      }
    });
  });
  document.querySelectorAll(".trip-row").forEach(el => {
    el.addEventListener("click", () => navigate(`/adventure/${el.dataset.id}`));
  });
}
