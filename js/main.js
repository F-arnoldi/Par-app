// ---------- Init ----------
import { state, saveData, touch } from './data.js';
import { daysBetween, todayISO } from './utils.js';
import { t } from './i18n.js';
import { toast } from './toast.js';
import { render } from './router.js';
import { SYNC_ENABLED } from './config.js';
import { hasOpsparing } from './selectors.js';
import { scheduleSavingsReminder } from './notifications.js';

function autoArchiveOldAdventures() {
  const archived = [];
  for (const a of state.adventures) {
    if (a.deletedAt || a.afsluttet) continue;
    // Arkivering kræver en konkret slutreference — modsat grupperingen i
    // Program-fanen, som bevidst IKKE fallbacker til startdato.
    const endRef = a.slutdato || a.startdato;
    if (!endRef) continue;               // intet at sammenligne
    if (daysBetween(endRef, todayISO()) > 3) {
      a.afsluttet = true;
      touch(a);
      archived.push(a);
    }
  }
  if (archived.length > 0) {
    saveData();
    toast(t('archivedTrips', archived.length), {
      actionLabel: t('undo'),
      persistent: true,
      onAction: () => {
        archived.forEach(a => { a.afsluttet = false; touch(a); });
        saveData();
        render();
      },
    });
  }
}

// Genopretter (idempotent — samme id overskrives bare) enhver ønsket
// påmindelse ved hver opstart, i stedet for kun ved selve
// spareplan-formularens gem-tryk — så en geninstalleret app, en tidligere
// afvist tilladelse der siden er givet, eller en frisk pull af en plan fra
// den anden partners enhed alle sammen ender med den rigtige tilstand.
function reconcileSavingsReminders() {
  for (const a of state.adventures) {
    if (a.deletedAt || a.afsluttet || !hasOpsparing(a)) continue;
    const plan = state.plans[a.id];
    if (plan?.remind) scheduleSavingsReminder(a, plan);
  }
}

autoArchiveOldAdventures();
reconcileSavingsReminders();
window.addEventListener("hashchange", render);
render();

// Gør enhver klikbar <div role="button"> (fx trip-rows, type-/ikon-
// vælgere) tastatur-betjenbar med ét delt, app-bredt lag i stedet for en
// keydown-lytter pr. gengivelsessted — så længe elementet selv har
// role="button" og tabindex="0" i sit markup, virker Enter/Mellemrum af
// sig selv, uanset hvilken visning det kommer fra.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const el = e.target.closest('[role="button"]');
  if (!el) return;
  e.preventDefault();
  el.click();
});

if (SYNC_ENABLED) {
  // Dynamisk import — aldrig statisk i kernemodul-grafen — så en genuint
  // offline første indlæsning uden cache for esm.sh stadig lader appen
  // starte fuldt funktionelt på lokale data, i stilhed.
  import('./sync.js').then(m => m.initSync()).catch(() => {});
}

if ("serviceWorker" in navigator) {
  // Efter første render, aldrig i vejen for den — cacher kun appens egen
  // skal, aldrig data eller kald til esm.sh/Supabase (se sw.js).
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// I den native app skal statuslinjen overlejre webviewet, så CSS'ens
// egne env(safe-area-inset-top)-paddinger (på #app) gør arbejdet med at
// holde indhold under den — ellers ville OS'et selv skubbe hele siden
// ned og efterlade et dobbelt mellemrum. window.Capacitor findes kun
// native; stilfærdigt ingenting i browseren eller uden pluginet
// registreret, samme mønster som Haptics.
(async () => {
  try {
    const StatusBar = window.Capacitor?.Plugins?.StatusBar;
    if (!StatusBar) return;
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: "LIGHT" }); // mørke ikoner/tekst, til appens lyse baggrund
    await StatusBar.setBackgroundColor({ color: "#EDEFF4" });
  } catch {
    // Web, eller pluginet er ikke registreret native — stilfærdigt ingenting.
  }
})();
