// ----- Opret / redigér aktivitet -----
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, isSafeHttpUrl, kildeNavn, kildeIkon, formatMonoDate, showFieldError } from '../utils.js';
import { KATEGORIER } from '../constants.js';
import { state, saveData, uid, touch, tombstone, restore } from '../data.js';
import { openModal, closeModal } from './modal.js';
import { openDatePicker } from './datepicker.js';
import { toast } from '../toast.js';
import { render } from '../router.js';

function hasAnyDetail(x) {
  return !!(x.startTid || x.slutTid || x.varerTil || x.stedNavn || x.adresse ||
    x.reference || x.link || x.telefon || x.noter || (x.status && x.status !== "idé"));
}

function detailsFieldsHtml(x) {
  return `
    <div class="field-row">
      <div class="field" style="margin-bottom:0">
        <label for="act-start-tid">${t('startTimeLabel')}</label>
        <input type="time" id="act-start-tid" value="${x.startTid || ""}" />
      </div>
      <div class="field" style="margin-bottom:0">
        <label for="act-slut-tid">${t('endTimeLabel')}</label>
        <input type="time" id="act-slut-tid" value="${x.slutTid || ""}" />
      </div>
    </div>
    <div class="field">
      <label>${t('lastsUntilLabel')}</label>
      <button type="button" class="date-select" id="act-varer-til-select" data-start="${x.varerTil || ""}">
        ${t('pickDate')}
      </button>
    </div>
    <div class="field">
      <label for="act-sted">${t('placeNameLabel')}</label>
      <input type="text" id="act-sted" value="${esc(x.stedNavn || "")}" placeholder="${t('placeNamePlaceholder')}" />
    </div>
    <div class="field">
      <label for="act-adresse">${t('addressLabel')}</label>
      <textarea id="act-adresse" rows="2" placeholder="${t('addressPlaceholder')}">${esc(x.adresse || "")}</textarea>
    </div>
    <div class="field-row">
      <div class="field" style="margin-bottom:0">
        <label for="act-reference">${t('referenceLabel')}</label>
        <input type="text" id="act-reference" value="${esc(x.reference || "")}" placeholder="${t('referencePlaceholder')}" />
      </div>
      <div class="field" style="margin-bottom:0">
        <label for="act-telefon">${t('phoneLabel')}</label>
        <input type="tel" id="act-telefon" value="${esc(x.telefon || "")}" />
      </div>
    </div>
    <div class="field">
      <label for="act-link">${t('linkLabel')}</label>
      <input type="url" id="act-link" value="${esc(x.link || "")}" placeholder="https://…" />
    </div>
    <div class="field">
      <label for="act-noter">${t('notesLabel')}</label>
      <textarea id="act-noter" rows="2">${esc(x.noter || "")}</textarea>
    </div>
    <div class="field">
      <label>${t('statusLabel')}</label>
      <div class="status-picker" id="act-status-picker">
        <div class="type-option ${(!x.status || x.status === "idé") ? "selected" : ""}" data-status="idé">
          <span class="type-label">${t('status_ide')}</span>
        </div>
        <div class="type-option ${x.status === "booket" ? "selected" : ""}" data-status="booket">
          <span class="type-label">${t('status_booket')}</span>
        </div>
        <div class="type-option ${x.status === "betalt" ? "selected" : ""}" data-status="betalt">
          <span class="type-label">${t('status_betalt')}</span>
        </div>
      </div>
    </div>
  `;
}

// preset (kun brugt for en NY, ikke-eksisterende aktivitet) markerer at
// dette er en fly/hotel/transport-detalje frem for en almindelig
// aktivitet — se KILDE_INFO. Navn/kategori er da faste (ikke noget
// brugeren vælger), og posten gemmes med kilde sat, så den fortsat
// findes af findLinkedActivity/syncLinkedActivity og holdes ude af
// Program-fanens liste (se program.js).
export function openActivityModal(adv, existing = null, preset = null) {
  const kilde = existing?.kilde || preset?.kilde || null;
  const x = existing || {
    id: uid(),
    adventureId: adv.id,
    navn: preset ? kildeNavn(preset.kilde) : "",
    kategori: preset ? preset.kategori : "oplevelse",
    dato: "",
    pris: "",
  };

  let detailsShown = existing ? hasAnyDetail(x) : false;
  let valgtStatus = x.status || "idé";

  const nameFieldsHtml = kilde ? `
    <div class="field">
      <label>${t('nameLabel')}</label>
      <p class="type-fixed">${icon(kildeIkon(kilde))} ${kildeNavn(kilde)}</p>
    </div>
  ` : `
    <div class="field">
      <label for="act-navn">${t('nameLabel')}</label>
      <input type="text" id="act-navn" value="${esc(x.navn)}" placeholder="${t('namePlaceholderAct')}" />
    </div>

    <div class="field">
      <label for="act-kat">${t('categoryLabel')}</label>
      <select id="act-kat">
        ${KATEGORIER.map(k => `
          <option value="${k.id}" ${k.id === x.kategori ? "selected" : ""}>${t('kat_' + k.id)}</option>
        `).join("")}
      </select>
    </div>
  `;

  openModal(`
    <div class="modal-header">
      <h2>${kilde ? kildeNavn(kilde) : (existing ? t('editActivityTitle') : t('newActivityTitle'))}</h2>
      <button class="modal-close" data-modal-close>✕</button>
    </div>
    ${existing && x.createdBy && adv.serverId ? `<p class="added-by-caption" id="act-added-by"></p>` : ""}

    ${nameFieldsHtml}

    <div class="field-row">
      <div class="field">
        <label>${t('date')}</label>
        <button type="button" class="date-select" id="act-date-select" data-start="${x.dato || ""}">
          ${t('pickDate')}
        </button>
      </div>
      <div class="field">
        <label for="act-pris">${t('priceLabelOptional')}</label>
        <input type="number" id="act-pris" value="${x.pris}" placeholder="0" inputmode="numeric" />
      </div>
    </div>

    <div id="act-details-area"></div>

    <div class="form-actions">
      <button class="btn" data-modal-close>${t('cancel')}</button>
      <button class="btn btn-rust" id="act-save">${existing ? t('save') : t('add')}</button>
    </div>
    ${existing ? `
      <button type="button" class="btn btn-block" id="act-delete" style="margin-top:10px;color:var(--rust);border-color:var(--rust-soft)">
        ${t('deleteActivity')}
      </button>
    ` : ""}
    ${existing && x.serverId ? `
      <div class="comments-section">
        <p class="paper-eyebrow" style="margin-top:20px">${t('commentsLabel')}</p>
        <div id="act-comments-list"><p class="comments-loading">${t('loadingComments')}</p></div>
        <div class="comment-input-row">
          <input type="text" id="act-comment-input" placeholder="${t('commentPlaceholder')}" />
          <button type="button" class="icon-only" id="act-comment-send" aria-label="${t('commentsLabel')}">${icon("check")}</button>
        </div>
      </div>
    ` : ""}
  `);

  function wireStatusPicker() {
    document.querySelectorAll("#act-status-picker .type-option").forEach(el => {
      el.addEventListener("click", () => {
        document.querySelectorAll("#act-status-picker .type-option").forEach(o => o.classList.remove("selected"));
        el.classList.add("selected");
        valgtStatus = el.dataset.status;
      });
    });
  }

  // Samme egen datepicker som resten af appen (eventyr-arket, både her og
  // detaljernes "varer til") — ikke browserens indbyggede <input
  // type="date">, som ser og virker anderledes fra ét felt til det næste.
  function wireDateSelectButton(id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    function refresh() {
      if (btn.dataset.start) {
        const y = new Date(btn.dataset.start + "T00:00:00").getFullYear();
        btn.textContent = `${formatMonoDate(btn.dataset.start)} ${y}`;
        btn.classList.add("date-selected");
      } else {
        btn.textContent = t('pickDate');
        btn.classList.remove("date-selected");
      }
    }
    refresh();
    btn.addEventListener("click", () => {
      const navn = kilde ? kildeNavn(kilde) : (document.getElementById("act-navn")?.value.trim() || t('adventureFallback'));
      openDatePicker(btn.dataset.start, "", navn, (start) => {
        btn.dataset.start = start || "";
        refresh();
      }, { singleOnly: true });
    });
  }

  wireDateSelectButton("act-date-select");

  function renderDetailsArea() {
    const area = document.getElementById("act-details-area");
    if (!detailsShown) {
      area.innerHTML = `<button type="button" class="add-btn" id="act-add-details">${t('addDetails')}</button>`;
      document.getElementById("act-add-details").addEventListener("click", () => {
        detailsShown = true;
        renderDetailsArea();
      });
    } else {
      area.innerHTML = detailsFieldsHtml(x);
      wireStatusPicker();
      wireDateSelectButton("act-varer-til-select");
    }
  }

  renderDetailsArea();

  // Kort, ikke-blokerende opslag — arket er allerede tegnet og fuldt
  // interaktivt. Samme mønster som sheet.js's "delt med"-linje.
  if (existing && x.createdBy && adv.serverId) {
    import('../sync.js').then(async (sync) => {
      const info = await sync.getPayerNames(adv.serverId);
      const el = document.getElementById("act-added-by");
      if (!el) return;
      const label = x.createdBy === info.myId ? t('youLabel') : (info.names[x.createdBy] || t('partnerFallback'));
      el.textContent = t('addedByLabel', label);
    }).catch(() => {});
  }

  // Kommentarer lever bevidst UDEN for det lokale-først lag (intet
  // state.comments) — hentes on-demand, kun for en aktivitet der allerede
  // er synkroniseret (har et serverId at knytte kommentarer til).
  async function loadComments() {
    const listEl = document.getElementById("act-comments-list");
    if (!listEl) return;
    const sync = await import('../sync.js');
    const [comments, info] = await Promise.all([
      sync.fetchComments(x.serverId),
      sync.getPayerNames(adv.serverId),
    ]);
    if (comments.length === 0) {
      listEl.innerHTML = `<p class="comments-empty">${t('noCommentsYet')}</p>`;
      return;
    }
    listEl.innerHTML = comments.map(c => {
      const label = c.user_id === info.myId ? t('youLabel') : (info.names[c.user_id] || t('partnerFallback'));
      return `
        <div class="comment-row">
          <p class="comment-meta">${esc(label)} · ${formatMonoDate(c.created_at.slice(0, 10))}</p>
          <p class="comment-body">${esc(c.body)}</p>
        </div>
      `;
    }).join("");
  }

  if (existing && x.serverId) {
    loadComments().catch(() => {});
    const sendComment = async () => {
      const input = document.getElementById("act-comment-input");
      const body = input.value.trim();
      if (!body) return;
      input.disabled = true;
      try {
        const sync = await import('../sync.js');
        await sync.postComment(x.serverId, body);
        input.value = "";
        await loadComments();
      } catch {
        toast(t('commentPostFailed'));
      } finally {
        input.disabled = false;
      }
    };
    document.getElementById("act-comment-send").addEventListener("click", sendComment);
    document.getElementById("act-comment-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendComment();
    });
  }

  document.getElementById("act-delete")?.addEventListener("click", () => {
    // Sletter med det samme og tilbyder fortryd via en toast, i stedet for
    // at spørge først med en systemdialog.
    tombstone(x);
    saveData();
    closeModal();
    render();
    toast(t('activityDeleted', x.navn), {
      actionLabel: t('undo'),
      persistent: true,
      onAction: () => {
        restore(x);
        saveData();
        render();
      },
    });
  });

  document.getElementById("act-save").addEventListener("click", () => {
    // navn/kategori er faste for en kilde-tagget post (fly/hotel/
    // transport) — der findes ingen #act-navn/#act-kat at læse fra, se
    // nameFieldsHtml ovenfor.
    const navn = kilde ? kildeNavn(kilde) : document.getElementById("act-navn").value.trim();
    const kategori = kilde ? x.kategori : document.getElementById("act-kat").value;
    const dato = document.getElementById("act-date-select").dataset.start || "";
    const pris = Number(document.getElementById("act-pris").value) || 0;

    if (!navn) { showFieldError(document.getElementById("act-navn"), t('nameRequired')); return; }

    const detailOverrides = detailsShown ? {
      startTid: document.getElementById("act-start-tid").value,
      slutTid: document.getElementById("act-slut-tid").value,
      varerTil: document.getElementById("act-varer-til-select").dataset.start || "",
      stedNavn: document.getElementById("act-sted").value.trim(),
      adresse: document.getElementById("act-adresse").value.trim(),
      reference: document.getElementById("act-reference").value.trim(),
      link: (() => {
        const raw = document.getElementById("act-link").value.trim();
        return raw && isSafeHttpUrl(raw) ? raw : "";
      })(),
      telefon: document.getElementById("act-telefon").value.trim(),
      noter: document.getElementById("act-noter").value.trim(),
      status: valgtStatus,
    } : {};

    const record = touch(existing
      ? { ...existing, navn, kategori, dato, pris, ...detailOverrides }
      : {
          id: x.id, adventureId: adv.id, navn, kategori, dato, pris, kilde,
          startTid: "", slutTid: "", varerTil: "", stedNavn: "", adresse: "",
          reference: "", link: "", telefon: "", noter: "", status: "idé",
          ...detailOverrides,
        });

    if (existing) {
      const idx = state.activities.findIndex(a => a.id === x.id);
      state.activities[idx] = record;
    } else {
      state.activities.push(record);
    }
    saveData();
    closeModal();
    render();
  });
}
