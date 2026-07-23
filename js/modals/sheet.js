// ---------- Bottom sheet ----------
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc } from '../utils.js';
import { state, saveData } from '../data.js';
import { toast } from '../toast.js';
import { navigate, render } from '../router.js';
import { openAdventureModal } from './adventure.js';
import { openInviteModal } from './invite.js';
import { downloadICS } from '../ics.js';

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

export function openAppMenu() {
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
