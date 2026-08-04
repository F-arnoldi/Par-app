// ---------- Profil ----------
import { t } from '../i18n.js';
import { state, saveData } from '../data.js';
import { todayISO } from '../utils.js';
import { navigate, render } from '../router.js';
import { toast } from '../toast.js';
import { hasLinkedEmail, myEmail, signOut } from '../sync.js';
import { confirmAction } from '../modals/confirm.js';

// "Download mine data" — hele state minus hasLoggedInBefore, som er et
// rent enheds-lokalt flag (styrer kun login-gaten offline) og ikke
// brugerens egne data. Samme Blob+download-link-mønster som ics.js.
function downloadDataExport() {
  const { hasLoggedInBefore, ...exportable } = state;
  const json = JSON.stringify(exportable, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nyt-eventyr-data-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function renderProfile() {
  const otherLangName = state.lang === "da" ? t('langNameEn') : t('langNameDa');

  // hasLinkedEmail bør altid være sandt her — router.js' login-gate lukker
  // ingen anden rute igennem uden det. Faldet tilbage til intet i det
  // korte vindue lige efter opstart, hvor en tidligere logget-ind enhed
  // (hasLoggedInBefore) allerede har adgang, men den faktiske Supabase-
  // session endnu ikke er bekræftet i baggrunden.
  const emailSectionHtml = hasLinkedEmail ? `
    <p style="margin:0 0 12px;font-size:14px;color:var(--ink-soft)">${t('emailLinkedAs', myEmail)}</p>
    <button class="btn btn-block" data-action="logout">${t('logoutBtn')}</button>
  ` : "";

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

    <div class="paper">
      <p class="paper-eyebrow">${t('language')}</p>
      <button class="btn btn-block" data-action="toggle-lang">${otherLangName}</button>
    </div>

    <div class="paper">
      <p class="paper-eyebrow">${t('dataSectionTitle')}</p>
      <p style="margin:0 0 12px;font-size:13px;color:var(--ink-soft);line-height:1.5">${t('dataSectionHint')}</p>
      <button class="btn btn-block" data-action="export-data">${t('downloadDataBtn')}</button>
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

  document.querySelector('[data-action="logout"]')?.addEventListener("click", async () => {
    if (!(await confirmAction(t('logoutConfirm'), t('logoutBtn')))) return;
    try {
      await signOut();
      toast(t('signedOut'));
      render(); // isLoggedIn() er nu falsk — render() viser login-gaten med det samme
    } catch {
      toast(t('signOutFailed'));
    }
  });

  document.querySelector('[data-action="toggle-lang"]')?.addEventListener("click", () => {
    state.lang = state.lang === "da" ? "en" : "da";
    saveData();
    render();
  });

  document.querySelector('[data-action="export-data"]')?.addEventListener("click", downloadDataExport);
}
