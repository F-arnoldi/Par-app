// ---------- Data-lag ----------
import { STORAGE_KEY, ICON_VALG } from './constants.js';
import { ICONS } from './icons.js';

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    // Tjek versionen på det rå, gemte objekt — før det bliver flettet med
    // defaultData(), som ellers selv ville forsyne dataVersion: 2 og gøre
    // det umuligt at se om migreringen reelt er kørt endnu.
    const needsV2Migration = !parsed.dataVersion || parsed.dataVersion < 2;
    const needsV3Migration = !parsed.dataVersion || parsed.dataVersion < 3;
    const data = { ...defaultData(), ...parsed };
    if (data.lang !== "da" && data.lang !== "en") data.lang = "da";
    data.adventures = (data.adventures || []).map(a => {
      const merged = {
        afsluttet: false,
        startdato: "",
        slutdato: "",
        målBeløb: 0,
        type: "rejse",
        opsparingAktiveret: false,
        icon: ICON_VALG[0],
        ...a,
      };
      if (!ICONS[merged.icon]) merged.icon = ICON_VALG[0];
      return merged;
    });
    if (needsV2Migration) migrateToV2(data);
    if (needsV3Migration) migrateToV3(data);
    data.dataVersion = 3;
    return data;
  } catch {
    return defaultData();
  }
}

function migrateToV2(data) {
  data.activities = (data.activities || []).map(act => {
    const merged = {
      startTid: "",
      slutTid: "",
      varerTil: "",
      stedNavn: "",
      adresse: "",
      reference: "",
      link: "",
      telefon: "",
      noter: "",
      status: "idé",
      kilde: null,
      ...act,
    };
    if (!merged.kilde) {
      if (merged.navn === "Fly") merged.kilde = "fly";
      else if (merged.navn === "Hotel") merged.kilde = "hotel";
    }
    return merged;
  });
}

// Forbereder hver record til sync (v4): updatedAt/deletedAt/serverId.
// Kører EFTER migrateToV2, så activities allerede har deres rige felter.
function migrateToV3(data) {
  const now = new Date().toISOString();
  const stamp = (x) => ({ updatedAt: now, deletedAt: null, serverId: null, ...x });
  data.adventures = data.adventures.map(stamp);
  data.activities = data.activities.map(stamp);
  data.savings = (data.savings || []).map(stamp);
}

export function defaultData() {
  return {
    dataVersion: 3,
    lang: "da",
    adventures: [],
    activities: [],
    savings: [],
    plans: {},
    lastSyncedAt: null,
    emailPromptDismissed: false,
  };
}

// sync.js tilmelder sig her for at vide hvornår der er noget nyt at synkronisere,
// uden at data.js selv skal kende noget til sync — se onDataSaved(). Skal stå
// FØR state/saveData() nedenfor, som selv kalder saveData() med det samme.
const saveListeners = [];
export function onDataSaved(fn) {
  saveListeners.push(fn);
}

export let state = loadData();
saveData(); // sikrer at en evt. migrering (fx dataVersion, nye felter) skrives tilbage med det samme

export function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveListeners.forEach(fn => fn());
}

export function uid() {
  return crypto.randomUUID();
}

// Stemples af enhver mutator der ændrer en record — sync-motoren (Fase 3)
// bruger updatedAt til last-write-wins, så alt der skriver til en
// adventure/activity/saving skal kalde en af disse to.
export function touch(record) {
  record.updatedAt = new Date().toISOString();
  return record;
}

export function tombstone(record) {
  record.deletedAt = new Date().toISOString();
  return touch(record);
}
