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
    data.dataVersion = 2;
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

export function defaultData() {
  return {
    dataVersion: 2,
    lang: "da",
    adventures: [],
    activities: [],
    savings: [],
    plans: {},
  };
}

export let state = loadData();
saveData(); // sikrer at en evt. migrering (fx dataVersion, nye felter) skrives tilbage med det samme

export function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
