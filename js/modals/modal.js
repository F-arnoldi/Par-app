// ---------- Modaler (fælles skal) ----------
import { attachDragToDismiss } from './dismissible.js';

let currentClose = null;
// Tæller op ved hvert openModal()-kald. En lukning (animateClose, se
// dismissible.js) er forsinket ~200ms — åbner et andet ark (fx
// adventure.js's [data-detail]-håndtering: closeModal() straks efterfulgt
// af et nyt openActivityModal()) INDEN den forsinkelse er omme, ville den
// forældede, planlagte oprydning ellers rydde det NYE arks innerHTML væk
// et øjeblik efter det åbnede. Lukningen tjekker derfor at den stadig
// hører til den nyeste åbning, før den rører DOM'en.
let openId = 0;

export function openModal(html) {
  const myId = ++openId;
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <div class="modal" role="dialog">
        <div class="modal-handle"></div>
        ${html}
      </div>
    </div>
  `;
  const backdrop = root.querySelector("[data-modal-backdrop]");
  const panel = root.querySelector(".modal");
  currentClose = attachDragToDismiss(panel, backdrop, () => {
    if (myId !== openId) return;
    root.innerHTML = "";
    currentClose = null;
  });

  backdrop.addEventListener("click", e => {
    if (e.target.hasAttribute("data-modal-backdrop")) closeModal();
  });
  root.querySelector("[data-modal-close]")?.addEventListener("click", closeModal);
}

// Samme udgang uanset udløser (træk, baggrund, luk-knap, eller et
// programmatisk kald efter gem/slet) — se attachDragToDismiss.
export function closeModal() {
  currentClose?.();
}
