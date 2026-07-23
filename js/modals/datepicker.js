// ---------- Date picker (bottom sheet) ----------
// mount() bygger arket ÉN gang (og lytterne med det) — draw()-mønstret fra
// resten af appen (fuld innerHTML-genopbygning pr. interaktion) ville her
// genstarte .sheet's slideUp/.sheet-backdrop's fadeIn-animation ved hvert
// tryk, fordi elementerne bogstaveligt talt genskabes. paint() opdaterer
// bagefter kun klasser/tekst på celler der allerede findes i DOM'en.
// Efter mount() må innerHTML kun røres ét sted mere: goToMonth(), som
// bygger et helt nyt .dp-grid (aldrig resten af arket).
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

  // DOM-referencer sat af mount(), gridEl genpeget af goToMonth()
  let sheetEl, gridViewportEl, gridEl, monthLabelEl, singleToggleEl;
  let startChipEl, endChipEl, endChipWrapEl;

  // Peger på den igangværende træk-gestus, eller null. originIso er den
  // celle, hvor pointerdown skete — det er den, der afgør både om det
  // ender som et tryk eller et træk, OG hvilken ende af en rækkevidde
  // trækket starter fra.
  let pointerState = null;

  function buildGridCellsHtml(year, month) {
    const first = new Date(year, month, 1);
    const firstWeekday = (first.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - firstWeekday);

    const cellsHtml = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = toISO(d);
      const inCurrent = d.getMonth() === month;
      const isStart = !!start && iso === start;
      const isEnd = !!end && iso === end;
      const isMid = !singleMode && !!start && !!end && iso > start && iso < end;

      let cls = "dp-cell";
      if (!inCurrent) cls += " dp-cell-out";
      if (isStart) cls += " dp-start";
      if (isEnd) cls += " dp-end";
      if (isMid) cls += " dp-mid";
      cellsHtml.push(`<button class="${cls}" data-iso="${iso}"><span class="dp-num">${d.getDate()}</span></button>`);
    }
    return cellsHtml.join("");
  }

  function monthLabelText() {
    return `${cap(cursor.toLocaleDateString(locale(), { month: "long" }))} ${cursor.getFullYear()}`;
  }

  function mount() {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
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
            <span class="dp-month">${monthLabelText()}</span>
            <button class="icon-only" data-picker="next" aria-label="${t('nextMonthAria')}">›</button>
          </div>
          <div class="dp-weekdays">
            ${(WEEKDAYS[state.lang] || WEEKDAYS.da).map(w => `<span>${w}</span>`).join("")}
          </div>
          <div class="dp-grid-viewport">
            <div class="dp-grid">${buildGridCellsHtml(year, month)}</div>
          </div>
          <div class="dp-chips">
            <div class="dp-chip">
              <span class="dp-chip-label">${t('startChip')}</span>
              <span class="dp-chip-val ${start ? "" : "empty"}" data-chip="start">${startChip}</span>
            </div>
            ${!singleOnly ? `
              <div class="dp-chip" data-chip-wrap="end" style="display:${singleMode ? "none" : ""}">
                <span class="dp-chip-label">${t('endChip')}</span>
                <span class="dp-chip-val ${end ? "" : "empty"}" data-chip="end">${endChip}</span>
              </div>
            ` : ""}
          </div>
          <div class="dp-confirm-wrap">
            <button class="btn btn-primary btn-block" data-picker="confirm">${t('confirm')}</button>
          </div>
        </div>
      </div>
    `;

    sheetEl = rootEl.querySelector(".dp-sheet");
    gridViewportEl = rootEl.querySelector(".dp-grid-viewport");
    gridEl = rootEl.querySelector(".dp-grid");
    monthLabelEl = rootEl.querySelector(".dp-month");
    singleToggleEl = rootEl.querySelector("#dp-single");
    startChipEl = rootEl.querySelector('[data-chip="start"]');
    endChipEl = rootEl.querySelector('[data-chip="end"]');
    endChipWrapEl = rootEl.querySelector('[data-chip-wrap="end"]');

    // ---- Lyttere: sættes op ÉN gang, aldrig igen ----
    rootEl.querySelector("[data-picker-backdrop]").addEventListener("click", e => {
      if (e.target.hasAttribute("data-picker-backdrop")) close();
    });
    rootEl.querySelector('[data-picker="prev"]').addEventListener("click", () => goToMonth(-1));
    rootEl.querySelector('[data-picker="next"]').addEventListener("click", () => goToMonth(1));
    singleToggleEl?.addEventListener("change", e => {
      singleMode = e.target.checked;
      if (singleMode) end = null;
      paint();
    });
    rootEl.querySelector('[data-picker="confirm"]').addEventListener("click", () => {
      if (!start) { alert(t('pickStartDate')); return; }
      onConfirm(start, singleMode ? "" : (end || ""));
      close();
    });

    // Delegeret på den STABILE viewport, ikke på de enkelte celler — så
    // et månedsskift (nyt .dp-grid) aldrig kræver at lytterne sættes op
    // igen.
    gridViewportEl.addEventListener("pointerdown", onPointerDown);
    gridViewportEl.addEventListener("pointermove", onPointerMove);
    gridViewportEl.addEventListener("pointerup", onPointerUp);
    gridViewportEl.addEventListener("pointercancel", onPointerUp);
  }

  // ---- paint(): opdaterer KUN klasser/tekst på eksisterende elementer ----
  function paint() {
    gridEl.querySelectorAll(".dp-cell").forEach(cell => {
      const iso = cell.dataset.iso;
      const isStart = !!start && iso === start;
      const isEnd = !!end && iso === end;
      const isMid = !singleMode && !!start && !!end && iso > start && iso < end;
      const wasStart = cell.classList.contains("dp-start");
      const wasEnd = cell.classList.contains("dp-end");

      cell.classList.toggle("dp-start", isStart);
      cell.classList.toggle("dp-end", isEnd);
      cell.classList.toggle("dp-mid", isMid);

      // Kun de celler der LIGE ER blevet start/slut får landings-
      // animationen — ikke dem der allerede var det (fx den anden ende
      // af en rækkevidde, der bare vokser).
      if ((isStart && !wasStart) || (isEnd && !wasEnd)) {
        cell.classList.remove("dp-marker-in");
        void cell.offsetWidth; // force reflow, så animationen kan afspilles igen
        cell.classList.add("dp-marker-in");
        cell.addEventListener("animationend", () => cell.classList.remove("dp-marker-in"), { once: true });
      }
    });

    setChipText(startChipEl, start ? formatChipDate(start) : "—", !start);
    if (endChipEl) setChipText(endChipEl, end ? formatChipDate(end) : "—", !end);
    if (endChipWrapEl) endChipWrapEl.style.display = singleMode ? "none" : "";
    if (singleToggleEl) singleToggleEl.checked = singleMode;
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function setChipText(el, text, empty) {
    if (el.textContent === text) {
      el.classList.toggle("empty", empty);
      return;
    }
    if (prefersReducedMotion()) {
      el.textContent = text;
      el.classList.toggle("empty", empty);
      return;
    }
    el.classList.add("dp-chip-fade");
    setTimeout(() => {
      el.textContent = text;
      el.classList.toggle("empty", empty);
      el.classList.remove("dp-chip-fade");
    }, 100);
  }

  // ---- Månedsskift: kun .dp-grid udskiftes, ALDRIG resten af arket ----
  function goToMonth(direction) {
    cursor.setMonth(cursor.getMonth() + direction);
    monthLabelEl.textContent = monthLabelText();

    const newGrid = document.createElement("div");
    newGrid.className = "dp-grid";
    newGrid.innerHTML = buildGridCellsHtml(cursor.getFullYear(), cursor.getMonth());

    const oldGrid = gridEl;

    if (prefersReducedMotion()) {
      gridViewportEl.replaceChild(newGrid, oldGrid);
      gridEl = newGrid;
      return;
    }

    const inward = direction > 0 ? "100%" : "-100%";
    const outward = direction > 0 ? "-100%" : "100%";
    newGrid.style.transform = `translateX(${inward})`;
    gridViewportEl.appendChild(newGrid);
    void newGrid.offsetWidth; // force reflow — commit startpositionen før transitionen slås til
    newGrid.style.transition = "transform 200ms ease-out";
    newGrid.style.transform = "translateX(0)";
    oldGrid.style.transition = "transform 200ms ease-out";
    oldGrid.style.transform = `translateX(${outward})`;
    oldGrid.addEventListener("transitionend", () => oldGrid.remove(), { once: true });

    gridEl = newGrid;
  }

  // ---- Tryk vs. træk ----
  // pointerdown rører ALDRIG start/end — kun pointerState. Bevæger
  // fingeren sig aldrig til en anden celle, afgøres det hele ved
  // pointerup af den oprindelige, uændrede handleTap-logik. Først når
  // der reelt krydses mindst én celle, begynder pointermove at skrive
  // til start/end som en løbende rækkevidde-forhåndsvisning.
  function onPointerDown(e) {
    const cell = e.target.closest(".dp-cell");
    if (!cell) return;
    pointerState = { originIso: cell.dataset.iso, moved: false, lastIso: cell.dataset.iso };
  }

  function onPointerMove(e) {
    if (!pointerState) return;
    // KRITISK på touch: cellen hvor gesten startede holder implicit
    // pointer capture, så pointerenter/over på andre celler aldrig
    // fyrer. elementFromPoint finder den faktiske celle under fingeren
    // uafhængigt af capture.
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest(".dp-cell");
    if (!cell) return;
    const iso = cell.dataset.iso;
    if (iso === pointerState.lastIso) return;
    pointerState.lastIso = iso;
    pointerState.moved = true;

    if (singleMode) {
      start = iso;
      end = null;
    } else if (iso < pointerState.originIso) {
      start = iso;
      end = pointerState.originIso;
    } else {
      start = pointerState.originIso;
      end = iso;
    }
    paint();
    hapticLight();
  }

  function onPointerUp() {
    if (!pointerState) return;
    if (!pointerState.moved) {
      handleTap(pointerState.originIso);
      paint();
    }
    pointerState = null;
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

  async function hapticLight() {
    try {
      await window.Capacitor?.Plugins?.Haptics?.impact({ style: "LIGHT" });
    } catch {
      // Web, eller pluginet er ikke registreret native — stilfærdigt
      // ingenting, som tiltænkt.
    }
  }

  function close() {
    rootEl.innerHTML = "";
  }

  mount();
}

export function formatChipDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}
