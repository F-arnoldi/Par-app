// ---------- Bekræftelses-dialog ----------
// App-stylet erstatning for window.confirm() — bruges til log ud og
// login-advarslen om at erstatte lokale data. Sletninger bruger IKKE
// denne: de udføres med det samme og tilbyder i stedet fortryd via en
// toast (se restore()-kaldene i sheet.js/activity.js/opsparing.js),
// samme mønster som auto-arkiveringen i main.js.
import { t } from '../i18n.js';
import { openModal, closeModal } from './modal.js';

/**
 * Viser messageHtml (skal være HTML-escaped af kalderen, hvis den
 * indeholder brugerdata) med Annuller/confirmLabel-knapper. Returnerer et
 * Promise<boolean> — true kun ved eksplicit tryk på confirmLabel-knappen;
 * false ved Annuller, baggrunds-klik ELLER træk-for-at-luk, så alle veje
 * ud af arket altid afgør Promise'et.
 */
export function confirmAction(messageHtml, confirmLabel) {
  return new Promise((resolve) => {
    let decided = false;
    openModal(`
      <div class="modal-header">
        <h2>${t('confirmTitle')}</h2>
      </div>
      <p style="color:var(--ink-soft);font-size:14px;line-height:1.5;margin:0 0 20px">${messageHtml}</p>
      <div class="form-actions">
        <button class="btn" data-confirm="cancel">${t('cancel')}</button>
        <button class="btn btn-rust" data-confirm="ok">${confirmLabel || t('confirm')}</button>
      </div>
    `, () => {
      if (!decided) resolve(false);
    });

    document.querySelector('[data-confirm="cancel"]').addEventListener("click", () => {
      decided = true;
      closeModal();
    });
    document.querySelector('[data-confirm="ok"]').addEventListener("click", () => {
      decided = true;
      resolve(true);
      closeModal();
    });
  });
}
