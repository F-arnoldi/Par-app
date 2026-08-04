// ---------- Pakkeliste-fane ----------
// Gemmes som ét jsonb-felt (checklist) direkte på selve eventyr-rækken,
// ikke som en egen synkroniseret tabel — hele eventyr-rækken er allerede
// én LWW-enhed i sync-motoren (navn, datoer osv. har heller ingen
// per-felt-fletning), så en pakkeliste her tilføjer ingen ny konflikt-
// risiko ud over den der allerede gælder for resten af rækken.
import { t } from '../i18n.js';
import { esc } from '../utils.js';
import { uid, state, saveData, touch } from '../data.js';
import { render } from '../router.js';
import { PACKING_TEMPLATES } from '../constants.js';

function renderPackingRow(item) {
  return `
    <div class="item packing-row">
      <label class="packing-check">
        <input type="checkbox" ${item.checket ? "checked" : ""} data-packing-toggle="${item.id}" />
      </label>
      <div class="item-body">
        <p class="item-title ${item.checket ? "packed" : ""}">${esc(item.tekst)}</p>
      </div>
      <button class="icon-btn" data-packing-delete="${item.id}" title="${t('delete')}">✕</button>
    </div>
  `;
}

export function renderPakkelisteTab(a) {
  const items = a.checklist || [];
  const checkedCount = items.filter(i => i.checket).length;

  return `
    ${items.length > 0 ? `
      <div class="total-row">
        <span class="total-row-label">${t('packedProgress')}</span>
        <span class="total-row-val">${checkedCount}/${items.length}</span>
      </div>
    ` : ""}
    <div class="item-list">
      ${items.map(renderPackingRow).join("")}
    </div>
    ${items.length === 0 ? `<p class="search-hint">${t('noPackingItemsYet')}</p>` : ""}
    <div class="field-row" style="margin-top:16px;align-items:flex-end">
      <div class="field" style="margin-bottom:0;flex:1">
        <input type="text" id="packing-new-input" placeholder="${t('packingItemPlaceholder')}" />
      </div>
      <button class="btn" id="packing-add-btn" style="margin-bottom:0">${t('add')}</button>
    </div>
    <p class="paper-eyebrow" style="margin-top:24px">${t('packingTemplatesLabel')}</p>
    <div class="quick-amounts">
      ${Object.keys(PACKING_TEMPLATES).map(key => `<button type="button" class="quick-amount-btn" data-template="${key}">${t('template_' + key)}</button>`).join("")}
    </div>
  `;
}

export function wirePakkelisteTab(a) {
  function saveChecklist(newList) {
    const idx = state.adventures.findIndex(x => x.id === a.id);
    if (idx < 0) return;
    state.adventures[idx] = touch({ ...state.adventures[idx], checklist: newList });
    saveData();
    render();
  }

  document.querySelectorAll("[data-packing-toggle]").forEach(el => {
    el.addEventListener("change", () => {
      const items = (a.checklist || []).map(i => i.id === el.dataset.packingToggle ? { ...i, checket: el.checked } : i);
      saveChecklist(items);
    });
  });

  document.querySelectorAll("[data-packing-delete]").forEach(el => {
    el.addEventListener("click", () => {
      const items = (a.checklist || []).filter(i => i.id !== el.dataset.packingDelete);
      saveChecklist(items);
    });
  });

  function addItem() {
    const input = document.getElementById("packing-new-input");
    const tekst = input.value.trim();
    if (!tekst) return;
    saveChecklist([...(a.checklist || []), { id: uid(), tekst, checket: false }]);
  }
  document.getElementById("packing-add-btn")?.addEventListener("click", addItem);
  document.getElementById("packing-new-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addItem();
  });

  document.querySelectorAll("[data-template]").forEach(el => {
    el.addEventListener("click", () => {
      // Springer tekster der allerede findes på listen over, så et
      // dobbeltklik (eller to skabeloner med overlap, fx pas/oplader) ikke
      // hober de samme punkter op flere gange.
      const existing = new Set((a.checklist || []).map(i => i.tekst.toLowerCase()));
      const newItems = PACKING_TEMPLATES[el.dataset.template]
        .map(key => t('packItem_' + key))
        .filter(tekst => !existing.has(tekst.toLowerCase()))
        .map(tekst => ({ id: uid(), tekst, checket: false }));
      if (newItems.length === 0) return;
      saveChecklist([...(a.checklist || []), ...newItems]);
    });
  });
}
