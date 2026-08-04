// ----- Opret / redigér aktivitet -----
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, isSafeHttpUrl, kildeNavn, kildeIkon, formatMonoDate, showFieldError, formatForeignHint } from '../utils.js';
import { KATEGORIER } from '../constants.js';
import { state, saveData, uid, touch, tombstone, restore } from '../data.js';
import { openModal, closeModal } from './modal.js';
import { openDatePicker } from './datepicker.js';
import { openTimePicker } from './timepicker.js';
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
        <label>${t('startTimeLabel')}</label>
        <button type="button" class="date-select" id="act-start-tid-select" data-time="${x.startTid || ""}">
          ${t('pickTime')}
        </button>
      </div>
      <div class="field" style="margin-bottom:0">
        <label>${t('endTimeLabel')}</label>
        <button type="button" class="date-select" id="act-slut-tid-select" data-time="${x.slutTid || ""}">
          ${t('pickTime')}
        </button>
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
        <div class="type-option ${(!x.status || x.status === "idé") ? "selected" : ""}" data-status="idé" role="button" tabindex="0" aria-pressed="${!x.status || x.status === "idé"}">
          <span class="type-label">${t('status_ide')}</span>
        </div>
        <div class="type-option ${x.status === "booket" ? "selected" : ""}" data-status="booket" role="button" tabindex="0" aria-pressed="${x.status === "booket"}">
          <span class="type-label">${t('status_booket')}</span>
        </div>
        <div class="type-option ${x.status === "betalt" ? "selected" : ""}" data-status="betalt" role="button" tabindex="0" aria-pressed="${x.status === "betalt"}">
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
    navn: preset?.kilde ? kildeNavn(preset.kilde) : "",
    kategori: preset?.kilde ? preset.kategori : "oplevelse",
    dato: preset?.dato || "",
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
      <button class="modal-close" data-modal-close aria-label="${t('closeLabel')}">✕</button>
    </div>
    ${existing && x.createdBy && adv.serverId ? `<p class="added-by-caption" id="act-added-by"></p>` : ""}

    <form data-modal-form>
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
          <p class="foreign-hint" id="act-pris-hint"></p>
        </div>
      </div>

      <div class="field">
        <label for="act-faktisk-pris">${t('actualPriceLabel')}</label>
        <input type="number" id="act-faktisk-pris" value="${x.faktiskPris ?? ""}" placeholder="0" inputmode="numeric" />
        <p class="foreign-hint" id="act-faktisk-pris-hint"></p>
      </div>

      <div id="act-details-area"></div>

      <div class="form-actions">
        <button type="button" class="btn" data-modal-close>${t('cancel')}</button>
        <button type="submit" class="btn btn-rust" id="act-save">${existing ? t('save') : t('add')}</button>
      </div>
    </form>
    ${existing ? `
      <button type="button" class="btn btn-block" id="act-delete" style="margin-top:10px;color:var(--rust);border-color:var(--rust-soft)">
        ${t('deleteActivity')}
      </button>
    ` : ""}
    ${existing && x.serverId && adv.serverId ? `
      <div class="documents-section">
        <p class="paper-eyebrow" style="margin-top:20px">${t('documentsLabel')}</p>
        <div id="act-documents-list"><p class="comments-loading">${t('loadingDocuments')}</p></div>
        <label class="btn btn-block document-upload-label">
          ${icon("paperclip")} ${t('uploadDocumentBtn')}
          <input type="file" id="act-doc-upload-input" accept="image/*,application/pdf" style="display:none" />
        </label>
      </div>
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
        document.querySelectorAll("#act-status-picker .type-option").forEach(o => {
          o.classList.remove("selected");
          o.setAttribute("aria-pressed", "false");
        });
        el.classList.add("selected");
        el.setAttribute("aria-pressed", "true");
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

  // Samme egen tidsvælger som resten af appen (se timepicker.js) — ikke
  // browserens indbyggede <input type="time">, som åbner OS'ets eget hjul
  // og bryder med appens udtryk.
  function wireTimeSelectButton(id, label) {
    const btn = document.getElementById(id);
    if (!btn) return;
    function refresh() {
      if (btn.dataset.time) {
        btn.textContent = btn.dataset.time;
        btn.classList.add("date-selected");
      } else {
        btn.textContent = t('pickTime');
        btn.classList.remove("date-selected");
      }
    }
    refresh();
    btn.addEventListener("click", () => {
      openTimePicker(btn.dataset.time, label, (value) => {
        btn.dataset.time = value || "";
        refresh();
      });
    });
  }

  // Rent kosmetisk — beløbet der rent faktisk gemmes/tælles med er stadig
  // kr.-feltet uændret, se formatForeignHint. Kun relevant når eventyret
  // selv har fået sat en rejsevaluta+kurs (se adventure.js).
  if (adv.valuta && adv.kurs) {
    function wirePriceHint(inputId, hintId) {
      const input = document.getElementById(inputId);
      const hint = document.getElementById(hintId);
      const refresh = () => { hint.textContent = formatForeignHint(input.value, adv.valuta, adv.kurs); };
      refresh();
      input.addEventListener("input", refresh);
    }
    wirePriceHint("act-pris", "act-pris-hint");
    wirePriceHint("act-faktisk-pris", "act-faktisk-pris-hint");
  }

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
      wireTimeSelectButton("act-start-tid-select", t('startTimeLabel'));
      wireTimeSelectButton("act-slut-tid-select", t('endTimeLabel'));
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

  // Dokumenter lever, ligesom kommentarer, uden for det lokale-først lag —
  // filerne findes kun i Supabase Storage, hentet on-demand. Fejler
  // gracefuldt til en tom liste hvis bucketen (endnu) ikke findes, se
  // sync.js's listDocuments.
  async function loadDocuments() {
    const listEl = document.getElementById("act-documents-list");
    if (!listEl) return;
    const sync = await import('../sync.js');
    const files = await sync.listDocuments(adv.serverId, x.serverId);
    if (files.length === 0) {
      listEl.innerHTML = `<p class="comments-empty">${t('noDocumentsYet')}</p>`;
      return;
    }
    listEl.innerHTML = files.map(f => {
      // Uploadede filnavne har et "<uuid>-"-præfiks (se sync.js's
      // uploadDocument) — vist navn er filen brugeren selv gav den.
      const displayName = f.name.replace(/^[0-9a-f-]{36}-/, "");
      return `
        <div class="document-row" data-doc-name="${esc(f.name)}">
          <span class="document-icon">${icon("paperclip")}</span>
          <span class="document-name">${esc(displayName)}</span>
          <button type="button" class="icon-btn" data-doc-view="${esc(f.name)}" aria-label="${t('viewDocument')}">${icon("search")}</button>
          <button type="button" class="icon-btn" data-doc-delete="${esc(f.name)}" aria-label="${t('delete')}">✕</button>
        </div>
      `;
    }).join("");

    listEl.querySelectorAll("[data-doc-view]").forEach(el => {
      el.addEventListener("click", async () => {
        const sync = await import('../sync.js');
        const url = await sync.getDocumentSignedUrl(adv.serverId, x.serverId, el.dataset.docView);
        if (url) window.open(url, "_blank", "noopener");
        else toast(t('documentOpenFailed'));
      });
    });
    listEl.querySelectorAll("[data-doc-delete]").forEach(el => {
      el.addEventListener("click", async () => {
        try {
          const sync = await import('../sync.js');
          await sync.deleteDocument(adv.serverId, x.serverId, el.dataset.docDelete);
          await loadDocuments();
        } catch {
          toast(t('documentDeleteFailed'));
        }
      });
    });
  }

  if (existing && x.serverId && adv.serverId) {
    loadDocuments().catch(() => {});
    document.getElementById("act-doc-upload-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = ""; // samme fil kan vælges/uploades igen senere
      if (!file) return;
      try {
        const sync = await import('../sync.js');
        await sync.uploadDocument(adv.serverId, x.serverId, file);
        await loadDocuments();
      } catch {
        toast(t('documentUploadFailed'));
      }
    });
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

  // submit (ikke blot et click på #act-save) så Enter i et hvilket som
  // helst enkeltlinje-felt i formularen også gemmer — browserens native
  // implicitte formular-indsendelse, ingen ekstra keydown-lytter nødvendig.
  document.querySelector("[data-modal-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    // navn/kategori er faste for en kilde-tagget post (fly/hotel/
    // transport) — der findes ingen #act-navn/#act-kat at læse fra, se
    // nameFieldsHtml ovenfor.
    const navn = kilde ? kildeNavn(kilde) : document.getElementById("act-navn").value.trim();
    const kategori = kilde ? x.kategori : document.getElementById("act-kat").value;
    const dato = document.getElementById("act-date-select").dataset.start || "";
    const pris = Number(document.getElementById("act-pris").value) || 0;
    const faktiskPrisRaw = document.getElementById("act-faktisk-pris").value;
    const faktiskPris = faktiskPrisRaw ? Number(faktiskPrisRaw) : null;

    if (!navn) { showFieldError(document.getElementById("act-navn"), t('nameRequired')); return; }

    const detailOverrides = detailsShown ? {
      startTid: document.getElementById("act-start-tid-select").dataset.time || "",
      slutTid: document.getElementById("act-slut-tid-select").dataset.time || "",
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
      ? { ...existing, navn, kategori, dato, pris, faktiskPris, ...detailOverrides }
      : {
          id: x.id, adventureId: adv.id, navn, kategori, dato, pris, faktiskPris, kilde,
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
