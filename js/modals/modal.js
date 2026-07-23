// ---------- Modaler (fælles skal) ----------
import { attachDragToDismiss } from './dismissible.js';

let currentClose = null;

export function openModal(html) {
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
