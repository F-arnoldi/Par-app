// ---------- Init ----------
import { state, saveData, touch } from './data.js';
import { daysBetween, todayISO } from './utils.js';
import { t } from './i18n.js';
import { toast } from './toast.js';
import { render } from './router.js';
import { SYNC_ENABLED } from './config.js';

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

autoArchiveOldAdventures();
window.addEventListener("hashchange", render);
render();

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
