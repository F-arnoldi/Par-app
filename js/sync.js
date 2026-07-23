// ---------- Synkronisering ----------
// Local-first: alt her kører i baggrunden, aldrig i vejen for render()
// eller for en brugerhandling. Denne fil importeres dynamisk fra main.js,
// netop så et ét statisk top-level import af Supabase et sted i
// kernemodul-grafen ikke kan få hele appen til at fejle ved en genuint
// offline første indlæsning. Selve filen her har derfor bevidst INGEN
// top-level import af 'https://esm.sh/...' — kun initSync() gør det,
// via dynamisk import(), indpakket i try/catch af kalderen.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { state, saveData, onDataSaved, touch } from './data.js';

let supabase = null;
let syncInFlight = false;
let pendingRerun = false;
let debounceTimer = null;

export let hasLinkedEmail = false;
export let myEmail = null;
export const syncStatus = { state: "idle", lastSyncedAt: null };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id) { return UUID_RE.test(id); }

// Sammenligner to tidsstempler efter faktisk værdi, ikke som rå strenge —
// Postgres returnerer "+00:00" med anden decimal-præcision end JS's egen
// toISOString() ("Z", altid 3 decimaler), så en streng-sammenligning ville
// kunne give et forkert svar selv når begge peger på samme øjeblik.
function isNewer(a, b) {
  return new Date(a).getTime() > new Date(b).getTime();
}

function isDirty(record) {
  if (!record.serverId) return true;
  if (!state.lastSyncedAt) return true;
  return isNewer(record.updatedAt, state.lastSyncedAt);
}

function ensureServerId(record) {
  if (!record.serverId) {
    // Nye lokale id'er er allerede UUID'er (Fase 2's uid()) og genbruges
    // direkte som serverId. Ældre, korte id'er fra før v4 får en frisk
    // UUID kun i serverId — den lokale id og alt der refererer til den
    // (fx activity.adventureId) rører vi aldrig.
    record.serverId = isValidUUID(record.id) ? record.id : crypto.randomUUID();
  }
  return record.serverId;
}

function findAdventureByLocalId(id) {
  return state.adventures.find(a => a.id === id);
}

// ---------- Lokal → server ----------

function toAdventureRow(a) {
  const plan = state.plans[a.id] || {};
  return {
    id: a.serverId,
    navn: a.navn,
    type: a.type,
    startdato: a.startdato || null,
    slutdato: a.slutdato || null,
    maal_beloeb: Number(a.målBeløb) || 0,
    icon: a.icon,
    afsluttet: !!a.afsluttet,
    opsparing_aktiveret: !!a.opsparingAktiveret,
    planlagt_beloeb: plan.planlagtBeløb ?? null,
    frekvens: plan.frekvens ?? null,
    updated_at: a.updatedAt,
    deleted_at: a.deletedAt || null,
    // created_by og join_token sendes bevidst ALDRIG med herfra — de har
    // egne kolonne-defaults ved insert og skal forblive urørte ved update
    // (join_token skiftes kun via rotate_join_token, created_by aldrig).
  };
}

function toActivityRow(x) {
  return {
    id: x.serverId,
    adventure_id: findAdventureByLocalId(x.adventureId)?.serverId,
    navn: x.navn,
    kategori: x.kategori,
    dato: x.dato || null,
    pris: Number(x.pris) || 0,
    kilde: x.kilde || null,
    start_tid: x.startTid || "",
    slut_tid: x.slutTid || "",
    varer_til: x.varerTil || null,
    sted_navn: x.stedNavn || "",
    adresse: x.adresse || "",
    reference: x.reference || "",
    link: x.link || "",
    telefon: x.telefon || "",
    noter: x.noter || "",
    status: x.status || "idé",
    updated_at: x.updatedAt,
    deleted_at: x.deletedAt || null,
  };
}

function toSavingsRow(s) {
  return {
    id: s.serverId,
    adventure_id: findAdventureByLocalId(s.adventureId)?.serverId,
    beloeb: Number(s.beløb) || 0,
    dato: s.dato || null,
    notat: s.notat || "",
    updated_at: s.updatedAt,
    deleted_at: s.deletedAt || null,
  };
}

// ---------- Server → lokal ----------

function fromAdventureRow(row) {
  return {
    id: row.id,
    serverId: row.id,
    navn: row.navn,
    type: row.type,
    startdato: row.startdato || "",
    slutdato: row.slutdato || "",
    målBeløb: Number(row.maal_beloeb) || 0,
    icon: row.icon,
    afsluttet: !!row.afsluttet,
    opsparingAktiveret: !!row.opsparing_aktiveret,
    // joinToken sendes ALDRIG i push-retningen (se toAdventureRow) — den
    // flyder kun én vej, server → lokal, så et lokalt cache-felt her holder
    // sig automatisk i sync med server-værdien, uden at kunne overskrive den.
    joinToken: row.join_token,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function fromActivityRow(row, localAdventureId) {
  return {
    id: row.id,
    adventureId: localAdventureId,
    serverId: row.id,
    navn: row.navn,
    kategori: row.kategori,
    dato: row.dato || "",
    pris: Number(row.pris) || 0,
    kilde: row.kilde || null,
    startTid: row.start_tid || "",
    slutTid: row.slut_tid || "",
    varerTil: row.varer_til || "",
    stedNavn: row.sted_navn || "",
    adresse: row.adresse || "",
    reference: row.reference || "",
    link: row.link || "",
    telefon: row.telefon || "",
    noter: row.noter || "",
    status: row.status || "idé",
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function fromSavingsRow(row, localAdventureId) {
  return {
    id: row.id,
    adventureId: localAdventureId,
    serverId: row.id,
    beløb: Number(row.beloeb) || 0,
    dato: row.dato || "",
    notat: row.notat || "",
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mergeAdventures(rows) {
  for (const row of rows) {
    let local = state.adventures.find(a => a.serverId === row.id);
    if (!local) {
      local = fromAdventureRow(row);
      state.adventures.push(local);
    } else {
      // join_token er IKKE et LWW-konfliktfelt — klienten sender det aldrig
      // selv i push (kun rotate_join_token sætter det, server-side), så det
      // findes ikke lokalt før pull kopierer det ned. Uden dette ville
      // ejerens EGEN første pull af sin lige-pushede række aldrig fange
      // token'et: rækkens updated_at er identisk med lokal (samme
      // redigering, ekko'et tilbage), så "kun ved nyere" ville springe hele
      // opdateringen over og aldrig nå frem til feltet.
      local.joinToken = row.join_token;
      if (!isNewer(row.updated_at, local.updatedAt)) continue; // lokal er nyere eller lige — resten forbliver urørt, forbliver beskidt til næste push
      Object.assign(local, fromAdventureRow(row), { id: local.id });
    }
    if (row.planlagt_beloeb != null) {
      state.plans[local.id] = { planlagtBeløb: Number(row.planlagt_beloeb), frekvens: row.frekvens };
    } else {
      delete state.plans[local.id];
    }
  }
}

function mergeActivities(rows) {
  for (const row of rows) {
    const local = state.activities.find(x => x.serverId === row.id);
    if (!local) {
      const parent = state.adventures.find(a => a.serverId === row.adventure_id);
      if (!parent) continue; // forældre-eventyret er endnu ikke kendt lokalt — håndteres af Fase 4's afgrænsede join-pull
      state.activities.push(fromActivityRow(row, parent.id));
      continue;
    }
    if (isNewer(row.updated_at, local.updatedAt)) {
      Object.assign(local, fromActivityRow(row, local.adventureId), { id: local.id });
    }
  }
}

function mergeSavings(rows) {
  for (const row of rows) {
    const local = state.savings.find(s => s.serverId === row.id);
    if (!local) {
      const parent = state.adventures.find(a => a.serverId === row.adventure_id);
      if (!parent) continue;
      state.savings.push(fromSavingsRow(row, parent.id));
      continue;
    }
    if (isNewer(row.updated_at, local.updatedAt)) {
      Object.assign(local, fromSavingsRow(row, local.adventureId), { id: local.id });
    }
  }
}

// ---------- Push / pull ----------

// Bærende princip: push() kører ALTID færdig, før pull() starter, og
// pull() er udelukkende additiv/fletning — den fjerner aldrig noget der
// mangler i server-svaret. Det er hele garantien mod at en første
// synkronisering kan slette lokale data: der findes ingen kodesti der
// siger "serveren returnerede intet for X, så slet lokal X."
async function push() {
  const dirtyAdventures = state.adventures.filter(isDirty);
  const dirtyActivities = state.activities.filter(isDirty);
  const dirtySavings = state.savings.filter(isDirty);

  // Eventyr FØRST og for sig selv — aktiviteter/indbetalinger har brug
  // for forældrens endelige serverId, før deres egen adventure_id-FK kan
  // sendes korrekt.
  if (dirtyAdventures.length > 0) {
    dirtyAdventures.forEach(ensureServerId);
    const { error } = await supabase.from("adventures").upsert(dirtyAdventures.map(toAdventureRow));
    if (error) throw error;
  }

  dirtyActivities.forEach(ensureServerId);
  dirtySavings.forEach(ensureServerId);

  const pushes = [];
  if (dirtyActivities.length > 0) pushes.push(supabase.from("activities").upsert(dirtyActivities.map(toActivityRow)));
  if (dirtySavings.length > 0) pushes.push(supabase.from("savings").upsert(dirtySavings.map(toSavingsRow)));
  const results = await Promise.all(pushes);
  for (const r of results) if (r.error) throw r.error;
}

// LOOKBACK: en lille sikkerhedsmargin trukket fra "since" i selve
// forespørgslen (ikke i det der gemmes som lastSyncedAt) — værn mod at en
// række der lige er pushet af en anden enhed endnu ikke er synlig i
// databasen i det præcise øjeblik denne pull kører (netværks-/commit-
// forsinkelse), men alligevel har et updated_at der ligger før "nu". Uden
// denne ville sådan en række aldrig blive genforespurgt, fordi lastSyncedAt
// kun kan gå fremad. Gen-hentning af et par allerede-kendte rækker er
// harmløst — merge-logikken er idempotent.
const PULL_LOOKBACK_MS = 5000;

async function pull() {
  const since = state.lastSyncedAt || "1970-01-01T00:00:00.000Z";
  const queryFrom = state.lastSyncedAt
    ? new Date(new Date(since).getTime() - PULL_LOOKBACK_MS).toISOString()
    : since;

  // Vandmærket der rykkes til, når pull'en er færdig, er det STØRSTE
  // updated_at der reelt blev observeret i svarene — ALDRIG klientens eget
  // "nu" ved pass-start. Baseres det på "nu", kan et vandmærke fra en enhed
  // rykke forbi en ændring, der teknisk set eksisterede på serveren, men
  // endnu ikke var committet/synlig i netop DENNE forespørgsel — og den
  // ændring ville aldrig blive hentet igen. Finder denne omgang intet nyt,
  // rykker vandmærket slet ikke, så næste omgang forespørger det samme
  // tidspunkt igen, indtil ændringen rent faktisk observeres.
  let maxSeen = null;
  const noteMax = (rows) => {
    for (const r of rows) {
      if (!maxSeen || isNewer(r.updated_at, maxSeen)) maxSeen = r.updated_at;
    }
  };

  const advRes = await supabase.from("adventures").select("*").gt("updated_at", queryFrom);
  if (advRes.error) throw advRes.error;
  mergeAdventures(advRes.data || []);
  noteMax(advRes.data || []);

  const [actRes, savRes] = await Promise.all([
    supabase.from("activities").select("*").gt("updated_at", queryFrom),
    supabase.from("savings").select("*").gt("updated_at", queryFrom),
  ]);
  if (actRes.error) throw actRes.error;
  if (savRes.error) throw savRes.error;
  mergeActivities(actRes.data || []);
  mergeSavings(savRes.data || []);
  noteMax(actRes.data || []);
  noteMax(savRes.data || []);

  return maxSeen;
}

export function scheduleSync() {
  if (!supabase) return; // ikke initialiseret (fx SYNC_ENABLED slået fra, eller stadig ved at loade)
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { runSync(); }, 800);
}

export async function runSync() {
  if (!supabase) return;
  if (syncInFlight) { pendingRerun = true; return; }
  syncInFlight = true;
  syncStatus.state = "syncing";
  try {
    await push();
    const maxSeen = await pull();
    if (maxSeen && (!state.lastSyncedAt || isNewer(maxSeen, state.lastSyncedAt))) {
      state.lastSyncedAt = maxSeen;
    }
    saveData();
    syncStatus.state = "idle";
    syncStatus.lastSyncedAt = state.lastSyncedAt;
  } catch {
    // Offline er en normal tilstand, ikke en fejl der skal afbryde noget —
    // recorden(erne) forbliver beskidte og prøves igen ved næste sync.
    syncStatus.state = navigator.onLine ? "error" : "offline";
  } finally {
    syncInFlight = false;
    if (pendingRerun) {
      pendingRerun = false;
      scheduleSync();
    }
  }
}

// ---------- Auth ----------

// Idempotent: main.js kalder den én gang i baggrunden ved opstart, men
// join-flowet (Fase 4) skal kunne kalde den igen uden at starte en ny
// session op — fx hvis brugeren åbner et invitationslink, før baggrunds-
// initieringen er nået at blive færdig, eller med SYNC_ENABLED slået fra.
let initPromise = null;
export function initSync() {
  if (!initPromise) initPromise = doInitSync();
  return initPromise;
}

async function doInitSync() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // pkce, ikke implicit-flow'ets standard: magic-link-redirect ville
      // ellers levere tokens i URL'ens #-fragment, som kolliderer direkte
      // med appens egen hash-router.
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    hasLinkedEmail = !!session?.user?.email;
    myEmail = session?.user?.email || null;
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    await supabase.auth.signInAnonymously();
  }
  hasLinkedEmail = !!session?.user?.email;
  myEmail = session?.user?.email || null;

  onDataSaved(() => scheduleSync());
  window.addEventListener("focus", () => scheduleSync());
  window.addEventListener("online", () => scheduleSync());

  scheduleSync();
}

export async function linkEmail(email) {
  if (!supabase) throw new Error("sync not initialized");
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: location.origin + location.pathname }
  );
  if (error) throw error;
}

// ---------- Invitationsflow (Fase 4) ----------

// Kalder join_adventure (den ene vej ind i adventure_members) og laver
// derefter en AFGRÆNSET pull af netop dette eventyr og dets børn, uanset
// hvor gamle de er — i modsætning til den almindelige pull() ovenfor, som
// kun henter noget nyere end lastSyncedAt. Rører aldrig det vandmærke,
// og rører aldrig andre, urelaterede lokale data. Returnerer det nyligt
// tilføjede eventyrs LOKALE id, så den kaldende rute kan navigere dertil.
export async function joinAdventure(serverAdventureId, token) {
  if (!supabase) throw new Error("sync not initialized");

  const { error: joinError } = await supabase.rpc("join_adventure", {
    p_adventure_id: serverAdventureId,
    p_token: token,
  });
  if (joinError) throw joinError;

  const advRes = await supabase.from("adventures").select("*").eq("id", serverAdventureId);
  if (advRes.error) throw advRes.error;
  mergeAdventures(advRes.data || []);

  const [actRes, savRes] = await Promise.all([
    supabase.from("activities").select("*").eq("adventure_id", serverAdventureId),
    supabase.from("savings").select("*").eq("adventure_id", serverAdventureId),
  ]);
  if (actRes.error) throw actRes.error;
  if (savRes.error) throw savRes.error;
  mergeActivities(actRes.data || []);
  mergeSavings(savRes.data || []);

  saveData();

  const local = state.adventures.find(a => a.serverId === serverAdventureId);
  return local?.id || null;
}

export async function rotateInviteLink(serverAdventureId) {
  if (!supabase) throw new Error("sync not initialized");
  const { data, error } = await supabase.rpc("rotate_join_token", { p_adventure_id: serverAdventureId });
  if (error) throw error;
  return data;
}

export async function getMemberCount(serverAdventureId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("adventure_members")
    .select("user_id")
    .eq("adventure_id", serverAdventureId);
  if (error) return null;
  return data.length;
}

// ---------- Profil ----------

// Rent netværkskald — den lokale state.myDisplayName opdateres af kalderen
// (samme mønster som rotateInviteLink/resetInviteLink), da der ikke findes
// noget auth-state-change-event at hænge en automatisk lokal opdatering på,
// sådan som hasLinkedEmail/myEmail har.
export async function saveDisplayName(name) {
  if (!supabase) throw new Error("sync not initialized");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, display_name: name, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// Navnene på de ANDRE medlemmer af et eventyr (aldrig ens eget), kun dem
// der rent faktisk har sat et navn — kalderen falder tilbage til
// getMemberCount()'s antals-baserede tekst hvis dette array er tomt.
export async function getMemberNames(serverAdventureId) {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  const myId = user?.id;

  const membersRes = await supabase.from("adventure_members").select("user_id").eq("adventure_id", serverAdventureId);
  if (membersRes.error) return [];
  const otherIds = membersRes.data.map(m => m.user_id).filter(id => id !== myId);
  if (otherIds.length === 0) return [];

  const profilesRes = await supabase.from("profiles").select("display_name").in("user_id", otherIds);
  if (profilesRes.error) return [];
  return profilesRes.data.map(p => p.display_name).filter(Boolean);
}
