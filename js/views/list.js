// ---------- Liste (forside) ----------
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, formatMonoRange, formatKr, heroCountdown, shortCountdown } from '../utils.js';
import { totalSparet, upcomingAdventures, ideaAdventures, pastAdventures } from '../selectors.js';
import { navigate } from '../router.js';
import { openAdventureModal } from '../modals/adventure.js';
import { openAppMenu } from '../modals/sheet.js';
import { syncStatus } from '../sync.js';

export function renderList() {
  const upcoming = upcomingAdventures();
  const ideas = ideaAdventures();
  const past = pastAdventures();

  if (upcoming.length === 0 && ideas.length === 0 && past.length === 0) {
    return `
      ${renderHomeTop()}
      <div class="hero-empty">
        <p class="eyebrow" style="color:var(--ink-soft)">${t('noAdventuresYet')}</p>
        <h2>${t('dreamHeadline')}</h2>
        <button class="btn btn-rust" data-action="new">
          <span class="fab-plus">+</span> ${t('newAdventure')}
        </button>
      </div>
    `;
  }

  const next = upcoming[0];
  const kommende = upcoming.slice(next ? 1 : 0);

  return `
    ${renderHomeTop()}
    ${next
      ? renderHero(next)
      : `
        <div class="hero-empty">
          <p class="eyebrow" style="color:var(--ink-soft)">${t('noUpcoming')}</p>
          <h2>${t('dreamHeadline')}</h2>
          <button class="btn btn-rust" data-action="new">
            <span class="fab-plus">+</span> ${t('newAdventure')}
          </button>
        </div>
      `}
    ${kommende.length > 0 ? `
      <p class="section-eyebrow">${t('sectionUpcoming')}</p>
      <div class="trip-list">
        ${kommende.map(renderTripRow).join("")}
      </div>
    ` : ""}
    ${ideas.length > 0 ? `
      <p class="section-eyebrow">${t('sectionIdeas')}</p>
      <div class="trip-list ideer">
        ${ideas.map(renderIdeaRow).join("")}
      </div>
    ` : ""}
    ${past.length > 0 ? `
      <p class="section-eyebrow">${t('sectionMemories')}</p>
      <div class="trip-list minder">
        ${past.map(renderTripRow).join("")}
      </div>
    ` : ""}
    <button class="fab" data-action="new">
      <span class="fab-plus">+</span> ${t('newAdventure')}
    </button>
  `;
}

function syncIndicatorOffline() {
  // "error" behandles roligt som "ikke forbundet lige nu" — samme visuelle
  // tilstand som offline, ingen alarmerende fejlmeddelelse.
  return !navigator.onLine || syncStatus.state === "error" || syncStatus.state === "offline";
}

export function renderHomeTop() {
  return `
    <div class="home-top">
      <span class="brand">${t('appName')}</span>
      <div class="home-top-actions">
        <button class="icon-only sync-indicator ${syncIndicatorOffline() ? "is-offline" : ""}" data-action="app-menu" aria-label="${t('syncStatus')}">${icon("cloud")}</button>
        <button class="icon-only" data-action="app-menu" aria-label="${t('menu')}">${icon("menu")}</button>
      </div>
    </div>
  `;
}

export function renderHero(a) {
  const sparet = totalSparet(a.id);
  const målBeløb = Number(a.målBeløb) || 0;
  const pct = målBeløb > 0 ? Math.min(100, (sparet / målBeløb) * 100) : 0;
  const cd = heroCountdown(a.startdato);
  const range = formatMonoRange(a.startdato, a.slutdato);

  return `
    <div class="hero" data-id="${a.id}">
      <p class="eyebrow">${t('nextAdventure')}</p>
      <h2 class="hero-title">${esc(a.navn)}</h2>
      <p class="hero-dates">${range}</p>
      <div class="hero-count">
        <span class="hero-count-num">${cd.num}</span>
        <span class="hero-count-unit">${cd.unit}</span>
      </div>
      ${målBeløb > 0 ? `
        <div class="hero-savings">
          <div class="hero-savings-row">
            <span>${t('heroSaved', formatKr(sparet))}</span>
            <span>${t('heroOf', formatKr(målBeløb))}</span>
          </div>
          <div class="hero-progress">
            <div class="hero-progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

export function renderTripRow(a) {
  const cd = a.startdato ? shortCountdown(a.startdato) : { num: "", unit: "" };
  const range = a.startdato ? formatMonoRange(a.startdato, a.slutdato) : "";
  return `
    <div class="trip-row" data-id="${a.id}">
      <div class="trip-glyph">${icon(a.icon)}</div>
      <div class="trip-info">
        <p class="trip-name">${esc(a.navn)}</p>
        ${range ? `<p class="trip-dates">${range}</p>` : ""}
      </div>
      ${cd.num ? `
        <div class="trip-days">
          <div class="trip-days-num">${cd.num}</div>
          ${cd.unit ? `<span class="trip-days-unit">${cd.unit}</span>` : ""}
        </div>
      ` : ""}
    </div>
  `;
}

export function renderIdeaRow(a) {
  return `
    <div class="trip-row" data-id="${a.id}">
      <div class="trip-glyph">${icon(a.icon)}</div>
      <div class="trip-info">
        <p class="trip-name">${esc(a.navn)}</p>
        <p class="trip-dates trip-dates-faint">${t('noDate')}</p>
      </div>
    </div>
  `;
}

// Registreres kun én gang for hele sidens levetid (ikke ved hvert kald af
// wireList — window-lyttere overlever en re-render, i modsætning til
// lyttere sat direkte på DOM-elementer, så gentagne tilmeldinger ville
// hobe sig op for hver gang forsiden vises igen). Slår altid det/de
// indikator-element(er) op der findes LIGE NU, i stedet for at gemme en
// reference fra tilmeldings-tidspunktet — så den altid rammer den aktuelle
// render, uanset hvor mange gange DOM'en er blevet skiftet ud siden.
let offlineListenerRegistered = false;
function ensureOfflineListener() {
  if (offlineListenerRegistered) return;
  offlineListenerRegistered = true;
  const update = () => {
    document.querySelectorAll(".sync-indicator").forEach(el => {
      el.classList.toggle("is-offline", syncIndicatorOffline());
    });
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
}

export function wireList() {
  document.querySelector(".hero")?.addEventListener("click", (e) => {
    navigate(`/adventure/${e.currentTarget.dataset.id}`);
  });
  document.querySelectorAll(".trip-row").forEach(el => {
    el.addEventListener("click", () => navigate(`/adventure/${el.dataset.id}`));
  });
  document.querySelectorAll('[data-action="new"]').forEach(el => {
    el.addEventListener("click", () => openAdventureModal());
  });
  document.querySelectorAll('[data-action="app-menu"]').forEach(el => {
    el.addEventListener("click", openAppMenu);
  });
  ensureOfflineListener();
}
