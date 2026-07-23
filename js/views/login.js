// ---------- Login-gate ----------
// Blokerer ALT andet i appen, indtil enheden enten er logget ind, eller
// har været det før (se hasLoggedInBefore, sat af sync.js). Vises af
// router.js's render() i stedet for den ønskede rute, for alle ruter
// undtagen /join — se den kommentar i router.js for hvorfor.
//
// E-mail + adgangskode, ikke en tilsendt kode — kræver ingen udgående
// mail for selve login/signup, så det virker uafhængigt af projektets
// e-mail-udbyder. "Glemt adgangskode" er eneste undtagelse — den kræver
// naturligt en mail, men rammes langt sjældnere end almindeligt login.
import { t } from '../i18n.js';
import { state } from '../data.js';
import { render } from '../router.js';
import { toast } from '../toast.js';
import {
  signInWithPassword, signUpWithPassword,
  requestPasswordReset, confirmPasswordReset,
} from '../sync.js';

export function isLoggedIn() {
  return !!state.hasLoggedInBefore;
}

let mode = "login"; // login | reset-request | reset-code
let resetEmail = "";

function confirmReplaceIfNeeded() {
  return state.adventures.length === 0 || confirm(t('loginReplaceConfirm'));
}

export function renderLogin() {
  const body = mode === "reset-request" ? `
    <p style="margin:0 0 20px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('resetGateIntro')}</p>
    <div class="field" style="margin-bottom:10px">
      <input type="email" id="reset-email-input" placeholder="${t('emailPlaceholder')}" value="${resetEmail}" />
    </div>
    <button class="btn btn-rust btn-block" data-action="reset-send">${t('sendResetCode')}</button>
    <button class="btn-ghost" data-action="reset-cancel" style="width:100%;margin-top:6px">${t('cancel')}</button>
  ` : mode === "reset-code" ? `
    <p style="margin:0 0 20px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('resetCodeSentTo', resetEmail)}</p>
    <div class="field" style="margin-bottom:10px">
      <input type="text" inputmode="numeric" autocomplete="one-time-code" id="reset-code-input" placeholder="${t('resetCodePlaceholder')}" />
    </div>
    <div class="field" style="margin-bottom:10px">
      <input type="password" id="reset-newpassword-input" autocomplete="new-password" placeholder="${t('newPasswordPlaceholder')}" />
    </div>
    <button class="btn btn-rust btn-block" data-action="reset-confirm">${t('confirmResetBtn')}</button>
    <button class="btn-ghost" data-action="reset-cancel" style="width:100%;margin-top:6px">${t('cancel')}</button>
  ` : `
    <p style="margin:0 0 20px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('loginGateIntro')}</p>
    <div class="field" style="margin-bottom:10px">
      <input type="email" id="gate-email-input" placeholder="${t('emailPlaceholder')}" />
    </div>
    <div class="field" style="margin-bottom:10px">
      <input type="password" id="gate-password-input" autocomplete="current-password" placeholder="${t('passwordPlaceholder')}" />
    </div>
    <div class="field" style="margin-bottom:10px">
      <input type="text" id="gate-name-input" placeholder="${t('yourNamePlaceholder')}" />
    </div>
    <button class="btn btn-rust btn-block" data-action="gate-signin">${t('signInBtn')}</button>
    <button class="btn btn-block" data-action="gate-signup" style="margin-top:6px">${t('signUpBtn')}</button>
    <button class="btn-ghost" data-action="gate-forgot" style="width:100%;margin-top:6px">${t('forgotPasswordLink')}</button>
  `;

  return `
    <div class="hero-empty">
      <p class="eyebrow" style="color:var(--ink-soft)">${t('appName')}</p>
      <h2>${t('loginGateTitle')}</h2>
      ${body}
    </div>
  `;
}

function readCredentials() {
  const email = document.getElementById("gate-email-input").value.trim();
  const password = document.getElementById("gate-password-input").value;
  if (!email) { alert(t('emailRequired')); return null; }
  if (!password) { alert(t('passwordRequired')); return null; }
  return { email, password };
}

export function wireLogin() {
  document.querySelector('[data-action="gate-signin"]')?.addEventListener("click", async () => {
    const creds = readCredentials();
    if (!creds) return;
    if (!confirmReplaceIfNeeded()) return;
    try {
      await signInWithPassword(creds.email, creds.password);
      toast(t('signedIn', creds.email));
      render();
    } catch (err) {
      console.error("signInWithPassword failed:", err);
      alert(err?.message || t('authFailedGeneric'));
    }
  });

  document.querySelector('[data-action="gate-signup"]')?.addEventListener("click", async () => {
    const creds = readCredentials();
    if (!creds) return;
    const name = document.getElementById("gate-name-input").value.trim();
    if (!name) { alert(t('nameRequired')); return; }
    if (!confirmReplaceIfNeeded()) return;
    try {
      await signUpWithPassword(creds.email, creds.password, name);
      toast(t('signedIn', creds.email));
      render();
    } catch (err) {
      console.error("signUpWithPassword failed:", err);
      alert(err?.message || t('authFailedGeneric'));
    }
  });

  document.querySelector('[data-action="gate-forgot"]')?.addEventListener("click", () => {
    resetEmail = document.getElementById("gate-email-input").value.trim();
    mode = "reset-request";
    render();
  });

  document.querySelector('[data-action="reset-send"]')?.addEventListener("click", async () => {
    const email = document.getElementById("reset-email-input").value.trim();
    if (!email) { alert(t('emailRequired')); return; }
    try {
      await requestPasswordReset(email);
      resetEmail = email;
      mode = "reset-code";
      render();
    } catch (err) {
      console.error("requestPasswordReset failed:", err);
      alert(err?.message || t('authFailedGeneric'));
    }
  });

  document.querySelector('[data-action="reset-confirm"]')?.addEventListener("click", async () => {
    const code = document.getElementById("reset-code-input").value.trim();
    const newPassword = document.getElementById("reset-newpassword-input").value;
    if (!code) { alert(t('resetCodeRequired')); return; }
    if (!newPassword) { alert(t('newPasswordRequired')); return; }
    if (!confirmReplaceIfNeeded()) return;
    try {
      const email = resetEmail;
      await confirmPasswordReset(email, code, newPassword);
      mode = "login";
      resetEmail = "";
      toast(t('signedIn', email));
      render();
    } catch (err) {
      console.error("confirmPasswordReset failed:", err);
      alert(err?.message || t('authFailedGeneric'));
    }
  });

  document.querySelector('[data-action="reset-cancel"]')?.addEventListener("click", () => {
    mode = "login";
    resetEmail = "";
    render();
  });
}
