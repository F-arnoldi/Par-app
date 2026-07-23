// ---------- Toast ----------
export function toast(msg, opts = {}) {
  const { actionLabel, onAction, persistent } = opts;
  const el = document.createElement("div");
  el.className = "toast" + (actionLabel || persistent ? " toast-actions" : "") + (persistent ? " toast-persistent" : "");

  const msgEl = document.createElement("span");
  msgEl.className = "toast-msg";
  msgEl.textContent = msg;
  el.appendChild(msgEl);

  if (actionLabel) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toast-btn";
    btn.textContent = actionLabel;
    btn.addEventListener("click", () => {
      onAction?.();
      el.remove();
    });
    el.appendChild(btn);
  }

  if (persistent) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "toast-close";
    close.setAttribute("aria-label", "×");
    close.textContent = "✕";
    close.addEventListener("click", () => el.remove());
    el.appendChild(close);
  }

  document.body.appendChild(el);
  if (!persistent) setTimeout(() => el.remove(), 2000);
}
