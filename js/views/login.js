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
import { esc } from '../utils.js';
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

let mode = "login"; // login | signup | reset-request | reset-code
let submitting = false;
let errors = {};

// Ét fælles felt-object for alle trin — kun det relevante udsnit læses/
// vises pr. tilstand. Holder værdier i live, så et skift af tilstand
// (fx "Glemt adgangskode?") eller en re-render for at vise en fejl ikke
// mister det, brugeren allerede har skrevet.
let fields = { name: "", email: "", password: "", code: "", newPassword: "" };

const FIELD_IDS = {
  name: "gate-name-input",
  email: "gate-email-input",
  password: "gate-password-input",
  code: "gate-code-input",
  newPassword: "gate-newpassword-input",
};

function syncFieldsFromDom() {
  for (const [key, id] of Object.entries(FIELD_IDS)) {
    const el = document.getElementById(id);
    if (el) fields[key] = el.value;
  }
}

function confirmReplaceIfNeeded() {
  return state.adventures.length === 0 || confirm(t('loginReplaceConfirm'));
}

function fieldHtml(key, { type = "text", placeholder, autocomplete }) {
  const err = errors[key];
  const attrs = autocomplete ? ` autocomplete="${autocomplete}"` : "";
  return `
    <div class="field" style="margin-bottom:${err ? "4px" : "8px"}">
      <input type="${type}" id="${FIELD_IDS[key]}"${attrs} placeholder="${placeholder}" value="${esc(fields[key])}" />
    </div>
    ${err ? `<p style="margin:0 0 8px;font-size:12px;color:var(--rust)">${esc(err)}</p>` : ""}
  `;
}

function quietLink(action, label) {
  return `<button type="button" data-action="${action}" style="display:block;width:100%;text-align:center;background:none;border:none;padding:0;margin-top:12px;font:inherit;font-size:14px;color:var(--ink-soft);cursor:pointer">${label}</button>`;
}

function hairline() {
  return `<div style="border-top:1px solid var(--rule);margin:20px 0"></div>`;
}

function primaryButton(action, label) {
  return `<button class="btn btn-rust btn-block" data-action="${action}"${submitting ? " disabled style=\"opacity:0.7\"" : ""}>${label}</button>`;
}

function renderLoginMode() {
  return `
    <p style="margin:0 0 20px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('loginBodyText')}</p>
    ${fieldHtml('email', { type: "email", placeholder: t('emailPlaceholder') })}
    ${fieldHtml('password', { type: "password", placeholder: t('passwordPlaceholder'), autocomplete: "current-password" })}
    ${errors.form ? `<p style="margin:0 0 8px;font-size:12px;color:var(--rust)">${esc(errors.form)}</p>` : ""}
    ${primaryButton('gate-signin', submitting ? t('signInBtnLoading') : t('signInBtn'))}
    ${quietLink('gate-forgot', t('forgotPasswordLink'))}
    ${hairline()}
    <p style="margin:0;text-align:center;font-size:14px;color:var(--ink-soft)">
      ${t('newHereText')} <button type="button" data-action="switch-signup" style="background:none;border:none;padding:0;font:inherit;color:var(--rust);cursor:pointer">${t('signUpBtn')}</button>
    </p>
  `;
}

function renderSignupMode() {
  return `
    <p style="margin:0 0 20px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('signupBodyText')}</p>
    ${fieldHtml('name', { type: "text", placeholder: t('yourNamePlaceholder') })}
    ${fieldHtml('email', { type: "email", placeholder: t('emailPlaceholder') })}
    ${fieldHtml('password', { type: "password", placeholder: t('passwordPlaceholder'), autocomplete: "new-password" })}
    ${errors.password ? "" : `<p style="margin:-4px 0 8px;font-size:12px;color:var(--ink-faint)">${t('minPasswordHint')}</p>`}
    ${errors.form ? `<p style="margin:0 0 8px;font-size:12px;color:var(--rust)">${esc(errors.form)}</p>` : ""}
    ${primaryButton('gate-signup', submitting ? t('signUpBtnLoading') : t('signUpBtn'))}
    ${hairline()}
    <p style="margin:0;text-align:center;font-size:14px;color:var(--ink-soft)">
      ${t('alreadyHaveAccountText')} <button type="button" data-action="switch-login" style="background:none;border:none;padding:0;font:inherit;color:var(--rust);cursor:pointer">${t('signInBtn')}</button>
    </p>
  `;
}

function renderResetRequestMode() {
  return `
    <p style="margin:0 0 20px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('resetGateIntro')}</p>
    ${fieldHtml('email', { type: "email", placeholder: t('emailPlaceholder') })}
    ${errors.form ? `<p style="margin:0 0 8px;font-size:12px;color:var(--rust)">${esc(errors.form)}</p>` : ""}
    ${primaryButton('reset-send', submitting ? t('sendResetCodeLoading') : t('sendResetCode'))}
    ${quietLink('reset-cancel', t('backToLoginLink'))}
  `;
}

function renderResetCodeMode() {
  return `
    <p style="margin:0 0 20px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('resetCodeSentTo', fields.email)}</p>
    ${fieldHtml('code', { type: "text", placeholder: t('resetCodePlaceholder'), autocomplete: "one-time-code" })}
    ${fieldHtml('newPassword', { type: "password", placeholder: t('newPasswordPlaceholder'), autocomplete: "new-password" })}
    ${errors.newPassword ? "" : `<p style="margin:-4px 0 8px;font-size:12px;color:var(--ink-faint)">${t('minPasswordHint')}</p>`}
    ${errors.form ? `<p style="margin:0 0 8px;font-size:12px;color:var(--rust)">${esc(errors.form)}</p>` : ""}
    ${primaryButton('reset-confirm', submitting ? t('confirmResetBtnLoading') : t('confirmResetBtn'))}
    ${quietLink('reset-cancel', t('backToLoginLink'))}
  `;
}

const TITLES = {
  login: 'welcomeBackTitle',
  signup: 'getStartedTitle',
  'reset-request': 'resetTitle',
  'reset-code': 'resetCodeTitle',
};

const BODIES = {
  login: renderLoginMode,
  signup: renderSignupMode,
  'reset-request': renderResetRequestMode,
  'reset-code': renderResetCodeMode,
};

export function renderLogin() {
  return `
    <div class="hero-empty">
      <p class="eyebrow" style="color:var(--ink-soft)">${t('appName')}</p>
      <h2>${t(TITLES[mode])}</h2>
      ${BODIES[mode]()}
    </div>
  `;
}

function goTo(nextMode) {
  syncFieldsFromDom();
  errors = {};
  mode = nextMode;
  render();
}

export function wireLogin() {
  document.querySelector('[data-action="switch-signup"]')?.addEventListener("click", () => goTo("signup"));
  document.querySelector('[data-action="switch-login"]')?.addEventListener("click", () => goTo("login"));
  document.querySelector('[data-action="gate-forgot"]')?.addEventListener("click", () => goTo("reset-request"));
  document.querySelector('[data-action="reset-cancel"]')?.addEventListener("click", () => goTo("login"));

  document.querySelector('[data-action="gate-signin"]')?.addEventListener("click", async () => {
    syncFieldsFromDom();
    errors = {};
    if (!fields.email.trim()) errors.email = t('emailRequired');
    if (!fields.password) errors.password = t('passwordRequired');
    if (Object.keys(errors).length > 0) { render(); return; }
    if (!confirmReplaceIfNeeded()) return;

    const email = fields.email.trim();
    submitting = true;
    render();
    try {
      await signInWithPassword(email, fields.password);
      toast(t('signedIn', email));
      render();
    } catch (err) {
      console.error("signInWithPassword failed:", err);
      submitting = false;
      errors = { form: err?.message || t('authFailedGeneric') };
      render();
    }
  });

  document.querySelector('[data-action="gate-signup"]')?.addEventListener("click", async () => {
    syncFieldsFromDom();
    errors = {};
    if (!fields.name.trim()) errors.name = t('nameRequired');
    if (!fields.email.trim()) errors.email = t('emailRequired');
    if (!fields.password) errors.password = t('passwordRequired');
    else if (fields.password.length < 8) errors.password = t('passwordTooShort');
    if (Object.keys(errors).length > 0) { render(); return; }
    if (!confirmReplaceIfNeeded()) return;

    const email = fields.email.trim();
    const name = fields.name.trim();
    submitting = true;
    render();
    try {
      await signUpWithPassword(email, fields.password, name);
      toast(t('signedIn', email));
      render();
    } catch (err) {
      console.error("signUpWithPassword failed:", err);
      submitting = false;
      errors = { form: err?.message || t('authFailedGeneric') };
      render();
    }
  });

  document.querySelector('[data-action="reset-send"]')?.addEventListener("click", async () => {
    syncFieldsFromDom();
    errors = {};
    if (!fields.email.trim()) errors.email = t('emailRequired');
    if (Object.keys(errors).length > 0) { render(); return; }

    const email = fields.email.trim();
    submitting = true;
    render();
    try {
      await requestPasswordReset(email);
      submitting = false;
      mode = "reset-code";
      render();
    } catch (err) {
      console.error("requestPasswordReset failed:", err);
      submitting = false;
      errors = { form: err?.message || t('authFailedGeneric') };
      render();
    }
  });

  document.querySelector('[data-action="reset-confirm"]')?.addEventListener("click", async () => {
    syncFieldsFromDom();
    errors = {};
    if (!fields.code.trim()) errors.code = t('resetCodeRequired');
    if (!fields.newPassword) errors.newPassword = t('newPasswordRequired');
    else if (fields.newPassword.length < 8) errors.newPassword = t('passwordTooShort');
    if (Object.keys(errors).length > 0) { render(); return; }
    if (!confirmReplaceIfNeeded()) return;

    const email = fields.email;
    submitting = true;
    render();
    try {
      await confirmPasswordReset(email, fields.code.trim(), fields.newPassword);
      toast(t('signedIn', email));
      render();
    } catch (err) {
      console.error("confirmPasswordReset failed:", err);
      submitting = false;
      errors = { form: err?.message || t('authFailedGeneric') };
      render();
    }
  });
}
