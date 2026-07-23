// ---------- Init ----------
import { state, saveData } from './data.js';
import { daysBetween, todayISO } from './utils.js';
import { t } from './i18n.js';
import { toast } from './toast.js';
import { render } from './router.js';

function autoArchiveOldAdventures() {
  const archived = [];
  for (const a of state.adventures) {
    if (a.afsluttet) continue;
    // Arkivering kræver en konkret slutreference — modsat grupperingen i
    // Program-fanen, som bevidst IKKE fallbacker til startdato.
    const endRef = a.slutdato || a.startdato;
    if (!endRef) continue;               // intet at sammenligne
    if (daysBetween(endRef, todayISO()) > 3) {
      a.afsluttet = true;
      archived.push(a);
    }
  }
  if (archived.length > 0) {
    saveData();
    toast(t('archivedTrips', archived.length), {
      actionLabel: t('undo'),
      persistent: true,
      onAction: () => {
        archived.forEach(a => { a.afsluttet = false; });
        saveData();
        render();
      },
    });
  }
}

autoArchiveOldAdventures();
window.addEventListener("hashchange", render);
render();
