// ============================================================
// Nyt Eventyr — v2 (iteration 2, opdateret)
// Mobil-first web-app, localStorage-baseret. Ingen backend.
// ============================================================

// ---------- Konstanter ----------
const STORAGE_KEY = "nyt-eventyr-v1";

const KATEGORIER = [
  { id: "transport", ikon: "plane" },
  { id: "ophold",    ikon: "bed" },
  { id: "mad",       ikon: "utensils" },
  { id: "oplevelse", ikon: "ticket" },
];

const ICON_VALG = ["globe","beach","mountain","landmark","ferris-wheel","wine","spa","ski","boat","tent","sunrise","palette"];

const MAANEDER_MONO = {
  da: ["JAN","FEB","MAR","APR","MAJ","JUN","JUL","AUG","SEP","OKT","NOV","DEC"],
  en: ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"],
};
const WEEKDAYS = {
  da: ["M","T","O","T","F","L","S"],
  en: ["M","T","W","T","F","S","S"],
};

// ---------- Ikoner ----------
// Selv-indeholdt, monokromt SVG-ikonsæt (ingen ekstern ikon-font/CDN).
// Hvert ikon arver farve fra sin container via currentColor.
const ICONS = {
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  beach: '<circle cx="12" cy="9" r="4"/><path d="M3 17c2-2 4-2 6 0s4 2 6 0s4-2 6 0"/>',
  mountain: '<path d="M3 18L9 8l4 5l3-3l5 8"/>',
  landmark: '<path d="M3 10l9-5l9 5"/><path d="M5 10v11M19 10v11M9 10v11M15 10v11"/><path d="M3 21h18"/>',
  "ferris-wheel": '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  wine: '<path d="M8 3h8"/><path d="M8 3c0 5 1.5 8 4 8s4-3 4-8"/><path d="M12 11v7"/><path d="M8 21h8"/>',
  spa: '<path d="M4 20c8 0 14-6 14-16c-10 0-16 6-16 14c0 1 0 2 2 2z"/><path d="M6 18c4-4 8-8 12-12"/>',
  ski: '<path d="M12 2v20"/><path d="M4.2 6L19.8 18"/><path d="M19.8 6L4.2 18"/>',
  boat: '<path d="M3 16h18l-2 4H5z"/><path d="M12 16V4"/><path d="M12 5l6 7"/>',
  tent: '<path d="M12 4l9 16H3z"/><path d="M12 4v16"/><path d="M9 20l3-5.5l3 5.5"/>',
  sunrise: '<path d="M3 18h18"/><path d="M7 18a5 5 0 0110 0"/><path d="M12 8v3M6.5 12.5l1.4 1.4M17.5 12.5l-1.4 1.4"/>',
  palette: '<path d="M12 3a9 9 0 100 18c1.4 0 1.9-.9 1.9-1.8c0-.8-.5-1.3-.5-2.1c0-1.3 1.3-1.7 2.6-1.7c2.3 0 4-1.9 4-4.2C20 6 16.5 3 12 3z"/><circle cx="8.3" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.3" r="1" fill="currentColor" stroke="none"/><circle cx="15.6" cy="9.7" r="1" fill="currentColor" stroke="none"/>',
  suitcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M3 12h18"/>',
  plane: '<path d="M21 3L11 13"/><path d="M21 3l-7 18-4-8-8-4z"/>',
  bed: '<path d="M3 19v-7a2 2 0 012-2h14a2 2 0 012 2v7"/><path d="M3 19h18"/><path d="M3 14h18"/><circle cx="7.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  utensils: '<path d="M6 3v7a2 2 0 002 2v9M6 3v7M9 3v7"/><path d="M17 3c-2 0-3 2-3 4v4a2 2 0 002 2v8"/>',
  ticket: '<path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v1.5a1.7 1.7 0 000 5V16a2 2 0 01-2 2H6a2 2 0 01-2-2v-1.5a1.7 1.7 0 000-5z"/><path d="M14 6.5v11" stroke-dasharray="2.2 2.2"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M9 9.5c0-1.1 1.2-2 3-2s3 .9 3 2c0 2.2-6 1-6 3.5c0 1.1 1.2 2 3 2s3-.9 3-2"/><path d="M12 5.8v1.2M12 16v1.2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6l9-6"/>',
  bookmark: '<path d="M6 3h12a1 1 0 011 1v17l-7-4l-7 4V4a1 1 0 011-1z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  link: '<path d="M9 15l6-6"/><path d="M8 12l-2 2a3 3 0 004 4l3-3"/><path d="M16 12l2-2a3 3 0 00-4-4l-3 3"/>',
  pin: '<path d="M12 2a6 6 0 00-6 6c0 5 6 12 6 12s6-7 6-12a6 6 0 00-6-6z"/><circle cx="12" cy="8" r="2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  more: '<circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
};

function icon(name, cls = "") {
  const inner = ICONS[name] || ICONS.pin;
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

// ---------- Sprog ----------
const STRINGS = {
  da: {
    appName: "Nyt Eventyr",
    menu: "Menu",
    noAdventuresYet: "Ingen eventyr endnu",
    dreamHeadline: "Hvad drømmer I om?",
    newAdventure: "Nyt eventyr",
    noUpcoming: "Ingen planlagte eventyr",
    sectionUpcoming: "Kommende",
    sectionIdeas: "Idéer",
    sectionMemories: "Minder",
    noDate: "Uden dato",
    nextAdventure: "Næste eventyr",
    heroSaved: (v) => `Sparet ${v}`,
    heroOf: (v) => `af ${v}`,
    unit_today: "i dag",
    unit_day: "dag",
    unit_days: "dage",
    unit_day_ago: "dag siden",
    unit_days_ago: "dage siden",
    backLabel: "Rejser",
    ideaNoDateHeading: "Idé — endnu uden dato",
    tab_oversigt: "Oversigt",
    tab_planer: "Planer",
    tab_opsparing: "Opsparing",
    countdownLabel: "Nedtælling",
    setDate: "Sæt en dato",
    startLabel: "Start",
    endLabel: "Slut",
    priceLabel: "Pris",
    opsparingLabel: "Opsparing",
    setAmountSuggest: (v) => `Sæt et beløb I sætter af (foreslå ${v})`,
    setAmount: "Sæt et beløb I sætter af",
    saved: "Sparet",
    missing: "Mangler",
    overAmount: "Over beløbet",
    settingAside: (v) => `Sætter af ${v}`,
    prognoseGood: (d) => `Med jeres nuværende spareplan er I i mål <b>${d}</b> — <b>før</b> eventyret starter.`,
    prognoseWarn: (d) => `Med jeres nuværende spareplan er I i mål <b>${d}</b> — det er <b>efter</b> eventyret starter.`,
    plannedExpenses: "Planlagte udgifter",
    sumOfActivities: "Sum af aktiviteter",
    leftOfAmount: "Tilbage af beløbet",
    planerEmptyTitle: "Skallen er på plads —<br>tilføj det I allerede har i tankerne.",
    planerEmptyText: "Flybilletter, en middag I glæder jer til, en tur op i bjerget. Alt tæller.",
    addActivity: "+ Tilføj aktivitet",
    total: "Samlet",
    edit: "Redigér",
    delete: "Slet",
    confirmDeleteActivity: "Slet denne aktivitet?",
    logPayment: "Log en indbetaling",
    amount: "Beløb",
    date: "Dato",
    noteOptional: "Notat (valgfrit)",
    notePlaceholder: "fx bonus fra chefen",
    logPaymentBtn: "Log indbetaling",
    savingsPlan: "Spareplan",
    frequency: "Frekvens",
    perWeek: "Pr. uge",
    perMonth: "Pr. måned",
    saveSavingsPlan: "Gem spareplan",
    savedTotal: "Sparet i alt",
    history: "Historik",
    noPaymentsYet: "Ingen indbetalinger endnu.",
    confirmDeletePayment: "Slet denne indbetaling?",
    amountValidation: "Angiv et beløb større end 0",
    dateValidation: "Vælg en dato",
    paymentLogged: "Indbetaling logget",
    planSaved: "Spareplan gemt",
    editAdventure: "Redigér eventyr",
    invitePartner: "Invitér partner",
    markDone: "Marker som afsluttet",
    saveToMemories: "Gem i minder",
    deleteAdventure: "Slet eventyr",
    confirmDeleteAdventure: (navn) => `Slet "${navn}" og alle tilknyttede aktiviteter og opsparinger?`,
    movedToMemories: "Flyttet til Minder",
    savedToMemoriesToast: "Gemt i minder",
    calendar: "Kalender",
    allAdventures: "Alle eventyr",
    about: "Om appen",
    comingSoon: "Kommer snart",
    language: "Sprog",
    langNameDa: "Dansk",
    langNameEn: "English",
    prev: "Forrige",
    today: "I dag",
    next: "Næste",
    thisMonth: "Denne måned",
    noEventsInMonth: (m) => `Ingen eventyr i ${m}.`,
    legendTrip: "Rejse",
    legendExperience: "Oplevelse",
    legendIdea: "Idé",
    typeLabel: "Type",
    typeRejse: "Rejse",
    typeOplevelse: "Oplevelse",
    iconLabel: "Ikon",
    nameLabel: "Navn *",
    namePlaceholder: "fx Portugal-tur eller Spa-dag",
    cancel: "Annuller",
    save: "Gem",
    create: "Opret",
    priceLabelKr: "Pris (kr.) *",
    pickDate: "Vælg dato",
    saveTowardThis: "Vi vil spare op til denne",
    datesLabel: "Datoer",
    pickDates: "Vælg datoer",
    amountSetAsideLabel: "Beløb I sætter af (kr.)",
    optional: "Valgfrit",
    flyLabel: "Fly (kr.)",
    hotelLabel: "Hotel (kr.)",
    nameRequired: "Angiv et navn",
    priceRequired: "Angiv en pris større end 0",
    endBeforeStart: "Slutdato kan ikke ligge før startdato",
    amountMustBePositive: "Beløbet I sætter af skal være 0 eller derover",
    editActivityTitle: "Redigér aktivitet",
    newActivityTitle: "Ny aktivitet",
    namePlaceholderAct: "fx Flybilletter",
    categoryLabel: "Kategori",
    dateRequiredLabel: "Dato *",
    priceLabelOptional: "Pris (kr.)",
    add: "Tilføj",
    invitePartnerTitle: "Invitér partner",
    inviteIntro: "Del koden eller linket — jeres partner kan se eventyret før de opretter noget.",
    inviteCode: "Invite-kode",
    previewLabel: "Preview af eventyret",
    ideaLabel: "Idé",
    copyLink: "Kopiér link",
    inviteFootnote: "NB: Rigtig deling mellem to telefoner kræver backend (kommer i runde 2).<br>Dette er et preview af hvordan flowet vil være.",
    linkCopied: "Link kopieret",
    copyLinkManually: "Kopiér linket manuelt:",
    whenDoYouLeave: "Hvornår tager I af sted?",
    singleDateOnly: "Kun én dato",
    prevMonthAria: "Forrige måned",
    nextMonthAria: "Næste måned",
    startChip: "Start",
    endChip: "Slut",
    confirm: "Bekræft",
    pickStartDate: "Vælg mindst en startdato",
    kat_transport: "Transport",
    kat_ophold: "Ophold",
    kat_mad: "Mad",
    kat_oplevelse: "Oplevelse",
    adventureFallback: "Eventyr",
    addToCalendar: "Tilføj til kalender",
    icsAmountLine: (v) => `Beløb sat af: ${v}`,
  },
  en: {
    appName: "New Adventure",
    menu: "Menu",
    noAdventuresYet: "No adventures yet",
    dreamHeadline: "What are you dreaming of?",
    newAdventure: "New adventure",
    noUpcoming: "No upcoming adventures",
    sectionUpcoming: "Upcoming",
    sectionIdeas: "Ideas",
    sectionMemories: "Memories",
    noDate: "No date",
    nextAdventure: "Next adventure",
    heroSaved: (v) => `Saved ${v}`,
    heroOf: (v) => `of ${v}`,
    unit_today: "today",
    unit_day: "day",
    unit_days: "days",
    unit_day_ago: "day ago",
    unit_days_ago: "days ago",
    backLabel: "Trips",
    ideaNoDateHeading: "Idea — no date yet",
    tab_oversigt: "Overview",
    tab_planer: "Plans",
    tab_opsparing: "Savings",
    countdownLabel: "Countdown",
    setDate: "Set a date",
    startLabel: "Start",
    endLabel: "End",
    priceLabel: "Price",
    opsparingLabel: "Savings",
    setAmountSuggest: (v) => `Set an amount you're setting aside (suggest ${v})`,
    setAmount: "Set an amount you're setting aside",
    saved: "Saved",
    missing: "Missing",
    overAmount: "Over the amount",
    settingAside: (v) => `Setting aside ${v}`,
    prognoseGood: (d) => `At your current savings pace you'll hit your goal by <b>${d}</b> — <b>before</b> the trip starts.`,
    prognoseWarn: (d) => `At your current savings pace you'll hit your goal by <b>${d}</b> — that's <b>after</b> the trip starts.`,
    plannedExpenses: "Planned expenses",
    sumOfActivities: "Sum of activities",
    leftOfAmount: "Left of the amount",
    planerEmptyTitle: "The shell's in place —<br>add what you already have in mind.",
    planerEmptyText: "Flight tickets, a dinner you're looking forward to, a trip up the mountain. It all counts.",
    addActivity: "+ Add activity",
    total: "Total",
    edit: "Edit",
    delete: "Delete",
    confirmDeleteActivity: "Delete this activity?",
    logPayment: "Log a payment",
    amount: "Amount",
    date: "Date",
    noteOptional: "Note (optional)",
    notePlaceholder: "e.g. bonus from work",
    logPaymentBtn: "Log payment",
    savingsPlan: "Savings plan",
    frequency: "Frequency",
    perWeek: "Per week",
    perMonth: "Per month",
    saveSavingsPlan: "Save plan",
    savedTotal: "Total saved",
    history: "History",
    noPaymentsYet: "No payments logged yet.",
    confirmDeletePayment: "Delete this payment?",
    amountValidation: "Enter an amount greater than 0",
    dateValidation: "Select a date",
    paymentLogged: "Payment logged",
    planSaved: "Savings plan saved",
    editAdventure: "Edit adventure",
    invitePartner: "Invite partner",
    markDone: "Mark as completed",
    saveToMemories: "Save to memories",
    deleteAdventure: "Delete adventure",
    confirmDeleteAdventure: (navn) => `Delete "${navn}" and all linked activities and savings?`,
    movedToMemories: "Moved to Memories",
    savedToMemoriesToast: "Saved to memories",
    calendar: "Calendar",
    allAdventures: "All adventures",
    about: "About the app",
    comingSoon: "Coming soon",
    language: "Language",
    langNameDa: "Dansk",
    langNameEn: "English",
    prev: "Previous",
    today: "Today",
    next: "Next",
    thisMonth: "This month",
    noEventsInMonth: (m) => `No adventures in ${m}.`,
    legendTrip: "Trip",
    legendExperience: "Experience",
    legendIdea: "Idea",
    typeLabel: "Type",
    typeRejse: "Trip",
    typeOplevelse: "Experience",
    iconLabel: "Icon",
    nameLabel: "Name *",
    namePlaceholder: "e.g. Portugal trip or Spa day",
    cancel: "Cancel",
    save: "Save",
    create: "Create",
    priceLabelKr: "Price (kr.) *",
    pickDate: "Pick a date",
    saveTowardThis: "We'll save up for this",
    datesLabel: "Dates",
    pickDates: "Pick dates",
    amountSetAsideLabel: "Amount you're setting aside (kr.)",
    optional: "Optional",
    flyLabel: "Flights (kr.)",
    hotelLabel: "Hotel (kr.)",
    nameRequired: "Enter a name",
    priceRequired: "Enter a price greater than 0",
    endBeforeStart: "End date can't be before the start date",
    amountMustBePositive: "The amount you're setting aside must be 0 or more",
    editActivityTitle: "Edit activity",
    newActivityTitle: "New activity",
    namePlaceholderAct: "e.g. Flight tickets",
    categoryLabel: "Category",
    dateRequiredLabel: "Date *",
    priceLabelOptional: "Price (kr.)",
    add: "Add",
    invitePartnerTitle: "Invite partner",
    inviteIntro: "Share the code or link — your partner can see the adventure before creating anything.",
    inviteCode: "Invite code",
    previewLabel: "Adventure preview",
    ideaLabel: "Idea",
    copyLink: "Copy link",
    inviteFootnote: "Note: real sharing between two phones needs a backend (coming in round 2).<br>This is a preview of how the flow will work.",
    linkCopied: "Link copied",
    copyLinkManually: "Copy the link manually:",
    whenDoYouLeave: "When are you heading off?",
    singleDateOnly: "Single date only",
    prevMonthAria: "Previous month",
    nextMonthAria: "Next month",
    startChip: "Start",
    endChip: "End",
    confirm: "Confirm",
    pickStartDate: "Pick at least a start date",
    kat_transport: "Transport",
    kat_ophold: "Stay",
    kat_mad: "Food",
    kat_oplevelse: "Experience",
    adventureFallback: "Adventure",
    addToCalendar: "Add to calendar",
    icsAmountLine: (v) => `Amount set aside: ${v}`,
  },
};

function t(key, ...args) {
  const entry = (STRINGS[state.lang] || STRINGS.da)[key] ?? STRINGS.da[key];
  return typeof entry === "function" ? entry(...args) : (entry ?? key);
}

function locale() {
  return state.lang === "en" ? "en-GB" : "da-DK";
}

// ---------- Data-lag ----------
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
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
    return data;
  } catch {
    return defaultData();
  }
}

function defaultData() {
  return {
    lang: "da",
    adventures: [],
    activities: [],
    savings: [],
    plans: {},
  };
}

let state = loadData();

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Selektorer ----------
function getAdventure(id) {
  return state.adventures.find(a => a.id === id);
}

function activitiesFor(adventureId) {
  return state.activities
    .filter(a => a.adventureId === adventureId)
    .sort((a, b) => a.dato.localeCompare(b.dato));
}

function savingsFor(adventureId) {
  return state.savings
    .filter(s => s.adventureId === adventureId)
    .sort((a, b) => b.dato.localeCompare(a.dato));
}

function totalSparet(adventureId) {
  return savingsFor(adventureId).reduce((sum, s) => sum + Number(s.beløb || 0), 0);
}

function totalAktivitetsPris(adventureId) {
  return activitiesFor(adventureId).reduce((sum, a) => sum + Number(a.pris || 0), 0);
}

function findLinkedActivity(adventureId, navn) {
  return state.activities.find(x => x.adventureId === adventureId && x.navn === navn);
}

function syncLinkedActivity(adventureId, navn, kategori, dato, pris) {
  const idx = state.activities.findIndex(x => x.adventureId === adventureId && x.navn === navn);
  if (pris > 0) {
    if (idx >= 0) {
      state.activities[idx] = { ...state.activities[idx], kategori, dato, pris };
    } else {
      state.activities.push({ id: uid(), adventureId, navn, kategori, dato, pris });
    }
  } else if (idx >= 0) {
    state.activities.splice(idx, 1);
  }
}

function planFor(adventureId) {
  return state.plans[adventureId] || null;
}

function allowedTabsFor(a) {
  const tabs = [{ id: "oversigt", label: t('tab_oversigt') }];
  if (a.type !== "oplevelse") tabs.push({ id: "planer", label: t('tab_planer') });
  if (hasOpsparing(a)) tabs.push({ id: "opsparing", label: t('tab_opsparing') });
  return tabs;
}

function normalizeTab(a, tab) {
  return allowedTabsFor(a).some(t => t.id === tab) ? tab : "oversigt";
}

function isIdea(a)      { return !a.afsluttet && !a.startdato; }
function isPlanned(a)   { return !a.afsluttet && !!a.startdato; }

function hasOpsparing(a) {
  return a.type !== "oplevelse" || !!a.opsparingAktiveret;
}

function upcomingAdventures() {
  return [...state.adventures]
    .filter(isPlanned)
    .sort((a, b) => a.startdato.localeCompare(b.startdato));
}

function ideaAdventures() {
  return [...state.adventures]
    .filter(isIdea)
    .sort((a, b) => (a.navn || "").localeCompare(b.navn || ""));
}

function pastAdventures() {
  return [...state.adventures]
    .filter(a => a.afsluttet)
    .sort((a, b) => (b.startdato || "").localeCompare(a.startdato || ""));
}

// ---------- Utilities ----------
function todayISO() {
  return toISO(new Date());
}

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(fromISO, toISO_) {
  const a = new Date(fromISO + "T00:00:00");
  const b = new Date(toISO_ + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
}

function formatMonoDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const months = MAANEDER_MONO[state.lang] || MAANEDER_MONO.da;
  return `${day} ${months[d.getMonth()]}`;
}

function formatMonoRange(start, end) {
  if (!start) return "";
  const s = new Date(start + "T00:00:00");
  const startFmt = formatMonoDate(start);
  const startYear = s.getFullYear();
  if (!end || end === start) return `${startFmt} · ${startYear}`;
  const e = new Date(end + "T00:00:00");
  const endFmt = formatMonoDate(end);
  const endYear = e.getFullYear();
  if (startYear === endYear) {
    return `${startFmt} — ${endFmt} · ${startYear}`;
  }
  return `${startFmt} ${startYear} — ${endFmt} ${endYear}`;
}

function formatKr(n) {
  const val = Math.round(Number(n) || 0);
  return val.toLocaleString(locale()) + " kr.";
}

// ---------- Kalender-eksport ----------
function icsEscape(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function icsFoldLines(text) {
  return text.split("\r\n").map(line => {
    if (line.length <= 75) return line;
    let folded = "";
    let rest = line;
    while (rest.length > 75) {
      folded += rest.slice(0, 75) + "\r\n ";
      rest = rest.slice(75);
    }
    return folded + rest;
  }).join("\r\n");
}

function addDaysISO(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
}

function buildICS(a) {
  const dtStart = a.startdato.replace(/-/g, "");
  const dtEnd = addDaysISO(a.slutdato || a.startdato, 1).replace(/-/g, "");
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nyt Eventyr//DA",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${a.id}@nyt-eventyr`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${icsEscape(a.navn)}`,
  ];
  if (Number(a.målBeløb) > 0) {
    lines.push(`DESCRIPTION:${icsEscape(t('icsAmountLine', formatKr(a.målBeløb)))}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return icsFoldLines(lines.join("\r\n"));
}

function downloadICS(a) {
  const ics = buildICS(a);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const filename = (a.navn || "eventyr")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "eventyr";
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function heroCountdown(startdato) {
  const d = daysBetween(todayISO(), startdato);
  if (d === 0) return { num: "0", unit: t('unit_today') };
  if (d === 1) return { num: "1", unit: t('unit_day') };
  if (d > 0)   return { num: String(d), unit: t('unit_days') };
  if (d === -1) return { num: "1", unit: t('unit_day_ago') };
  return { num: String(-d), unit: t('unit_days_ago') };
}

function shortCountdown(startdato) {
  const d = daysBetween(todayISO(), startdato);
  if (d === 0) return { num: t('unit_today'), unit: "" };
  if (d === 1) return { num: "1", unit: t('unit_day') };
  if (d > 0)   return { num: String(d), unit: t('unit_days') };
  if (d === -1) return { num: "1", unit: t('unit_day_ago') };
  return { num: String(-d), unit: t('unit_days_ago') };
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function kategoriIkon(id) {
  const k = KATEGORIER.find(k => k.id === id);
  return k ? k.ikon : "pin";
}

function kategoriNavn(id) {
  const k = KATEGORIER.find(k => k.id === id);
  return k ? t('kat_' + id) : "";
}

// ---------- Router ----------
function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "list" };
  if (parts[0] === "calendar") return { name: "calendar" };
  if (parts[0] === "adventure" && parts[1]) {
    return {
      name: "detail",
      id: parts[1],
      tab: parts[2] || "oversigt",
    };
  }
  return { name: "list" };
}

function navigate(path) {
  location.hash = path;
}

window.addEventListener("hashchange", render);

// ---------- Render ----------
function render() {
  const route = parseRoute();
  const root = document.getElementById("app");

  if (route.name === "detail") {
    const adv = getAdventure(route.id);
    if (!adv) { navigate("/"); return; }
    const tab = normalizeTab(adv, route.tab);
    root.innerHTML = renderDetail(adv, tab);
    wireDetail(adv, tab);
    return;
  }

  if (route.name === "calendar") {
    root.innerHTML = renderCalendar();
    wireCalendar();
    return;
  }

  root.innerHTML = renderList();
  wireList();
}

// ---------- Liste (forside) ----------
function renderList() {
  const upcoming = upcomingAdventures();
  const ideas = ideaAdventures();
  const past = pastAdventures();

  if (state.adventures.length === 0) {
    return `
      ${renderHomeTop()}
      <div class="hero-empty">
        <p class="eyebrow" style="color:var(--ink-soft)">${t('noAdventuresYet')}</p>
        <h2>${t('dreamHeadline')}</h2>
        <button class="btn btn-rust" data-action="new">
          <span class="fab-plus">+</span> ${t('newAdventure')}
        </button>
      </div>
    `;
  }

  const next = upcoming[0];
  const kommende = upcoming.slice(next ? 1 : 0);

  return `
    ${renderHomeTop()}
    ${next
      ? renderHero(next)
      : `
        <div class="hero-empty">
          <p class="eyebrow" style="color:var(--ink-soft)">${t('noUpcoming')}</p>
          <h2>${t('dreamHeadline')}</h2>
          <button class="btn btn-rust" data-action="new">
            <span class="fab-plus">+</span> ${t('newAdventure')}
          </button>
        </div>
      `}
    ${kommende.length > 0 ? `
      <p class="section-eyebrow">${t('sectionUpcoming')}</p>
      <div class="trip-list">
        ${kommende.map(renderTripRow).join("")}
      </div>
    ` : ""}
    ${ideas.length > 0 ? `
      <p class="section-eyebrow">${t('sectionIdeas')}</p>
      <div class="trip-list ideer">
        ${ideas.map(renderIdeaRow).join("")}
      </div>
    ` : ""}
    ${past.length > 0 ? `
      <p class="section-eyebrow">${t('sectionMemories')}</p>
      <div class="trip-list minder">
        ${past.map(renderTripRow).join("")}
      </div>
    ` : ""}
    <button class="fab" data-action="new">
      <span class="fab-plus">+</span> ${t('newAdventure')}
    </button>
  `;
}

function renderHomeTop() {
  return `
    <div class="home-top">
      <span class="brand">${t('appName')}</span>
      <button class="icon-only" data-action="app-menu" aria-label="${t('menu')}">${icon("menu")}</button>
    </div>
  `;
}

function renderHero(a) {
  const sparet = totalSparet(a.id);
  const målBeløb = Number(a.målBeløb) || 0;
  const pct = målBeløb > 0 ? Math.min(100, (sparet / målBeløb) * 100) : 0;
  const cd = heroCountdown(a.startdato);
  const range = formatMonoRange(a.startdato, a.slutdato);

  return `
    <div class="hero" data-id="${a.id}">
      <p class="eyebrow">${t('nextAdventure')}</p>
      <h2 class="hero-title">${esc(a.navn)}</h2>
      <p class="hero-dates">${range}</p>
      <div class="hero-count">
        <span class="hero-count-num">${cd.num}</span>
        <span class="hero-count-unit">${cd.unit}</span>
      </div>
      ${målBeløb > 0 ? `
        <div class="hero-savings">
          <div class="hero-savings-row">
            <span>${t('heroSaved', formatKr(sparet))}</span>
            <span>${t('heroOf', formatKr(målBeløb))}</span>
          </div>
          <div class="hero-progress">
            <div class="hero-progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

function renderTripRow(a) {
  const cd = a.startdato ? shortCountdown(a.startdato) : { num: "", unit: "" };
  const range = a.startdato ? formatMonoRange(a.startdato, a.slutdato) : "";
  return `
    <div class="trip-row" data-id="${a.id}">
      <div class="trip-glyph">${icon(a.icon)}</div>
      <div class="trip-info">
        <p class="trip-name">${esc(a.navn)}</p>
        ${range ? `<p class="trip-dates">${range}</p>` : ""}
      </div>
      ${cd.num ? `
        <div class="trip-days">
          <div class="trip-days-num">${cd.num}</div>
          ${cd.unit ? `<span class="trip-days-unit">${cd.unit}</span>` : ""}
        </div>
      ` : ""}
    </div>
  `;
}

function renderIdeaRow(a) {
  return `
    <div class="trip-row" data-id="${a.id}">
      <div class="trip-glyph">${icon(a.icon)}</div>
      <div class="trip-info">
        <p class="trip-name">${esc(a.navn)}</p>
        <p class="trip-dates trip-dates-faint">${t('noDate')}</p>
      </div>
    </div>
  `;
}

function wireList() {
  document.querySelector(".hero")?.addEventListener("click", (e) => {
    navigate(`/adventure/${e.currentTarget.dataset.id}`);
  });
  document.querySelectorAll(".trip-row").forEach(el => {
    el.addEventListener("click", () => navigate(`/adventure/${el.dataset.id}`));
  });
  document.querySelectorAll('[data-action="new"]').forEach(el => {
    el.addEventListener("click", () => openAdventureModal());
  });
  document.querySelector('[data-action="app-menu"]')?.addEventListener("click", openAppMenu);
}

// ---------- Detalje-visning ----------
function renderDetail(a, tab) {
  const range = a.startdato
    ? formatMonoRange(a.startdato, a.slutdato)
    : "";

  const tabs = allowedTabsFor(a);

  let tabContent = "";
  if (tab === "planer")         tabContent = renderPlanerTab(a);
  else if (tab === "opsparing") tabContent = renderOpsparingTab(a);
  else                          tabContent = renderOversigtTab(a);

  return `
    <div class="detail-top">
      <button class="back-link" data-action="back">‹ ${t('backLabel')}</button>
      <button class="icon-only" data-action="detail-menu" aria-label="${t('menu')}">${icon("more")}</button>
    </div>
    <div class="detail-hero">
      <div class="detail-glyph">${icon(a.icon)}</div>
      <h1 class="detail-name">${esc(a.navn)}</h1>
      ${range
        ? `<p class="detail-mono">${range}</p>`
        : `<p class="detail-mono faint">${t('ideaNoDateHeading')}</p>`}
    </div>
    <div class="tabs">
      ${tabs.map(t => `
        <button class="tab ${t.id === tab ? "active" : ""}" data-tab="${t.id}">${t.label}</button>
      `).join("")}
    </div>
    ${tabContent}
  `;
}

function wireDetail(a, tab) {
  document.querySelector('[data-action="back"]')?.addEventListener("click", () => navigate("/"));
  document.querySelector('[data-action="detail-menu"]')?.addEventListener("click", () => openDetailMenu(a));
  document.querySelectorAll(".tab").forEach(el => {
    el.addEventListener("click", () => navigate(`/adventure/${a.id}/${el.dataset.tab}`));
  });

  if (tab === "planer") wirePlaner(a);
  else if (tab === "opsparing") wireOpsparing(a);
  else wireOversigt(a);
}

// ---------- Oversigt-fane ----------
function renderOversigtTab(a) {
  const sparet    = totalSparet(a.id);
  const målBeløb  = Number(a.målBeløb) || 0;
  const mangler   = målBeløb - sparet;
  const overskud  = -mangler;
  const pct       = målBeløb > 0 ? Math.min(100, (sparet / målBeløb) * 100) : 0;
  const aktPris   = totalAktivitetsPris(a.id);
  const plan      = planFor(a.id);

  // Nedtælling section
  let countdownHtml;
  if (!a.startdato) {
    countdownHtml = `
      <div class="countdown-card">
        <p class="paper-eyebrow">${t('countdownLabel')}</p>
        <button class="placeholder-tap" data-action="edit-dates">${t('setDate')}</button>
      </div>
    `;
  } else {
    const cd = heroCountdown(a.startdato);
    countdownHtml = `
      <div class="countdown-card">
        <p class="paper-eyebrow">${t('countdownLabel')}</p>
        <div class="countdown-big">
          <span class="countdown-big-num">${cd.num}</span>
          <span class="countdown-big-unit">${cd.unit}</span>
        </div>
        <div class="countdown-dates-row">
          <div>
            <span class="label">${t('startLabel')}</span>
            <span class="val">${formatMonoDate(a.startdato)} ${new Date(a.startdato + "T00:00:00").getFullYear()}</span>
          </div>
          ${a.slutdato ? `
            <div>
              <span class="label">${t('endLabel')}</span>
              <span class="val">${formatMonoDate(a.slutdato)} ${new Date(a.slutdato + "T00:00:00").getFullYear()}</span>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }

  // Opsparing section
  let opsparingHtml;
  if (!hasOpsparing(a)) {
    opsparingHtml = målBeløb > 0 ? `
      <div class="paper">
        <p class="paper-eyebrow">${t('priceLabel')}</p>
        <p class="stat-big">${formatKr(målBeløb)}</p>
      </div>
    ` : "";
  } else if (!målBeløb) {
    const forslagsTekst = aktPris > 0
      ? t('setAmountSuggest', formatKr(aktPris))
      : t('setAmount');
    opsparingHtml = `
      <div class="paper">
        <p class="paper-eyebrow">${t('opsparingLabel')}</p>
        <button class="placeholder-tap" data-action="edit-mål">${forslagsTekst}</button>
      </div>
    `;
  } else {
    let prognose = "";
    if (plan && mangler > 0 && plan.planlagtBeløb > 0 && a.startdato) {
      const perDag = plan.frekvens === "uge"
        ? plan.planlagtBeløb / 7
        : plan.planlagtBeløb / 30;
      const dageTilMål = Math.ceil(mangler / perDag);
      const målDato = new Date();
      målDato.setDate(målDato.getDate() + dageTilMål);
      const målDatoISO = målDato.toISOString().slice(0, 10);
      const forRejsen = målDatoISO <= a.startdato;
      prognose = `
        <div class="callout ${forRejsen ? "good" : "warn"}">
          <span class="callout-icon">${forRejsen ? "✓" : "⚠"}</span>
          <div>
            ${forRejsen ? t('prognoseGood', formatDate(målDatoISO)) : t('prognoseWarn', formatDate(målDatoISO))}
          </div>
        </div>
      `;
    }

    opsparingHtml = `
      <div class="paper">
        <p class="paper-eyebrow">${t('opsparingLabel')}</p>
        <div class="stat-row">
          <div>
            <p class="stat-big">${formatKr(sparet)}</p>
            <p class="stat-label">${t('saved')}</p>
          </div>
          <div>
            <p class="stat-big ${mangler > 0 ? 'rust' : 'sage'}">
              ${mangler > 0 ? formatKr(mangler) : formatKr(overskud)}
            </p>
            <p class="stat-label">${mangler > 0 ? t('missing') : t('overAmount')}</p>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="progress-meta">
          <span>${Math.round(pct)}%</span>
          <span>${t('settingAside', formatKr(målBeløb))}</span>
        </div>
        ${prognose}
      </div>
    `;
  }

  return `
    ${countdownHtml}
    ${opsparingHtml}
    ${aktPris > 0 && målBeløb > 0 ? `
      <div class="paper">
        <p class="paper-eyebrow">${t('plannedExpenses')}</p>
        <div class="stat-row">
          <div>
            <p class="stat-big">${formatKr(aktPris)}</p>
            <p class="stat-label">${t('sumOfActivities')}</p>
          </div>
          <div>
            <p class="stat-big ${aktPris > målBeløb ? 'rust' : 'sage'}">
              ${aktPris > målBeløb ? "+" + formatKr(aktPris - målBeløb) : formatKr(målBeløb - aktPris)}
            </p>
            <p class="stat-label">${aktPris > målBeløb ? t('overAmount') : t('leftOfAmount')}</p>
          </div>
        </div>
      </div>
    ` : ""}
  `;
}

function wireOversigt(a) {
  document.querySelector('[data-action="edit-dates"]')?.addEventListener("click", () => openAdventureModal(a));
  document.querySelector('[data-action="edit-mål"]')?.addEventListener("click", () => openAdventureModal(a));
}

// ---------- Planer-fane ----------
function renderPlanerTab(a) {
  const akt = activitiesFor(a.id);
  const total = totalAktivitetsPris(a.id);

  if (akt.length === 0) {
    return `
      <div class="planer-empty">
        <h3>${t('planerEmptyTitle')}</h3>
        <p>${t('planerEmptyText')}</p>
        <button class="btn btn-rust btn-block" data-action="add-activity">
          ${t('addActivity')}
        </button>
      </div>
    `;
  }

  return `
    <div class="total-row">
      <span class="total-row-label">${t('total')}</span>
      <span class="total-row-val">${formatKr(total)}</span>
    </div>

    <div class="item-list">
      ${akt.map(x => `
        <div class="item">
          <div class="item-icon">${icon(kategoriIkon(x.kategori))}</div>
          <div class="item-body">
            <p class="item-title">${esc(x.navn)}</p>
            <p class="item-meta">${formatMonoDate(x.dato)} · ${kategoriNavn(x.kategori)}</p>
          </div>
          <div class="item-price">${formatKr(x.pris)}</div>
          <div class="item-actions">
            <button class="icon-btn" data-edit-activity="${x.id}" title="${t('edit')}">${icon("pencil")}</button>
            <button class="icon-btn" data-del-activity="${x.id}" title="${t('delete')}">✕</button>
          </div>
        </div>
      `).join("")}
    </div>

    <button class="add-btn" data-action="add-activity">
      ${t('addActivity')}
    </button>
  `;
}

function wirePlaner(a) {
  document.querySelectorAll('[data-action="add-activity"]').forEach(el => {
    el.addEventListener("click", () => openActivityModal(a));
  });
  document.querySelectorAll("[data-edit-activity]").forEach(el => {
    el.addEventListener("click", () => {
      const act = state.activities.find(x => x.id === el.dataset.editActivity);
      if (act) openActivityModal(a, act);
    });
  });
  document.querySelectorAll("[data-del-activity]").forEach(el => {
    el.addEventListener("click", () => {
      if (confirm(t('confirmDeleteActivity'))) {
        state.activities = state.activities.filter(x => x.id !== el.dataset.delActivity);
        saveData();
        render();
      }
    });
  });
}

// ---------- Opsparing-fane ----------
function renderOpsparingTab(a) {
  const sp = savingsFor(a.id);
  const total = totalSparet(a.id);
  const plan = planFor(a.id);

  return `
    <div class="paper">
      <p class="paper-eyebrow">${t('logPayment')}</p>
      <div class="field">
        <label for="save-amount">${t('amount')}</label>
        <input type="number" id="save-amount" placeholder="0" inputmode="numeric" />
      </div>
      <div class="field">
        <label for="save-date">${t('date')}</label>
        <input type="date" id="save-date" value="${todayISO()}" />
      </div>
      <div class="field">
        <label for="save-note">${t('noteOptional')}</label>
        <input type="text" id="save-note" placeholder="${t('notePlaceholder')}" />
      </div>
      <button class="btn btn-rust btn-block" data-action="log-saving">${t('logPaymentBtn')}</button>
    </div>

    <div class="paper">
      <p class="paper-eyebrow">${t('savingsPlan')}</p>
      <div class="field-row">
        <div class="field" style="margin-bottom:0">
          <label for="plan-amount">${t('amount')}</label>
          <input type="number" id="plan-amount" value="${plan?.planlagtBeløb || ""}" placeholder="0" inputmode="numeric" />
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="plan-freq">${t('frequency')}</label>
          <select id="plan-freq">
            <option value="uge" ${plan?.frekvens === "uge" ? "selected" : ""}>${t('perWeek')}</option>
            <option value="måned" ${(!plan || plan?.frekvens === "måned") ? "selected" : ""}>${t('perMonth')}</option>
          </select>
        </div>
      </div>
      <div style="height:14px"></div>
      <button class="btn btn-block" data-action="save-plan">${t('saveSavingsPlan')}</button>
    </div>

    <div class="total-row">
      <span class="total-row-label">${t('savedTotal')}</span>
      <span class="total-row-val">${formatKr(total)}</span>
    </div>

    <div style="padding: 4px 0">
      <p class="paper-eyebrow" style="margin-top:14px">${t('history')}</p>
      ${sp.length === 0 ? `
        <p style="color:var(--ink-soft);font-size:14px;margin:0">${t('noPaymentsYet')}</p>
      ` : `
        <div class="item-list">
          ${sp.map(s => `
            <div class="item">
              <div class="item-icon">${icon("coin")}</div>
              <div class="item-body">
                <p class="item-title">${formatKr(s.beløb)}</p>
                <p class="item-meta">${formatMonoDate(s.dato)}${s.notat ? " · " + esc(s.notat) : ""}</p>
              </div>
              <div class="item-actions">
                <button class="icon-btn" data-del-saving="${s.id}" title="${t('delete')}">✕</button>
              </div>
            </div>
          `).join("")}
        </div>
      `}
    </div>
  `;
}

function wireOpsparing(a) {
  document.querySelector('[data-action="log-saving"]')?.addEventListener("click", () => {
    const amt = Number(document.getElementById("save-amount").value);
    const dato = document.getElementById("save-date").value;
    const notat = document.getElementById("save-note").value.trim();
    if (!amt || amt <= 0) { alert(t('amountValidation')); return; }
    if (!dato) { alert(t('dateValidation')); return; }
    state.savings.push({ id: uid(), adventureId: a.id, beløb: amt, dato, notat });
    saveData();
    toast(t('paymentLogged'));
    render();
  });

  document.querySelector('[data-action="save-plan"]')?.addEventListener("click", () => {
    const amt = Number(document.getElementById("plan-amount").value);
    const freq = document.getElementById("plan-freq").value;
    if (!amt || amt <= 0) { alert(t('amountValidation')); return; }
    state.plans[a.id] = { planlagtBeløb: amt, frekvens: freq };
    saveData();
    toast(t('planSaved'));
    render();
  });

  document.querySelectorAll("[data-del-saving]").forEach(el => {
    el.addEventListener("click", () => {
      if (confirm(t('confirmDeletePayment'))) {
        state.savings = state.savings.filter(x => x.id !== el.dataset.delSaving);
        saveData();
        render();
      }
    });
  });
}

// ---------- Bottom sheet ----------
function openSheet(html) {
  const root = document.getElementById("sheet-root");
  root.innerHTML = `
    <div class="sheet-backdrop" data-sheet-backdrop>
      <div class="sheet" role="dialog">
        <div class="sheet-handle"></div>
        ${html}
      </div>
    </div>
  `;
  root.querySelector("[data-sheet-backdrop]").addEventListener("click", e => {
    if (e.target.hasAttribute("data-sheet-backdrop")) closeSheet();
  });
}

function closeSheet() {
  document.getElementById("sheet-root").innerHTML = "";
}

function openDetailMenu(a) {
  openSheet(`
    <p class="sheet-title">${esc(a.navn)}</p>
    <button class="sheet-action" data-sheet-action="edit">
      <span class="sheet-glyph">${icon("pencil")}</span> ${t('editAdventure')}
    </button>
    ${a.startdato ? `
      <button class="sheet-action" data-sheet-action="ics">
        <span class="sheet-glyph">${icon("calendar")}</span> ${t('addToCalendar')}
      </button>
    ` : ""}
    <button class="sheet-action" data-sheet-action="invite">
      <span class="sheet-glyph">${icon("mail")}</span> ${t('invitePartner')}
    </button>
    <button class="sheet-action" data-sheet-action="done">
      <span class="sheet-glyph">${icon("check")}</span> ${t('markDone')}
    </button>
    <button class="sheet-action" data-sheet-action="memory">
      <span class="sheet-glyph">${icon("bookmark")}</span> ${t('saveToMemories')}
    </button>
    <div class="sheet-sep"></div>
    <button class="sheet-action danger" data-sheet-action="delete">
      <span class="sheet-glyph">${icon("trash")}</span> ${t('deleteAdventure')}
    </button>
  `);

  document.querySelectorAll("[data-sheet-action]").forEach(el => {
    el.addEventListener("click", () => {
      const action = el.dataset.sheetAction;
      closeSheet();
      if (action === "edit")   return openAdventureModal(a);
      if (action === "ics")    return downloadICS(a);
      if (action === "invite") return openInviteModal(a);
      if (action === "done") {
        const idx = state.adventures.findIndex(x => x.id === a.id);
        if (idx >= 0) {
          state.adventures[idx] = { ...state.adventures[idx], afsluttet: true };
          saveData();
          toast(t('movedToMemories'));
          navigate("/");
        }
        return;
      }
      if (action === "memory") {
        toast(t('savedToMemoriesToast'));
        return;
      }
      if (action === "delete") {
        if (confirm(t('confirmDeleteAdventure', a.navn))) {
          state.adventures = state.adventures.filter(x => x.id !== a.id);
          state.activities = state.activities.filter(x => x.adventureId !== a.id);
          state.savings    = state.savings.filter(x => x.adventureId !== a.id);
          delete state.plans[a.id];
          saveData();
          navigate("/");
        }
      }
    });
  });
}

function openAppMenu() {
  const otherLangName = state.lang === "da" ? t('langNameEn') : t('langNameDa');
  openSheet(`
    <p class="sheet-title">${t('appName')}</p>
    <button class="sheet-action" data-app-action="calendar">
      <span class="sheet-glyph">${icon("calendar")}</span> ${t('calendar')}
    </button>
    <button class="sheet-action" data-app-action="all">
      <span class="sheet-glyph">${icon("grid")}</span> ${t('allAdventures')}
    </button>
    <button class="sheet-action" data-app-action="lang">
      <span class="sheet-glyph">${icon("globe")}</span> ${t('language')} · ${otherLangName}
    </button>
    <button class="sheet-action" data-app-action="about">
      <span class="sheet-glyph">${icon("info")}</span> ${t('about')}
    </button>
  `);
  document.querySelectorAll("[data-app-action]").forEach(el => {
    el.addEventListener("click", () => {
      const action = el.dataset.appAction;
      closeSheet();
      if (action === "calendar") return navigate("/calendar");
      if (action === "lang") {
        state.lang = state.lang === "da" ? "en" : "da";
        saveData();
        render();
        return;
      }
      toast(t('comingSoon'));
    });
  });
}

// ---------- Kalender-visning ----------
let calCursor = null;

function getCalCursor() {
  if (!calCursor) {
    calCursor = new Date();
    calCursor.setDate(1);
  }
  return calCursor;
}

function renderCalendar() {
  const cursor = getCalCursor();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cap(cursor.toLocaleDateString(locale(), { month: "long" }));

  const first = new Date(year, month, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(year, month, 1 - firstWeekday);

  // Only include planned events (has startdato) that overlap this grid
  const events = state.adventures.filter(a => !!a.startdato);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + 41);

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = toISO(d);
    const inCurrent = d.getMonth() === month;
    const isToday = iso === todayISO();
    const col = i % 7; // 0=Mon .. 6=Sun

    let cellCls = "cal-cell";
    if (!inCurrent) cellCls += " cal-out";
    if (isToday) cellCls += " cal-today";

    let dotHtml = "";
    let advId = null;

    for (const a of events) {
      const start = a.startdato;
      const end = a.slutdato || a.startdato;
      if (iso < start || iso > end) continue;
      advId = a.id;
      if (start === end) {
        dotHtml = '<span class="cal-dot"></span>';
      } else {
        if (iso === start) cellCls += " cal-band-start";
        else if (iso === end) cellCls += " cal-band-end";
        else cellCls += " cal-band-mid";
      }
      break;
    }

    cells.push(`
      <div class="${cellCls}" ${advId ? `data-adv-id="${advId}"` : ""}>
        <span class="cal-num">${d.getDate()}</span>
        ${dotHtml}
      </div>
    `);
  }

  // "Denne måned" list: any event whose interval overlaps this month
  const monthStart = first;
  const monthEnd = new Date(year, month + 1, 0);
  const thisMonthEvents = events.filter(a => {
    const s = new Date(a.startdato + "T00:00:00");
    const e = new Date((a.slutdato || a.startdato) + "T00:00:00");
    return e >= monthStart && s <= monthEnd;
  }).sort((a, b) => a.startdato.localeCompare(b.startdato));

  return `
    <div class="detail-top">
      <button class="back-link" data-action="back-home">‹ ${t('backLabel')}</button>
      <button class="icon-only" data-action="cal-menu" aria-label="${t('menu')}">${icon("more")}</button>
    </div>
    <div class="cal-hero">
      <p class="cal-year">${year}</p>
      <h1 class="cal-month-name">${monthName}</h1>
    </div>
    <div class="cal-nav">
      <button class="btn-ghost" data-cal="prev">‹ ${t('prev')}</button>
      <button class="btn-ghost" data-cal="today">${t('today')}</button>
      <button class="btn-ghost" data-cal="next">${t('next')} ›</button>
    </div>
    <div class="cal-weekdays">
      ${(WEEKDAYS[state.lang] || WEEKDAYS.da).map(w => `<span>${w}</span>`).join("")}
    </div>
    <div class="cal-grid">${cells.join("")}</div>
    <div class="cal-legend">
      <span class="legend-item"><span class="legend-band"></span> ${t('legendTrip')}</span>
      <span class="legend-item"><span class="legend-dot"></span> ${t('legendExperience')}</span>
      <span class="legend-item"><span class="legend-dash"></span> ${t('legendIdea')}</span>
    </div>
    ${thisMonthEvents.length > 0 ? `
      <p class="section-eyebrow">${t('thisMonth')}</p>
      <div class="trip-list">
        ${thisMonthEvents.map(renderTripRow).join("")}
      </div>
    ` : `
      <p style="color:var(--ink-soft);font-size:13px;margin:24px 4px 0">${t('noEventsInMonth', monthName.toLowerCase())}</p>
    `}
  `;
}

function wireCalendar() {
  document.querySelector('[data-action="back-home"]')?.addEventListener("click", () => navigate("/"));
  document.querySelector('[data-action="cal-menu"]')?.addEventListener("click", openAppMenu);
  document.querySelector('[data-cal="prev"]')?.addEventListener("click", () => {
    const c = getCalCursor();
    c.setMonth(c.getMonth() - 1);
    render();
  });
  document.querySelector('[data-cal="next"]')?.addEventListener("click", () => {
    const c = getCalCursor();
    c.setMonth(c.getMonth() + 1);
    render();
  });
  document.querySelector('[data-cal="today"]')?.addEventListener("click", () => {
    calCursor = new Date();
    calCursor.setDate(1);
    render();
  });
  document.querySelectorAll(".cal-cell[data-adv-id]").forEach(el => {
    el.addEventListener("click", () => navigate(`/adventure/${el.dataset.advId}`));
  });
  document.querySelectorAll(".trip-row").forEach(el => {
    el.addEventListener("click", () => navigate(`/adventure/${el.dataset.id}`));
  });
}

// ---------- Modaler ----------
function openModal(html) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <div class="modal" role="dialog">
        <div class="modal-handle"></div>
        ${html}
      </div>
    </div>
  `;
  root.querySelector("[data-modal-backdrop]").addEventListener("click", e => {
    if (e.target.hasAttribute("data-modal-backdrop")) closeModal();
  });
  root.querySelector("[data-modal-close]")?.addEventListener("click", closeModal);
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

// ----- Opret / redigér eventyr -----
function openAdventureModal(existing = null) {
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
      const flyAct = existing ? findLinkedActivity(a.id, "Fly") : null;
      const hotelAct = existing ? findLinkedActivity(a.id, "Hotel") : null;
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
      const pris = Number(prisInput);

      if (!prisInput || isNaN(pris) || pris <= 0) {
        alert(t('priceRequired')); return;
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
      syncLinkedActivity(a.id, "Fly", "transport", dato, flyPris);
      syncLinkedActivity(a.id, "Hotel", "ophold", dato, hotelPris);
      saveData();
      closeModal();
      if (!existing) {
        navigate(`/adventure/${a.id}/planer`);
      } else {
        render();
      }
    }
  });
}

// ----- Opret / redigér aktivitet -----
function openActivityModal(adv, existing = null) {
  const x = existing || {
    id: uid(),
    adventureId: adv.id,
    navn: "",
    kategori: "oplevelse",
    dato: adv.startdato || todayISO(),
    pris: "",
  };

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
        <label for="act-dato">${t('dateRequiredLabel')}</label>
        <input type="date" id="act-dato" value="${x.dato}" />
      </div>
      <div class="field">
        <label for="act-pris">${t('priceLabelOptional')}</label>
        <input type="number" id="act-pris" value="${x.pris}" placeholder="0" inputmode="numeric" />
      </div>
    </div>

    <div class="form-actions">
      <button class="btn" data-modal-close>${t('cancel')}</button>
      <button class="btn btn-rust" id="act-save">${existing ? t('save') : t('add')}</button>
    </div>
  `);

  document.getElementById("act-save").addEventListener("click", () => {
    const navn = document.getElementById("act-navn").value.trim();
    const kategori = document.getElementById("act-kat").value;
    const dato = document.getElementById("act-dato").value;
    const pris = Number(document.getElementById("act-pris").value) || 0;

    if (!navn) { alert(t('nameRequired')); return; }
    if (!dato) { alert(t('dateValidation')); return; }

    const record = { id: x.id, adventureId: adv.id, navn, kategori, dato, pris };
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

// ----- Invitér partner -----
function openInviteModal(a) {
  const kode = a.id.slice(0, 6).toUpperCase();
  const link = `${location.origin}${location.pathname}#/adventure/${a.id}`;

  openModal(`
    <div class="modal-header">
      <h2>${t('invitePartnerTitle')}</h2>
      <button class="modal-close" data-modal-close>✕</button>
    </div>

    <p style="color:var(--ink-soft);font-size:14px;margin:0 0 12px;line-height:1.5">
      ${t('inviteIntro')}
    </p>

    <div class="invite-code-box">
      <p class="invite-eyebrow">${t('inviteCode')}</p>
      <p class="invite-code">${kode}</p>
      <p class="invite-hint">"${esc(a.navn)}"</p>
    </div>

    <div class="field">
      <label>${t('previewLabel')}</label>
      <div class="paper" style="margin:0">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="detail-glyph" style="width:44px;height:44px;margin:0">${icon(a.icon)}</div>
          <div>
            <p style="margin:0;font-family:var(--font-sans);font-weight:600;font-size:18px">${esc(a.navn)}</p>
            <p style="margin:2px 0 0;font-family:var(--font-mono);font-size:11px;letter-spacing:0.06em;color:var(--ink-soft);text-transform:uppercase">
              ${a.startdato ? formatMonoRange(a.startdato, a.slutdato) : t('ideaLabel')}${a.målBeløb ? ` · ${formatKr(a.målBeløb)}` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>

    <button class="btn btn-rust btn-block" id="copy-link">
      ${icon("link")} ${t('copyLink')}
    </button>
    <p class="invite-hint" style="text-align:center;margin-top:12px">
      ${t('inviteFootnote')}
    </p>
  `);

  document.getElementById("copy-link").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast(t('linkCopied'));
    } catch {
      prompt(t('copyLinkManually'), link);
    }
  });
}

// ---------- Date picker (bottom sheet) ----------
function openDatePicker(currentStart, currentEnd, eventyrNavn, onConfirm, opts = {}) {
  const singleOnly = !!opts.singleOnly;
  let start = currentStart || null;
  let end = currentEnd || null;
  let singleMode = singleOnly || (!!currentStart && !currentEnd);
  const startDate = start ? new Date(start + "T00:00:00") : new Date();
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  const rootEl = document.getElementById("picker-root");

  function draw() {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthName = cap(cursor.toLocaleDateString(locale(), { month: "long" }));

    const first = new Date(year, month, 1);
    const firstWeekday = (first.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - firstWeekday);

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = toISO(d);
      const inCurrent = d.getMonth() === month;
      const isStart = start && iso === start;
      const isEnd = end && iso === end;
      const isMid = !singleMode && start && end && iso > start && iso < end;

      let cls = "dp-cell";
      if (!inCurrent) cls += " dp-cell-out";
      if (isStart) cls += " dp-start";
      if (isEnd) cls += " dp-end";
      if (isMid) cls += " dp-mid";
      cells.push(`<button class="${cls}" data-iso="${iso}"><span class="dp-num">${d.getDate()}</span></button>`);
    }

    const startChip = start ? formatChipDate(start) : "—";
    const endChip = end ? formatChipDate(end) : "—";

    rootEl.innerHTML = `
      <div class="sheet-backdrop dp-backdrop" data-picker-backdrop>
        <div class="sheet dp-sheet" role="dialog">
          <div class="sheet-handle"></div>
          <div class="dp-header">
            <p class="sheet-eyebrow">${esc(eventyrNavn)}</p>
            <h2 class="sheet-title-lg">${t('whenDoYouLeave')}</h2>
          </div>
          ${singleOnly ? "" : `
            <label class="dp-mode-toggle">
              <input type="checkbox" id="dp-single" ${singleMode ? "checked" : ""}/>
              <span>${t('singleDateOnly')}</span>
            </label>
          `}
          <div class="dp-nav">
            <button class="icon-only" data-picker="prev" aria-label="${t('prevMonthAria')}">‹</button>
            <span class="dp-month">${monthName} ${year}</span>
            <button class="icon-only" data-picker="next" aria-label="${t('nextMonthAria')}">›</button>
          </div>
          <div class="dp-weekdays">
            ${(WEEKDAYS[state.lang] || WEEKDAYS.da).map(w => `<span>${w}</span>`).join("")}
          </div>
          <div class="dp-grid">${cells.join("")}</div>
          <div class="dp-chips">
            <div class="dp-chip">
              <span class="dp-chip-label">${t('startChip')}</span>
              <span class="dp-chip-val ${start ? "" : "empty"}">${startChip}</span>
            </div>
            ${!singleMode ? `
              <div class="dp-chip">
                <span class="dp-chip-label">${t('endChip')}</span>
                <span class="dp-chip-val ${end ? "" : "empty"}">${endChip}</span>
              </div>
            ` : ""}
          </div>
          <div class="dp-confirm-wrap">
            <button class="btn btn-primary btn-block" data-picker="confirm">${t('confirm')}</button>
          </div>
        </div>
      </div>
    `;

    rootEl.querySelector("[data-picker-backdrop]").addEventListener("click", e => {
      if (e.target.hasAttribute("data-picker-backdrop")) close();
    });
    rootEl.querySelector('[data-picker="prev"]').addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() - 1);
      draw();
    });
    rootEl.querySelector('[data-picker="next"]').addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() + 1);
      draw();
    });
    rootEl.querySelector("#dp-single")?.addEventListener("change", e => {
      singleMode = e.target.checked;
      if (singleMode) end = null;
      draw();
    });
    rootEl.querySelectorAll(".dp-cell").forEach(cell => {
      cell.addEventListener("click", () => {
        handleTap(cell.dataset.iso);
        draw();
      });
    });
    rootEl.querySelector('[data-picker="confirm"]').addEventListener("click", () => {
      if (!start) { alert(t('pickStartDate')); return; }
      onConfirm(start, singleMode ? "" : (end || ""));
      close();
    });
  }

  function handleTap(iso) {
    if (singleMode) {
      start = iso;
      end = null;
      return;
    }
    if (!start || (start && end)) {
      start = iso;
      end = null;
    } else {
      if (iso < start) {
        end = start;
        start = iso;
      } else if (iso === start) {
        end = iso;
      } else {
        end = iso;
      }
    }
  }

  function close() {
    rootEl.innerHTML = "";
  }

  draw();
}

function formatChipDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

// ---------- Toast ----------
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// ---------- Init ----------
render();
