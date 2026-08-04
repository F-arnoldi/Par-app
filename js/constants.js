// ---------- Konstanter ----------
export const STORAGE_KEY = "nyt-eventyr-v1";

export const KATEGORIER = [
  { id: "transport", ikon: "plane" },
  { id: "ophold",    ikon: "bed" },
  { id: "mad",       ikon: "utensils" },
  { id: "oplevelse", ikon: "ticket" },
];

// Fly/hotel/transport er ikke almindelige aktiviteter — de er rejse-
// egenskaber, der (som andre aktiviteter) lever i state.activities med
// kilde sat, men holdes ude af Program-fanens liste og redigeres fra
// eventyr-arket/Oversigt i stedet. Se selectors.js's findLinkedActivity/
// syncLinkedActivity og utils.js's kildeNavn/kildeIkon.
export const KILDE_INFO = {
  fly:       { kategori: "transport", ikon: "plane" },
  hotel:     { kategori: "ophold",    ikon: "bed" },
  transport: { kategori: "transport", ikon: "suitcase" },
};

export const ICON_VALG = ["globe","beach","mountain","landmark","ferris-wheel","wine","spa","ski","boat","tent","sunrise","palette"];

export const MAANEDER_MONO = {
  da: ["JAN","FEB","MAR","APR","MAJ","JUN","JUL","AUG","SEP","OKT","NOV","DEC"],
  en: ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"],
};
export const WEEKDAYS = {
  da: ["M","T","O","T","F","L","S"],
  en: ["M","T","W","T","F","S","S"],
};
