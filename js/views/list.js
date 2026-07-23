// ---------- Liste (forside) ----------
import { state } from '../data.js';
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, formatMonoRange, formatKr, heroCountdown, shortCountdown } from '../utils.js';
import { totalSparet, upcomingAdventures, ideaAdventures, pastAdventures } from '../selectors.js';
import { navigate } from '../router.js';
import { openAdventureModal } from '../modals/adventure.js';
import { openAppMenu } from '../modals/sheet.js';

export function renderList() {
  const upcoming = upcomingAdventures();
  const ideas = ideaAdventures();
  const past = pastAdventures();

  if (state.adventures.length === 0) {
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

export function renderHomeTop() {
  return `
    <div class="home-top">
      <span class="brand">${t('appName')}</span>
      <button class="icon-only" data-action="app-menu" aria-label="${t('menu')}">${icon("menu")}</button>
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
  document.querySelector('[data-action="app-menu"]')?.addEventListener("click", openAppMenu);
}
