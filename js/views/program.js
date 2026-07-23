// ---------- Program-fanen (dag-for-dag) ----------
import { t, locale } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, formatKr, formatMonoDate, kategoriIkon, kategoriNavn, buildMapsUrl, isSafeHttpUrl, cap, todayISO } from '../utils.js';
import { activitiesFor, totalAktivitetsPris } from '../selectors.js';
import { state } from '../data.js';
import { toast } from '../toast.js';
import { openActivityModal } from '../modals/activity.js';

function statusDotClass(status) {
  if (status === "booket") return "is-booket";
  if (status === "betalt") return "is-betalt";
  return "is-idea";
}

export function renderActivityCard(x) {
  const timeRange = [x.startTid, x.slutTid].filter(Boolean).join("–");
  const metaParts = [];
  if (x.dato) metaParts.push(formatMonoDate(x.dato));
  if (timeRange) metaParts.push(timeRange);
  metaParts.push(kategoriNavn(x.kategori));
  if (x.varerTil) metaParts.push(`→ ${formatMonoDate(x.varerTil)}`);

  const validLink = x.link && isSafeHttpUrl(x.link) ? x.link : "";
  const hasChips = !!(x.telefon || x.reference || validLink);

  return `
    <div class="item act-card" data-open-activity="${x.id}">
      <div class="item-icon">${icon(kategoriIkon(x.kategori))}</div>
      <div class="item-body">
        <p class="item-title">
          <span class="status-dot ${statusDotClass(x.status)}"></span>
          ${esc(x.navn)}
        </p>
        <p class="item-meta">${metaParts.join(" · ")}</p>
        ${x.stedNavn ? `<p class="item-place">${esc(x.stedNavn)}</p>` : ""}
        ${x.adresse ? `<a class="item-address" href="${buildMapsUrl(x.adresse)}" target="_blank" rel="noopener" data-inner-link>${esc(x.adresse)}</a>` : ""}
        ${x.noter ? `<p class="item-notes">${esc(x.noter)}</p>` : ""}
        ${hasChips ? `
          <div class="item-chips">
            ${x.telefon ? `<a class="item-chip" href="tel:${esc(x.telefon)}" data-inner-link>${esc(x.telefon)}</a>` : ""}
            ${x.reference ? `<button type="button" class="item-chip" data-copy-ref="${esc(x.reference)}">${esc(x.reference)}</button>` : ""}
            ${validLink ? `<a class="item-chip" href="${esc(validLink)}" target="_blank" rel="noopener" data-inner-link>${t('openLink')}</a>` : ""}
          </div>
        ` : ""}
      </div>
      <div class="item-price">${formatKr(x.pris)}</div>
    </div>
  `;
}

function sortByTime(list) {
  return [...list].sort((x, y) => {
    if (!x.startTid && !y.startTid) return 0;
    if (!x.startTid) return 1;
    if (!y.startTid) return -1;
    return x.startTid.localeCompare(y.startTid);
  });
}

function sortByDateThenTime(list) {
  return [...list].sort((x, y) => {
    if (x.dato !== y.dato) return x.dato.localeCompare(y.dato);
    if (!x.startTid && !y.startTid) return 0;
    if (!x.startTid) return 1;
    if (!y.startTid) return -1;
    return x.startTid.localeCompare(y.startTid);
  });
}

function formatDayHeading(iso) {
  const d = new Date(iso + "T00:00:00");
  const weekday = cap(d.toLocaleDateString(locale(), { weekday: "short" }));
  return `${weekday} ${formatMonoDate(iso)}`;
}

// Grupperer aktiviteter til Program-fanen. Slutdato er valgfri på et
// eventyr — mangler den, er intervallet åbent fremad (alt fra startdato
// og frem hører til rejsen; kun noget FØR startdato er "uden for
// rejseperioden"). Har eventyret slet ingen startdato (fx en idé),
// findes der intet interval at være uden for overhovedet.
function groupActivities(a, activities) {
  const noDate = activities.filter(x => !x.dato);
  const dated = activities.filter(x => !!x.dato);

  let inRange, outOfRange;
  if (a.startdato) {
    const start = a.startdato;
    const end = a.slutdato || null; // ingen fallback til start — se Fase 2's arkivering for kontrasten
    inRange = dated.filter(x => x.dato >= start && (end === null || x.dato <= end));
    outOfRange = dated.filter(x => x.dato < start || (end !== null && x.dato > end));
  } else {
    inRange = dated;
    outOfRange = [];
  }

  const byDate = new Map();
  for (const x of inRange) {
    if (!byDate.has(x.dato)) byDate.set(x.dato, []);
    byDate.get(x.dato).push(x);
  }

  // Sørg for at dagens dato altid har en overskrift, hvis den falder inden
  // for rejseperioden — ellers er der intet at scrolle til på en stille
  // rejsedag uden aktiviteter.
  if (a.startdato) {
    const today = todayISO();
    const end = a.slutdato || null;
    const todayInRange = today >= a.startdato && (end === null || today <= end);
    if (todayInRange && !byDate.has(today)) byDate.set(today, []);
  }

  const sortedDates = [...byDate.keys()].sort();
  return { noDate, byDate, sortedDates, outOfRange };
}

export function renderProgramTab(a) {
  const akt = activitiesFor(a.id);
  const total = totalAktivitetsPris(a.id);

  if (akt.length === 0) {
    return `
      <div class="planer-empty">
        <h3>${t('planerEmptyTitle')}</h3>
        <p>${t('planerEmptyText')}</p>
        <button class="btn btn-rust btn-block" data-action="add-activity">
          ${t('addActivity')}
        </button>
      </div>
    `;
  }

  const { noDate, byDate, sortedDates, outOfRange } = groupActivities(a, akt);

  const noDateSection = noDate.length > 0 ? `
    <p class="section-eyebrow">${t('unplacedSection')}</p>
    <div class="item-list">
      ${sortByTime(noDate).map(renderActivityCard).join("")}
    </div>
  ` : "";

  const daySections = sortedDates.map(iso => {
    const dayActivities = byDate.get(iso);
    return `
      <p class="section-eyebrow" data-day-heading="${iso}">${formatDayHeading(iso)}</p>
      ${dayActivities.length > 0 ? `
        <div class="item-list">
          ${sortByTime(dayActivities).map(renderActivityCard).join("")}
        </div>
      ` : `
        <p style="color:var(--ink-soft);font-size:14px;margin:0 0 20px">${t('nothingPlannedYet')}</p>
      `}
    `;
  }).join("");

  const outOfRangeSection = outOfRange.length > 0 ? `
    <p class="section-eyebrow">${t('outsideTripPeriod')}</p>
    <div class="item-list">
      ${sortByDateThenTime(outOfRange).map(renderActivityCard).join("")}
    </div>
  ` : "";

  return `
    <div class="total-row">
      <span class="total-row-label">${t('total')}</span>
      <span class="total-row-val">${formatKr(total)}</span>
    </div>
    ${noDateSection}
    ${daySections}
    ${outOfRangeSection}
    <button class="add-btn" data-action="add-activity">
      ${t('addActivity')}
    </button>
  `;
}

export function wireProgram(a) {
  document.querySelectorAll('[data-action="add-activity"]').forEach(el => {
    el.addEventListener("click", () => openActivityModal(a));
  });
  document.querySelectorAll("[data-open-activity]").forEach(el => {
    el.addEventListener("click", () => {
      const act = state.activities.find(x => x.id === el.dataset.openActivity);
      if (act) openActivityModal(a, act);
    });
  });
  // Adresse-/tel-/link-elementer skal ikke boble op til kortets egen
  // klik-handler, ellers åbner et tryk på adressen både kortappen og
  // redigér-modalen samtidig.
  document.querySelectorAll("[data-inner-link]").forEach(el => {
    el.addEventListener("click", (e) => e.stopPropagation());
  });
  document.querySelectorAll("[data-copy-ref]").forEach(el => {
    el.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(el.dataset.copyRef);
        toast(t('referenceCopied'));
      } catch {
        // Ingen clipboard-adgang tilgængelig — aktiviteten forbliver åben,
        // så referencen stadig kan læses og kopieres manuelt.
      }
    });
  });
}
