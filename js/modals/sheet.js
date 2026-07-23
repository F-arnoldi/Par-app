// ---------- Bottom sheet ----------
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc } from '../utils.js';
import { state, saveData, touch, tombstone } from '../data.js';
import { toast } from '../toast.js';
import { navigate } from '../router.js';
import { openAdventureModal } from './adventure.js';
import { openInviteModal } from './invite.js';
import { downloadICS } from '../ics.js';
import { syncStatus } from '../sync.js';

export function openSheet(html) {
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

export function closeSheet() {
  document.getElementById("sheet-root").innerHTML = "";
}

export function openDetailMenu(a) {
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
    ${a.joinToken ? `
      <button class="sheet-action" data-sheet-action="reset-invite">
        <span class="sheet-glyph">${icon("link")}</span> ${t('resetInviteLink')}
      </button>
    ` : ""}
    ${a.serverId ? `<p class="sheet-hint" id="shared-with-line"></p>` : ""}
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

  if (a.serverId) {
    // Kort, ikke-blokerende opslag — sheeten er allerede tegnet og fuldt
    // interaktiv. "Delt med"-linjen fyldes ind, når (og hvis) svaret når
    // frem; ingen spinner, den er bare tom indtil da. Navne foretrækkes
    // frem for et antal, men kun for de medlemmer der rent faktisk har
    // sat et navn i deres profil — resten falder tilbage til antallet.
    import('../sync.js').then(async (sync) => {
      const [names, count] = await Promise.all([
        sync.getMemberNames(a.serverId),
        sync.getMemberCount(a.serverId),
      ]);
      const line = document.getElementById("shared-with-line");
      if (!line) return;
      if (names.length > 0) {
        line.textContent = t('sharedWithNames', names);
      } else if (count != null) {
        line.textContent = count > 1 ? t('sharedWithCount', count - 1) : t('sharedWithNoOne');
      }
    }).catch(() => {});
  }

  document.querySelectorAll("[data-sheet-action]").forEach(el => {
    el.addEventListener("click", () => {
      const action = el.dataset.sheetAction;
      closeSheet();
      if (action === "edit")   return openAdventureModal(a);
      if (action === "ics")    return downloadICS(a);
      if (action === "invite") return openInviteModal(a);
      if (action === "reset-invite") return resetInviteLink(a);
      if (action === "done") {
        const idx = state.adventures.findIndex(x => x.id === a.id);
        if (idx >= 0) {
          state.adventures[idx] = touch({ ...state.adventures[idx], afsluttet: true });
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
          // Eksplicit cascade-tombstone af børnene, ikke kun forældren —
          // adgang styres af adventure_members, ikke af deleted_at, og
          // 30-dages-oprydningen renser kun rækker efter deres EGEN alder.
          const idx = state.adventures.findIndex(x => x.id === a.id);
          if (idx >= 0) tombstone(state.adventures[idx]);
          state.activities.filter(x => x.adventureId === a.id && !x.deletedAt).forEach(tombstone);
          state.savings.filter(x => x.adventureId === a.id && !x.deletedAt).forEach(tombstone);
          delete state.plans[a.id];
          saveData();
          navigate("/");
        }
      }
    });
  });
}

async function resetInviteLink(a) {
  try {
    const sync = await import('../sync.js');
    const newToken = await sync.rotateInviteLink(a.serverId);
    const idx = state.adventures.findIndex(x => x.id === a.id);
    if (idx >= 0) state.adventures[idx].joinToken = newToken;
    saveData();
    toast(t('inviteLinkReset'));
  } catch {
    toast(t('inviteLinkResetFailed'));
  }
}

function syncStatusText() {
  // Behandler "error" roligt som offline — ingen alarmerende fejlbesked,
  // offline er en normal tilstand appen er bygget til at leve fint med.
  if (!navigator.onLine || syncStatus.state === "error" || syncStatus.state === "offline") {
    return t('offlineStatus');
  }
  if (!syncStatus.lastSyncedAt) return t('notSyncedYetStatus');
  const mins = Math.floor((Date.now() - new Date(syncStatus.lastSyncedAt).getTime()) / 60000);
  return t('syncedAgo', mins);
}

export function openAppMenu() {
  openSheet(`
    <p class="sheet-title">${t('appName')}</p>
    <p class="sheet-hint">${syncStatusText()}</p>
    <button class="sheet-action" data-app-action="calendar">
      <span class="sheet-glyph">${icon("calendar")}</span> ${t('calendar')}
    </button>
    <button class="sheet-action" data-app-action="all">
      <span class="sheet-glyph">${icon("grid")}</span> ${t('allAdventures')}
    </button>
    <button class="sheet-action" data-app-action="profile">
      <span class="sheet-glyph">${icon("user")}</span> ${t('profileTitle')}
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
      if (action === "profile") return navigate("/profile");
      toast(t('comingSoon'));
    });
  });
}
