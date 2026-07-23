// ---------- Profil ----------
import { t } from '../i18n.js';
import { state, saveData } from '../data.js';
import { navigate, render } from '../router.js';
import { toast } from '../toast.js';
import {
  hasLinkedEmail, myEmail, linkEmail, verifyLinkEmail,
  sendLoginCode, confirmLogin, signOut,
} from '../sync.js';

// Transient UI-state for de to kode-flows — lever kun i denne modul-
// instans (aldrig i localStorage), så et navigationsskift væk og tilbage
// til profilsiden ikke mister et halvvejs indtastet kode-trin.
let linkStep = "idle";  // idle | code
let linkStepEmail = "";
let loginStep = "idle"; // idle | code
let loginStepEmail = "";

function resetFlows() {
  linkStep = "idle";
  linkStepEmail = "";
  loginStep = "idle";
  loginStepEmail = "";
}

export function renderProfile() {
  const otherLangName = state.lang === "da" ? t('langNameEn') : t('langNameDa');

  const emailSectionHtml = hasLinkedEmail ? `
    <p style="margin:0 0 12px;font-size:14px;color:var(--ink-soft)">${t('emailLinkedAs', myEmail)}</p>
    <button class="btn btn-block" data-action="logout">${t('logoutBtn')}</button>
  ` : linkStep === "code" ? `
    <p style="margin:0 0 12px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('codeSentTo', linkStepEmail)}</p>
    <div class="field" style="margin-bottom:10px">
      <input type="text" inputmode="numeric" autocomplete="one-time-code" id="link-code-input" placeholder="${t('codePlaceholder')}" />
    </div>
    <button class="btn btn-rust btn-block" data-action="confirm-link-email">${t('confirmCode')}</button>
    <button class="btn-ghost" data-action="cancel-link-email" style="width:100%;margin-top:6px">${t('cancel')}</button>
  ` : `
    <p style="margin:0 0 12px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('emailPromptText')}</p>
    <div class="field" style="margin-bottom:10px">
      <input type="email" id="profile-email-input" placeholder="${t('emailPlaceholder')}" />
    </div>
    <button class="btn btn-rust btn-block" data-action="link-email">${t('emailPromptLink')}</button>
  `;

  const loginSectionHtml = hasLinkedEmail ? "" : `
    <div class="paper">
      <p class="paper-eyebrow">${t('loginSectionTitle')}</p>
      ${loginStep === "code" ? `
        <p style="margin:0 0 12px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('codeSentTo', loginStepEmail)}</p>
        <div class="field" style="margin-bottom:10px">
          <input type="text" inputmode="numeric" autocomplete="one-time-code" id="login-code-input" placeholder="${t('codePlaceholder')}" />
        </div>
        <button class="btn btn-rust btn-block" data-action="confirm-login">${t('confirmLoginBtn')}</button>
        <button class="btn-ghost" data-action="cancel-login" style="width:100%;margin-top:6px">${t('cancel')}</button>
      ` : `
        <p style="margin:0 0 12px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('loginIntro')}</p>
        <div class="field" style="margin-bottom:10px">
          <input type="email" id="login-email-input" placeholder="${t('emailPlaceholder')}" />
        </div>
        <button class="btn btn-block" data-action="send-login-code">${t('sendLoginCode')}</button>
      `}
    </div>
  `;

  return `
    <div class="detail-top">
      <button class="back-link" data-action="back">‹ ${t('backLabel')}</button>
    </div>
    <div class="detail-hero">
      <h1 class="detail-name">${t('profileTitle')}</h1>
    </div>

    <div class="paper">
      <p class="paper-eyebrow">${t('yourNameLabel')}</p>
      <div class="field" style="margin-bottom:10px">
        <input type="text" id="profile-name-input" value="${state.myDisplayName || ""}" placeholder="${t('yourNamePlaceholder')}" />
      </div>
      <button class="btn btn-rust btn-block" data-action="save-name">${t('save')}</button>
    </div>

    <div class="paper">
      <p class="paper-eyebrow">${t('emailSectionTitle')}</p>
      ${emailSectionHtml}
    </div>

    ${loginSectionHtml}

    <div class="paper">
      <p class="paper-eyebrow">${t('language')}</p>
      <button class="btn btn-block" data-action="toggle-lang">${otherLangName}</button>
    </div>
  `;
}

export function wireProfile() {
  document.querySelector('[data-action="back"]')?.addEventListener("click", () => navigate("/"));

  document.querySelector('[data-action="save-name"]')?.addEventListener("click", async () => {
    const input = document.getElementById("profile-name-input");
    const name = input.value.trim();
    state.myDisplayName = name;
    saveData();
    try {
      const sync = await import('../sync.js');
      await sync.saveDisplayName(name);
      toast(t('nameSaved'));
    } catch {
      toast(t('nameSaveFailed'));
    }
  });

  // ---- Tilføj e-mail (knytter til DENNE enheds nuværende konto) ----

  document.querySelector('[data-action="link-email"]')?.addEventListener("click", async () => {
    const input = document.getElementById("profile-email-input");
    const email = input.value.trim();
    if (!email) { alert(t('emailRequired')); return; }
    try {
      await linkEmail(email);
      linkStep = "code";
      linkStepEmail = email;
      render();
    } catch {
      alert(t('emailLinkFailed'));
    }
  });

  document.querySelector('[data-action="confirm-link-email"]')?.addEventListener("click", async () => {
    const input = document.getElementById("link-code-input");
    const code = input.value.trim();
    if (!code) { alert(t('codeRequired')); return; }
    try {
      await verifyLinkEmail(linkStepEmail, code);
      resetFlows();
      toast(t('emailLinked'));
      render();
    } catch {
      alert(t('codeInvalid'));
    }
  });

  document.querySelector('[data-action="cancel-link-email"]')?.addEventListener("click", () => {
    linkStep = "idle";
    linkStepEmail = "";
    render();
  });

  // ---- Log ud ----

  document.querySelector('[data-action="logout"]')?.addEventListener("click", async () => {
    if (!confirm(t('logoutConfirm'))) return;
    try {
      await signOut();
      resetFlows();
      toast(t('signedOut'));
      navigate("/");
    } catch {
      alert(t('signOutFailed'));
    }
  });

  // ---- Log ind (skifter til en allerede eksisterende konto) ----

  document.querySelector('[data-action="send-login-code"]')?.addEventListener("click", async () => {
    const input = document.getElementById("login-email-input");
    const email = input.value.trim();
    if (!email) { alert(t('emailRequired')); return; }
    try {
      await sendLoginCode(email);
      loginStep = "code";
      loginStepEmail = email;
      render();
    } catch {
      alert(t('emailLinkFailed'));
    }
  });

  document.querySelector('[data-action="confirm-login"]')?.addEventListener("click", async () => {
    const input = document.getElementById("login-code-input");
    const code = input.value.trim();
    if (!code) { alert(t('codeRequired')); return; }
    if (state.adventures.length > 0 && !confirm(t('loginReplaceConfirm'))) return;
    try {
      const email = loginStepEmail;
      await confirmLogin(email, code);
      resetFlows();
      toast(t('signedIn', email));
      navigate("/");
    } catch {
      alert(t('codeInvalid'));
    }
  });

  document.querySelector('[data-action="cancel-login"]')?.addEventListener("click", () => {
    loginStep = "idle";
    loginStepEmail = "";
    render();
  });

  document.querySelector('[data-action="toggle-lang"]')?.addEventListener("click", () => {
    state.lang = state.lang === "da" ? "en" : "da";
    saveData();
    render();
  });
}
