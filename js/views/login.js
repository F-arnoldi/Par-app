// ---------- Login-gate ----------
// Blokerer ALT andet i appen, indtil enheden enten er logget ind, eller
// har været det før (se hasLoggedInBefore, sat af sync.js). Vises af
// router.js's render() i stedet for den ønskede rute, for alle ruter
// undtagen /join — se den kommentar i router.js for hvorfor.
import { t } from '../i18n.js';
import { state } from '../data.js';
import { render } from '../router.js';
import { toast } from '../toast.js';
import { sendLoginCode, confirmLogin } from '../sync.js';

export function isLoggedIn() {
  return !!state.hasLoggedInBefore;
}

let step = "idle"; // idle | code
let stepEmail = "";

export function renderLogin() {
  return `
    <div class="hero-empty">
      <p class="eyebrow" style="color:var(--ink-soft)">${t('appName')}</p>
      <h2>${t('loginGateTitle')}</h2>
      <p style="margin:0 0 20px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('loginGateIntro')}</p>
      ${step === "code" ? `
        <p style="margin:0 0 12px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('codeSentTo', stepEmail)}</p>
        <div class="field" style="margin-bottom:10px">
          <input type="text" inputmode="numeric" autocomplete="one-time-code" id="gate-code-input" placeholder="${t('codePlaceholder')}" />
        </div>
        <button class="btn btn-rust btn-block" data-action="gate-confirm">${t('confirmLoginBtn')}</button>
        <button class="btn-ghost" data-action="gate-cancel" style="width:100%;margin-top:6px">${t('cancel')}</button>
      ` : `
        <div class="field" style="margin-bottom:10px">
          <input type="email" id="gate-email-input" placeholder="${t('emailPlaceholder')}" />
        </div>
        <button class="btn btn-rust btn-block" data-action="gate-send">${t('sendLoginCode')}</button>
      `}
    </div>
  `;
}

export function wireLogin() {
  document.querySelector('[data-action="gate-send"]')?.addEventListener("click", async () => {
    const input = document.getElementById("gate-email-input");
    const email = input.value.trim();
    if (!email) { alert(t('emailRequired')); return; }
    try {
      await sendLoginCode(email);
      step = "code";
      stepEmail = email;
      render();
    } catch (err) {
      console.error("sendLoginCode failed:", err);
      alert(t('emailLinkFailed'));
    }
  });

  document.querySelector('[data-action="gate-confirm"]')?.addEventListener("click", async () => {
    const input = document.getElementById("gate-code-input");
    const code = input.value.trim();
    if (!code) { alert(t('codeRequired')); return; }
    if (state.adventures.length > 0 && !confirm(t('loginReplaceConfirm'))) return;
    try {
      const email = stepEmail;
      await confirmLogin(email, code);
      step = "idle";
      stepEmail = "";
      toast(t('signedIn', email));
      render();
    } catch (err) {
      console.error("confirmLogin failed:", err);
      alert(t('codeInvalid'));
    }
  });

  document.querySelector('[data-action="gate-cancel"]')?.addEventListener("click", () => {
    step = "idle";
    stepEmail = "";
    render();
  });
}
