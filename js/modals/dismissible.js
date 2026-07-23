// ---------- Træk-for-at-lukke ----------
// Fælles for bundark og modaler: sheet.js's openSheet, modal.js's
// openModal, og datepicker.js (som bygger sin egen .sheet-markup direkte
// i picker-root i stedet for at kalde openSheet, og derfor kobler denne
// helper til eksplicit).
//
// Gribning sker LØBENDE i onPointerMove, ikke kun ved pointerdown — et
// træk der starter midt i en scrollet liste kan overtage naturligt, i det
// øjeblik man når toppen og trækker nedad. Uden det ville et scroll-til-
// toppen-og-fortsæt-nedad ikke kunne udløse lukning i samme gestus.

const DISMISS_DISTANCE_RATIO = 1 / 3;
const DISMISS_VELOCITY = 0.5; // px/ms — et kort, hurtigt strøg skal lukke
const RESISTANCE = 3; // deler udslaget ved opadtræk forbi udgangspunktet
const CLOSE_MS = 200;
const VELOCITY_WINDOW_MS = 80; // hastighed måles over de sidste par events, ikke hele trækket

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getTranslateY(el) {
  const t = getComputedStyle(el).transform;
  if (!t || t === "none") return 0;
  const m = t.match(/matrix(3d)?\(([^)]+)\)/);
  if (!m) return 0;
  const parts = m[2].split(",").map(v => parseFloat(v.trim()));
  return m[1] ? parts[13] : parts[5];
}

async function hapticLight() {
  try {
    await window.Capacitor?.Plugins?.Haptics?.impact({ style: "LIGHT" });
  } catch {
    // Web, eller pluginet er ikke registreret native — stilfærdigt
    // ingenting, som tiltænkt.
  }
}

// Fælles udgang for ALLE tre veje ud (træk, baggrunds-klik, luk-knap) —
// panelet glider til translateY(100%), baggrunden falmer, og først når
// det er færdigt ryddes DOM'en via onClose.
function animateClose(panelEl, backdropEl, onClose) {
  if (prefersReducedMotion()) {
    onClose();
    return;
  }
  panelEl.style.transition = `transform ${CLOSE_MS}ms ease-out`;
  panelEl.style.transform = "translateY(100%)";
  backdropEl.style.transition = `opacity ${CLOSE_MS}ms ease-out`;
  backdropEl.style.opacity = "0";
  setTimeout(onClose, CLOSE_MS);
}

/**
 * Kobler træk-for-at-luk på et allerede-indsat panel+baggrund.
 * Returnerer en close()-funktion, der spiller SAMME lukke-animation som
 * selve trækket — kaldes af backdrop-klik og luk-knap i sheet.js/modal.js,
 * så alle tre veje ud ser ens ud.
 */
export function attachDragToDismiss(panelEl, backdropEl, onClose) {
  let closed = false;
  let tracking = false;   // pointer er nede, retning/scroll endnu ikke afgjort
  let engaged = false;    // trækket ER blevet en luk-gestus, panelet følger fingeren
  let startClientY = 0;
  let dragBaseY = 0;      // panelets visuelle translateY-startpunkt (fanger en evt. igangværende indgangsanimation dér, hvor den er)
  let panelHeight = 0;
  let pastThreshold = false;
  let samples = [];

  function close() {
    if (closed) return;
    closed = true;
    animateClose(panelEl, backdropEl, onClose);
  }

  function onPointerDown(e) {
    if (tracking) return;
    tracking = true;
    engaged = false;
    pastThreshold = false;
    startClientY = e.clientY;
    samples = [{ t: performance.now(), y: e.clientY }];
  }

  function engage() {
    engaged = true;
    dragBaseY = getTranslateY(panelEl);
    panelHeight = panelEl.getBoundingClientRect().height;
    // Sæt inline transform FØR noget andet — stopper en evt. stadig
    // igangværende slideUp-indgangsanimation dér, hvor den visuelt er,
    // uden noget hop, i stedet for at afbryde den midtvejs.
    panelEl.style.animation = "none";
    panelEl.style.transition = "none";
    panelEl.style.transform = `translateY(${dragBaseY}px)`;
  }

  function onPointerMove(e) {
    if (!tracking) return;
    const deltaY = e.clientY - startClientY;

    if (!engaged) {
      // Grib kun når bevægelsen går nedad OG panelets scroll er i toppen
      // — ellers er det almindelig scroll af indholdet, som skal virke
      // uforstyrret.
      if (deltaY > 0 && panelEl.scrollTop <= 0) {
        engage();
      } else {
        return;
      }
    }

    // touch-action:pan-y tillader stadig native scroll — når vi FØRST er
    // engageret, skal kun vores egen transform styre, ellers kan iOS'
    // rubber-band-bounce konkurrere med gestussen.
    e.preventDefault();

    const raw = dragBaseY + deltaY;
    // Mærkbar modstand ved træk opad forbi udgangspunktet, i stedet for
    // at panelet bare letter fra bunden.
    const offset = raw < 0 ? raw / RESISTANCE : raw;
    panelEl.style.transform = `translateY(${offset}px)`;

    const opacity = Math.max(0, 1 - Math.max(0, offset) / panelHeight);
    backdropEl.style.opacity = String(opacity);

    const closeDistance = panelHeight * DISMISS_DISTANCE_RATIO;
    const nowPast = offset > closeDistance;
    if (nowPast && !pastThreshold) hapticLight();
    pastThreshold = nowPast;

    const now = performance.now();
    samples.push({ t: now, y: e.clientY });
    while (samples.length > 2 && now - samples[0].t > VELOCITY_WINDOW_MS) samples.shift();
  }

  function onPointerEnd() {
    if (!tracking) return;
    tracking = false;
    if (!engaged) return; // var kun et almindeligt tryk/scroll — intet at afgøre

    const offset = Math.max(0, getTranslateY(panelEl));
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = Math.max(1, last.t - first.t);
    const velocity = (last.y - first.y) / dt; // px/ms, positiv = nedad

    const closeDistance = panelHeight * DISMISS_DISTANCE_RATIO;
    engaged = false;

    if (offset > closeDistance || velocity > DISMISS_VELOCITY) {
      close();
      return;
    }

    // Ikke langt/hurtigt nok — spring tilbage til udgangspunktet.
    if (prefersReducedMotion()) {
      panelEl.style.transition = "";
      panelEl.style.transform = "";
      backdropEl.style.opacity = "";
      return;
    }
    panelEl.style.transition = `transform ${CLOSE_MS}ms ease-out`;
    panelEl.style.transform = "translateY(0px)";
    backdropEl.style.transition = `opacity ${CLOSE_MS}ms ease-out`;
    backdropEl.style.opacity = "";
    const cleanup = () => {
      panelEl.style.transition = "";
      panelEl.style.transform = "";
      backdropEl.style.transition = "";
    };
    panelEl.addEventListener("transitionend", cleanup, { once: true });
  }

  panelEl.addEventListener("pointerdown", onPointerDown);
  panelEl.addEventListener("pointermove", onPointerMove);
  panelEl.addEventListener("pointerup", onPointerEnd);
  panelEl.addEventListener("pointercancel", onPointerEnd);

  return close;
}
