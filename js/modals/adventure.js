// ----- Opret / redigér eventyr -----
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, formatMonoDate, formatMonoRange, formatKr, todayISO, kildeNavn, kildeIkon, showFieldError } from '../utils.js';
import { ICON_VALG, KILDE_INFO } from '../constants.js';
import { state, saveData, uid, touch } from '../data.js';
import { findLinkedActivity, syncLinkedActivity } from '../selectors.js';
import { navigate, render } from '../router.js';
import { openDatePicker } from './datepicker.js';
import { openModal, closeModal } from './modal.js';
import { openActivityModal } from './activity.js';

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
      const transportAct = existing ? findLinkedActivity(a.id, "transport") : null;

      // Ved OPRETTELSE er fly/hotel/transport en simpel pris bag et
      // progressivt "+ Tilføj detaljer"-trin — eventyret findes jo ikke i
      // state.adventures endnu, så der er intet at knytte en fuld
      // aktivitets-post med rige detaljer til (se save-handleren, som
      // kun kalder syncLinkedActivity for et NYT eventyr). Ved REDIGERING
      // er de i stedet hver sin egen detalje-editor — samme skabelon som
      // en aktivitet — åbnet ved at lukke dette ark og kalde
      // openActivityModal direkte, se klik-håndteringen herunder.
      const simpleDetailsFieldsHtml = `
        <div class="field-row">
          <div class="field" style="margin-bottom:0">
            <label for="adv-fly">${t('flyLabel')}</label>
            <input type="number" id="adv-fly" placeholder="${t('optional')}" inputmode="numeric" />
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="adv-hotel">${t('hotelLabel')}</label>
            <input type="number" id="adv-hotel" placeholder="${t('optional')}" inputmode="numeric" />
          </div>
        </div>
        <div class="field">
          <label for="adv-transport">${t('transportLabel')}</label>
          <input type="number" id="adv-transport" placeholder="${t('optional')}" inputmode="numeric" />
        </div>
      `;

      function detailRowHtml(kilde, act) {
        if (!act) {
          return `<button type="button" class="detail-row detail-row-empty" data-detail="${kilde}">+ ${kildeNavn(kilde)}</button>`;
        }
        return `
          <button type="button" class="detail-row" data-detail="${kilde}">
            <span>${icon(kildeIkon(kilde))} ${kildeNavn(kilde)}</span>
            <span class="detail-row-price">${formatKr(act.pris)}</span>
          </button>
        `;
      }

      const richDetailsFieldsHtml = `
        <div class="field">
          <label>${t('tripDetailsPrompt')}</label>
          ${detailRowHtml("fly", flyAct)}
          ${detailRowHtml("hotel", hotelAct)}
          ${detailRowHtml("transport", transportAct)}
        </div>
      `;

      fieldsRoot.innerHTML = `
        <div class="field">
          <label>${t('datesLabel')}</label>
          <button type="button" class="date-select" id="date-select"
                  data-start="${a.startdato || ""}" data-end="${a.slutdato || ""}">
            ${t('pickDates')}
          </button>
        </div>

        ${existing ? `
          <div class="field">
            <label for="adv-mål">${t('amountSetAsideLabel')}</label>
            <input type="number" id="adv-mål" value="${a.målBeløb || ""}" placeholder="${t('optional')}" inputmode="numeric" />
          </div>
          ${richDetailsFieldsHtml}
          <div class="field-row">
            <div class="field" style="margin-bottom:0">
              <label for="adv-valuta">${t('currencyLabel')}</label>
              <input type="text" id="adv-valuta" value="${esc(a.valuta || "")}" placeholder="${t('currencyPlaceholder')}" maxlength="6" />
            </div>
            <div class="field" style="margin-bottom:0">
              <label for="adv-kurs">${t('exchangeRateLabel')}</label>
              <input type="number" id="adv-kurs" value="${a.kurs || ""}" placeholder="${t('exchangeRatePlaceholder')}" step="0.01" inputmode="decimal" />
            </div>
          </div>
        ` : `
          <div id="trip-details-area"></div>
        `}
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

      if (!existing) {
        const area = document.getElementById("trip-details-area");
        let detailsShown = false;
        function renderDetailsArea() {
          if (!detailsShown) {
            area.innerHTML = `<button type="button" class="add-btn" id="trip-add-details">${t('addDetails')}</button>`;
            document.getElementById("trip-add-details").addEventListener("click", () => {
              detailsShown = true;
              renderDetailsArea();
            });
          } else {
            area.innerHTML = simpleDetailsFieldsHtml;
          }
        }
        renderDetailsArea();
      } else {
        const linked = { fly: flyAct, hotel: hotelAct, transport: transportAct };
        document.querySelectorAll("[data-detail]").forEach(el => {
          el.addEventListener("click", () => {
            const kilde = el.dataset.detail;
            const act = linked[kilde];
            closeModal();
            openActivityModal(a, act, act ? null : { kilde, kategori: KILDE_INFO[kilde].kategori });
          });
        });
      }

      getFieldValues = () => {
        const målEl = document.getElementById("adv-mål");
        const flyEl = document.getElementById("adv-fly");
        const hotelEl = document.getElementById("adv-hotel");
        const transportEl = document.getElementById("adv-transport");
        const valutaEl = document.getElementById("adv-valuta");
        const kursEl = document.getElementById("adv-kurs");
        return {
          startdato: dateBtn.dataset.start || "",
          slutdato: dateBtn.dataset.end || "",
          målBeløbInput: målEl ? målEl.value : "",
          flyPris: flyEl ? Number(flyEl.value) || 0 : 0,
          hotelPris: hotelEl ? Number(hotelEl.value) || 0 : 0,
          transportPris: transportEl ? Number(transportEl.value) || 0 : 0,
          valuta: valutaEl ? valutaEl.value.trim().toUpperCase() : "",
          kurs: kursEl ? kursEl.value : "",
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
    const navnInput = document.getElementById("adv-navn");
    const navn = navnInput.value.trim();
    if (!navn) { showFieldError(navnInput, t('nameRequired')); return; }
    showFieldError(navnInput, null);

    if (type === "oplevelse") {
      const { startdato, prisInput, opsparingAktiveret } = getFieldValues();
      const pris = prisInput ? Number(prisInput) : 0;
      const prisInputEl = document.getElementById("adv-pris");

      showFieldError(prisInputEl, null);
      if (prisInput && (isNaN(pris) || pris < 0)) {
        showFieldError(prisInputEl, t('priceInvalid')); return;
      }

      // Spreder ...a først, så felter som en fremtidig serverId (sat af
      // sync-motoren, Fase 3) overlever en redigering — ikke kun de felter
      // formularen selv kender til.
      const record = touch({
        ...a,
        id: a.id,
        navn,
        type: "oplevelse",
        startdato,
        slutdato: "",
        målBeløb: pris,
        opsparingAktiveret,
        icon: valgtIcon,
        afsluttet: a.afsluttet || false,
      });

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
      const { startdato, slutdato, målBeløbInput, flyPris, hotelPris, transportPris, valuta, kurs } = getFieldValues();
      const målBeløb = målBeløbInput ? Number(målBeløbInput) : 0;
      const dateBtn = document.getElementById("date-select");
      const målInput = document.getElementById("adv-mål");

      showFieldError(dateBtn, null);
      if (slutdato && startdato && slutdato < startdato) {
        showFieldError(dateBtn, t('endBeforeStart')); return;
      }
      showFieldError(målInput, null);
      if (målBeløbInput && (isNaN(målBeløb) || målBeløb < 0)) {
        showFieldError(målInput, t('amountMustBePositive')); return;
      }

      const record = touch({
        ...a,
        id: a.id,
        navn,
        type: "rejse",
        startdato,
        slutdato,
        målBeløb: målBeløb || 0,
        opsparingAktiveret: false,
        icon: valgtIcon,
        afsluttet: a.afsluttet || false,
        valuta: valuta || null,
        kurs: kurs ? Number(kurs) : null,
      });

      if (existing) {
        const idx = state.adventures.findIndex(x => x.id === a.id);
        state.adventures[idx] = record;
      } else {
        state.adventures.push(record);
      }
      // Kun ved OPRETTELSE — ved redigering har fly/hotel/transport hver
      // deres egen detalje-editor (se klik-håndteringen for [data-detail]
      // ovenfor), som allerede gemmer sig selv uafhængigt af dette ark.
      if (!existing) {
        const dato = startdato || todayISO();
        syncLinkedActivity(a.id, "fly", kildeNavn("fly"), KILDE_INFO.fly.kategori, dato, flyPris);
        syncLinkedActivity(a.id, "hotel", kildeNavn("hotel"), KILDE_INFO.hotel.kategori, dato, hotelPris);
        syncLinkedActivity(a.id, "transport", kildeNavn("transport"), KILDE_INFO.transport.kategori, dato, transportPris);
      }
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
