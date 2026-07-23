// ---------- Modaler (fælles skal) ----------
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
  root.querySelector("[data-modal-backdrop]").addEventListener("click", e => {
    if (e.target.hasAttribute("data-modal-backdrop")) closeModal();
  });
  root.querySelector("[data-modal-close]")?.addEventListener("click", closeModal);
}

export function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}
