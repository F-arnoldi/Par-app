// ----- Opret / redigér eventyr -----
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, formatMonoDate, formatMonoRange, todayISO } from '../utils.js';
import { ICON_VALG } from '../constants.js';
import { state, saveData, uid } from '../data.js';
import { findLinkedActivity, syncLinkedActivity } from '../selectors.js';
import { navigate, render } from '../router.js';
import { openDatePicker } from './datepicker.js';
import { openModal, closeModal } from './modal.js';

export function openAdventureModal(existing = null) {
  const a = existing || {
    id: uid(),
    navn: "",
    startdato: "",
    slutdato: "",
    målBeløb: "",
    icon: ICON_VALG[0],
    afsluttet: false,
    type: "rejse",
    opsparingAktiveret: false,
  };

  let type = a.type || "rejse";
  let valgtIcon = a.icon;

  openModal(`
    <div class="modal-header">
      <h2>${existing ? t('editAdventure') : t('newAdventure')}</h2>
      <button class="modal-close" data-modal-close>✕</button>
    </div>

    ${existing ? `
      <div class="field">
        <label>${t('typeLabel')}</label>
        <p class="type-fixed">${icon(type === "oplevelse" ? "ticket" : "suitcase")} ${type === "oplevelse" ? t('typeOplevelse') : t('typeRejse')}</p>
      </div>
    ` : `
      <div class="field">
        <label>${t('typeLabel')}</label>
        <div class="type-picker" id="type-picker">
          <div class="type-option ${type === "rejse" ? "selected" : ""}" data-type="rejse">
            <span class="type-icon">${icon("suitcase")}</span>
            <span class="type-label">${t('typeRejse')}</span>
          </div>
          <div class="type-option ${type === "oplevelse" ? "selected" : ""}" data-type="oplevelse">
            <span class="type-icon">${icon("ticket")}</span>
            <span class="type-label">${t('typeOplevelse')}</span>
          </div>
        </div>
      </div>
    `}

    <div class="field">
      <label>${t('iconLabel')}</label>
      <div class="icon-picker" id="icon-picker">
        ${ICON_VALG.map(name => `
          <div class="icon-option ${name === a.icon ? "selected" : ""}" data-icon="${name}">${icon(name)}</div>
        `).join("")}
      </div>
    </div>

    <div class="field">
      <label for="adv-navn">${t('nameLabel')}</label>
      <input type="text" id="adv-navn" value="${esc(a.navn)}" placeholder="${t('namePlaceholder')}" />
    </div>

    <div id="adventure-type-fields"></div>

    <div class="form-actions">
      <button class="btn" data-modal-close>${t('cancel')}</button>
      <button class="btn btn-rust" id="adv-save">${existing ? t('save') : t('create')}</button>
    </div>
  `);

  document.querySelectorAll("#icon-picker .icon-option").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll("#icon-picker .icon-option").forEach(x => x.classList.remove("selected"));
      el.classList.add("selected");
      valgtIcon = el.dataset.icon;
    });
  });

  const fieldsRoot = document.getElementById("adventure-type-fields");
  let getFieldValues = () => ({});

  function renderFields() {
    if (type === "oplevelse") {
      fieldsRoot.innerHTML = `
        <div class="field">
          <label for="adv-pris">${t('priceLabelKr')}</label>
          <input type="number" id="adv-pris" value="${a.målBeløb || ""}" placeholder="0" inputmode="numeric" />
        </div>
        <div class="field">
          <label>${t('date')}</label>
          <button type="button" class="date-select" id="date-select"
                  data-start="${a.startdato || ""}">
            ${t('pickDate')}
          </button>
        </div>
        <label class="toggle-row">
          <input type="checkbox" id="adv-opsparing" ${a.opsparingAktiveret ? "checked" : ""}/>
          <span>${t('saveTowardThis')}</span>
        </label>
      `;

      const dateBtn = document.getElementById("date-select");
      function refreshDateBtn() {
        if (dateBtn.dataset.start) {
          const y = new Date(dateBtn.dataset.start + "T00:00:00").getFullYear();
          dateBtn.textContent = `${formatMonoDate(dateBtn.dataset.start)} ${y}`;
          dateBtn.classList.add("date-selected");
        } else {
          dateBtn.textContent = t('pickDate');
          dateBtn.classList.remove("date-selected");
        }
      }
      refreshDateBtn();
      dateBtn.addEventListener("click", () => {
        const navn = document.getElementById("adv-navn").value.trim() || t('adventureFallback');
        openDatePicker(dateBtn.dataset.start, "", navn, (start) => {
          dateBtn.dataset.start = start || "";
          refreshDateBtn();
        }, { singleOnly: true });
      });

      getFieldValues = () => ({
        startdato: dateBtn.dataset.start || "",
        prisInput: document.getElementById("adv-pris").value,
        opsparingAktiveret: document.getElementById("adv-opsparing").checked,
      });
    } else {
      const flyAct = existing ? findLinkedActivity(a.id, "fly") : null;
      const hotelAct = existing ? findLinkedActivity(a.id, "hotel") : null;
      fieldsRoot.innerHTML = `
        <div class="field">
          <label>${t('datesLabel')}</label>
          <button type="button" class="date-select" id="date-select"
                  data-start="${a.startdato || ""}" data-end="${a.slutdato || ""}">
            ${t('pickDates')}
          </button>
        </div>

        <div class="field">
          <label for="adv-mål">${t('amountSetAsideLabel')}</label>
          <input type="number" id="adv-mål" value="${a.målBeløb || ""}" placeholder="${t('optional')}" inputmode="numeric" />
        </div>

        <div class="field-row">
          <div class="field" style="margin-bottom:0">
            <label for="adv-fly">${t('flyLabel')}</label>
            <input type="number" id="adv-fly" value="${flyAct ? flyAct.pris : ""}" placeholder="${t('optional')}" inputmode="numeric" />
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="adv-hotel">${t('hotelLabel')}</label>
            <input type="number" id="adv-hotel" value="${hotelAct ? hotelAct.pris : ""}" placeholder="${t('optional')}" inputmode="numeric" />
          </div>
        </div>
      `;

      const dateBtn = document.getElementById("date-select");
      function refreshDateBtn() {
        if (dateBtn.dataset.start) {
          dateBtn.textContent = formatMonoRange(dateBtn.dataset.start, dateBtn.dataset.end);
          dateBtn.classList.add("date-selected");
        } else {
          dateBtn.textContent = t('pickDates');
          dateBtn.classList.remove("date-selected");
        }
      }
      refreshDateBtn();
      dateBtn.addEventListener("click", () => {
        const navn = document.getElementById("adv-navn").value.trim() || t('adventureFallback');
        openDatePicker(dateBtn.dataset.start, dateBtn.dataset.end, navn, (start, end) => {
          dateBtn.dataset.start = start || "";
          dateBtn.dataset.end = end || "";
          refreshDateBtn();
        });
      });

      getFieldValues = () => {
        const flyEl = document.getElementById("adv-fly");
        const hotelEl = document.getElementById("adv-hotel");
        return {
          startdato: dateBtn.dataset.start || "",
          slutdato: dateBtn.dataset.end || "",
          målBeløbInput: document.getElementById("adv-mål").value,
          flyPris: flyEl ? Number(flyEl.value) || 0 : 0,
          hotelPris: hotelEl ? Number(hotelEl.value) || 0 : 0,
        };
      };
    }
  }

  renderFields();

  if (!existing) {
    document.querySelectorAll("#type-picker .type-option").forEach(el => {
      el.addEventListener("click", () => {
        type = el.dataset.type;
        document.querySelectorAll("#type-picker .type-option").forEach(x => x.classList.remove("selected"));
        el.classList.add("selected");
        renderFields();
      });
    });
  }

  document.getElementById("adv-save").addEventListener("click", () => {
    const navn = document.getElementById("adv-navn").value.trim();
    if (!navn) { alert(t('nameRequired')); return; }

    if (type === "oplevelse") {
      const { startdato, prisInput, opsparingAktiveret } = getFieldValues();
      const pris = prisInput ? Number(prisInput) : 0;

      if (prisInput && (isNaN(pris) || pris < 0)) {
        alert(t('priceInvalid')); return;
      }

      const record = {
        id: a.id,
        navn,
        type: "oplevelse",
        startdato,
        slutdato: "",
        målBeløb: pris,
        opsparingAktiveret,
        icon: valgtIcon,
        afsluttet: a.afsluttet || false,
      };

      if (existing) {
        const idx = state.adventures.findIndex(x => x.id === a.id);
        state.adventures[idx] = record;
      } else {
        state.adventures.push(record);
      }
      saveData();
      closeModal();
      if (!existing) {
        navigate(`/adventure/${a.id}`);
      } else {
        render();
      }
    } else {
      const { startdato, slutdato, målBeløbInput, flyPris, hotelPris } = getFieldValues();
      const målBeløb = målBeløbInput ? Number(målBeløbInput) : 0;

      if (slutdato && startdato && slutdato < startdato) {
        alert(t('endBeforeStart')); return;
      }
      if (målBeløbInput && (isNaN(målBeløb) || målBeløb < 0)) {
        alert(t('amountMustBePositive')); return;
      }

      const record = {
        id: a.id,
        navn,
        type: "rejse",
        startdato,
        slutdato,
        målBeløb: målBeløb || 0,
        opsparingAktiveret: false,
        icon: valgtIcon,
        afsluttet: a.afsluttet || false,
      };

      if (existing) {
        const idx = state.adventures.findIndex(x => x.id === a.id);
        state.adventures[idx] = record;
      } else {
        state.adventures.push(record);
      }
      const dato = startdato || todayISO();
      syncLinkedActivity(a.id, "fly", "Fly", "transport", dato, flyPris);
      syncLinkedActivity(a.id, "hotel", "Hotel", "ophold", dato, hotelPris);
      saveData();
      closeModal();
      if (!existing) {
        navigate(`/adventure/${a.id}/program`);
      } else {
        render();
      }
    }
  });
}
