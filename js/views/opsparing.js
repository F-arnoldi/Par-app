// ---------- Opsparing-fane ----------
import { t } from '../i18n.js';
import { formatKr, formatMonoDate, todayISO, showFieldError } from '../utils.js';
import { icon } from '../icons.js';
import { esc } from '../utils.js';
import { savingsFor, totalSparet, planFor } from '../selectors.js';
import { state, saveData, uid, touch, tombstone, restore } from '../data.js';
import { toast } from '../toast.js';
import { render } from '../router.js';

export function renderOpsparingTab(a) {
  const sp = savingsFor(a.id);
  const total = totalSparet(a.id);
  const plan = planFor(a.id);

  return `
    <div class="paper">
      <p class="paper-eyebrow">${t('logPayment')}</p>
      <div class="field">
        <label for="save-amount">${t('amount')}</label>
        <input type="number" id="save-amount" placeholder="0" inputmode="numeric" />
      </div>
      <div class="quick-amounts">
        ${[100, 250, 500].map(v => `<button type="button" class="quick-amount-btn" data-amt="${v}">+${v}</button>`).join("")}
        ${plan?.planlagtBeløb ? `<button type="button" class="quick-amount-btn" data-amt="${plan.planlagtBeløb}">${formatKr(plan.planlagtBeløb)}</button>` : ""}
      </div>
      <div class="field">
        <label for="save-date">${t('date')}</label>
        <input type="date" id="save-date" value="${todayISO()}" />
      </div>
      <div class="field">
        <label for="save-note">${t('noteOptional')}</label>
        <input type="text" id="save-note" placeholder="${t('notePlaceholder')}" />
      </div>
      <button class="btn btn-rust btn-block" data-action="log-saving">${t('logPaymentBtn')}</button>
    </div>

    <div class="paper">
      <p class="paper-eyebrow">${t('savingsPlan')}</p>
      <div class="field-row">
        <div class="field" style="margin-bottom:0">
          <label for="plan-amount">${t('amount')}</label>
          <input type="number" id="plan-amount" value="${plan?.planlagtBeløb || ""}" placeholder="0" inputmode="numeric" />
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="plan-freq">${t('frequency')}</label>
          <select id="plan-freq">
            <option value="uge" ${plan?.frekvens === "uge" ? "selected" : ""}>${t('perWeek')}</option>
            <option value="måned" ${(!plan || plan?.frekvens === "måned") ? "selected" : ""}>${t('perMonth')}</option>
          </select>
        </div>
      </div>
      <div style="height:14px"></div>
      <button class="btn btn-block" data-action="save-plan">${t('saveSavingsPlan')}</button>
    </div>

    <div class="total-row">
      <span class="total-row-label">${t('savedTotal')}</span>
      <span class="total-row-val">${formatKr(total)}</span>
    </div>

    <div style="padding: 4px 0">
      <p class="paper-eyebrow" style="margin-top:14px">${t('history')}</p>
      ${sp.length === 0 ? `
        <p style="color:var(--ink-soft);font-size:14px;margin:0">${t('noPaymentsYet')}</p>
      ` : `
        <div class="item-list">
          ${sp.map(s => `
            <div class="item">
              <div class="item-icon">${icon("coin")}</div>
              <div class="item-body">
                <p class="item-title">${formatKr(s.beløb)}</p>
                <p class="item-meta">${formatMonoDate(s.dato)}${s.notat ? " · " + esc(s.notat) : ""}</p>
              </div>
              <div class="item-actions">
                <button class="icon-btn" data-del-saving="${s.id}" title="${t('delete')}">✕</button>
              </div>
            </div>
          `).join("")}
        </div>
      `}
    </div>
  `;
}

// 25/50/75/100% — fejrer kun den TÆRSKEL en given indbetaling faktisk
// krydser (før% < tærskel <= efter%), aldrig på almindelig gen-rendering,
// så festen kun sker i selve øjeblikket målet rykker sig.
const MILESTONES = [25, 50, 75, 100];
function crossedMilestone(mål, before, after) {
  if (mål <= 0) return null;
  const beforePct = (before / mål) * 100;
  const afterPct = (after / mål) * 100;
  const crossed = MILESTONES.filter(m => beforePct < m && afterPct >= m);
  return crossed.length > 0 ? crossed[crossed.length - 1] : null;
}

export function wireOpsparing(a) {
  document.querySelectorAll("[data-amt]").forEach(el => {
    el.addEventListener("click", () => {
      const amountEl = document.getElementById("save-amount");
      amountEl.value = el.dataset.amt;
      showFieldError(amountEl, null);
    });
  });

  document.querySelector('[data-action="log-saving"]')?.addEventListener("click", () => {
    const amountEl = document.getElementById("save-amount");
    const dateEl = document.getElementById("save-date");
    const amt = Number(amountEl.value);
    const dato = dateEl.value;
    const notat = document.getElementById("save-note").value.trim();
    showFieldError(amountEl, null);
    if (!amt || amt <= 0) { showFieldError(amountEl, t('amountValidation')); return; }
    showFieldError(dateEl, null);
    if (!dato) { showFieldError(dateEl, t('dateValidation')); return; }
    const before = totalSparet(a.id);
    state.savings.push(touch({ id: uid(), adventureId: a.id, beløb: amt, dato, notat }));
    saveData();
    const milestone = crossedMilestone(Number(a.målBeløb) || 0, before, before + amt);
    toast(milestone ? t('milestoneToast', milestone, a.navn) : t('paymentLogged'));
    render();
  });

  document.querySelector('[data-action="save-plan"]')?.addEventListener("click", () => {
    const planAmountEl = document.getElementById("plan-amount");
    const amt = Number(planAmountEl.value);
    const freq = document.getElementById("plan-freq").value;
    showFieldError(planAmountEl, null);
    if (!amt || amt <= 0) { showFieldError(planAmountEl, t('amountValidation')); return; }
    state.plans[a.id] = { planlagtBeløb: amt, frekvens: freq };
    // Spareplanen foldes ind i eventyr-rækken ved sync (planlagt_beloeb/
    // frekvens-kolonner), så det er forældre-eventyret der skal touch()'es
    // — planen har intet eget dirty-signal at synkronisere på ellers.
    const idx = state.adventures.findIndex(x => x.id === a.id);
    if (idx >= 0) touch(state.adventures[idx]);
    saveData();
    toast(t('planSaved'));
    render();
  });

  document.querySelectorAll("[data-del-saving]").forEach(el => {
    el.addEventListener("click", () => {
      // Sletter med det samme og tilbyder fortryd via en toast, i stedet
      // for at spørge først med en systemdialog.
      const s = state.savings.find(x => x.id === el.dataset.delSaving);
      if (!s) return;
      tombstone(s);
      saveData();
      render();
      toast(t('paymentDeleted'), {
        actionLabel: t('undo'),
        persistent: true,
        onAction: () => {
          restore(s);
          saveData();
          render();
        },
      });
    });
  });
}
