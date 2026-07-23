// ---------- Login-gate ----------
// Blokerer ALT andet i appen, indtil enheden enten er logget ind, eller
// har været det før (se hasLoggedInBefore, sat af sync.js). Vises af
// router.js's render() i stedet for den ønskede rute, for alle ruter
// undtagen /join — se den kommentar i router.js for hvorfor.
//
// E-mail + adgangskode, ikke en tilsendt kode — kræver ingen udgående
// mail, så login virker uafhængigt af om projektets e-mail-udbyder er
// sat op eller ramt af en rate-limit.
import { t } from '../i18n.js';
import { state } from '../data.js';
import { render } from '../router.js';
import { toast } from '../toast.js';
import { signInWithPassword, signUpWithPassword } from '../sync.js';

export function isLoggedIn() {
  return !!state.hasLoggedInBefore;
}

export function renderLogin() {
  return `
    <div class="hero-empty">
      <p class="eyebrow" style="color:var(--ink-soft)">${t('appName')}</p>
      <h2>${t('loginGateTitle')}</h2>
      <p style="margin:0 0 20px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('loginGateIntro')}</p>
      <div class="field" style="margin-bottom:10px">
        <input type="email" id="gate-email-input" placeholder="${t('emailPlaceholder')}" />
      </div>
      <div class="field" style="margin-bottom:10px">
        <input type="password" id="gate-password-input" autocomplete="current-password" placeholder="${t('passwordPlaceholder')}" />
      </div>
      <button class="btn btn-rust btn-block" data-action="gate-signin">${t('signInBtn')}</button>
      <button class="btn btn-block" data-action="gate-signup" style="margin-top:6px">${t('signUpBtn')}</button>
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
    if (state.adventures.length > 0 && !confirm(t('loginReplaceConfirm'))) return;
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
    if (state.adventures.length > 0 && !confirm(t('loginReplaceConfirm'))) return;
    try {
      await signUpWithPassword(creds.email, creds.password);
      toast(t('signedIn', creds.email));
      render();
    } catch (err) {
      console.error("signUpWithPassword failed:", err);
      alert(err?.message || t('authFailedGeneric'));
    }
  });
}
