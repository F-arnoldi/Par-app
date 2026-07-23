// ---------- Opsparing-fane ----------
import { t } from '../i18n.js';
import { formatKr, formatMonoDate, todayISO } from '../utils.js';
import { icon } from '../icons.js';
import { esc } from '../utils.js';
import { savingsFor, totalSparet, planFor } from '../selectors.js';
import { state, saveData, uid, touch, tombstone } from '../data.js';
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

export function wireOpsparing(a) {
  document.querySelector('[data-action="log-saving"]')?.addEventListener("click", () => {
    const amt = Number(document.getElementById("save-amount").value);
    const dato = document.getElementById("save-date").value;
    const notat = document.getElementById("save-note").value.trim();
    if (!amt || amt <= 0) { alert(t('amountValidation')); return; }
    if (!dato) { alert(t('dateValidation')); return; }
    state.savings.push(touch({ id: uid(), adventureId: a.id, beløb: amt, dato, notat }));
    saveData();
    toast(t('paymentLogged'));
    render();
  });

  document.querySelector('[data-action="save-plan"]')?.addEventListener("click", () => {
    const amt = Number(document.getElementById("plan-amount").value);
    const freq = document.getElementById("plan-freq").value;
    if (!amt || amt <= 0) { alert(t('amountValidation')); return; }
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
      if (confirm(t('confirmDeletePayment'))) {
        const s = state.savings.find(x => x.id === el.dataset.delSaving);
        if (s) tombstone(s);
        saveData();
        render();
      }
    });
  });
}
