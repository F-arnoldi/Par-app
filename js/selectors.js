// ---------- Selektorer ----------
import { state, uid } from './data.js';
import { t } from './i18n.js';
import { todayISO, addDaysISO } from './utils.js';

export function getAdventure(id) {
  return state.adventures.find(a => a.id === id);
}

export function activitiesFor(adventureId) {
  return state.activities
    .filter(a => a.adventureId === adventureId)
    .sort((a, b) => a.dato.localeCompare(b.dato));
}

export function savingsFor(adventureId) {
  return state.savings
    .filter(s => s.adventureId === adventureId)
    .sort((a, b) => b.dato.localeCompare(a.dato));
}

export function totalSparet(adventureId) {
  return savingsFor(adventureId).reduce((sum, s) => sum + Number(s.beløb || 0), 0);
}

export function totalAktivitetsPris(adventureId) {
  return activitiesFor(adventureId).reduce((sum, a) => sum + Number(a.pris || 0), 0);
}

export function findLinkedActivity(adventureId, kilde) {
  return state.activities.find(x => x.adventureId === adventureId && x.kilde === kilde);
}

export function syncLinkedActivity(adventureId, kilde, navn, kategori, dato, pris) {
  const idx = state.activities.findIndex(x => x.adventureId === adventureId && x.kilde === kilde);
  if (pris > 0) {
    if (idx >= 0) {
      // Behold brugerens eget navn, hvis aktiviteten er omdøbt i Program-fanen —
      // kun kategori/dato/pris synkroniseres fra eventyr-formularens genvej.
      state.activities[idx] = { ...state.activities[idx], kategori, dato, pris };
    } else {
      state.activities.push({ id: uid(), adventureId, navn, kategori, dato, pris, kilde });
    }
  } else if (idx >= 0) {
    state.activities.splice(idx, 1);
  }
}

export function planFor(adventureId) {
  return state.plans[adventureId] || null;
}

export function allowedTabsFor(a) {
  const tabs = [{ id: "oversigt", label: t('tab_oversigt') }];
  if (a.type !== "oplevelse") tabs.push({ id: "program", label: t('tab_program') });
  if (hasOpsparing(a)) tabs.push({ id: "opsparing", label: t('tab_opsparing') });
  return tabs;
}

export function normalizeTab(a, tab) {
  return allowedTabsFor(a).some(x => x.id === tab) ? tab : "oversigt";
}

// Bundet, selv når slutdato mangler (i modsætning til Program-fanens åbne
// gruppering) — matcher bevidst arkiverings-karensen, så en rejse uden
// slutdato ikke forbliver en "rejsedag" i al fremtid.
export function isTravelDay(a) {
  if (!a.startdato) return false;
  const end = a.slutdato || addDaysISO(a.startdato, 3);
  const today = todayISO();
  return today >= a.startdato && today <= end;
}

export function isIdea(a)      { return !a.afsluttet && !a.startdato; }
export function isPlanned(a)   { return !a.afsluttet && !!a.startdato; }

export function hasOpsparing(a) {
  return a.type !== "oplevelse" || !!a.opsparingAktiveret;
}

export function upcomingAdventures() {
  return [...state.adventures]
    .filter(isPlanned)
    .sort((a, b) => a.startdato.localeCompare(b.startdato));
}

export function ideaAdventures() {
  return [...state.adventures]
    .filter(isIdea)
    .sort((a, b) => (a.navn || "").localeCompare(b.navn || ""));
}

export function pastAdventures() {
  return [...state.adventures]
    .filter(a => a.afsluttet)
    .sort((a, b) => (b.startdato || "").localeCompare(a.startdato || ""));
}
