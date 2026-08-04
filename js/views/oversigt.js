// ---------- Oversigt-fane ----------
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { formatKr, formatMonoDate, formatDate, heroCountdown, toISO, todayISO, daysBetween, kildeNavn, kildeIkon } from '../utils.js';
import { totalSparet, totalAktivitetsPris, totalFaktiskForbrug, planFor, hasOpsparing, findLinkedActivity, activitiesFor } from '../selectors.js';
import { KILDE_INFO } from '../constants.js';
import { state, saveData, touch } from '../data.js';
import { toast } from '../toast.js';
import { render } from '../router.js';
import { openAdventureModal } from '../modals/adventure.js';
import { openActivityModal } from '../modals/activity.js';

export function renderOversigtTab(a) {
  const sparet    = totalSparet(a.id);
  const målBeløb  = Number(a.målBeløb) || 0;
  const mangler   = målBeløb - sparet;
  const overskud  = -mangler;
  const pct       = målBeløb > 0 ? Math.min(100, (sparet / målBeløb) * 100) : 0;
  const aktPris   = totalAktivitetsPris(a.id);
  const faktiskTotal = totalFaktiskForbrug(a.id);
  const hasFaktisk = activitiesFor(a.id).some(x => x.faktiskPris != null);
  const plan      = planFor(a.id);

  // Kun for afsluttede rejser — en kort opsummering i stedet for kun en
  // (nu tilbageskuende) nedtælling. "antal aktiviteter" tæller som
  // Program-fanen: uden fly/hotel/transport, som er rejse-detaljer, ikke
  // rigtige aktiviteter (se detailRowHtml længere nede).
  let memorySummaryHtml = "";
  if (a.afsluttet && a.startdato) {
    const tripDays = daysBetween(a.startdato, a.slutdato || a.startdato) + 1;
    const activityCount = activitiesFor(a.id).filter(x => !x.kilde).length;
    memorySummaryHtml = `
      <div class="paper">
        <p class="paper-eyebrow">${t('memorySummaryLabel')}</p>
        <div class="memory-stats-grid">
          <div><p class="stat-big">${tripDays}</p><p class="stat-label">${t('tripDaysLabel')}</p></div>
          <div><p class="stat-big">${formatKr(sparet)}</p><p class="stat-label">${t('savedTotal')}</p></div>
          <div><p class="stat-big">${formatKr(aktPris)}</p><p class="stat-label">${t('spentTotal')}</p></div>
          <div><p class="stat-big">${activityCount}</p><p class="stat-label">${t('activityCountLabel')}</p></div>
        </div>
      </div>
    `;
  }

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

    // Foreslår selv et beløb, i stedet for at kræve at brugeren regner det
    // ud og opretter spareplanen manuelt, før prognosen ovenfor overhovedet
    // kan vise sig. "hver" antager to personer — appen er bygget til par,
    // og der findes endnu intet pålideligt tal for hvor mange der reelt er
    // med på eventyret (adventure_members kræver et netværkskald og siger
    // intet før partneren har accepteret en invitation).
    let planSuggestion = "";
    if ((!plan || !plan.planlagtBeløb) && mangler > 0 && a.startdato) {
      const dageTil = daysBetween(todayISO(), a.startdato);
      if (dageTil > 0) {
        const uger = Math.max(1, Math.ceil(dageTil / 7));
        const perUgeTotal = Math.ceil((mangler / uger) / 10) * 10;
        const perUgeHver = Math.ceil((perUgeTotal / 2) / 10) * 10;
        planSuggestion = `
          <div class="callout suggest" data-suggest-per-week="${perUgeTotal}">
            <span class="callout-icon">💡</span>
            <div>
              <p style="margin:0 0 10px">${t('planSuggestText', formatKr(perUgeHver), formatDate(a.startdato))}</p>
              <button type="button" class="btn" data-action="use-suggestion">${t('useSuggestion')}</button>
            </div>
          </div>
        `;
      }
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
        ${planSuggestion}
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
    ${memorySummaryHtml}
    ${countdownHtml}
    ${opsparingHtml}
    ${tripDetailsHtml}
    ${aktPris > 0 ? `
      <div class="paper">
        <p class="paper-eyebrow">${t('plannedExpenses')}</p>
        ${hasFaktisk ? `
          <div class="stat-row">
            <div>
              <p class="stat-big">${formatKr(aktPris)}</p>
              <p class="stat-label">${t('budgetLabel')}</p>
            </div>
            <div>
              <p class="stat-big ${faktiskTotal > aktPris ? 'rust' : 'sage'}">${formatKr(faktiskTotal)}</p>
              <p class="stat-label">${t('spentTotal')}</p>
            </div>
          </div>
        ` : målBeløb > 0 ? `
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

  document.querySelector('[data-action="use-suggestion"]')?.addEventListener("click", (e) => {
    const perUgeTotal = Number(e.currentTarget.closest("[data-suggest-per-week]")?.dataset.suggestPerWeek);
    if (!perUgeTotal) return;
    state.plans[a.id] = { planlagtBeløb: perUgeTotal, frekvens: "uge" };
    // Spareplanen foldes ind i eventyr-rækken ved sync — se opsparing.js's
    // save-plan-handler, samme touch()-behov gælder her.
    const idx = state.adventures.findIndex(x => x.id === a.id);
    if (idx >= 0) touch(state.adventures[idx]);
    saveData();
    toast(t('planSaved'));
    render();
  });
}
