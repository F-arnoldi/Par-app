// ---------- Tastatur/tilgængelighed for modaler/ark ----------
// Delt af modal.js, sheet.js og datepicker.js (som bygger sin egen
// .sheet-markup direkte, samme grund til at den kobler attachDragToDismiss
// eksplicit i stedet for at gå via openSheet).
export function trapFocusAndEscape(panelEl, onEscape) {
  const previouslyFocused = document.activeElement;

  function focusables() {
    return [...panelEl.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter(el => el.offsetParent !== null); // kun synlige — udelukker fx et skjult act-details-area
  }

  // Fokuserer panelet selv, ikke automatisk det første felt — et
  // automatisk fokuseret tekstfelt ville rive markøren væk fra det, og
  // for en lang formular er "et sted i selve panelet" et bedre
  // udgangspunkt for skærmlæsere end en vilkårlig første input.
  panelEl.setAttribute("tabindex", "-1");
  panelEl.focus({ preventScroll: true });

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      onEscape();
      return;
    }
    if (e.key !== "Tab") return;
    const els = focusables();
    if (els.length === 0) { e.preventDefault(); return; }
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  document.addEventListener("keydown", onKeydown);

  // Kaldes når panelet rent faktisk fjernes fra DOM'en (efter luk-
  // animationen) — ikke ved selve luk-udløsningen, som stadig kan fortryde
  // undervejs (træk der springer tilbage).
  return function cleanup() {
    document.removeEventListener("keydown", onKeydown);
    if (previouslyFocused && document.contains(previouslyFocused)) {
      previouslyFocused.focus({ preventScroll: true });
    }
  };
}
