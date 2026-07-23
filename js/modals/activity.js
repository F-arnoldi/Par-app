// ----- Opret / redigér aktivitet -----
import { t } from '../i18n.js';
import { esc, isSafeHttpUrl } from '../utils.js';
import { KATEGORIER } from '../constants.js';
import { state, saveData, uid, touch, tombstone } from '../data.js';
import { openModal, closeModal } from './modal.js';
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
      <label for="act-varer-til">${t('lastsUntilLabel')}</label>
      <input type="date" id="act-varer-til" value="${x.varerTil || ""}" />
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

export function openActivityModal(adv, existing = null) {
  const x = existing || {
    id: uid(),
    adventureId: adv.id,
    navn: "",
    kategori: "oplevelse",
    dato: "",
    pris: "",
  };

  let detailsShown = existing ? hasAnyDetail(x) : false;
  let valgtStatus = x.status || "idé";

  openModal(`
    <div class="modal-header">
      <h2>${existing ? t('editActivityTitle') : t('newActivityTitle')}</h2>
      <button class="modal-close" data-modal-close>✕</button>
    </div>

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

    <div class="field-row">
      <div class="field">
        <label for="act-dato">${t('date')}</label>
        <input type="date" id="act-dato" value="${x.dato || ""}" />
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
    }
  }

  renderDetailsArea();

  document.getElementById("act-delete")?.addEventListener("click", () => {
    if (confirm(t('confirmDeleteActivity'))) {
      tombstone(x);
      saveData();
      closeModal();
      render();
    }
  });

  document.getElementById("act-save").addEventListener("click", () => {
    const navn = document.getElementById("act-navn").value.trim();
    const kategori = document.getElementById("act-kat").value;
    const dato = document.getElementById("act-dato").value;
    const pris = Number(document.getElementById("act-pris").value) || 0;

    if (!navn) { alert(t('nameRequired')); return; }

    const detailOverrides = detailsShown ? {
      startTid: document.getElementById("act-start-tid").value,
      slutTid: document.getElementById("act-slut-tid").value,
      varerTil: document.getElementById("act-varer-til").value,
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
          id: x.id, adventureId: adv.id, navn, kategori, dato, pris, kilde: null,
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
