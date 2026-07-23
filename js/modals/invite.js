// ----- Invitér partner -----
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, formatMonoRange, formatKr } from '../utils.js';
import { openModal } from './modal.js';
import { toast } from '../toast.js';

export function openInviteModal(a) {
  const kode = a.id.slice(0, 6).toUpperCase();
  const link = `${location.origin}${location.pathname}#/adventure/${a.id}`;

  openModal(`
    <div class="modal-header">
      <h2>${t('invitePartnerTitle')}</h2>
      <button class="modal-close" data-modal-close>✕</button>
    </div>

    <p style="color:var(--ink-soft);font-size:14px;margin:0 0 12px;line-height:1.5">
      ${t('inviteIntro')}
    </p>

    <div class="invite-code-box">
      <p class="invite-eyebrow">${t('inviteCode')}</p>
      <p class="invite-code">${kode}</p>
      <p class="invite-hint">"${esc(a.navn)}"</p>
    </div>

    <div class="field">
      <label>${t('previewLabel')}</label>
      <div class="paper" style="margin:0">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="detail-glyph" style="width:44px;height:44px;margin:0">${icon(a.icon)}</div>
          <div>
            <p style="margin:0;font-family:var(--font-sans);font-weight:600;font-size:18px">${esc(a.navn)}</p>
            <p style="margin:2px 0 0;font-family:var(--font-mono);font-size:11px;letter-spacing:0.06em;color:var(--ink-soft);text-transform:uppercase">
              ${a.startdato ? formatMonoRange(a.startdato, a.slutdato) : t('ideaLabel')}${a.målBeløb ? ` · ${formatKr(a.målBeløb)}` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>

    <button class="btn btn-rust btn-block" id="copy-link">
      ${icon("link")} ${t('copyLink')}
    </button>
    <p class="invite-hint" style="text-align:center;margin-top:12px">
      ${t('inviteFootnote')}
    </p>
  `);

  document.getElementById("copy-link").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast(t('linkCopied'));
    } catch {
      prompt(t('copyLinkManually'), link);
    }
  });
}
