// ---------- Date picker (bottom sheet) ----------
import { t, locale } from '../i18n.js';
import { cap, toISO, esc } from '../utils.js';
import { WEEKDAYS } from '../constants.js';
import { state } from '../data.js';

export function openDatePicker(currentStart, currentEnd, eventyrNavn, onConfirm, opts = {}) {
  const singleOnly = !!opts.singleOnly;
  let start = currentStart || null;
  let end = currentEnd || null;
  let singleMode = singleOnly || (!!currentStart && !currentEnd);
  const startDate = start ? new Date(start + "T00:00:00") : new Date();
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  const rootEl = document.getElementById("picker-root");

  function draw() {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthName = cap(cursor.toLocaleDateString(locale(), { month: "long" }));

    const first = new Date(year, month, 1);
    const firstWeekday = (first.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - firstWeekday);

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = toISO(d);
      const inCurrent = d.getMonth() === month;
      const isStart = start && iso === start;
      const isEnd = end && iso === end;
      const isMid = !singleMode && start && end && iso > start && iso < end;

      let cls = "dp-cell";
      if (!inCurrent) cls += " dp-cell-out";
      if (isStart) cls += " dp-start";
      if (isEnd) cls += " dp-end";
      if (isMid) cls += " dp-mid";
      cells.push(`<button class="${cls}" data-iso="${iso}"><span class="dp-num">${d.getDate()}</span></button>`);
    }

    const startChip = start ? formatChipDate(start) : "—";
    const endChip = end ? formatChipDate(end) : "—";

    rootEl.innerHTML = `
      <div class="sheet-backdrop dp-backdrop" data-picker-backdrop>
        <div class="sheet dp-sheet" role="dialog">
          <div class="sheet-handle"></div>
          <div class="dp-header">
            <p class="sheet-eyebrow">${esc(eventyrNavn)}</p>
            <h2 class="sheet-title-lg">${t('whenDoYouLeave')}</h2>
          </div>
          ${singleOnly ? "" : `
            <label class="dp-mode-toggle">
              <input type="checkbox" id="dp-single" ${singleMode ? "checked" : ""}/>
              <span>${t('singleDateOnly')}</span>
            </label>
          `}
          <div class="dp-nav">
            <button class="icon-only" data-picker="prev" aria-label="${t('prevMonthAria')}">‹</button>
            <span class="dp-month">${monthName} ${year}</span>
            <button class="icon-only" data-picker="next" aria-label="${t('nextMonthAria')}">›</button>
          </div>
          <div class="dp-weekdays">
            ${(WEEKDAYS[state.lang] || WEEKDAYS.da).map(w => `<span>${w}</span>`).join("")}
          </div>
          <div class="dp-grid">${cells.join("")}</div>
          <div class="dp-chips">
            <div class="dp-chip">
              <span class="dp-chip-label">${t('startChip')}</span>
              <span class="dp-chip-val ${start ? "" : "empty"}">${startChip}</span>
            </div>
            ${!singleMode ? `
              <div class="dp-chip">
                <span class="dp-chip-label">${t('endChip')}</span>
                <span class="dp-chip-val ${end ? "" : "empty"}">${endChip}</span>
              </div>
            ` : ""}
          </div>
          <div class="dp-confirm-wrap">
            <button class="btn btn-primary btn-block" data-picker="confirm">${t('confirm')}</button>
          </div>
        </div>
      </div>
    `;

    rootEl.querySelector("[data-picker-backdrop]").addEventListener("click", e => {
      if (e.target.hasAttribute("data-picker-backdrop")) close();
    });
    rootEl.querySelector('[data-picker="prev"]').addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() - 1);
      draw();
    });
    rootEl.querySelector('[data-picker="next"]').addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() + 1);
      draw();
    });
    rootEl.querySelector("#dp-single")?.addEventListener("change", e => {
      singleMode = e.target.checked;
      if (singleMode) end = null;
      draw();
    });
    rootEl.querySelectorAll(".dp-cell").forEach(cell => {
      cell.addEventListener("click", () => {
        handleTap(cell.dataset.iso);
        draw();
      });
    });
    rootEl.querySelector('[data-picker="confirm"]').addEventListener("click", () => {
      if (!start) { alert(t('pickStartDate')); return; }
      onConfirm(start, singleMode ? "" : (end || ""));
      close();
    });
  }

  function handleTap(iso) {
    if (singleMode) {
      start = iso;
      end = null;
      return;
    }
    if (!start || (start && end)) {
      start = iso;
      end = null;
    } else {
      if (iso < start) {
        end = start;
        start = iso;
      } else if (iso === start) {
        end = iso;
      } else {
        end = iso;
      }
    }
  }

  function close() {
    rootEl.innerHTML = "";
  }

  draw();
}

export function formatChipDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}
