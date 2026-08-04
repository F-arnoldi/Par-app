// ---------- Opsparing-fane ----------
import { t } from '../i18n.js';
import { formatKr, formatMonoDate, todayISO, showFieldError } from '../utils.js';
import { icon } from '../icons.js';
import { esc } from '../utils.js';
import { savingsFor, totalSparet, planFor, savingsGroupedByPayer } from '../selectors.js';
import { state, saveData, uid, touch, tombstone, restore } from '../data.js';
import { toast } from '../toast.js';
import { render } from '../router.js';
import { scheduleSavingsReminder, cancelSavingsReminder } from '../notifications.js';

// Navne slås kun op når et eventyr rent faktisk er delt (a.serverId) —
// cachet pr. server-id for sessionens levetid, så et tabskift ikke sender
// samme netværkskald igen. Se wireOpsparing/fillPayerNames for hvordan
// cachen bruges til at eftermontere navne i en allerede tegnet DOM, i
// stedet for at genrendere hele fanen og risikere at nulstille et
// halvudfyldt log-indbetaling-felt.
const payerNamesCache = new Map();

function payerLabel(userId, names, myId) {
  if (userId === null) return t('unknownPayer');
  if (userId === myId) return t('youLabel');
  return names[userId] || t('partnerFallback');
}

function renderPayerSplitHtml(grouped, names, myId) {
  if (grouped.length === 0) return "";
  const total = grouped.reduce((sum, g) => sum + g.total, 0) || 1;
  const colors = ["var(--rust)", "var(--sage)", "var(--ink-soft)"];
  const rows = grouped.map((g, i) => ({ ...g, label: payerLabel(g.userId, names, myId), color: colors[i % colors.length] }));

  let diffHtml = "";
  if (rows.length === 2 && rows[0].total !== rows[1].total) {
    const lower = rows[0].total > rows[1].total ? rows[1] : rows[0];
    const gap = Math.abs(rows[0].total - rows[1].total);
    diffHtml = `<p class="payer-split-diff">${t('payerDiff', esc(lower.label), formatKr(gap))}</p>`;
  }

  return `
    <div class="payer-split">
      <div class="payer-split-bar">
        ${rows.map(r => `<div class="payer-split-seg" style="width:${(r.total / total) * 100}%;background:${r.color}"></div>`).join("")}
      </div>
      <div class="payer-split-legend">
        ${rows.map(r => `<span class="payer-split-legend-item"><i class="payer-split-dot" style="background:${r.color}"></i>${esc(r.label)} ${formatKr(r.total)}</span>`).join("")}
      </div>
      ${diffHtml}
    </div>
  `;
}

export function renderOpsparingTab(a) {
  const sp = savingsFor(a.id);
  const total = totalSparet(a.id);
  const plan = planFor(a.id);
  const grouped = savingsGroupedByPayer(a.id);
  // Kun interessant for et delt (synkroniseret) eventyr — en ren lokal
  // opsparing har ingen user_id-data at fordele på overhovedet.
  const showSplit = !!a.serverId && grouped.length > 0;
  const cached = a.serverId ? payerNamesCache.get(a.serverId) : null;
  const showPayerOnRows = grouped.length > 1;

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
      <label class="toggle-row">
        <input type="checkbox" id="plan-remind" ${plan?.remind ? "checked" : ""}/>
        <span>${t('remindMeLabel')}</span>
      </label>
      <div style="height:14px"></div>
      <button class="btn btn-block" data-action="save-plan">${t('saveSavingsPlan')}</button>
    </div>

    <div class="total-row">
      <span class="total-row-label">${t('savedTotal')}</span>
      <span class="total-row-val">${formatKr(total)}</span>
    </div>

    ${showSplit ? `
      <div id="payer-split-wrap">
        ${renderPayerSplitHtml(grouped, cached?.names || {}, cached?.myId ?? null)}
      </div>
    ` : ""}

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
                <p class="item-meta">
                  ${showPayerOnRows ? `<span class="item-payer" data-payer-id="${s.userId ?? ""}">${cached ? esc(payerLabel(s.userId, cached.names, cached.myId)) + " · " : ""}</span>` : ""}
                  ${formatMonoDate(s.dato)}${s.notat ? " · " + esc(s.notat) : ""}
                </p>
              </div>
              <div class="item-actions">
                <button class="icon-btn" data-del-saving="${s.id}" title="${t('delete')}" aria-label="${t('delete')}">✕</button>
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

// Kort, ikke-blokerende opslag — fanen er allerede tegnet og fuldt
// interaktiv med "Ukendt"/uden navne. Retter kun de specifikke DOM-noder
// (split-sektionen + hver historik-rækkes navnefelt) i stedet for at
// kalde render(), som ellers ville nulstille et halvudfyldt
// log-indbetaling-felt hvis brugeren nåede at skrive i det imens.
function fillPayerNames(a, grouped) {
  if (!a.serverId || grouped.length === 0) return;
  if (payerNamesCache.has(a.serverId)) return;
  import('../sync.js').then(async (sync) => {
    const info = await sync.getPayerNames(a.serverId);
    payerNamesCache.set(a.serverId, info);
    const splitWrap = document.getElementById("payer-split-wrap");
    if (splitWrap) splitWrap.innerHTML = renderPayerSplitHtml(grouped, info.names, info.myId);
    document.querySelectorAll("[data-payer-id]").forEach(el => {
      const userId = el.dataset.payerId || null;
      el.textContent = payerLabel(userId, info.names, info.myId) + " · ";
    });
  }).catch(() => {});
}

export function wireOpsparing(a) {
  fillPayerNames(a, savingsGroupedByPayer(a.id));

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
    const målBeløb = Number(a.målBeløb) || 0;
    const before = totalSparet(a.id);
    const after = before + amt;
    state.savings.push(touch({ id: uid(), adventureId: a.id, beløb: amt, dato, notat }));
    saveData();
    const milestone = crossedMilestone(målBeløb, before, after);
    // Målet nået — ingen grund til at blive ved med at minde om en
    // indbetaling der ikke længere mangler.
    if (milestone === 100) cancelSavingsReminder(a);
    toast(milestone ? t('milestoneToast', milestone, a.navn) : t('paymentLogged'));
    render();
  });

  document.querySelector('[data-action="save-plan"]')?.addEventListener("click", () => {
    const planAmountEl = document.getElementById("plan-amount");
    const amt = Number(planAmountEl.value);
    const freq = document.getElementById("plan-freq").value;
    const remind = document.getElementById("plan-remind").checked;
    showFieldError(planAmountEl, null);
    if (!amt || amt <= 0) { showFieldError(planAmountEl, t('amountValidation')); return; }
    const plan = { planlagtBeløb: amt, frekvens: freq, remind };
    state.plans[a.id] = plan;
    // Spareplanen foldes ind i eventyr-rækken ved sync (planlagt_beloeb/
    // frekvens-kolonner), så det er forældre-eventyret der skal touch()'es
    // — planen har intet eget dirty-signal at synkronisere på ellers.
    // "remind" sendes bevidst ALDRIG med (se toAdventureRow) — det er en
    // ren enheds-lokal indstilling, ikke noget der giver mening at dele.
    const idx = state.adventures.findIndex(x => x.id === a.id);
    if (idx >= 0) touch(state.adventures[idx]);
    saveData();
    if (remind) {
      if (window.Capacitor?.Plugins?.LocalNotifications) {
        scheduleSavingsReminder(a, plan);
      } else {
        toast(t('remindersNotAvailable'));
        render();
        return;
      }
    } else {
      cancelSavingsReminder(a);
    }
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
