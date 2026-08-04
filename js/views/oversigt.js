// ---------- Oversigt-fane ----------
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { formatKr, formatMonoDate, formatDate, heroCountdown, toISO, kildeNavn, kildeIkon } from '../utils.js';
import { totalSparet, totalAktivitetsPris, planFor, hasOpsparing, findLinkedActivity } from '../selectors.js';
import { KILDE_INFO } from '../constants.js';
import { openAdventureModal } from '../modals/adventure.js';
import { openActivityModal } from '../modals/activity.js';

export function renderOversigtTab(a) {
  const sparet    = totalSparet(a.id);
  const målBeløb  = Number(a.målBeløb) || 0;
  const mangler   = målBeløb - sparet;
  const overskud  = -mangler;
  const pct       = målBeløb > 0 ? Math.min(100, (sparet / målBeløb) * 100) : 0;
  const aktPris   = totalAktivitetsPris(a.id);
  const plan      = planFor(a.id);

  // Nedtælling section
  let countdownHtml;
  if (!a.startdato) {
    countdownHtml = `
      <div class="countdown-card">
        <p class="paper-eyebrow">${t('countdownLabel')}</p>
        <button class="placeholder-tap" data-action="edit-dates">${t('setDate')}</button>
      </div>
    `;
  } else {
    const cd = heroCountdown(a.startdato);
    countdownHtml = `
      <div class="countdown-card">
        <p class="paper-eyebrow">${t('countdownLabel')}</p>
        <div class="countdown-big">
          <span class="countdown-big-num">${cd.num}</span>
          <span class="countdown-big-unit">${cd.unit}</span>
        </div>
        <div class="countdown-dates-row">
          <div>
            <span class="label">${t('startLabel')}</span>
            <span class="val">${formatMonoDate(a.startdato)} ${new Date(a.startdato + "T00:00:00").getFullYear()}</span>
          </div>
          ${a.slutdato ? `
            <div>
              <span class="label">${t('endLabel')}</span>
              <span class="val">${formatMonoDate(a.slutdato)} ${new Date(a.slutdato + "T00:00:00").getFullYear()}</span>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }

  // Opsparing section
  let opsparingHtml;
  if (!hasOpsparing(a)) {
    opsparingHtml = målBeløb > 0 ? `
      <div class="paper">
        <p class="paper-eyebrow">${t('priceLabel')}</p>
        <p class="stat-big">${formatKr(målBeløb)}</p>
      </div>
    ` : "";
  } else if (!målBeløb) {
    const forslagsTekst = aktPris > 0
      ? t('setAmountSuggest', formatKr(aktPris))
      : t('setAmount');
    opsparingHtml = `
      <div class="paper">
        <p class="paper-eyebrow">${t('opsparingLabel')}</p>
        <button class="placeholder-tap" data-action="edit-mål">${forslagsTekst}</button>
      </div>
    `;
  } else {
    let prognose = "";
    if (plan && mangler > 0 && plan.planlagtBeløb > 0 && a.startdato) {
      const perDag = plan.frekvens === "uge"
        ? plan.planlagtBeløb / 7
        : plan.planlagtBeløb / 30;
      const dageTilMål = Math.ceil(mangler / perDag);
      const målDato = new Date();
      målDato.setDate(målDato.getDate() + dageTilMål);
      const målDatoISO = toISO(målDato);
      const forRejsen = målDatoISO <= a.startdato;
      prognose = `
        <div class="callout ${forRejsen ? "good" : "warn"}">
          <span class="callout-icon">${forRejsen ? "✓" : "⚠"}</span>
          <div>
            ${forRejsen ? t('prognoseGood', formatDate(målDatoISO)) : t('prognoseWarn', formatDate(målDatoISO))}
          </div>
        </div>
      `;
    }

    opsparingHtml = `
      <div class="paper">
        <p class="paper-eyebrow">${t('opsparingLabel')}</p>
        <div class="stat-row">
          <div>
            <p class="stat-big">${formatKr(sparet)}</p>
            <p class="stat-label">${t('saved')}</p>
          </div>
          <div>
            <p class="stat-big ${mangler > 0 ? 'rust' : 'sage'}">
              ${mangler > 0 ? formatKr(mangler) : formatKr(overskud)}
            </p>
            <p class="stat-label">${mangler > 0 ? t('missing') : t('overAmount')}</p>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="progress-meta">
          <span>${Math.round(pct)}%</span>
          <span>${t('settingAside', formatKr(målBeløb))}</span>
        </div>
        ${prognose}
      </div>
    `;
  }

  // Kun for rejser. Hver af fly/hotel/transport vises enten som en
  // afvisningsfri "+ tilføj"-prompt (intet indtastet endnu) eller en
  // udfyldt opsummeringsrække (pris, tryk for at redigere) — begge
  // åbner samme rige detalje-editor som en aktivitet, direkte, uden
  // omvejen om redigér-eventyr-arket. Se adventure.js's [data-detail]
  // for samme mønster i redigeringsarket.
  const flyAct = a.type === "rejse" ? findLinkedActivity(a.id, "fly") : null;
  const hotelAct = a.type === "rejse" ? findLinkedActivity(a.id, "hotel") : null;
  const transportAct = a.type === "rejse" ? findLinkedActivity(a.id, "transport") : null;

  function detailRowHtml(kilde, act) {
    if (!act) {
      return `<button type="button" class="detail-row detail-row-empty" data-detail="${kilde}" style="margin-bottom:8px">+ ${kildeNavn(kilde)}</button>`;
    }
    return `
      <button type="button" class="detail-row" data-detail="${kilde}" style="margin-bottom:8px">
        <span>${icon(kildeIkon(kilde))} ${kildeNavn(kilde)}</span>
        <span class="detail-row-price">${formatKr(act.pris)}</span>
      </button>
    `;
  }

  const tripDetailsHtml = a.type === "rejse" ? `
    <div class="paper">
      <p class="paper-eyebrow">${t('tripDetailsPrompt')}</p>
      ${detailRowHtml("fly", flyAct)}
      ${detailRowHtml("hotel", hotelAct)}
      ${detailRowHtml("transport", transportAct)}
    </div>
  ` : "";

  return `
    ${countdownHtml}
    ${opsparingHtml}
    ${tripDetailsHtml}
    ${aktPris > 0 ? `
      <div class="paper">
        <p class="paper-eyebrow">${t('plannedExpenses')}</p>
        ${målBeløb > 0 ? `
          <div class="stat-row">
            <div>
              <p class="stat-big">${formatKr(aktPris)}</p>
              <p class="stat-label">${t('sumOfActivities')}</p>
            </div>
            <div>
              <p class="stat-big ${aktPris > målBeløb ? 'rust' : 'sage'}">
                ${aktPris > målBeløb ? "+" + formatKr(aktPris - målBeløb) : formatKr(målBeløb - aktPris)}
              </p>
              <p class="stat-label">${aktPris > målBeløb ? t('overAmount') : t('leftOfAmount')}</p>
            </div>
          </div>
        ` : `
          <p class="stat-big">${formatKr(aktPris)}</p>
          <p class="stat-label">${t('sumOfActivities')}</p>
        `}
      </div>
    ` : ""}
  `;
}

export function wireOversigt(a) {
  document.querySelector('[data-action="edit-dates"]')?.addEventListener("click", () => openAdventureModal(a));
  document.querySelector('[data-action="edit-mål"]')?.addEventListener("click", () => openAdventureModal(a));

  document.querySelectorAll("[data-detail]").forEach(el => {
    el.addEventListener("click", () => {
      const kilde = el.dataset.detail;
      const act = findLinkedActivity(a.id, kilde);
      openActivityModal(a, act, act ? null : { kilde, kategori: KILDE_INFO[kilde].kategori });
    });
  });
}
