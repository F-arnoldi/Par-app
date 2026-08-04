// ---------- Time picker (bottom sheet) ----------
// Samme skal og visuelle sprog som datepicker.js (backdrop/sheet-klasser,
// header, træk-for-at-luk, fokus-fælde) — kun selve vælgeren er anderledes,
// da klokkeslæt er en anden slags data end en kalendermåned: to uafhængigt
// rullende kolonner (time/minut) i stedet for et rutenet.
import { t } from '../i18n.js';
import { esc } from '../utils.js';
import { attachDragToDismiss } from './dismissible.js';
import { trapFocusAndEscape } from './a11y.js';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n) { return String(n).padStart(2, "0"); }

// Runder en tidligere gemt værdi ned til nærmeste tilladte 5-minutters-trin
// — kun relevant for data der er sat før denne vælger fandtes.
function closestMinute(m) {
  return MINUTES.reduce((closest, cand) => Math.abs(cand - m) < Math.abs(closest - m) ? cand : closest, 0);
}

export function openTimePicker(currentValue, label, onConfirm) {
  const [initHour, initMinute] = currentValue && /^\d{2}:\d{2}$/.test(currentValue)
    ? currentValue.split(":").map(Number)
    : [null, null];

  let hour = initHour;
  let minute = initMinute != null ? closestMinute(initMinute) : null;

  const rootEl = document.getElementById("picker-root");

  rootEl.innerHTML = `
    <div class="sheet-backdrop tp-backdrop" data-picker-backdrop>
      <div class="sheet tp-sheet" role="dialog">
        <div class="sheet-handle"></div>
        <div class="dp-header">
          <p class="sheet-eyebrow">${esc(label)}</p>
          <h2 class="sheet-title-lg">${t('pickTimeTitle')}</h2>
        </div>
        <div class="tp-columns">
          <div class="tp-col" data-col="hour">
            <div class="tp-col-pad"></div>
            ${HOURS.map(h => `<button type="button" class="tp-option" data-hour="${h}">${pad(h)}</button>`).join("")}
            <div class="tp-col-pad"></div>
          </div>
          <div class="tp-colon">:</div>
          <div class="tp-col" data-col="minute">
            <div class="tp-col-pad"></div>
            ${MINUTES.map(m => `<button type="button" class="tp-option" data-minute="${m}">${pad(m)}</button>`).join("")}
            <div class="tp-col-pad"></div>
          </div>
        </div>
        <div class="dp-confirm-wrap tp-confirm-wrap">
          <button type="button" class="btn" data-picker="clear">${t('clearTime')}</button>
          <button type="button" class="btn btn-primary btn-block" data-picker="confirm">${t('confirm')}</button>
        </div>
      </div>
    </div>
  `;

  const backdropEl = rootEl.querySelector(".tp-backdrop");
  const sheetEl = rootEl.querySelector(".tp-sheet");
  const hourCol = rootEl.querySelector('[data-col="hour"]');
  const minuteCol = rootEl.querySelector('[data-col="minute"]');

  // De to kolonner skal kunne rulles frit med fingeren uden at det tolkes
  // som et forsøg på at trække hele arket ned og lukke det — se
  // attachDragToDismiss, som lytter på HELE sheetEl og derfor ellers ville
  // fange gestussen, når den bobler op fra en indre kolonne (i modsætning
  // til datepicker.js, som ikke har nogen indlejret rullende region).
  [hourCol, minuteCol].forEach(col => {
    col.addEventListener("pointerdown", e => e.stopPropagation());
    col.addEventListener("pointermove", e => e.stopPropagation());
    col.addEventListener("pointerup", e => e.stopPropagation());
  });

  function scrollToSelected(col, selector, instant) {
    const el = col.querySelector(selector);
    if (!el) return;
    const target = el.offsetTop - (col.clientHeight - el.clientHeight) / 2;
    col.scrollTo({ top: target, behavior: instant ? "auto" : "smooth" });
  }

  function paint() {
    hourCol.querySelectorAll(".tp-option").forEach(el => {
      el.classList.toggle("selected", Number(el.dataset.hour) === hour);
    });
    minuteCol.querySelectorAll(".tp-option").forEach(el => {
      el.classList.toggle("selected", Number(el.dataset.minute) === minute);
    });
  }

  hourCol.querySelectorAll(".tp-option").forEach(el => {
    el.addEventListener("click", () => {
      hour = Number(el.dataset.hour);
      if (minute == null) minute = 0;
      paint();
      scrollToSelected(hourCol, `[data-hour="${hour}"]`);
      scrollToSelected(minuteCol, `[data-minute="${minute}"]`);
    });
  });
  minuteCol.querySelectorAll(".tp-option").forEach(el => {
    el.addEventListener("click", () => {
      minute = Number(el.dataset.minute);
      if (hour == null) hour = 0;
      paint();
      scrollToSelected(hourCol, `[data-hour="${hour}"]`);
      scrollToSelected(minuteCol, `[data-minute="${minute}"]`);
    });
  });

  paint();
  // Uden animation ved selve åbningen — kun senere valg (klik) skal glide.
  requestAnimationFrame(() => {
    scrollToSelected(hourCol, hour != null ? `[data-hour="${hour}"]` : ".tp-option", true);
    scrollToSelected(minuteCol, minute != null ? `[data-minute="${minute}"]` : ".tp-option", true);
  });

  // Bygger sin egen .sheet-markup direkte, samme grund som datepicker.js —
  // kobler træk-for-at-luk til eksplicit i stedet for at gå via openSheet().
  const cleanupA11y = trapFocusAndEscape(sheetEl, close);
  const dismiss = attachDragToDismiss(sheetEl, backdropEl, () => {
    cleanupA11y();
    rootEl.innerHTML = "";
  });

  function close() {
    dismiss();
  }

  backdropEl.addEventListener("click", e => {
    if (e.target.hasAttribute("data-picker-backdrop")) close();
  });
  rootEl.querySelector('[data-picker="clear"]').addEventListener("click", () => {
    onConfirm("");
    close();
  });
  rootEl.querySelector('[data-picker="confirm"]').addEventListener("click", () => {
    const value = (hour != null && minute != null) ? `${pad(hour)}:${pad(minute)}` : "";
    onConfirm(value);
    close();
  });
}
