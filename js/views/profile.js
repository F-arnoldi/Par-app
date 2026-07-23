// ---------- Profil ----------
import { t } from '../i18n.js';
import { state, saveData } from '../data.js';
import { navigate, render } from '../router.js';
import { toast } from '../toast.js';
import { hasLinkedEmail, myEmail, linkEmail } from '../sync.js';

export function renderProfile() {
  const otherLangName = state.lang === "da" ? t('langNameEn') : t('langNameDa');

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
      ${hasLinkedEmail ? `
        <p style="margin:0;font-size:14px;color:var(--ink-soft)">${t('emailLinkedAs', myEmail)}</p>
      ` : `
        <p style="margin:0 0 12px;font-size:14px;color:var(--ink-soft);line-height:1.5">${t('emailPromptText')}</p>
        <div class="field" style="margin-bottom:10px">
          <input type="email" id="profile-email-input" placeholder="${t('emailPlaceholder')}" />
        </div>
        <button class="btn btn-rust btn-block" data-action="link-email">${t('emailPromptLink')}</button>
      `}
    </div>

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

  document.querySelector('[data-action="link-email"]')?.addEventListener("click", async () => {
    const input = document.getElementById("profile-email-input");
    const email = input.value.trim();
    if (!email) { alert(t('emailRequired')); return; }
    try {
      await linkEmail(email);
      toast(t('emailLinkSent'));
    } catch {
      alert(t('emailLinkFailed'));
    }
  });

  document.querySelector('[data-action="toggle-lang"]')?.addEventListener("click", () => {
    state.lang = state.lang === "da" ? "en" : "da";
    saveData();
    render();
  });
}
